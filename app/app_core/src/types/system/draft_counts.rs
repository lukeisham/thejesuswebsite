use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START DraftCounts
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DraftCounts {
    pub records: u32,
    pub essays: u32,
    pub responses: u32,
}

impl DraftCounts {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(records: u32, essays: u32, responses: u32) -> Self {
        Self {
            records,
            essays,
            responses,
        }
    }
}
// END
