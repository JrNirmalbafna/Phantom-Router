use std::collections::VecDeque;
use std::sync::Mutex;
use dashmap::DashMap;
use crate::state::node::NodeState;
use crate::state::cluster::ClusterState;
use crate::state::prediction::PredictionState;
use crate::state::metrics_state::MetricsState;
use crate::state::decision_history::DecisionHistory;
use crate::state::config_state::ConfigState;
use crate::state::pool::ConnectionPool;

pub struct MemoryClusterState {
    pub nodes: DashMap<String, NodeState>,
    pub node_ids: Vec<String>,
}

impl ClusterState for MemoryClusterState {
    fn get_node(&self, id: &str) -> Option<NodeState> {
        self.nodes.get(id).map(|n| n.clone())
    }
    fn get_all_nodes(&self) -> Vec<NodeState> {
        self.nodes.iter().map(|n| n.clone()).collect()
    }
    fn get_node_ids(&self) -> Vec<String> {
        self.node_ids.clone()
    }
    fn update_health(&self, id: &str, health: f64) {
        if let Some(mut n) = self.nodes.get_mut(id) {
            n.health = health;
        }
    }
    fn update_active_conns(&self, id: &str, delta: i64) {
        if let Some(mut n) = self.nodes.get_mut(id) {
            let new_conns = n.active_conns as i64 + delta;
            n.active_conns = new_conns.max(0) as u64;
        }
    }
    
    fn reset_circuit(&self, id: &str) -> bool {
        if let Some(mut node) = self.nodes.get_mut(id) {
            node.circuit_state = crate::state::CircuitState::Closed;
            node.consecutive_errors = 0;
            node.circuit_open_since = None;
            true
        } else {
            false
        }
    }
    
    fn update_node_state(&self, id: &str, node: NodeState) {
        self.nodes.insert(id.to_string(), node);
    }
}

pub struct MemoryPredictionState {
    pub probs: DashMap<String, f64>,
}

impl PredictionState for MemoryPredictionState {
    fn get_failure_prob(&self, node_id: &str) -> Option<f64> {
        self.probs.get(node_id).map(|p| *p)
    }
    fn set_failure_prob(&self, node_id: &str, prob: f64) {
        self.probs.insert(node_id.to_string(), prob);
    }
}

pub struct MemoryMetricsState;
impl MetricsState for MemoryMetricsState {
    fn get_p50_latency(&self, _node_id: &str) -> Option<f64> { Some(1.5) }
    fn get_p95_latency(&self, _node_id: &str) -> Option<f64> { Some(3.0) }
    fn get_rps(&self, _node_id: &str) -> Option<f64> { Some(100.0) }
}

pub struct MemoryDecisionHistory {
    pub decisions: Mutex<VecDeque<String>>,
}
impl DecisionHistory for MemoryDecisionHistory {
    fn push_decision(&self, decision: String) {
        let mut dq = self.decisions.lock().unwrap();
        if dq.len() >= 20 { dq.pop_front(); }
        dq.push_back(decision);
    }
    fn get_recent_decisions(&self) -> Vec<String> {
        self.decisions.lock().unwrap().iter().cloned().collect()
    }
}

pub struct MemoryConfigState {
    pub strategy: std::sync::RwLock<String>,
}

impl MemoryConfigState {
    pub fn new() -> Self {
        Self { strategy: std::sync::RwLock::new("Hybrid".to_string()) }
    }
}

impl ConfigState for MemoryConfigState {
    fn is_feature_enabled(&self, _feature: &str) -> bool { true }
    fn get_routing_strategy(&self) -> String { 
        self.strategy.read().unwrap().clone() 
    }
    fn set_routing_strategy(&self, strategy: String) {
        *self.strategy.write().unwrap() = strategy;
    }
}

pub struct MemoryConnectionPool;
impl ConnectionPool for MemoryConnectionPool {
    fn has_available_connection(&self, _node_id: &str) -> bool { true }
    fn acquire_connection(&self, _node_id: &str) {}
    fn release_connection(&self, _node_id: &str) {}
}
