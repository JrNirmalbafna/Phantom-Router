use crate::router::algorithms::{Hybrid, RoutingAlgorithm};
use crate::decision::{make_decision, DecisionAction};
use crate::state::AppState;
use crate::context::RequestContext;
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::net::TcpListener;
use std::time::{Instant, Duration};

type BoxBody = http_body_util::combinators::BoxBody<hyper::body::Bytes, hyper::Error>;

/// HTTP proxy/load balancer — runs on :8080.
pub async fn run_proxy(state: Arc<AppState>) {
    let registry = Arc::new(crate::router::algorithms::AlgorithmRegistry::new());
    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await.expect("HTTP bind failed on :8080");
    tracing::info!("🔀 HTTP proxy on http://{}", addr);

    loop {
        let (stream, remote_addr) = match listener.accept().await {
            Ok(s) => s,
            Err(e) => { tracing::error!("Proxy accept: {}", e); continue; }
        };
        let state = state.clone();
        let registry = registry.clone();
        let client_ip = remote_addr.ip().to_string();

        tokio::spawn(async move {
            let io = TokioIo::new(stream);
            let svc = service_fn(move |req| {
                let state = state.clone();
                let registry = registry.clone();
                
                // Phase 1: Create RequestContext
                let req_id = uuid::Uuid::new_v4().to_string();
                let priority = req.headers().get("X-Priority")
                    .and_then(|v| v.to_str().ok()).unwrap_or("standard").to_string();
                
                let ctx = RequestContext::new(req_id, Some(client_ip.clone()), &priority);

                handle(req, ctx, state, registry)
            });
            let _ = http1::Builder::new().serve_connection(io, svc).await;
        });
    }
}

async fn handle(
    req: Request<hyper::body::Incoming>,
    mut ctx: RequestContext,
    state: Arc<AppState>,
    registry: Arc<crate::router::algorithms::AlgorithmRegistry>,
) -> Result<Response<BoxBody>, Infallible> {
    let active_algo_name = state.config.get_routing_strategy();
    let algo = registry.get(&active_algo_name).unwrap_or_else(|| registry.get("Hybrid").unwrap());

    // ── Algorithm ranks nodes ─────────────────────────────────────────────
    let candidates = algo.rank_nodes(&state, &ctx);
    let primary_node = candidates.first().map(|c| c.node_id.clone());
    let backup_node = candidates.get(1).map(|c| c.node_id.clone());

    // ── Decision Engine applies rules for Primary ─────────────────────────
    let decision = make_decision(&ctx, &state, primary_node.clone());

    match decision.action {
        DecisionAction::Backpressure => {
            state.history.push_decision("🚫 BACKPRESSURE — HTTP 429 issued".to_string());
            Ok(Response::builder()
                .status(StatusCode::TOO_MANY_REQUESTS)
                .header("Retry-After", "0")
                .header("X-Phantom-Reason", decision.reason.to_string())
                .header("X-Request-ID", ctx.request_id)
                .body(body_str(format!("Too Many Requests — {}", decision.reason.message)))
                .unwrap())
        }

        DecisionAction::Shed => {
            state.history.push_decision(format!("🗑️  SHED — {}", decision.reason.message));
            let status = if decision.reason.rule == "CircuitRule" {
                StatusCode::BAD_GATEWAY
            } else {
                StatusCode::SERVICE_UNAVAILABLE
            };
            Ok(Response::builder()
                .status(status)
                .header("X-Phantom-Reason", decision.reason.to_string())
                .header("X-Request-ID", ctx.request_id)
                .body(body_str(format!("Request shed: {}", decision.reason.message)))
                .unwrap())
        }

        DecisionAction::Queue { delay_ms } => {
            state.history.push_decision(format!("⏳ QUEUE — Delay {}ms", delay_ms));
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
            
            let Some(node_id) = decision.node_id else {
                state.history.push_decision("⚠️  FAIL — Queue action but no node ID".to_string());
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(body_str("Internal Error: Queue decision lacked target node"))
                    .unwrap());
            };
            let Some(node) = state.cluster.get_node(&node_id) else {
                state.history.push_decision(format!("⚠️  FAIL — Target node {} disappeared after queue", node_id));
                return Ok(Response::builder()
                    .status(StatusCode::BAD_GATEWAY)
                    .body(body_str(format!("Bad Gateway: Target node {} unavailable after queue", node_id)))
                    .unwrap());
            };
            forward_request(req, &mut ctx, &state, node_id, node.port, &node.circuit_state, node.health, algo.name()).await
        }

        DecisionAction::Forward => {
            let Some(node_id) = decision.node_id else {
                state.history.push_decision("⚠️  FAIL — Forward action but no node ID".to_string());
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(body_str("Internal Error: Routing decision lacked target node"))
                    .unwrap());
            };
            let Some(node) = state.cluster.get_node(&node_id) else {
                state.history.push_decision(format!("⚠️  FAIL — Target node {} disappeared", node_id));
                return Ok(Response::builder()
                    .status(StatusCode::BAD_GATEWAY)
                    .body(body_str(format!("Bad Gateway: Target node {} unavailable", node_id)))
                    .unwrap());
            };

            // Hedging Logic
            // Only hedge if we have a backup node and method is safe (GET/HEAD/OPTIONS)
            let is_idempotent = matches!(*req.method(), hyper::Method::GET | hyper::Method::HEAD | hyper::Method::OPTIONS);
            
            if is_idempotent && backup_node.is_some() {
                let backup_id = backup_node.unwrap();
                if let Some(backup) = state.cluster.get_node(&backup_id) {
                    let hedge_delay_ms = node.dna.latency_percentile_p99.max(10.0) as u64; // dynamic delay based on P99
                    
                    // We need to clone the request to race them.
                    // hyper::Request cloning can be tricky due to bodies. Since we only hedge GET/HEAD without bodies (usually),
                    // we'll create an empty body clone for the hedge. (In a production proxy, we'd buffer the body if needed).
                    let mut hedge_req = Request::builder()
                        .method(req.method().clone())
                        .uri(req.uri().clone());
                    for (k, v) in req.headers() {
                        hedge_req = hedge_req.header(k, v);
                    }
                    let hedge_req = hedge_req.body(http_body_util::Empty::<Bytes>::new().map_err(|e| match e {}).boxed()).unwrap();
                    
                    let state_clone = state.clone();
                    let backup_port = backup.port;
                    let backup_circuit = backup.circuit_state.clone();
                    let backup_health = backup.health;
                    let algo_name = algo.name();
                    
                    let mut ctx_clone = ctx.clone();
                    
                    state.history.push_decision(format!("⏱️ HEDGING — Will hedge to {} if {} takes > {}ms", backup_id, node_id, hedge_delay_ms));

                    let primary_fut = forward_request(req, &mut ctx, &state, node_id.clone(), node.port, &node.circuit_state, node.health, algo_name);
                    tokio::pin!(primary_fut);

                    return tokio::select! {
                        primary_res = &mut primary_fut => {
                            primary_res
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_millis(hedge_delay_ms)) => {
                            state.history.push_decision(format!("⚡ HEDGE FIRED — Primary {} too slow, racing {}", node_id, backup_id));
                            // Both requests are now in flight, return whichever finishes next
                            let backup_fut = forward_request(hedge_req, &mut ctx_clone, &state_clone, backup_id, backup_port, &backup_circuit, backup_health, algo_name);
                            tokio::pin!(backup_fut);
                            
                            tokio::select! {
                                res1 = primary_fut => res1,
                                res2 = backup_fut => res2,
                            }
                        }
                    }
                }
            }
            
            // Standard forwarding (no hedging)
            forward_request(req, &mut ctx, &state, node_id, node.port, &node.circuit_state, node.health, algo.name()).await
        }
    }
}

async fn forward_request(
    mut req: Request<hyper::body::Incoming>,
    _ctx: &mut RequestContext,
    state: &AppState,
    node_id: String,
    port: u16,
    circuit: &crate::state::CircuitState,
    health: f64,
    algo: &str,
) -> Result<Response<BoxBody>, Infallible> {
    // 1. Mutate the request URI to point to the backend
    let uri = req.uri().clone();
    let path_and_query = uri.path_and_query().map_or("", |pq| pq.as_str());
    
    // Assumes backends are running locally for testing. In prod, use node IP.
    let backend_url = format!("http://127.0.0.1:{}{}", port, path_and_query);
    
    match backend_url.parse::<hyper::Uri>() {
        Ok(parsed_uri) => *req.uri_mut() = parsed_uri,
        Err(_) => return Ok(Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(body_str("Internal Error: Invalid backend URI"))
            .unwrap())
    }

    // 2. Adjust Host header
    req.headers_mut().insert(hyper::header::HOST, hyper::header::HeaderValue::from_str(&format!("127.0.0.1:{}", port)).unwrap());
    
    // 3. Send Request with Timeout (5 seconds)
    let start_time = Instant::now();
    let timeout_duration = Duration::from_secs(5);
    
    let client_req = state.http_client.request(req);
    
    let response_result = tokio::time::timeout(timeout_duration, client_req).await;
    let proxy_latency = start_time.elapsed();
    
    // 4. Handle Result
    match response_result {
        Ok(Ok(mut res)) => {
            state.history.push_decision(format!("✅ PROXY — {} → {} ({}ms)", algo, node_id, proxy_latency.as_millis()));
            
            // Inject Phantom Headers
            res.headers_mut().insert("X-Phantom-Node", hyper::header::HeaderValue::from_str(&node_id).unwrap());
            res.headers_mut().insert("X-Phantom-Health", hyper::header::HeaderValue::from_str(&format!("{:.1}", health)).unwrap());
            res.headers_mut().insert("X-Phantom-Circuit", hyper::header::HeaderValue::from_str(&circuit.to_string()).unwrap());
            res.headers_mut().insert("X-Phantom-Algo", hyper::header::HeaderValue::from_str(algo).unwrap());
            res.headers_mut().insert("X-Phantom-Latency-Ms", hyper::header::HeaderValue::from_str(&proxy_latency.as_millis().to_string()).unwrap());
            
            // Map body to BoxBody
            let res = res.map(|body| {
                use http_body_util::BodyExt;
                body.map_err(|e| e.into()).boxed()
            });
            Ok(res)
        }
        Ok(Err(e)) => {
            // Connection error (502 Bad Gateway)
            state.history.push_decision(format!("❌ ERROR — Backend {} failed: {}", node_id, e));
            Ok(Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(body_str(format!("Bad Gateway: {}", e)))
                .unwrap())
        }
        Err(_) => {
            // Timeout error (504 Gateway Timeout)
            state.history.push_decision(format!("⏱️ TIMEOUT — Backend {} took > 5s", node_id));
            Ok(Response::builder()
                .status(StatusCode::GATEWAY_TIMEOUT)
                .body(body_str("Gateway Timeout: Backend did not respond in time"))
                .unwrap())
        }
    }
}

fn body_str(s: impl Into<String>) -> BoxBody {
    Full::new(hyper::body::Bytes::from(s.into()))
        .map_err(|_| unreachable!())
        .boxed()
}
