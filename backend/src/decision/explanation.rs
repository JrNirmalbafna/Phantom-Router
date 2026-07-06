#[derive(Debug, Clone, PartialEq)]
pub enum DecisionAction {
    Forward,
    Queue { delay_ms: u64 },
    Shed,
    Backpressure,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ReasonSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone)]
pub struct DecisionReason {
    pub rule: &'static str,
    pub message: String,
    pub severity: ReasonSeverity,
}

impl std::fmt::Display for DecisionReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.rule, self.message)
    }
}

#[derive(Debug, Clone)]
pub struct RoutingDecision {
    pub node_id: Option<String>,
    pub action: DecisionAction,
    pub confidence: f64,
    pub reason: DecisionReason,
}
