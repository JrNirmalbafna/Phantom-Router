use crate::predictor::features::FeatureVector;
use crate::utils::clamp;

/// Per-feature statistics used for z-score normalisation.
/// These would be computed from training data in production;
/// here we use domain-knowledge priors.
struct FeatureStats {
    mean: f64,
    std: f64,
}

impl FeatureStats {
    fn z(&self, v: f64) -> f32 {
        clamp((v - self.mean) / self.std.max(1e-8), -3.0, 3.0) as f32
    }
}

/// Normalises a FeatureVector into a `[f32; 15]` tensor.
/// This is the exact input format the ONNX model expects: `[Batch=1, Dims=15]`.
///
/// Uses z-score normalisation: z = (x - μ) / σ, clamped to [-3, +3].
pub fn normalize(dna: &FeatureVector) -> [f32; 15] {
    // (mean, std) priors derived from domain knowledge of typical server metrics
    let stats: [FeatureStats; 15] = [
        FeatureStats { mean: 5.0,    std: 10.0   }, // current_latency_ms
        FeatureStats { mean: 5.0,    std: 10.0   }, // latency_rolling_avg_10s
        FeatureStats { mean: 1.0,    std: 3.0    }, // latency_rolling_stddev_10s
        FeatureStats { mean: 10.0,   std: 20.0   }, // latency_percentile_p99
        FeatureStats { mean: 1000.0, std: 2000.0 }, // requests_per_second
        FeatureStats { mean: 100.0,  std: 200.0  }, // active_connections
        FeatureStats { mean: 50.0,   std: 100.0  }, // queue_depth
        FeatureStats { mean: 0.01,   std: 0.05   }, // error_rate_5xx
        FeatureStats { mean: 0.005,  std: 0.02   }, // timeout_rate
        FeatureStats { mean: 0.0,    std: 5.0    }, // connection_refused_count
        FeatureStats { mean: 0.0,    std: 0.05   }, // latency_delta_last_5s
        FeatureStats { mean: 0.0,    std: 500.0  }, // load_delta_last_5s
        FeatureStats { mean: 0.0,    std: 0.02   }, // error_rate_delta_last_5s
        FeatureStats { mean: 3600.0, std: 7200.0 }, // time_since_last_restart
        FeatureStats { mean: 12.0,   std: 7.0    }, // hour_of_day
    ];

    let raw = dna.as_array();
    let mut out = [0.0f32; 15];
    for (i, (val, stat)) in raw.iter().zip(stats.iter()).enumerate() {
        out[i] = stat.z(*val);
    }
    out
}
