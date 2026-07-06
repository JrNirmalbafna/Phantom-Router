use serde::Serialize;
use std::collections::HashMap;
use std::time::Instant;
use crate::predictor::features::{FeatureVector, default_sensor_dna};

/// Circuit breaker states — serialized as strings matching the TypeScript contract.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum CircuitState {
    #[serde(rename = "CLOSED")]
    Closed,
    #[serde(rename = "OPEN")]
    Open,
    #[serde(rename = "HALF-OPEN")]
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitState::Closed   => write!(f, "CLOSED"),
            CircuitState::Open     => write!(f, "OPEN"),
            CircuitState::HalfOpen => write!(f, "HALF-OPEN"),
        }
    }
}

/// Complete runtime state for a single backend node.
#[derive(Debug, Clone, Serialize)]
pub struct NodeState {
    pub id: String,
    pub port: u16,
    pub health: f64,
    pub rps: f64,
    pub active_conns: u64,
    pub circuit_state: CircuitState,
    pub failure_prob: f64,
    pub dna: FeatureVector,
    pub sensor_dna: HashMap<String, f64>,

    // Internal bookkeeping — excluded from WS serialisation
    #[serde(skip)]
    pub consecutive_errors: u32,
    #[serde(skip)]
    pub consecutive_successes: u32,
    #[serde(skip)]
    pub circuit_open_since: Option<Instant>,
    #[serde(skip)]
    pub latency_history: Vec<f64>,
    #[serde(skip)]
    pub ewma_latency: f64,
    #[serde(skip)]
    pub weight: f64,
    #[serde(skip)]
    pub stress_ticks: u32,
}

impl NodeState {
    pub fn new(id: &str) -> Self {
        let port = match id {
            "node_a" => 5001,
            "node_b" => 5002,
            "node_c" => 5003,
            _ => 5000,
        };
        Self {
            id: id.to_string(),
            port,
            health: 95.0,
            rps: 0.0,
            active_conns: 0,
            circuit_state: CircuitState::Closed,
            failure_prob: 0.02,
            dna: FeatureVector::default(),
            sensor_dna: default_sensor_dna(),
            consecutive_errors: 0,
            consecutive_successes: 0,
            circuit_open_since: None,
            latency_history: vec![1.5; 20],
            ewma_latency: 1.5,
            weight: 1.0,
            stress_ticks: 0,
        }
    }

    /// Produces the JSON shape the frontend WebSocket expects.
    pub fn to_ws_payload(&self) -> serde_json::Value {
        serde_json::json!({
            "id": self.id,
            "health": self.health,
            "rps": self.rps,
            "active_conns": self.active_conns,
            "circuit_state": self.circuit_state.to_string(),
            "failure_prob": self.failure_prob,
            "dna": self.dna,
            "sensor_dna": self.sensor_dna,
        })
    }
}
