use crate::context::RequestContext;
use crate::state::AppState;
use super::explanation::RoutingDecision;
use super::rules::{RuleRegistry, BackpressureRule, MissingNodeRule, CircuitRule, PredictionRule, HealthRule};

pub fn make_decision(ctx: &RequestContext, state: &AppState, selected_node: Option<String>) -> RoutingDecision {
    // In the future, this registry will be built once from `RuleConfig`
    // and injected via AppState, rather than instantiated per request.
    let registry = RuleRegistry::new(vec![
        Box::new(BackpressureRule { max_queue: 950.0 }),
        Box::new(MissingNodeRule),
        Box::new(CircuitRule),
        Box::new(PredictionRule { threshold: 0.92 }),
        Box::new(HealthRule { degraded_threshold: 70.0 }),
    ]);

    registry.evaluate_all(ctx, state, selected_node)
}
