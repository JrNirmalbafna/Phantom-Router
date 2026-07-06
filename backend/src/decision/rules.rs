use crate::context::{RequestContext, Priority};
use crate::state::{AppState, CircuitState, NodeState};
use super::explanation::{RoutingDecision, DecisionAction, DecisionReason, ReasonSeverity};

/// The plugin trait for decision rules.
pub trait Rule: Send + Sync {
    fn name(&self) -> &'static str;
    
    /// Evaluates the rule. Returns `Some(RoutingDecision)` to halt the chain,
    /// or `None` to pass to the next rule.
    fn evaluate(
        &self, 
        ctx: &RequestContext, 
        state: &AppState, 
        node: Option<&NodeState>
    ) -> Option<RoutingDecision>;
}

/// 1. Backpressure Rule (Cluster-wide)
pub struct BackpressureRule {
    pub max_queue: f64,
}

impl Rule for BackpressureRule {
    fn name(&self) -> &'static str { "BackpressureRule" }
    fn evaluate(&self, ctx: &RequestContext, state: &AppState, _node: Option<&NodeState>) -> Option<RoutingDecision> {
        let current_max = state.cluster.get_all_nodes().iter()
            .map(|n| n.dna.queue_depth)
            .fold(0.0f64, f64::max);

        if current_max > self.max_queue && ctx.priority != Priority::Critical {
            Some(RoutingDecision {
                node_id: None,
                action: DecisionAction::Backpressure,
                confidence: 1.0,
                reason: DecisionReason {
                    rule: self.name(),
                    message: format!("Max queue depth {} exceeded limit {}", current_max, self.max_queue),
                    severity: ReasonSeverity::Warning,
                }
            })
        } else {
            None
        }
    }
}

/// 2. Missing Node Rule (Safety)
pub struct MissingNodeRule;

impl Rule for MissingNodeRule {
    fn name(&self) -> &'static str { "MissingNodeRule" }
    fn evaluate(&self, _ctx: &RequestContext, _state: &AppState, node: Option<&NodeState>) -> Option<RoutingDecision> {
        if node.is_none() {
            Some(RoutingDecision {
                node_id: None,
                action: DecisionAction::Shed,
                confidence: 1.0,
                reason: DecisionReason {
                    rule: self.name(),
                    message: "No healthy nodes available to route request".into(),
                    severity: ReasonSeverity::Critical,
                }
            })
        } else {
            None
        }
    }
}

/// 3. Circuit Breaker Rule
pub struct CircuitRule;

impl Rule for CircuitRule {
    fn name(&self) -> &'static str { "CircuitRule" }
    fn evaluate(&self, _ctx: &RequestContext, _state: &AppState, node: Option<&NodeState>) -> Option<RoutingDecision> {
        let n = node?;
        if n.circuit_state == CircuitState::Open {
            Some(RoutingDecision {
                node_id: Some(n.id.clone()),
                action: DecisionAction::Shed,
                confidence: 1.0,
                reason: DecisionReason {
                    rule: self.name(),
                    message: "Circuit is open".into(),
                    severity: ReasonSeverity::Critical,
                }
            })
        } else {
            None
        }
    }
}

/// 4. Prediction Rule
pub struct PredictionRule {
    pub threshold: f64,
}

impl Rule for PredictionRule {
    fn name(&self) -> &'static str { "PredictionRule" }
    fn evaluate(&self, ctx: &RequestContext, _state: &AppState, node: Option<&NodeState>) -> Option<RoutingDecision> {
        let n = node?;
        if n.failure_prob > self.threshold {
            let action = if ctx.priority == Priority::Critical {
                DecisionAction::Forward
            } else {
                DecisionAction::Shed
            };
            
            Some(RoutingDecision {
                node_id: Some(n.id.clone()),
                action,
                confidence: n.failure_prob,
                reason: DecisionReason {
                    rule: self.name(),
                    message: format!("Predicted failure prob {:.2} > {:.2}", n.failure_prob, self.threshold),
                    severity: ReasonSeverity::Warning,
                }
            })
        } else {
            None
        }
    }
}

/// 5. Health Priority Rule (Exponential Delay)
pub struct HealthRule {
    pub degraded_threshold: f64,
}

impl Rule for HealthRule {
    fn name(&self) -> &'static str { "HealthRule" }
    fn evaluate(&self, ctx: &RequestContext, _state: &AppState, node: Option<&NodeState>) -> Option<RoutingDecision> {
        let n = node?;
        if n.health < self.degraded_threshold {
            if ctx.priority == Priority::Low {
                return Some(RoutingDecision {
                    node_id: Some(n.id.clone()),
                    action: DecisionAction::Shed,
                    confidence: 1.0 - (n.health / 100.0),
                    reason: DecisionReason {
                        rule: self.name(),
                        message: "Shedding low priority traffic from degraded node".into(),
                        severity: ReasonSeverity::Info,
                    }
                });
            } else if ctx.priority == Priority::Standard {
                // Exponential backoff for queueing
                let degradation = self.degraded_threshold - n.health; // e.g. 70 - 60 = 10
                let delay = 10.0 * (1.2f64).powf(degradation);
                return Some(RoutingDecision {
                    node_id: Some(n.id.clone()),
                    action: DecisionAction::Queue { delay_ms: delay as u64 },
                    confidence: 0.85,
                    reason: DecisionReason {
                        rule: self.name(),
                        message: format!("Queuing standard traffic for {:.0}ms", delay),
                        severity: ReasonSeverity::Info,
                    }
                });
            }
        }
        None
    }
}

/// The Rule Registry evaluates a chain of rules.
pub struct RuleRegistry {
    rules: Vec<Box<dyn Rule>>,
}

impl RuleRegistry {
    pub fn new(rules: Vec<Box<dyn Rule>>) -> Self {
        Self { rules }
    }

    pub fn evaluate_all(&self, ctx: &RequestContext, state: &AppState, node_id: Option<String>) -> RoutingDecision {
        let node = node_id.as_ref().and_then(|id| state.cluster.get_node(id));
        
        for rule in &self.rules {
            if let Some(decision) = rule.evaluate(ctx, state, node.as_ref()) {
                return decision;
            }
        }

        // Fallback default decision if no rule halts the chain
        RoutingDecision {
            node_id: node_id.clone(),
            action: DecisionAction::Forward,
            confidence: node.map_or(1.0, |n| n.health / 100.0),
            reason: DecisionReason {
                rule: "Default",
                message: "Healthy Forward".into(),
                severity: ReasonSeverity::Info,
            }
        }
    }
}
