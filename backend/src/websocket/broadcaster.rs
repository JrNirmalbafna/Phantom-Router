use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Message;

/// Per-client WS task — receives from the broadcast channel and forwards to the client.
pub async fn handle_client(
    stream: TcpStream,
    mut rx: broadcast::Receiver<String>,
    peer: String,
) {
    let ws = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { tracing::warn!("WS handshake failed {}: {}", peer, e); return; }
    };

    let (mut sink, mut source) = ws.split();

    loop {
        tokio::select! {
            result = rx.recv() => {
                match result {
                    Ok(json) => {
                        if sink.send(Message::Text(json.into())).await.is_err() {
                            tracing::info!("📡 WS disconnected: {}", peer);
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        tracing::warn!("WS {} lagged {} frames", peer, n);
                    }
                    Err(_) => break,
                }
            }
            msg = source.next() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => {
                        tracing::info!("📡 WS closed: {}", peer);
                        break;
                    }
                    Some(Ok(Message::Ping(d))) => { let _ = sink.send(Message::Pong(d)).await; }
                    _ => {}
                }
            }
        }
    }
}
