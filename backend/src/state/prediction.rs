/// Interface for accessing ML prediction state.
pub trait PredictionState: Send + Sync {
    /// Gets the cached failure probability for a node.
    fn get_failure_prob(&self, node_id: &str) -> Option<f64>;
    
    /// Updates the cached failure probability for a node.
    fn set_failure_prob(&self, node_id: &str, prob: f64);
}
