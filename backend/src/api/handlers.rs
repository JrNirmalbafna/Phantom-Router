use crate::state::AppState;
use std::sync::Arc;
use serde_json::json;

/// Returns JSON list of all nodes.
pub async fn list_nodes(state: Arc<AppState>) -> impl serde::Serialize {
    let nodes: Vec<serde_json::Value> = state.cluster.get_all_nodes().into_iter()
        .map(|n| n.to_ws_payload())
        .collect();
    json!({ "nodes": nodes, "count": nodes.len() })
}

/// Returns a single node by ID.
pub async fn get_node(state: Arc<AppState>, id: &str) -> Option<serde_json::Value> {
    state.cluster.get_node(id).map(|n| n.to_ws_payload())
}

/// Returns the current telemetry snapshot as JSON.
pub async fn get_metrics_snapshot(state: Arc<AppState>) -> serde_json::Value {
    let global_rps: f64 = state.cluster.get_all_nodes().into_iter()
        .map(|n| n.rps)
        .sum();

    json!({
        "global_rps": global_rps,
        "uptime_s": state.start_time.elapsed().as_secs(),
        "decisions": state.history.get_recent_decisions(),
    })
}

/// Manually resets the circuit breaker for a node to CLOSED.
pub async fn reset_circuit(state: Arc<AppState>, id: &str) -> bool {
    if state.cluster.reset_circuit(id) {
        state.history.push_decision(format!("🔧 MANUAL_RESET circuit on {}", id));
        true
    } else {
        false
    }
}
