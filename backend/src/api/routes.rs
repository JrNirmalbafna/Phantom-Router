use crate::api::handlers;
use crate::state::AppState;
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::{Method, Request, Response, StatusCode};
use std::convert::Infallible;
use std::sync::Arc;

type BoxBody = http_body_util::combinators::BoxBody<Bytes, Infallible>;

/// Routes incoming REST requests to the appropriate handler.
/// Called from the engine when the request path starts with `/api/` or is `/health`.
pub async fn route(
    req: Request<hyper::body::Incoming>,
    state: Arc<AppState>,
) -> Result<Response<BoxBody>, Infallible> {
    let path = req.uri().path().to_string();
    let method = req.method().clone();

    let response = match (method, path.as_str()) {
        // GET /health
        (Method::GET, "/health") => {
            json_response(StatusCode::OK, serde_json::json!({ "status": "ok" }))
        }

        // GET /api/nodes
        (Method::GET, "/api/nodes") => {
            let payload = handlers::list_nodes(state).await;
            json_response(StatusCode::OK, serde_json::to_value(payload).unwrap())
        }

        // GET /api/nodes/:id
        (Method::GET, p) if p.starts_with("/api/nodes/") && !p.ends_with("/reset") => {
            let id = p.trim_start_matches("/api/nodes/");
            match handlers::get_node(state, id).await {
                Some(v) => json_response(StatusCode::OK, v),
                None    => json_response(StatusCode::NOT_FOUND,
                               serde_json::json!({ "error": "Node not found" })),
            }
        }

        // POST /api/nodes/:id/reset
        (Method::POST, p) if p.ends_with("/reset") => {
            let id = p
                .trim_start_matches("/api/nodes/")
                .trim_end_matches("/reset");
            if handlers::reset_circuit(state, id).await {
                json_response(StatusCode::OK,
                    serde_json::json!({ "ok": true, "node": id, "action": "circuit_reset" }))
            } else {
                json_response(StatusCode::NOT_FOUND,
                    serde_json::json!({ "error": "Node not found" }))
            }
        }

        // GET /api/metrics
        (Method::GET, "/api/metrics") => {
            let v = handlers::get_metrics_snapshot(state).await;
            json_response(StatusCode::OK, v)
        }

        _ => json_response(StatusCode::NOT_FOUND,
                 serde_json::json!({ "error": "Not Found" })),
    };

    Ok(response)
}

fn json_response(status: StatusCode, body: serde_json::Value) -> Response<BoxBody> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(
            Full::new(Bytes::from(body.to_string()))
                .map_err(|_| unreachable!())
                .boxed(),
        )
        .unwrap()
}
