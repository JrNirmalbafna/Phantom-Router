/// Interface for accessing hot-reloaded configuration.
pub trait ConfigState: Send + Sync {
    /// Checks if a specific feature flag is enabled.
    fn is_feature_enabled(&self, feature: &str) -> bool;
    
    /// Gets the current routing strategy name.
    fn get_routing_strategy(&self) -> String;

    /// Sets the current routing strategy name.
    fn set_routing_strategy(&self, strategy: String);
}
