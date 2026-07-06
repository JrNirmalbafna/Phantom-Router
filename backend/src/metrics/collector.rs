use crate::state::{AppState, CircuitState};
use metrics::{gauge, histogram};

/// Reads live AppState and records all Prometheus metrics.
/// Called every 500ms by the exporter.
pub fn collect(state: &AppState) {
    gauge!("router_uptime_seconds").set(state.start_time.elapsed().as_secs_f64());

    let mut global_rps = 0.0f64;

    for node in state.cluster.get_all_nodes() {
        let lbl = [("node", node.id.clone())];

        gauge!("phantom_health_score",         &lbl).set(node.health);
        gauge!("phantom_failure_probability",  &lbl).set(node.failure_prob);
        gauge!("router_active_connections",    &lbl).set(node.dna.active_connections);
        gauge!("router_queue_depth",           &lbl).set(node.dna.queue_depth);
        gauge!("router_error_rate_5xx",        &lbl).set(node.dna.error_rate_5xx);
        gauge!("router_requests_per_second",   &lbl).set(node.rps);
        gauge!("phantom_node_weight",          &lbl).set(node.weight);
        gauge!("LB_backpressure_active",       &lbl)
            .set(*node.sensor_dna.get("LB_backpressure_active").unwrap_or(&0.0));

        gauge!("router_circuit_breaker_state", &lbl).set(match node.circuit_state {
            CircuitState::Closed   => 0.0,
            CircuitState::HalfOpen => 0.5,
            CircuitState::Open     => 1.0,
        });

        histogram!("router_latency_ms", &lbl).record(node.dna.current_latency_ms);

        global_rps += node.rps;
    }

    gauge!("router_global_rps").set(global_rps);
}
