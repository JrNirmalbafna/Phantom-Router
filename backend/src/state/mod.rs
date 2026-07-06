pub mod node;
pub mod cluster;
pub mod prediction;
pub mod metrics_state;
pub mod decision_history;
pub mod config_state;
pub mod pool;
pub mod memory;

pub use node::{NodeState, CircuitState};
pub use cluster::ClusterState;
pub use prediction::PredictionState;
pub use metrics_state::MetricsState;
pub use decision_history::DecisionHistory;
pub use config_state::ConfigState;
pub use pool::ConnectionPool;

use dashmap::DashMap;
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use std::time::Instant;
use tokio::sync::broadcast;

/// Global shared application state — `Arc<AppState>` is passed to every worker.
/// v4 Architecture uses domain-specific state traits.
pub struct AppState {
    pub cluster: Arc<dyn ClusterState>,
    pub prediction: Arc<dyn PredictionState>,
    pub metrics: Arc<dyn MetricsState>,
    pub history: Arc<dyn DecisionHistory>,
    pub config: Arc<dyn ConfigState>,
    pub pool: Arc<dyn ConnectionPool>,

    /// Broadcast channel — simulator sends payloads here, WS broadcaster fans out.
    pub ws_tx: broadcast::Sender<String>,

    /// Engine start time for uptime_seconds metric.
    pub start_time: Instant,
    
    /// Reusable connection pool for the reverse proxy
    pub http_client: hyper_util::client::legacy::Client<
        hyper_util::client::legacy::connect::HttpConnector, 
        hyper::body::Incoming
    >,
}

impl AppState {
    pub fn new(node_ids: Vec<String>) -> Arc<Self> {
        let nodes = DashMap::new();
        for id in &node_ids {
            nodes.insert(id.clone(), NodeState::new(id));
        }
        
        let cluster = Arc::new(memory::MemoryClusterState { nodes, node_ids: node_ids.clone() });
        let prediction = Arc::new(memory::MemoryPredictionState { probs: DashMap::new() });
        let metrics = Arc::new(memory::MemoryMetricsState);
        let history = Arc::new(memory::MemoryDecisionHistory { decisions: Mutex::new(VecDeque::new()) });
        let config = Arc::new(memory::MemoryConfigState::new());
        let pool = Arc::new(memory::MemoryConnectionPool);
        
        let (ws_tx, _) = broadcast::channel(64);

        // Initialize hyper client for connection pooling
        let http_client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
            .build(hyper_util::client::legacy::connect::HttpConnector::new());

        Arc::new(Self {
            cluster,
            prediction,
            metrics,
            history,
            config,
            pool,
            ws_tx,
            start_time: Instant::now(),
            http_client,
        })
    }
}

