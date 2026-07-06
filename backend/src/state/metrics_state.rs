/// Interface for accessing recent aggregated metrics for routing decisions.
pub trait MetricsState: Send + Sync {
    /// Gets the P50 latency for a node over the last window.
    fn get_p50_latency(&self, node_id: &str) -> Option<f64>;
    
    /// Gets the P95 latency for a node over the last window.
    fn get_p95_latency(&self, node_id: &str) -> Option<f64>;
    
    /// Gets the current Request Per Second for a node.
    fn get_rps(&self, node_id: &str) -> Option<f64>;
}
