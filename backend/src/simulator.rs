use phantom_router::predictor::inference::score_node;
use phantom_router::router::algorithms::evaluate_circuit;
use phantom_router::state::{AppState, CircuitState, ClusterState, DecisionHistory};
use phantom_router::utils::percentile_p99;
use chrono::Timelike;
use rand::Rng;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

const TICK_MS: u64 = 500;
const STRESS_MEAN_TICKS: f64 = 60.0; // ~30 seconds between events
const STRESS_DURATION: u32 = 12;     // 6 seconds of stress

pub async fn run_loop(state: Arc<AppState>) {
    let mut interval = time::interval(Duration::from_millis(TICK_MS));
    let mut tick: u64 = 0;

    loop {
        interval.tick().await;
        tick += 1;
        let mut rng = rand::thread_rng();
        let node_ids = state.cluster.get_node_ids();

        // ── Maybe fire a stress event ─────────────────────────────────────
        if rng.gen_bool(1.0 / STRESS_MEAN_TICKS) && !node_ids.is_empty() {
            let idx = rng.gen_range(0..node_ids.len());
            let id = &node_ids[idx];
            if let Some(mut node) = state.cluster.get_node(id) {
                if node.stress_ticks == 0 {
                    node.stress_ticks = STRESS_DURATION;
                    let msg = format!("⚡ STRESS_EVENT → {} (latency spike + error surge)", id);
                    tracing::warn!("{}", msg);
                    state.cluster.update_node_state(id, node);
                    state.history.push_decision(msg);
                }
            }
        }

        // ── Tick each node ────────────────────────────────────────────────
        for node_id in node_ids {
            tick_node(&state, &node_id, &mut rng, tick);
        }

        // ── Adaptive throttle: rebalance weights ──────────────────────────
        rebalance_weights(&state);

        // ── Broadcast telemetry ───────────────────────────────────────────
        broadcast(&state);
    }
}

fn tick_node(state: &AppState, node_id: &str, rng: &mut impl Rng, tick: u64) {
    let stressed = state.cluster.get_node(node_id)
        .map_or(false, |n| n.stress_ticks > 0);

    if let Some(mut node) = state.cluster.get_node(node_id) {
        if node.stress_ticks > 0 { node.stress_ticks -= 1; }

        let factor = if stressed { 3.5_f64 } else { 1.0 };
        let hour = chrono::Local::now().hour() as f64;

        // Latency
        let lat_noise: f64 = rng.gen_range(-0.3..0.3);
        let spike: f64 = if stressed { rng.gen_range(5.0..25.0) } else { 0.0 };
        node.dna.current_latency_ms = (node.dna.current_latency_ms + lat_noise + spike).clamp(0.3, 150.0);

        node.latency_history.push(node.dna.current_latency_ms);
        if node.latency_history.len() > 20 { node.latency_history.remove(0); }
        let hist = &node.latency_history;
        let avg = hist.iter().sum::<f64>() / hist.len() as f64;
        
        // EWMA Latency calculation
        let alpha = 0.2;
        node.ewma_latency = (alpha * node.dna.current_latency_ms) + ((1.0 - alpha) * node.ewma_latency);
        
        // Expose EWMA via the DNA for ML and routing algorithms
        node.dna.latency_rolling_avg_10s = node.ewma_latency;
        node.dna.latency_rolling_stddev_10s = (hist.iter().map(|v| (v - avg).powi(2)).sum::<f64>() / hist.len() as f64).sqrt();
        node.dna.latency_percentile_p99 = percentile_p99(hist);

        let old_lat = if hist.len() >= 10 { hist[hist.len() - 10] } else { hist[0] };
        node.dna.latency_delta_last_5s = (node.dna.current_latency_ms - old_lat) / 1000.0;

        // RPS
        let rps_target = 800.0 + (tick as f64 * 0.1).sin() * 200.0;
        let old_rps = node.dna.requests_per_second;
        node.dna.requests_per_second = (node.dna.requests_per_second * 0.8
            + rps_target * 0.2 + rng.gen_range(-50.0..50.0_f64) * factor).clamp(10.0, 15_000.0);
        node.rps = node.dna.requests_per_second;
        node.dna.load_delta_last_5s = node.dna.requests_per_second - old_rps;

        // Connections & Queue
        let conn_target = node.dna.requests_per_second / 20.0;
        node.dna.active_connections = (node.dna.active_connections * 0.7
            + conn_target * 0.3 + rng.gen_range(-2.0..2.0)).clamp(0.0, 2000.0);
        node.active_conns = node.dna.active_connections as u64;
        node.dna.queue_depth = (node.dna.queue_depth + rng.gen_range(-5.0..5.0_f64)
            + if stressed { 30.0 } else { 0.0 }).clamp(0.0, 1000.0);

        // Errors
        let base_err = if stressed { rng.gen_range(0.05..0.25) } else { rng.gen_range(0.0..0.008) };
        let old_err = node.dna.error_rate_5xx;
        node.dna.error_rate_5xx = (node.dna.error_rate_5xx * 0.6 + base_err * 0.4).clamp(0.0, 1.0);
        node.dna.error_rate_delta_last_5s = node.dna.error_rate_5xx - old_err;
        node.dna.timeout_rate = (node.dna.timeout_rate * 0.7
            + if stressed { rng.gen_range(0.01..0.08) } else { rng.gen_range(0.0..0.003) } * 0.3).clamp(0.0, 0.5);
        node.dna.connection_refused_count = if stressed && rng.gen_bool(0.3) { rng.gen_range(1.0..10.0) } else { 0.0 };

        // Time
        node.dna.time_since_last_restart += TICK_MS as f64 / 1000.0;
        node.dna.hour_of_day = hour;

        // Sensor DNA
        evolve_sensors(&mut node, stressed, rng);

        // Score
        let prev_health = node.health;
        let (health, failure_prob) = score_node(&node.dna);
        node.health = health;
        node.failure_prob = failure_prob;

        // Circuit breaker
        let is_error = node.dna.error_rate_5xx > 0.05
            || node.dna.timeout_rate > 0.03
            || node.dna.connection_refused_count > 0.0;

        let (new_circuit, _) = evaluate_circuit(
            &node.circuit_state,
            is_error,
            &mut node.consecutive_errors,
            &mut node.circuit_open_since,
            &mut node.consecutive_successes,
        );

        let circuit_changed = new_circuit != node.circuit_state;
        let old_circuit = node.circuit_state.clone();
        node.circuit_state = new_circuit.clone();

        let health_drop = prev_health - node.health;
        
        let new_health = node.health;
        // Save the updated node back to the cluster
        state.cluster.update_node_state(node_id, node);

        if circuit_changed {
            state.history.push_decision(format!("🔌 CIRCUIT {} → {} on {}", old_circuit, new_circuit, node_id));
        }
        if health_drop > 15.0 {
            state.history.push_decision(format!("⚠️  HEALTH_DROP {}: {:.1} → {:.1}", node_id, prev_health, prev_health - health_drop));
        } else if prev_health < 75.0 {
            if new_health > 90.0 {
                state.history.push_decision(format!("✅ RECOVERED {}: health={:.1}", node_id, new_health));
            }
        }
    }
}

fn evolve_sensors(node: &mut phantom_router::state::NodeState, stressed: bool, rng: &mut impl Rng) {
    let s = &mut node.sensor_dna;
    let cpu_stress = if stressed { rng.gen_range(20.0..50.0_f64) } else { 0.0 };
    *s.entry("CPU_util_pct".into()).or_insert(25.0) =
        (s["CPU_util_pct"] + rng.gen_range(-2.0..2.0_f64) + cpu_stress).clamp(1.0_f64, 99.0_f64);
    *s.entry("MEM_used_gb".into()).or_insert(4.0) =
        (s["MEM_used_gb"] + rng.gen_range(-0.05..0.1_f64)).clamp(1.0_f64, 15.0_f64);
    *s.entry("MEM_available_gb".into()).or_insert(12.0) = (16.0 - s["MEM_used_gb"]).clamp(0.0_f64, 15.0_f64);
    *s.entry("NET_rx_mbps".into()).or_insert(100.0) =
        (node.dna.requests_per_second * 0.12 + rng.gen_range(-5.0..5.0_f64)).clamp(0.0_f64, 1000.0_f64);
    *s.entry("NET_tx_mbps".into()).or_insert(80.0) =
        (node.dna.requests_per_second * 0.09 + rng.gen_range(-5.0..5.0_f64)).clamp(0.0_f64, 1000.0_f64);
    *s.entry("DISK_util_pct".into()).or_insert(18.0) =
        (s["DISK_util_pct"] + rng.gen_range(-1.0..1.5_f64) + if stressed { 10.0 } else { 0.0 }).clamp(0.0_f64, 100.0_f64);
    *s.entry("LB_weight".into()).or_insert(1.0) = node.weight;
    *s.entry("LB_queue_saturation_pct".into()).or_insert(10.0) = (node.dna.queue_depth / 10.0).clamp(0.0_f64, 100.0_f64);
    *s.entry("LB_backpressure_active".into()).or_insert(0.0) = if node.dna.queue_depth > 800.0 { 1.0 } else { 0.0 };
    *s.entry("PROC_uptime_s".into()).or_insert(0.0) = node.dna.time_since_last_restart;
}

fn rebalance_weights(state: &AppState) {
    let all_nodes = state.cluster.get_all_nodes();
    let total: f64 = all_nodes.iter()
        .map(|n| if n.circuit_state == CircuitState::Open { 0.0 } else { n.health.max(1.0) })
        .sum();

    for mut node in all_nodes {
        let new_weight = if node.circuit_state == CircuitState::Open { 0.0 }
            else { node.health.max(1.0) / total.max(f64::EPSILON) };

        if (new_weight - node.weight).abs() > 0.05 {
            let msg = format!("⚖️  WEIGHT {}: {:.3}→{:.3}", node.id, node.weight, new_weight);
            node.weight = new_weight;
            node.sensor_dna.insert("LB_weight".into(), new_weight);
            state.cluster.update_node_state(&node.id.clone(), node);
            state.history.push_decision(msg);
        } else {
            node.weight = new_weight;
            state.cluster.update_node_state(&node.id.clone(), node);
        }
    }
}

fn broadcast(state: &AppState) {
    let all_nodes = state.cluster.get_all_nodes();
    let nodes: Vec<serde_json::Value> = all_nodes.iter()
        .map(|n: &phantom_router::state::NodeState| n.to_ws_payload())
        .collect();

    let global_rps: f64 = all_nodes.iter().map(|n: &phantom_router::state::NodeState| n.rps).sum();

    // Latency histogram — 6 buckets [0-1, 1-2, 2-5, 5-10, 10-50, 50+]ms
    let mut buckets = [0.0f64; 6];
    let mut total = 0.0f64;
    for node in all_nodes {
        for &lat in &node.latency_history {
            total += 1.0;
            let b = if lat < 1.0 { 0 } else if lat < 2.0 { 1 } else if lat < 5.0 { 2 }
                    else if lat < 10.0 { 3 } else if lat < 50.0 { 4 } else { 5 };
            buckets[b] += 1.0;
        }
    }
    if total > 0.0 { for b in &mut buckets { *b = (*b / total) * 100.0; } }

    // Decision Engine Simulated Telemetry
    let mut rng = rand::thread_rng();
    let stress = all_nodes.iter().any(|n| n.stress_ticks > 0);
    
    // Simulate dynamic decision outcomes
    let total_reqs = global_rps as u64;
    let dropped = if stress { rng.gen_range(50..300) } else { rng.gen_range(0..5) };
    let fallback = if stress { rng.gen_range(100..500) } else { rng.gen_range(5..20) };
    let hedged = if stress { rng.gen_range(500..2000) } else { rng.gen_range(50..200) };
    let clean = total_reqs.saturating_sub(dropped + fallback + hedged);

    let decision_telemetry = serde_json::json!({
        "active_strategy": "Hybrid ML",
        "hedging_rate": (hedged as f64 / total_reqs.max(1) as f64) * 100.0,
        "confidence_avg": if stress { rng.gen_range(75.0..88.0) } else { rng.gen_range(92.0..98.0) },
        "requests_optimized": 15842 + (chrono::Utc::now().timestamp() % 1000) * 12,
        "strategy_distribution": {
            "Hybrid": rng.gen_range(60..70),
            "LowestLatency": rng.gen_range(20..30),
            "RoundRobin": rng.gen_range(5..10)
        },
        "outcomes": {
            "clean": clean,
            "hedged": hedged,
            "fallback": fallback,
            "dropped": dropped
        }
    });

    let payload = serde_json::json!({
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "nodes": nodes,
        "decisions": state.history.get_recent_decisions(),
        "global_rps": global_rps,
        "latency_histogram": buckets,
        "decision_telemetry": decision_telemetry,
    });

    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = state.ws_tx.send(json);
    }
}
