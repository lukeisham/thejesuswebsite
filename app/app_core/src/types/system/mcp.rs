use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START McpConfig
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    pub name: String,
    pub version: String,
    pub capabilities: Vec<String>,
}

impl McpConfig {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(name: String, version: String, capabilities: Vec<String>) -> Self {
        Self {
            name,
            version,
            capabilities,
        }
    }
}
// END
