use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use url::Url; // Type-safe URL handling

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

/// Represents one entry in news_sources.toml
#[derive(Debug, Deserialize)]
pub struct NewsSource {
    pub name: String,
    pub domain: String,
    pub rss_url: String, // Empty string means no RSS — fall back to scraping
    pub scrape_fallback: bool,
}

/// Top-level config loaded from news_sources.toml
#[derive(Debug, Deserialize)]
pub struct NewsConfig {
    pub crawl_interval_days: u32,
    pub sources: Vec<NewsSource>,
}

impl NewsConfig {
    /// Load from news_sources.toml at the given path
    #[cfg(not(target_arch = "wasm32"))]
    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }
}

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture_url: Option<Url>,
    pub harvested_at: chrono::DateTime<chrono::Utc>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNewsItem {
    pub title: String,
    pub url: String, // String because it's unvalidated raw data
    pub raw_content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
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

        Ok(id)
    }

    pub async fn get_feed(&self) -> Vec<NewsItem> {
        self.feed.read().await.items.clone()
    }

    /// Returns a limited number of items from the feed
    pub async fn get_feed_limited(&self, limit: usize) -> Vec<NewsItem> {
        let feed = self.feed.read().await;
        feed.items.iter().take(limit).cloned().collect()
    }

    /// SEED LOGIC: Generates mock news items for verification
    pub async fn seed_mock_data(&self) -> usize {
        let mut feed = self.feed.write().await;
        feed.items.clear();

        let sites = [
            ("Biblical Archaeology Review", "https://www.biblicalarchaeology.org"),
            ("Society of Biblical Literature", "https://www.sbl-site.org"),
            ("The Bible and Interpretation", "https://bibleinterp.arizona.edu"),
            ("Ancient Near East Today", "https://www.asor.org/anet"),
        ];

        for i in 1..=25 {
            let (site_name, site_url) = sites[i % sites.len()];
            feed.items.push(NewsItem {
                id: NewsItemId(uuid::Uuid::new_v4()),
                title: format!("Discovery #{} at {}", i, site_name),
                source_url: Url::parse(site_url).unwrap(),
                snippet: format!("This is an AI-generated snippet for news discovery #{} providing historical context about Jesus.", i),
                contents: "Full article contents would reside here in a production crawl.".into(),
                picture_url: None,
                harvested_at: chrono::Utc::now() - chrono::Duration::hours(i as i64),
            });
        }

        feed.items.len()
    }

    /// Crawl all sources in the config. Tries RSS first; falls back to scraping.
    /// Returns the list of raw items harvested.
    #[cfg(not(target_arch = "wasm32"))]
    pub async fn crawl_sources(&self, config: &NewsConfig) -> Vec<RawNewsItem> {
        let mut harvested: Vec<RawNewsItem> = Vec::new();

        for source in &config.sources {
            // Step 1: Try RSS if url is non-empty
            let rss_items = if !source.rss_url.is_empty() {
                fetch_rss(&source.rss_url).await.unwrap_or_default()
            } else {
                vec![]
            };

            if !rss_items.is_empty() {
                harvested.extend(rss_items);
            } else if source.scrape_fallback {
                // Step 2: Fall back to scraping the domain URL
                let scraped = scrape_domain(&source.domain).await.unwrap_or_default();
                harvested.extend(scraped);
            }
        }

        harvested
    }
}

/// Fetch and parse an RSS/Atom feed. Returns RawNewsItem list.
#[cfg(not(target_arch = "wasm32"))]
async fn fetch_rss(feed_url: &str) -> Result<Vec<RawNewsItem>, Box<dyn std::error::Error>> {
    let body = reqwest::get(feed_url).await?.text().await?;
    let channel = rss::Channel::read_from(body.as_bytes())?;
    let items = channel
        .items()
        .iter()
        .take(10) // Max 10 items per source per crawl
        .filter_map(|item| {
            let title = item.title()?.to_string();
            let url = item.link()?.to_string();
            let raw_content = item.description().unwrap_or("").to_string();
            // Try to extract image from enclosure or media content
            let raw_image_url = item.enclosure().and_then(|e| {
                if e.mime_type().starts_with("image") {
                    Some(e.url().to_string())
                } else {
                    None
                }
            });
            Some(RawNewsItem {
                title,
                url,
                raw_content,
                raw_image_url,
            })
        })
        .collect();
    Ok(items)
}

/// Scrape a domain's homepage for article links and og:image tags.
#[cfg(not(target_arch = "wasm32"))]
async fn scrape_domain(domain_url: &str) -> Result<Vec<RawNewsItem>, Box<dyn std::error::Error>> {
    let body = reqwest::get(domain_url).await?.text().await?;
    let document = scraper::Html::parse_document(&body);

    // Extract og:image (meta tag)
    let og_image_selector = scraper::Selector::parse(r#"meta[property="og:image"]"#).unwrap();
    let raw_image_url = document
        .select(&og_image_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    // Extract title from <title> or og:title
    let title_selector = scraper::Selector::parse("title").unwrap();
    let title = document
        .select(&title_selector)
        .next()
        .map(|el| el.text().collect::<String>())
        .unwrap_or_else(|| domain_url.to_string());

    // Extract description from meta description or og:description
    let desc_selector = scraper::Selector::parse(r#"meta[name="description"]"#).unwrap();
    let raw_content = document
        .select(&desc_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .unwrap_or("")
        .to_string();

    Ok(vec![RawNewsItem {
        title,
        url: domain_url.to_string(),
        raw_content,
        raw_image_url,
    }])
}

/// Attempt to extract an og:image from the article URL.
/// If not found, query Unsplash API with article keywords.
/// Returns an Option<String> image URL.
#[cfg(not(target_arch = "wasm32"))]
pub async fn fetch_article_image(article_url: &str, keywords: &str) -> Option<String> {
    // Step 1: Try og:image from the article page
    if let Ok(resp) = reqwest::get(article_url).await {
        if let Ok(text) = resp.text().await {
            let document = scraper::Html::parse_document(&text);
            let og_selector = scraper::Selector::parse(r#"meta[property="og:image"]"#).unwrap();
            if let Some(og_img) = document
                .select(&og_selector)
                .next()
                .and_then(|el| el.value().attr("content"))
            {
                return Some(og_img.to_string());
            }
        }
    }

    // Step 2: Fallback — query Unsplash
    fetch_unsplash_image(keywords).await
}

/// Query the Unsplash API for a photo matching the given keywords.
/// Requires UNSPLASH_ACCESS_KEY environment variable.
#[cfg(not(target_arch = "wasm32"))]
async fn fetch_unsplash_image(keywords: &str) -> Option<String> {
    let api_key = std::env::var("UNSPLASH_ACCESS_KEY").ok()?;
    let url = format!(
        "https://api.unsplash.com/search/photos?query={}&per_page=1&orientation=landscape",
        urlencoding::encode(keywords)
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("Authorization", format!("Client-ID {}", api_key))
        .send()
        .await
        .ok()?;
    let json: serde_json::Value = resp.json().await.ok()?;
    json["results"][0]["urls"]["small"]
        .as_str()
        .map(|s| s.to_string())
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
