use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START ServerMetrics
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerMetrics {
    pub timestamp: DateTime<Utc>,
    pub cpu_usage_percent: f32,
    pub memory_used_mb: u32,
    pub memory_total_mb: u32,
    pub disk_usage_percent: f32,
}

impl ServerMetrics {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(cpu: f32, memory_used: u32, memory_total: u32, disk: f32) -> Self {
        Self {
            timestamp: Utc::now(),
            cpu_usage_percent: cpu,
            memory_used_mb: memory_used,
            memory_total_mb: memory_total,
            disk_usage_percent: disk,
        }
    }
}
// END
