use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub nodes: Vec<NodeConfig>,
    pub settings: Settings,
}

#[derive(Debug, Deserialize, Clone)]
pub struct NodeConfig {
    pub id: String,
    pub weight: f64,
    pub region: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub ws_port: u16,
    pub proxy_port: u16,
    pub metrics_port: u16,
    pub broadcast_interval_ms: u64,
    pub circuit_breaker_threshold: u32,
    pub circuit_breaker_timeout_s: u64,
}

/// Load and parse nodes.yaml. Panics with a clear message on failure.
pub fn load(path: &str) -> Config {
    let contents = fs::read_to_string(path)
        .unwrap_or_else(|_| panic!("Cannot read config: '{}'. Run from backend/", path));
    serde_yaml::from_str(&contents)
        .unwrap_or_else(|e| panic!("Invalid YAML in '{}': {}", path, e))
}
