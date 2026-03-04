use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START WidgetStatus
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WidgetStatus {
    Idle,
    Active,
    Warning,
    Error,
}

impl Default for WidgetStatus {
    fn default() -> Self {
        WidgetStatus::Idle
    }
}
// END
