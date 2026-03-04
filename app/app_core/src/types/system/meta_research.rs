use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START MetaResearch
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaResearch {
    pub id: Ulid,
    pub suggested_action: String,
    pub priority: u8, // 1 is highest priority
    pub context_uuid: Option<Ulid>,
    pub generated_at: DateTime<Utc>,
    pub is_resolved: bool,
}

impl MetaResearch {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(action: String, priority: u8, context: Option<Ulid>) -> Self {
        Self {
            id: Ulid::new(),
            suggested_action: action,
            priority,
            context_uuid: context,
            generated_at: Utc::now(),
            is_resolved: false,
        }
    }
}
// END
