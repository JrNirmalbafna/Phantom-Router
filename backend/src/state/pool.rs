/// Interface for acquiring backend connections.
pub trait ConnectionPool: Send + Sync {
    /// Checks if a connection is available for the given node.
    fn has_available_connection(&self, node_id: &str) -> bool;
    
    /// Records an active connection.
    fn acquire_connection(&self, node_id: &str);
    
    /// Releases an active connection.
    fn release_connection(&self, node_id: &str);
}
