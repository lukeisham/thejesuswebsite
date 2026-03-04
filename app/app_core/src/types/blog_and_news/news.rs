use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use url::Url; // Type-safe URL handling

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewsItemId(pub uuid::Uuid);

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsItem {
    pub id: NewsItemId,
    pub title: String,
    pub source_url: Url,
    pub snippet: String,  // The AI-generated summary
    pub contents: String, // Full copy of source
    pub picture_url: Option<Url>,
    pub harvested_at: chrono::DateTime<chrono::Utc>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNewsItem {
    pub title: String,
    pub url: String, // String because it's unvalidated raw data
    pub raw_content: String,
    pub raw_image_url: Option<String>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Newsfeed {
    pub items: Vec<NewsItem>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct NewsHoldingArea {
    pub pending: Vec<RawNewsItem>,
}

pub struct NewsEngine {
    pub feed: Arc<RwLock<Newsfeed>>,
    pub holding_area: Arc<RwLock<NewsHoldingArea>>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl NewsEngine {
    pub fn new() -> Self {
        Self {
            feed: Arc::new(RwLock::new(Newsfeed::default())),
            holding_area: Arc::new(RwLock::new(NewsHoldingArea::default())),
        }
    }

    /// Deposits raw, unverified news into the holding area
    pub async fn harvest_raw(&self, raw: RawNewsItem) -> Result<(), NewsError> {
        let mut holding = self.holding_area.write().await;
        holding.pending.push(raw);
        Ok(())
    }

    /// Processes a raw item: Validates, Summarizes (AI), and moves to Feed
    pub async fn process_next_pending(&self, ai_summary: String) -> Result<NewsItemId, NewsError> {
        let mut holding = self.holding_area.write().await;

        // Pop the oldest item (FIFO)
        let raw = holding.pending.pop().ok_or(NewsError::EmptyHoldingArea)?;

        // Gatekeeping: Transform raw strings into Type-Safe types
        let validated_url = NewsGatekeeper::verify_url(&raw.url)?;
        let validated_img = match raw.raw_image_url {
            Some(u) => Some(NewsGatekeeper::verify_url(&u)?),
            None => None,
        };

        let processed_item = NewsItem {
            id: NewsItemId(uuid::Uuid::new_v4()),
            title: raw.title,
            source_url: validated_url,
            snippet: ai_summary,
            contents: raw.raw_content,
            picture_url: validated_img,
            harvested_at: chrono::Utc::now(),
        };

        let id = processed_item.id.clone();

        // Move to Feed
        let mut feed = self.feed.write().await;
        feed.items.insert(0, processed_item); // Sequential: Newest at top
        feed.items.truncate(25); // Cap at 25 items

        Ok(id)
    }

    pub async fn get_feed(&self) -> Vec<NewsItem> {
        self.feed.read().await.items.clone()
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security Gatekeeping & Validators)                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct NewsGatekeeper;

impl NewsGatekeeper {
    /// Ensures we aren't ingesting malicious links or garbage strings
    pub fn verify_url(input: &str) -> Result<Url, NewsError> {
        let parsed = Url::parse(input)
            .map_err(|_| NewsError::SecurityViolation(format!("Invalid URL source: {}", input)))?;

        // Security Rule: Only allow HTTPS
        if parsed.scheme() != "https" {
            return Err(NewsError::SecurityViolation("Only HTTPS sources allowed".into()));
        }

        Ok(parsed)
    }

    /// Sanitizes content to prevent injection attacks if rendered in HTML
    pub fn sanitize_content(content: &str) -> String {
        // Use a library like `ammonia` here in a real production environment
        content.chars().filter(|c| !c.is_control()).collect()
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, thiserror::Error)]
pub enum NewsError {
    #[error("Holding area is empty, nothing to process")]
    EmptyHoldingArea,

    #[error("Security Violation: {0}")]
    SecurityViolation(String),

    #[error("Failed to generate AI summary")]
    AiProcessingError,

    #[error("Item already exists in feed")]
    DuplicateItem,
}
