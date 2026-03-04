use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START SlidePayload
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlidePayload {
    pub title: String,
    pub content_blocks: Vec<String>,
    pub generated_at: DateTime<Utc>,
}

impl SlidePayload {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(title: String, content: Vec<String>) -> Self {
        Self {
            title,
            content_blocks: content,
            generated_at: Utc::now(),
        }
    }
}
// END
