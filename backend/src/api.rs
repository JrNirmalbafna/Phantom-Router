use crate::state::AppState;
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::net::TcpListener;
use url::Url;

type BoxBody = http_body_util::combinators::BoxBody<hyper::body::Bytes, hyper::Error>;

pub async fn run_admin_api(state: Arc<AppState>) {
    let addr = "0.0.0.0:8081";
    let listener = TcpListener::bind(addr).await.expect("Admin API bind failed");
    tracing::info!("🛠️  Admin API on http://{}", addr);

    loop {
        let (stream, _) = match listener.accept().await {
            Ok(s) => s,
            Err(_) => continue,
        };
        let state = state.clone();

        tokio::spawn(async move {
            let io = TokioIo::new(stream);
            let svc = service_fn(move |req| {
                let state = state.clone();
                async move { handle_api(req, state).await }
            });
            let _ = http1::Builder::new().serve_connection(io, svc).await;
        });
    }
}

async fn handle_api(req: Request<hyper::body::Incoming>, state: Arc<AppState>) -> Result<Response<BoxBody>, Infallible> {
    let path = req.uri().path();
    
    // Example: POST /api/weights?node=n1&weight=1.5
    if path == "/api/weights" && req.method() == Method::POST {
        if let Some(query) = req.uri().query() {
            let mut node_id = None;
            let mut weight = None;
            for param in query.split('&') {
                let mut parts = param.split('=');
                if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                    if k == "node" { node_id = Some(v.to_string()); }
                    if k == "weight" { weight = v.parse::<f64>().ok(); }
                }
            }
            if let (Some(n), Some(w)) = (node_id, weight) {
                if let Some(mut node) = state.cluster.get_node(&n) {
                    node.weight = w;
                    state.cluster.update_node_state(&n, node);
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body(body_str(format!("Updated node {} weight to {}", n, w)))
                        .unwrap());
                } else {
                    return Ok(Response::builder()
                        .status(StatusCode::NOT_FOUND)
                        .body(body_str(format!("Node {} not found", n)))
                        .unwrap());
                }
            }
        }
        return Ok(Response::builder().status(StatusCode::BAD_REQUEST).body(body_str("Missing node or weight")).unwrap());
    }

    // Example: GET /api/decisions
    if path == "/api/decisions" && req.method() == Method::GET {
        let history = state.history.get_recent_decisions();
        let json = serde_json::to_string(&history).unwrap_or_else(|_| "[]".to_string());
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "application/json")
            .body(body_str(json))
            .unwrap());
    }

    // Example: POST /api/strategy?name=LowestLatency
    if path == "/api/strategy" && req.method() == Method::POST {
        if let Some(query) = req.uri().query() {
            if let Some(name) = query.strip_prefix("name=") {
                state.config.set_routing_strategy(name.to_string());
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(body_str(format!("Switched routing strategy to {}", name)))
                    .unwrap());
            }
        }
        return Ok(Response::builder().status(StatusCode::BAD_REQUEST).body(body_str("Missing name")).unwrap());
    }

    Ok(Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(body_str("Not Found"))
        .unwrap())
}

fn body_str(s: impl Into<String>) -> BoxBody {
    Full::new(hyper::body::Bytes::from(s.into()))
        .map_err(|_| unreachable!())
        .boxed()
}
