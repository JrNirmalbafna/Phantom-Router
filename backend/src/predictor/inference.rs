use crate::predictor::features::FeatureVector;
use crate::utils::{clamp, norm, sigmoid};

/// Runs the AI health scorer against a FeatureVector.
///
/// Returns `(health: f64, failure_prob: f64)` where:
/// - `health` is in [0, 100] — 100 = perfectly healthy
/// - `failure_prob` is in [0, 1] — probability the node will fail
///
/// This is the ONNX-ready placeholder from the architecture design.
/// To upgrade to a real model, replace this function body with:
///   `ort::Session::run(session, preprocess(dna))`
pub fn score_node(dna: &FeatureVector) -> (f64, f64) {
    // ── Latency signals ──────────────────────────────────────────────────────
    let latency   = norm(dna.current_latency_ms,          50.0)  * 0.25;
    let p99       = norm(dna.latency_percentile_p99,      100.0) * 0.15;
    let avg_lat   = norm(dna.latency_rolling_avg_10s,     50.0)  * 0.10;
    let stddev    = norm(dna.latency_rolling_stddev_10s,  20.0)  * 0.05;

    // ── Load signals ─────────────────────────────────────────────────────────
    let load      = norm(dna.requests_per_second,         10_000.0) * 0.04;
    let queue     = norm(dna.queue_depth,                 500.0)    * 0.05;
    let conns     = norm(dna.active_connections,          1_000.0)  * 0.02;

    // ── Error signals ────────────────────────────────────────────────────────
    let errors    = norm(dna.error_rate_5xx,              0.10) * 0.20;
    let timeouts  = norm(dna.timeout_rate,                0.05) * 0.08;
    let refused   = norm(dna.connection_refused_count,    100.0) * 0.04;

    // ── Trend signals (leading indicators — only penalise when worsening) ────
    let lat_trend  = clamp(dna.latency_delta_last_5s  /  0.05, -1.0, 1.0).max(0.0) * 0.03;
    let load_trend = clamp(dna.load_delta_last_5s     / 2_000.0, -1.0, 1.0).max(0.0) * 0.02;
    let err_trend  = clamp(dna.error_rate_delta_last_5s / 0.05, -1.0, 1.0).max(0.0) * 0.01;

    let penalty = latency + p99 + avg_lat + stddev
                + load + queue + conns
                + errors + timeouts + refused
                + lat_trend + load_trend + err_trend;

    // ── Health score ─────────────────────────────────────────────────────────
    let health = clamp(100.0 - penalty * 100.0, 0.0, 100.0);

    // ── Failure probability via tuned sigmoid ────────────────────────────────
    // penalty=0.0 → prob≈0.03 (baseline noise)
    // penalty=0.5 → prob≈0.73 (degraded node)
    // penalty=1.0 → prob≈0.998 (near-certain failure)
    let failure_prob = sigmoid(penalty * 8.0 - 3.5);

    (health, failure_prob)
}
