/// Interface for tracking recent routing decisions.
pub trait DecisionHistory: Send + Sync {
    /// Records a new decision.
    fn push_decision(&self, decision: String);
    
    /// Retrieves the most recent decisions.
    fn get_recent_decisions(&self) -> Vec<String>;
}
