use crate::state::AppState;

use metrics_exporter_prometheus::PrometheusBuilder;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

pub async fn run_prometheus(state: Arc<AppState>) {
    PrometheusBuilder::new()
        .with_http_listener(([0, 0, 0, 0], 2112))
        .install()
        .expect("Prometheus install failed");
    tracing::info!("📊 Prometheus metrics: http://0.0.0.0:2112/metrics");

    let mut interval = time::interval(Duration::from_millis(500));
    loop {
        interval.tick().await;
        crate::metrics::collector::collect(&state);
    }
}
