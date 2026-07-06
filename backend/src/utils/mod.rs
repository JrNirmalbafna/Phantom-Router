/// Shared math helpers used across modules.

/// Returns the P99 value from a slice using linear interpolation.
pub fn percentile_p99(data: &[f64]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }
    let mut sorted = data.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let idx = ((sorted.len() as f64) * 0.99) as usize;
    sorted[idx.min(sorted.len() - 1)]
}

/// Standard sigmoid activation function.
#[inline]
pub fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

/// Clamps a value between lo and hi.
#[inline]
pub fn clamp(v: f64, lo: f64, hi: f64) -> f64 {
    v.max(lo).min(hi)
}

/// Normalises a value to [0, 1] given an observed maximum.
#[inline]
pub fn norm(v: f64, max: f64) -> f64 {
    clamp(v / max.max(f64::EPSILON), 0.0, 1.0)
}
