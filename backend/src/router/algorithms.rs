use crate::state::{AppState, CircuitState};
use ordered_float::OrderedFloat;
use std::sync::atomic::Ordering;
use std::collections::HashMap;
use std::sync::Arc;

use crate::context::RequestContext;

pub struct NodeCandidate {
    pub node_id: String,
    pub score: f64,
    pub confidence: f64,
}

/// Pluggable routing algorithm trait.
pub trait RoutingAlgorithm: Send + Sync {
    fn name(&self) -> &'static str;
    fn rank_nodes(&self, state: &AppState, ctx: &RequestContext) -> Vec<NodeCandidate>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Round Robin
// ─────────────────────────────────────────────────────────────────────────────
pub struct RoundRobin {
    counter: std::sync::atomic::AtomicUsize,
}

impl RoundRobin {
    pub fn new() -> Self { Self { counter: std::sync::atomic::AtomicUsize::new(0) } }
}

impl RoutingAlgorithm for RoundRobin {
    fn name(&self) -> &'static str { "RoundRobin" }
    fn rank_nodes(&self, state: &AppState, _ctx: &RequestContext) -> Vec<NodeCandidate> {
        let healthy: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter(|id| state.cluster.get_node(id)
                .map_or(false, |n| n.circuit_state != CircuitState::Open))
            .collect();
        if healthy.is_empty() { return vec![]; }
        let idx = self.counter.fetch_add(1, Ordering::SeqCst) % healthy.len();
        
        let mut candidates = Vec::new();
        for i in 0..healthy.len() {
            let offset_idx = (idx + i) % healthy.len();
            candidates.push(NodeCandidate {
                node_id: healthy[offset_idx].clone(),
                score: 1.0 - (i as f64 / healthy.len() as f64),
                confidence: 1.0,
            });
        }
        candidates
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Least Connections
// ─────────────────────────────────────────────────────────────────────────────
pub struct LeastConnections;

impl RoutingAlgorithm for LeastConnections {
    fn name(&self) -> &'static str { "LeastConnections" }
    fn rank_nodes(&self, state: &AppState, _ctx: &RequestContext) -> Vec<NodeCandidate> {
        let mut list: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter_map(|id| state.cluster.get_node(&id)
                .filter(|n| n.circuit_state != CircuitState::Open)
                .map(|n| (id, n.active_conns)))
            .collect();
        list.sort_by_key(|(_, c)| *c);
        
        list.into_iter().enumerate().map(|(i, (id, _))| NodeCandidate {
            node_id: id,
            score: 1.0 - (i as f64 / 100.0),
            confidence: 1.0,
        }).collect()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Lowest Latency
// ─────────────────────────────────────────────────────────────────────────────
pub struct LowestLatency;

impl RoutingAlgorithm for LowestLatency {
    fn name(&self) -> &'static str { "LowestLatency" }
    fn rank_nodes(&self, state: &AppState, _ctx: &RequestContext) -> Vec<NodeCandidate> {
        let mut list: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter_map(|id| state.cluster.get_node(&id)
                .filter(|n| n.circuit_state != CircuitState::Open)
                .map(|n| (id, OrderedFloat(n.dna.latency_rolling_avg_10s))))
            .collect();
        list.sort_by_key(|(_, l)| *l);
        
        list.into_iter().enumerate().map(|(i, (id, _))| NodeCandidate {
            node_id: id,
            score: 1.0 - (i as f64 / 100.0),
            confidence: 1.0,
        }).collect()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ML Predictor (health-weighted)
// ─────────────────────────────────────────────────────────────────────────────
pub struct MLPredictor;

impl RoutingAlgorithm for MLPredictor {
    fn name(&self) -> &'static str { "MLPredictor" }
    fn rank_nodes(&self, state: &AppState, _ctx: &RequestContext) -> Vec<NodeCandidate> {
        let mut list: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter_map(|id| state.cluster.get_node(&id)
                .filter(|n| n.circuit_state != CircuitState::Open)
                .map(|n| (id, OrderedFloat(1.0 - n.failure_prob))))
            .collect();
        list.sort_by_key(|(_, h)| std::cmp::Reverse(*h));
        
        list.into_iter().map(|(id, h)| NodeCandidate {
            node_id: id,
            score: h.into_inner(),
            confidence: 0.9,
        }).collect()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Hybrid — weighted combination: health 50% + latency 30% + connections 20%
// ─────────────────────────────────────────────────────────────────────────────
pub struct Hybrid;

impl RoutingAlgorithm for Hybrid {
    fn name(&self) -> &'static str { "Hybrid" }
    fn rank_nodes(&self, state: &AppState, _ctx: &RequestContext) -> Vec<NodeCandidate> {
        let mut list: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter_map(|id| {
                let n = state.cluster.get_node(&id)?;
                if n.circuit_state == CircuitState::Open { return None; }
                let health_score  = n.health / 100.0;                       // 0-1
                let pred_score    = 1.0 - n.failure_prob;                   // 0-1
                let latency_score = 1.0 - (n.dna.latency_rolling_avg_10s / 50.0).clamp(0.0, 1.0);
                let conn_score    = 1.0 - (n.dna.active_connections as f64 / 1000.0).clamp(0.0, 1.0);
                
                // Composite score
                let combined = health_score * 0.40 
                             + pred_score * 0.30 
                             + latency_score * 0.20 
                             + conn_score * 0.10;
                             
                Some((id, OrderedFloat(combined)))
            })
            .collect();
        list.sort_by_key(|(_, s)| std::cmp::Reverse(*s));
        
        list.into_iter().map(|(id, s)| NodeCandidate {
            node_id: id,
            score: s.into_inner(),
            confidence: 0.95,
        }).collect()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Consistent Hashing
// ─────────────────────────────────────────────────────────────────────────────
pub struct ConsistentHashing;

impl RoutingAlgorithm for ConsistentHashing {
    fn name(&self) -> &'static str { "ConsistentHashing" }
    fn rank_nodes(&self, state: &AppState, ctx: &RequestContext) -> Vec<NodeCandidate> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        if let Some(ref ip) = ctx.client_ip {
            ip.hash(&mut hasher);
        } else {
            ctx.request_id.hash(&mut hasher);
        }
        let hash_val = hasher.finish();

        let mut list: Vec<_> = state.cluster.get_node_ids().into_iter()
            .filter_map(|id| state.cluster.get_node(&id)
                .filter(|n| n.circuit_state != CircuitState::Open))
            .collect();
            
        if list.is_empty() { return vec![]; }
        
        // Simple hash ring approach: find the node whose hash is closest to the request hash
        // We calculate distance and sort by it
        list.sort_by_cached_key(|n| {
            let mut n_hasher = DefaultHasher::new();
            n.id.hash(&mut n_hasher);
            let n_hash = n_hasher.finish();
            let dist = if hash_val > n_hash { hash_val - n_hash } else { n_hash - hash_val };
            dist
        });
        
        list.into_iter().enumerate().map(|(i, n)| NodeCandidate {
            node_id: n.id,
            score: 1.0 - (i as f64 / 100.0),
            confidence: 1.0,
        }).collect()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm Registry
// ─────────────────────────────────────────────────────────────────────────────
pub struct AlgorithmRegistry {
    algorithms: HashMap<String, Arc<dyn RoutingAlgorithm>>,
}

impl AlgorithmRegistry {
    pub fn new() -> Self {
        let mut map: HashMap<String, Arc<dyn RoutingAlgorithm>> = HashMap::new();
        map.insert("RoundRobin".to_string(), Arc::new(RoundRobin::new()));
        map.insert("LeastConnections".to_string(), Arc::new(LeastConnections));
        map.insert("LowestLatency".to_string(), Arc::new(LowestLatency));
        map.insert("MLPredictor".to_string(), Arc::new(MLPredictor));
        map.insert("Hybrid".to_string(), Arc::new(Hybrid));
        map.insert("ConsistentHashing".to_string(), Arc::new(ConsistentHashing));
        
        Self { algorithms: map }
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn RoutingAlgorithm>> {
        self.algorithms.get(name).cloned()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker State Machine
// ─────────────────────────────────────────────────────────────────────────────
const ERROR_THRESHOLD: u32 = 5;
const OPEN_TIMEOUT_SECS: u64 = 10;
const SUCCESS_THRESHOLD: u32 = 3;

/// Evaluates a request outcome and returns `(new_state, is_allowed)`.
pub fn evaluate_circuit(
    state: &CircuitState,
    is_error: bool,
    consecutive_errors: &mut u32,
    open_since: &mut Option<std::time::Instant>,
    success_count: &mut u32,
) -> (CircuitState, bool) {
    let timeout = std::time::Duration::from_secs(OPEN_TIMEOUT_SECS);
    match state {
        CircuitState::Closed => {
            if is_error {
                *consecutive_errors += 1;
                *success_count = 0;
                if *consecutive_errors >= ERROR_THRESHOLD {
                    *open_since = Some(std::time::Instant::now());
                    *consecutive_errors = 0;
                    return (CircuitState::Open, false);
                }
            } else {
                *consecutive_errors = 0;
            }
            (CircuitState::Closed, true)
        }
        CircuitState::Open => {
            if open_since.map_or(false, |t| t.elapsed() >= timeout) {
                *success_count = 0;
                (CircuitState::HalfOpen, true)
            } else {
                (CircuitState::Open, false)
            }
        }
        CircuitState::HalfOpen => {
            if is_error {
                *open_since = Some(std::time::Instant::now());
                *success_count = 0;
                (CircuitState::Open, false)
            } else {
                *success_count += 1;
                if *success_count >= SUCCESS_THRESHOLD {
                    *open_since = None;
                    *consecutive_errors = 0;
                    *success_count = 0;
                    (CircuitState::Closed, true)
                } else {
                    (CircuitState::HalfOpen, true)
                }
            }
        }
    }
}
