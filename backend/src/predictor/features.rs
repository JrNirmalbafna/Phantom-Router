use serde::{Deserialize, Serialize};
use chrono::Timelike;
use std::collections::HashMap;

/// The 15-dimensional feature vector fed to the AI predictor.
/// Field names MUST match the TypeScript `FeatureVector` in usePhantomSocket.ts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureVector {
    pub current_latency_ms: f64,
    pub latency_rolling_avg_10s: f64,
    pub latency_rolling_stddev_10s: f64,
    pub latency_percentile_p99: f64,
    pub requests_per_second: f64,
    pub active_connections: f64,
    pub queue_depth: f64,
    pub error_rate_5xx: f64,
    pub timeout_rate: f64,
    pub connection_refused_count: f64,
    pub latency_delta_last_5s: f64,
    pub load_delta_last_5s: f64,
    pub error_rate_delta_last_5s: f64,
    pub time_since_last_restart: f64,
    pub hour_of_day: f64,
}

impl FeatureVector {
    /// Extracts a raw `[f64; 15]` array in a stable canonical order for the ONNX model.
    pub fn as_array(&self) -> [f64; 15] {
        [
            self.current_latency_ms,
            self.latency_rolling_avg_10s,
            self.latency_rolling_stddev_10s,
            self.latency_percentile_p99,
            self.requests_per_second,
            self.active_connections,
            self.queue_depth,
            self.error_rate_5xx,
            self.timeout_rate,
            self.connection_refused_count,
            self.latency_delta_last_5s,
            self.load_delta_last_5s,
            self.error_rate_delta_last_5s,
            self.time_since_last_restart,
            self.hour_of_day,
        ]
    }
}

impl Default for FeatureVector {
    fn default() -> Self {
        let hour = chrono::Local::now().hour() as f64;
        Self {
            current_latency_ms: 1.5,
            latency_rolling_avg_10s: 1.5,
            latency_rolling_stddev_10s: 0.2,
            latency_percentile_p99: 3.0,
            requests_per_second: 1000.0,
            active_connections: 50.0,
            queue_depth: 10.0,
            error_rate_5xx: 0.001,
            timeout_rate: 0.001,
            connection_refused_count: 0.0,
            latency_delta_last_5s: 0.0,
            load_delta_last_5s: 0.0,
            error_rate_delta_last_5s: 0.0,
            time_since_last_restart: 3600.0,
            hour_of_day: hour,
        }
    }
}

/// Initialises the 32+ hardware/infrastructure sensor metrics map.
/// Keys match the TypeScript `sensor_dna: Record<string, number>` in NodeStats.
pub fn default_sensor_dna() -> HashMap<String, f64> {
    let mut m = HashMap::new();
    // CPU
    m.insert("CPU_util_pct".into(), 25.0);
    m.insert("CPU_steal_pct".into(), 0.5);
    m.insert("CPU_iowait_pct".into(), 1.2);
    m.insert("CPU_core_count".into(), 8.0);
    m.insert("CPU_freq_mhz".into(), 3200.0);
    // Memory
    m.insert("MEM_used_gb".into(), 4.2);
    m.insert("MEM_available_gb".into(), 11.8);
    m.insert("MEM_swap_used_mb".into(), 0.0);
    m.insert("MEM_page_faults_s".into(), 12.0);
    m.insert("MEM_cache_hit_rate".into(), 0.94);
    // Network
    m.insert("NET_rx_mbps".into(), 120.0);
    m.insert("NET_tx_mbps".into(), 95.0);
    m.insert("NET_tcp_retransmit_pct".into(), 0.02);
    m.insert("NET_connections_established".into(), 512.0);
    m.insert("NET_connections_time_wait".into(), 48.0);
    m.insert("NET_packet_loss_pct".into(), 0.001);
    m.insert("NET_dns_latency_ms".into(), 0.8);
    // Disk
    m.insert("DISK_read_iops".into(), 800.0);
    m.insert("DISK_write_iops".into(), 400.0);
    m.insert("DISK_util_pct".into(), 18.0);
    m.insert("DISK_queue_depth".into(), 2.0);
    m.insert("DISK_latency_ms".into(), 0.4);
    m.insert("DISK_free_gb".into(), 120.0);
    // Process / Runtime
    m.insert("PROC_fd_count".into(), 1024.0);
    m.insert("PROC_thread_count".into(), 64.0);
    m.insert("PROC_gc_pause_ms".into(), 0.0);
    m.insert("PROC_uptime_s".into(), 3600.0);
    // Load Balancer internals
    m.insert("LB_weight".into(), 1.0);
    m.insert("LB_queue_saturation_pct".into(), 10.0);
    m.insert("LB_requests_shed_total".into(), 0.0);
    m.insert("LB_backpressure_active".into(), 0.0);
    m.insert("LB_coalesced_requests".into(), 0.0);
    m
}
