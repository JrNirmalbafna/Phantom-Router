// PHANTOM Router — Tokio entry point
// Imports via lib.rs re-exports
use phantom_router::config;
use phantom_router::state::AppState;
use phantom_router::{metrics, router, websocket};

mod simulator;

use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .compact()
        .init();

    tracing::info!("╔═══════════════════════════════════════╗");
    tracing::info!("║   PHANTOM ROUTER  ·  Intelligent Engine  ║");
    tracing::info!("║   v0.1  ·  1M RPS Target                 ║");
    tracing::info!("╚═══════════════════════════════════════╝");

    let cfg      = config::load("nodes.yaml");
    let node_ids = cfg.nodes.iter().map(|n| n.id.clone()).collect();

    tracing::info!("📋 {} nodes loaded: {:?}", cfg.nodes.len(), node_ids);

    let state = AppState::new(node_ids);

    tokio::join!(
        tokio::spawn({ let s = state.clone(); async move { simulator::run_loop(s).await } }),
        tokio::spawn({ let s = state.clone(); async move { websocket::server::run_ws_server(s).await } }),
        tokio::spawn({ let s = state.clone(); async move { metrics::exporter::run_prometheus(s).await } }),
        tokio::spawn({ let s = state.clone(); async move { router::engine::run_proxy(s).await } }),
        tokio::spawn({ let s = state.clone(); async move { phantom_router::api::run_admin_api(s).await } }),
    );
}
