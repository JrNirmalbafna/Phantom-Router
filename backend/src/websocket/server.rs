use crate::state::AppState;
use futures_util::StreamExt;
use std::sync::Arc;
use tokio::net::TcpListener;


/// WS server — TCP listener on :9001 that spawns a broadcaster per client.
pub async fn run_ws_server(state: Arc<AppState>) {
    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(addr).await.expect("WS bind failed on :9001");
    tracing::info!("🌐 WebSocket telemetry on ws://{}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, peer)) => {
                tracing::info!("📡 WS connected: {}", peer);
                let rx = state.ws_tx.subscribe();
                tokio::spawn(crate::websocket::broadcaster::handle_client(stream, rx, peer.to_string()));
            }
            Err(e) => tracing::error!("WS accept: {}", e),
        }
    }
}
