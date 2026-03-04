use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START PdfPayload
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfPayload {
    pub document_title: String,
    pub body_text: String,
    pub source_url: String,
    pub generated_at: DateTime<Utc>,
}

impl PdfPayload {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(title: String, body: String, url: String) -> Self {
        Self {
            document_title: title,
            body_text: body,
            source_url: url,
            generated_at: Utc::now(),
        }
    }
}
// END
