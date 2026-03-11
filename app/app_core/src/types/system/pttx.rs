use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// START SlidePayload
/// Represents a single slide in a presentation.
/// The `heading` maps to an <h3> (or <h4>/<h5> for essays/posts).
/// `content_blocks` are stripped plain-text or ASCII strings from the HTML beneath that heading.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlidePayload {
    pub heading: String,
    pub content_blocks: Vec<String>,
}

impl SlidePayload {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(heading: String, content_blocks: Vec<String>) -> Self {
        Self {
            heading,
            content_blocks,
        }
    }
}
// END SlidePayload

// START SlideDeckPayload
/// Represents the full POST body sent from the browser when "Export to Slide" is clicked.
/// `deck_title` comes from the highest-ranked heading found on the page (e.g. <h2>).
/// `slides` is an ordered list of SlidePayload objects, one per sub-section.
/// `generated_at` is set client-side at the moment the export is triggered.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlideDeckPayload {
    pub deck_title: String,
    pub slides: Vec<SlidePayload>,
    pub generated_at: DateTime<Utc>,
}

impl SlideDeckPayload {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn new(deck_title: String, slides: Vec<SlidePayload>) -> Self {
        Self {
            deck_title,
            slides,
            generated_at: Utc::now(),
        }
    }
}
// END SlideDeckPayload
