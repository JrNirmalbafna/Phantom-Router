use super::node::NodeState;

/// Interface for accessing and mutating cluster topology and node health.
pub trait ClusterState: Send + Sync {
    /// Gets a snapshot of a specific node.
    fn get_node(&self, id: &str) -> Option<NodeState>;
    
    /// Gets a snapshot of all nodes.
    fn get_all_nodes(&self) -> Vec<NodeState>;
    
    /// Gets the list of configured node IDs.
    fn get_node_ids(&self) -> Vec<String>;
    
    /// Updates the health score of a node.
    fn update_health(&self, id: &str, health: f64);
    
    /// Updates the active connection count of a node.
    fn update_active_conns(&self, id: &str, delta: i64);
    
    /// Resets the circuit breaker for a node to Closed. Returns true if node exists.
    fn reset_circuit(&self, id: &str) -> bool;
    
    /// Overwrites the full node state. Useful for the simulator.
    fn update_node_state(&self, id: &str, node: NodeState);
}
