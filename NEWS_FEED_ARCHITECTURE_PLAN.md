# News Feed Architecture Plan

**Project:** The Jesus Website
**Component:** News Feed — Crawler, Storage, Display, and Image Handling
**Date:** March 11, 2026
**Author:** Luke Isham
**Purpose:** Design and document the complete newsfeed pipeline. This plan has two deliverables:
1. A working implementation plan for Gemini Flash to execute in batches
2. The final ASCII diagrams and architecture documentation to be written into `frontend/private/news_feed_architecture.html`

---

## How This Plan Works

This plan is divided into **6 Phases**. Each phase ends with a **Checkpoint**. Phase 6 is a **mandatory second-pass review**.

**CRITICAL RULES:**
1. Do NOT guess field names, file paths, or struct names. Refer to the exact values in this plan.
2. Always read the source file before modifying it.
3. The architecture page (`news_feed_architecture.html`) is **read-only documentation** — no forms, no API calls.

---

## Current State (Reference — Do Not Change Unless Instructed)

### Existing Files

| File | Purpose | Key Detail |
|------|---------|------------|
| `app/app_core/src/types/blog_and_news/news.rs` | Core types: `NewsItem`, `RawNewsItem`, `NewsEngine`, `NewsGatekeeper` | `picture_url: Option<Url>` field exists on `NewsItem` |
| `app/app_ui/src/api_news.rs` | API handlers | `POST /api/v1/news_run` (triggers crawl), `GET /api/blog/news` (fetch feed), `GET /api/v1/news_feed_content` (HTML fragment) |
| `app/app_storage/database/schema.sql` | DB schema | `news_items` table has `picture_url TEXT` column |
| `app/app_storage/src/sqlite.rs` | DB methods | `get_news_feed()`, `store_news_item()`, `get_harvested_news()`, `store_harvested_news()` |
| `frontend/js/display_news_feed.js` | Full feed display | Fetches `GET /api/blog/news`, renders to `#news-feed-list` |
| `frontend/js/display_top_four_news_items.js` | 4-snippet display | Fetches `GET /api/blog/news?limit=4`, renders to `#news-feed` |
| `frontend/js/news_feed_hero.js` | Hero display | Fetches `GET /api/v1/news_feed_content`, injects into `#hero-placeholder` |
| `frontend/news_and_blog.html` | Public page | Shows 4 snippet cards |
| `frontend/news_feed.html` | Public page | Full news feed |
| `frontend/js/widgets/wgt_news_crawler.js` | Dashboard widget | Triggers `POST /api/v1/news_run`, auto-polls every 300000ms (5 min — needs updating to monthly) |
| `frontend/private/news_feed_architecture.html` | Architecture docs | Placeholder — will be fully written in Phase 5 |

### Existing DB Schema (Do Not Change Column Names)

```sql
-- news_items (the live feed — capped at 25 items)
CREATE TABLE IF NOT EXISTS news_items (
    id           TEXT PRIMARY KEY,     -- ULID/UUID
    title        TEXT NOT NULL,
    source_url   TEXT NOT NULL,
    snippet      TEXT NOT NULL,        -- AI-generated summary
    contents     TEXT NOT NULL,        -- Full copy of source article
    picture_url  TEXT,                 -- Optional: scraped or Unsplash image URL
    harvested_at TEXT NOT NULL         -- ISO 8601 timestamp
);

-- news_holding_area (unprocessed raw items awaiting AI summary)
CREATE TABLE IF NOT EXISTS news_holding_area (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    url           TEXT NOT NULL,
    raw_content   TEXT NOT NULL,
    raw_image_url TEXT                 -- Optional: raw scraped image URL
);
```

### Existing Rust Struct Fields (Do Not Rename)

```rust
pub struct NewsItem {
    pub id: NewsItemId,
    pub title: String,
    pub source_url: Url,
    pub snippet: String,           // AI-generated summary
    pub contents: String,          // Full source content
    pub picture_url: Option<Url>,  // ← image field already exists
    pub harvested_at: chrono::DateTime<chrono::Utc>,
}

pub struct RawNewsItem {
    pub title: String,
    pub url: String,
    pub raw_content: String,
    pub raw_image_url: Option<String>,  // ← raw image field already exists
}
```

---

## Target State (What This Plan Builds)

After this plan is executed:

1. **Domain config file** (`news_sources.toml`) lives at the project root, containing source domains with RSS feed URLs, crawl schedule interval, and scrape fallback flag
2. **Real crawler** in `NewsEngine` tries RSS first, falls back to HTML scraping
3. **25-article cap** enforced at insertion: after storing new items, delete rows beyond the 25 most recent by `harvested_at`
4. **Image pipeline**: scrape `<og:image>` or `<meta name="twitter:image">` from article pages; if missing, query Unsplash API with article keywords; store URL in `picture_url`
5. **Frontend display** updated to render thumbnails on both full feed and 4-snippet cards (thumbnail + title + snippet + source link + date)
6. **Dashboard widget** auto-poll interval updated from 5 minutes to monthly (2592000000ms)
7. **`news_feed_architecture.html`** fully written with ASCII diagrams and file/function reference tables

---

## Phase 1: Create the Domain Config File

**Goal:** Move the hardcoded domain list out of `news.rs` and into an editable config file.

### Step 1A: Create `news_sources.toml`

1. Create file at the project root: `news_sources.toml`
2. Use this exact structure:

```toml
# News Feed Source Configuration
# The crawler tries each source's RSS feed first.
# If no RSS feed URL is provided, or if the RSS fetch fails, it falls back to scraping the domain URL.
# crawl_interval_days controls how often the agent auto-crawls (30 = monthly).

crawl_interval_days = 30

[[sources]]
name = "Biblical Archaeology Review"
domain = "https://www.biblicalarchaeology.org"
rss_url = "https://www.biblicalarchaeology.org/feed/"
scrape_fallback = true

[[sources]]
name = "Society of Biblical Literature"
domain = "https://www.sbl-site.org"
rss_url = ""
scrape_fallback = true

[[sources]]
name = "The Bible and Interpretation"
domain = "https://bibleinterp.arizona.edu"
rss_url = "https://bibleinterp.arizona.edu/feed"
scrape_fallback = true

[[sources]]
name = "Ancient Near East Today (ASOR)"
domain = "https://www.asor.org/anet"
rss_url = "https://www.asor.org/feed/"
scrape_fallback = true
```

### Step 1B: Create the Rust config reader struct

1. Open `app/app_core/src/types/blog_and_news/news.rs`
2. At the TOP of the file (before the `NewsItem` struct), add:

```rust
/// Represents one entry in news_sources.toml
#[derive(Debug, Deserialize)]
pub struct NewsSource {
    pub name: String,
    pub domain: String,
    pub rss_url: String,           // Empty string means no RSS — fall back to scraping
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
    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }
}
```

3. Add `toml` to `app/app_core/Cargo.toml` dependencies if not already present:
   ```toml
   toml = "0.8"
   ```
4. Add `use serde::Deserialize;` at the top of `news.rs` if not already present

### Checkpoint 1

- [ ] `news_sources.toml` exists at project root with 4 sources and `crawl_interval_days = 30`
- [ ] `NewsSource` and `NewsConfig` structs compile without errors
- [ ] `NewsConfig::load()` can be called in a unit test or main
- [ ] `toml` crate is listed in `app_core/Cargo.toml`

---

## Phase 2: Implement the Real Crawler

**Goal:** Replace `seed_mock_data()` with a real crawler that tries RSS first, scrapes as fallback, and enforces the 25-item cap.

### Step 2A: Add crawl method to `NewsEngine`

1. Open `app/app_core/src/types/blog_and_news/news.rs`
2. Inside the `NewsEngine` impl block, add a new async method:

```rust
/// Crawl all sources in the config. Tries RSS first; falls back to scraping.
/// Returns the list of raw items harvested.
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
```

### Step 2B: Implement `fetch_rss()` helper

1. In the same file, outside the impl block, add:

```rust
/// Fetch and parse an RSS/Atom feed. Returns RawNewsItem list.
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
            let raw_image_url = item
                .enclosure()
                .and_then(|e| if e.mime_type().starts_with("image") { Some(e.url().to_string()) } else { None });
            Some(RawNewsItem { title, url, raw_content, raw_image_url })
        })
        .collect();
    Ok(items)
}
```

2. Add `rss` crate to `app_core/Cargo.toml`:
   ```toml
   rss = "2"
   reqwest = { version = "0.11", features = ["json"] }
   ```

### Step 2C: Implement `scrape_domain()` helper

1. In the same file, add:

```rust
/// Scrape a domain's homepage for article links and og:image tags.
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
```

2. Add `scraper` crate to `app_core/Cargo.toml`:
   ```toml
   scraper = "0.19"
   ```

### Step 2D: Enforce the 25-article cap in `api_news.rs`

1. Open `app/app_ui/src/api_news.rs`
2. In `handle_news_run()`, after storing each new item, add a trim step:

```rust
// After storing all new items, enforce the 25-article cap.
// Delete articles beyond the 25 most recent by harvested_at.
let _ = state.storage.sqlite.trim_news_feed_to_limit(25).await;
```

3. Open `app/app_storage/src/sqlite.rs` and add the new method:

```rust
/// Delete news_items beyond the most recent `limit` rows (ordered by harvested_at DESC).
pub async fn trim_news_feed_to_limit(&self, limit: i64) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM news_items WHERE id NOT IN (
            SELECT id FROM news_items ORDER BY harvested_at DESC LIMIT ?
        )",
        limit
    )
    .execute(&self.pool)
    .await?;
    Ok(())
}
```

### Checkpoint 2

- [ ] `crawl_sources()` method compiles in `NewsEngine`
- [ ] `fetch_rss()` and `scrape_domain()` helpers compile
- [ ] `trim_news_feed_to_limit()` DB method compiles
- [ ] `rss`, `reqwest`, and `scraper` crates listed in `app_core/Cargo.toml`
- [ ] `handle_news_run()` calls `trim_news_feed_to_limit(25)` after storing items
- [ ] Running `cargo check` produces no errors

---

## Phase 3: Image Pipeline

**Goal:** When storing a news item, attempt to find a real image. If none found, query Unsplash. Store the URL in `picture_url`.

### Step 3A: Add `fetch_article_image()` helper to `NewsEngine`

1. In `news.rs`, add:

```rust
/// Attempt to extract an og:image from the article URL.
/// If not found, query Unsplash API with article keywords.
/// Returns an Option<String> image URL.
pub async fn fetch_article_image(article_url: &str, keywords: &str) -> Option<String> {
    // Step 1: Try og:image from the article page
    if let Ok(body) = reqwest::get(article_url).await.and_then(|r| Ok(r.text())) {
        if let Ok(text) = body.await {
            let document = scraper::Html::parse_document(&text);
            let og_selector = scraper::Selector::parse(r#"meta[property="og:image"]"#).unwrap();
            if let Some(og_img) = document.select(&og_selector).next()
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
    json["results"][0]["urls"]["small"].as_str().map(|s| s.to_string())
}
```

2. Add `urlencoding` crate to `app_core/Cargo.toml`:
   ```toml
   urlencoding = "2"
   ```

3. Add `UNSPLASH_ACCESS_KEY` to your `.env` or environment config. The key is obtained from https://unsplash.com/developers (free tier allows 50 requests/hour).

### Step 3B: Wire image fetching into the crawl pipeline

1. In `api_news.rs`, inside `handle_news_run()`, when processing each `RawNewsItem` into a `NewsItem`, add the image fetch step:

```rust
// For each raw item, attempt to get an image before building the NewsItem
let picture_url = NewsEngine::fetch_article_image(&raw.url, &raw.title)
    .await
    .and_then(|url_str| NewsGatekeeper::verify_url(&url_str).ok());
```

Then pass `picture_url` into the `NewsItem` struct field.

### Step 3C: Update frontend to render thumbnails

**In `display_news_feed.js`:**

1. Open `frontend/js/display_news_feed.js`
2. Find the card rendering code (where each news item is turned into HTML)
3. Update to include the thumbnail. The current card likely renders title + snippet + link. Update to:

```javascript
const imgHtml = item.picture_url
    ? `<img src="${item.picture_url}" alt="${item.title}" class="news-card__thumb"
            style="width:100%; height:180px; object-fit:cover; border-radius:4px; margin-bottom:0.75rem;"
            loading="lazy" onerror="this.style.display='none'">`
    : '';

const cardHtml = `
    <div class="news-card">
        ${imgHtml}
        <h3 class="news-card__title">${item.title}</h3>
        <p class="news-card__snippet">${item.snippet}</p>
        <div class="news-card__footer">
            <a href="${item.source_url}" target="_blank" rel="noopener" class="news-card__link">Read source</a>
            <span class="news-card__date">${new Date(item.harvested_at).toLocaleDateString()}</span>
        </div>
    </div>
`;
```

**In `display_top_four_news_items.js`:**

1. Open `frontend/js/display_top_four_news_items.js`
2. Apply the same thumbnail rendering pattern — thumbnail + title + snippet + source link + date
3. The limit query is already `?limit=4` — do not change this

### Checkpoint 3

- [ ] `fetch_article_image()` compiles
- [ ] `fetch_unsplash_image()` compiles
- [ ] `UNSPLASH_ACCESS_KEY` is documented in `.env.example` or equivalent
- [ ] `urlencoding` crate is in `Cargo.toml`
- [ ] Both display JS files render `picture_url` as an `<img>` tag when present
- [ ] `onerror="this.style.display='none'"` is on the `<img>` to handle broken URLs gracefully

---

## Phase 4: Update the Dashboard Widget Auto-Poll Interval

**Goal:** The current auto-poll interval of 300000ms (5 minutes) is too frequent for a real crawl. Update to monthly.

### Step 4A: Update `wgt_news_crawler.js`

1. Open `frontend/js/widgets/wgt_news_crawler.js`
2. Find the auto-polling interval (currently 300000ms)
3. Change to monthly:
   ```javascript
   // Monthly interval: 30 days × 24h × 60m × 60s × 1000ms
   const CRAWL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
   ```
4. Replace the hardcoded `300000` with `CRAWL_INTERVAL_MS` wherever it appears

**NOTE:** The manual trigger button on the dashboard widget still works for on-demand runs — do not remove it.

### Checkpoint 4

- [ ] `CRAWL_INTERVAL_MS` is defined as `30 * 24 * 60 * 60 * 1000`
- [ ] No hardcoded `300000` remains in `wgt_news_crawler.js`
- [ ] Manual trigger still functions

---

## Phase 5: Write the Architecture Documentation Page

**Goal:** Fully populate `frontend/private/news_feed_architecture.html` with ASCII diagrams and file/function reference tables following GLOSSARY_PLAN.md format.

### Step 5A: Replace the entire content of `news_feed_architecture.html`

Replace the current placeholder content with the complete architecture page below. Use the template structure from `architecture_template.html` (self-contained `<style>` block, Back to Dashboard link, `glossary-diagram`/`glossary-section`/`glossary-table` classes).

---

### COMPLETE PAGE CONTENT FOR `news_feed_architecture.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsfeed Architecture — The Jesus Website</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        body { font-family: var(--font-sans, 'Inter', sans-serif); background: var(--bg-primary, #fafaf9); color: var(--text-primary, #333); padding: 2rem; max-width: 960px; margin: 0 auto; }
        h1 { color: var(--accent-color, #5b7065); border-bottom: 2px solid var(--accent-color, #5b7065); padding-bottom: 0.5rem; }
        h2 { color: var(--accent-color, #5b7065); margin-top: 2rem; }
        .glossary-diagram { background: #1e1e1e; color: #d4d4d4; padding: 1.5rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; line-height: 1.4; margin: 1rem 0; }
        .glossary-section { margin: 1rem 0; border: 1px solid var(--border-color, #ddd); border-radius: 4px; }
        .glossary-section summary { padding: 0.75rem 1rem; cursor: pointer; font-weight: 600; background: var(--bg-secondary, #f5f5f0); }
        .glossary-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 0.5rem 0; }
        .glossary-table th { text-align: left; background: var(--bg-secondary, #f5f5f0); padding: 0.5rem; border-bottom: 2px solid var(--border-color, #ddd); }
        .glossary-table td { padding: 0.5rem; border-bottom: 1px solid var(--border-color, #eee); vertical-align: top; }
        .glossary-table code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 0.8rem; }
        .glossary-note { color: #666; font-style: italic; font-size: 0.9rem; }
        .glossary-heading { color: var(--accent-color, #5b7065); margin-top: 1.5rem; }
        .back-link { display: inline-block; margin-bottom: 1.5rem; color: var(--accent-color, #5b7065); text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <a href="/private/dashboard.html" class="back-link">&larr; Back to Dashboard</a>
    <h1>Newsfeed Architecture</h1>
    <p class="glossary-note">System architecture reference for the news crawler, storage pipeline, image handling, and public display. Read-only — no forms or API calls.</p>

    <h2>Data Flow</h2>

    <h4 class="glossary-heading">Diagram 1 — Monthly Crawl Pipeline</h4>
    <pre class="glossary-diagram">
  TRIGGER (monthly schedule or manual dashboard button)
  wgt_news_crawler.js  ──POST /api/v1/news_run──►  api_news.rs :: handle_news_run()
                                                           │
                                                           ▼
                                              NewsConfig::load("news_sources.toml")
                                              Reads: crawl_interval_days, [[sources]]
                                                           │
                                              ┌────────────┴─────────────┐
                                              │  For each source domain  │
                                              └────────────┬─────────────┘
                                                           │
                                          ┌────────────────▼──────────────────┐
                                          │  Has rss_url?                     │
                                          │                                   │
                                  YES ────┤ fetch_rss(rss_url)                │
                                          │ → parse RSS/Atom feed             │
                                          │ → up to 10 RawNewsItems           │
                                          │                                   │
                                  NO  ────┤ scrape_fallback == true?          │
                                  (or     │                                   │
                                  RSS     ├─YES──► scrape_domain(domain)      │
                                  fails)  │        → parse og:image, title,   │
                                          │          description from HTML    │
                                          │                                   │
                                          └───────────────────────────────────┘
                                                           │
                                                           ▼
                                              Vec&lt;RawNewsItem&gt; harvested
                                              stored in: news_holding_area table
                                                           │
                                                           ▼
                                          ┌────────────────────────────────────┐
                                          │  For each RawNewsItem              │
                                          │                                    │
                                          │  1. fetch_article_image(url, title)│
                                          │     ┌────────────────────────────┐ │
                                          │     │ Try: og:image meta tag     │ │
                                          │     │ on article page            │ │
                                          │     │         │                  │ │
                                          │     │    Found? ──YES──► use it  │ │
                                          │     │         │                  │ │
                                          │     │         NO                 │ │
                                          │     │         ▼                  │ │
                                          │     │ Unsplash API search        │ │
                                          │     │ (UNSPLASH_ACCESS_KEY env)  │ │
                                          │     │ query = article title      │ │
                                          │     │ keywords                   │ │
                                          │     └────────────────────────────┘ │
                                          │                                    │
                                          │  2. AI summarises raw_content      │
                                          │     → short snippet string         │
                                          │                                    │
                                          │  3. Build NewsItem struct          │
                                          │     { id, title, source_url,       │
                                          │       snippet, contents,           │
                                          │       picture_url, harvested_at }  │
                                          │                                    │
                                          │  4. sqlite::store_news_item()      │
                                          └────────────────────────────────────┘
                                                           │
                                                           ▼
                                          sqlite::trim_news_feed_to_limit(25)
                                          DELETE rows beyond 25 most recent
                                          (ordered by harvested_at DESC)
                                          ── Feed is always capped at 25 items

  ─────────────────────────────────────────────────────────────────────────────
  📁 Domain search pool lives in:  news_sources.toml  (project root)
     Contains: source names, domain URLs, RSS feed URLs, scrape_fallback flag
     Edit this file to add or remove crawl sources — no code change required.
  ─────────────────────────────────────────────────────────────────────────────
    </pre>

    <h4 class="glossary-heading">Diagram 2 — Public Display Pipeline</h4>
    <pre class="glossary-diagram">
  SQLite :: news_items table (max 25 rows, ordered by harvested_at DESC)
                          │
          ┌───────────────┴────────────────────────────────────┐
          │                                                    │
          ▼                                                    ▼
  GET /api/blog/news                             GET /api/v1/news_feed_content
  (optional ?limit=N query param)                (returns pre-rendered HTML fragment)
          │                                                    │
  ┌───────┴──────────────────────┐                            │
  │                              │                            ▼
  ▼                              ▼                    news_feed_hero.js
  display_news_feed.js    display_top_four_news_items.js      │
  (news_feed.html)        (news_and_blog.html)                │
  Full list, all 25       Top 4 only (?limit=4)               ▼
  items                   Each card shows:           #hero-placeholder
                          ┌──────────────────────┐   (news_feed.html)
                          │ [thumbnail image]    │
                          │ Article Title        │
                          │ AI snippet text      │
                          │ Read source →  date  │
                          └──────────────────────┘

  IMAGE RENDERING RULE:
    if picture_url present ──► render &lt;img src=picture_url&gt;
    if picture_url absent  ──► render no image (onerror hides broken tags)
    &lt;img loading="lazy" onerror="this.style.display='none'"&gt;
    </pre>

    <h2>File &amp; Function Reference</h2>

    <details class="glossary-section">
        <summary>Config — Domain Sources</summary>
        <table class="glossary-table">
            <thead><tr><th>File</th><th>Key</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>news_sources.toml</code> (project root)</td><td><code>[[sources]]</code></td><td>Array of source domains. Each entry has <code>name</code>, <code>domain</code>, <code>rss_url</code>, <code>scrape_fallback</code></td></tr>
                <tr><td><code>news_sources.toml</code></td><td><code>crawl_interval_days</code></td><td>How often the agent auto-crawls. Default: 30 (monthly)</td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Backend — Core Types (app/app_core/src/types/blog_and_news/news.rs)</summary>
        <table class="glossary-table">
            <thead><tr><th>Struct / Fn</th><th>Key Fields / Signature</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>NewsItem</code></td><td><code>id, title, source_url, snippet, contents, picture_url: Option&lt;Url&gt;, harvested_at</code></td><td>A processed, AI-summarised news article ready for display</td></tr>
                <tr><td><code>RawNewsItem</code></td><td><code>title, url, raw_content, raw_image_url: Option&lt;String&gt;</code></td><td>Unprocessed article scraped from source; held in <code>news_holding_area</code> table pending AI summary</td></tr>
                <tr><td><code>NewsSource</code></td><td><code>name, domain, rss_url, scrape_fallback</code></td><td>One entry from <code>news_sources.toml</code>. Loaded at crawl time</td></tr>
                <tr><td><code>NewsConfig</code></td><td><code>crawl_interval_days, sources: Vec&lt;NewsSource&gt;</code></td><td>Top-level config struct. Load with <code>NewsConfig::load(path)</code></td></tr>
                <tr><td><code>NewsEngine::crawl_sources()</code></td><td><code>(&amp;self, config: &amp;NewsConfig) -&gt; Vec&lt;RawNewsItem&gt;</code></td><td>Iterates sources; tries RSS, falls back to scraping</td></tr>
                <tr><td><code>fetch_rss()</code></td><td><code>(feed_url: &amp;str) -&gt; Result&lt;Vec&lt;RawNewsItem&gt;&gt;</code></td><td>Fetches and parses RSS/Atom feed. Returns up to 10 items per source</td></tr>
                <tr><td><code>scrape_domain()</code></td><td><code>(domain_url: &amp;str) -&gt; Result&lt;Vec&lt;RawNewsItem&gt;&gt;</code></td><td>Fetches domain HTML, extracts og:image, title, meta description</td></tr>
                <tr><td><code>fetch_article_image()</code></td><td><code>(article_url: &amp;str, keywords: &amp;str) -&gt; Option&lt;String&gt;</code></td><td>Tries og:image on article page; falls back to Unsplash API search</td></tr>
                <tr><td><code>fetch_unsplash_image()</code></td><td><code>(keywords: &amp;str) -&gt; Option&lt;String&gt;</code></td><td>Queries Unsplash /search/photos with article keywords. Requires <code>UNSPLASH_ACCESS_KEY</code> env var</td></tr>
                <tr><td><code>NewsGatekeeper::verify_url()</code></td><td><code>(input: &amp;str) -&gt; Result&lt;Url&gt;</code></td><td>Validates URL is HTTPS. Used to validate image URLs before storing</td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Backend — API Handlers (app/app_ui/src/api_news.rs)</summary>
        <table class="glossary-table">
            <thead><tr><th>Handler</th><th>Route</th><th>Method</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>handle_news_run()</code></td><td><code>/api/v1/news_run</code></td><td>POST</td><td>Triggers the crawl pipeline. Crawls all sources, stores items, trims to 25</td></tr>
                <tr><td><code>handle_get_news()</code></td><td><code>/api/blog/news</code></td><td>GET</td><td>Returns news items as JSON. Accepts optional <code>?limit=N</code> query param</td></tr>
                <tr><td><code>handle_news_feed_content()</code></td><td><code>/api/v1/news_feed_content</code></td><td>GET</td><td>Returns pre-rendered HTML fragment for the news feed hero section</td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Backend — Storage (app/app_storage/src/sqlite.rs)</summary>
        <table class="glossary-table">
            <thead><tr><th>Method</th><th>Table</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>get_news_feed()</code></td><td><code>news_items</code></td><td>SELECT all items ORDER BY harvested_at DESC. Returns <code>Vec&lt;NewsItem&gt;</code></td></tr>
                <tr><td><code>store_news_item()</code></td><td><code>news_items</code></td><td>INSERT one processed article (7 fields including optional picture_url)</td></tr>
                <tr><td><code>trim_news_feed_to_limit(limit)</code></td><td><code>news_items</code></td><td>DELETE rows not in the most recent N items. Enforces 25-item cap</td></tr>
                <tr><td><code>get_harvested_news()</code></td><td><code>news_holding_area</code></td><td>SELECT all raw unprocessed items</td></tr>
                <tr><td><code>store_harvested_news()</code></td><td><code>news_holding_area</code></td><td>INSERT raw article awaiting AI summary</td></tr>
                <tr><td><code>delete_harvested_news_by_url()</code></td><td><code>news_holding_area</code></td><td>DELETE processed item from holding area by URL</td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Frontend — JavaScript</summary>
        <table class="glossary-table">
            <thead><tr><th>File</th><th>Fetches</th><th>Renders to</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>frontend/js/display_news_feed.js</code></td><td><code>GET /api/blog/news</code></td><td><code>#news-feed-list</code></td><td>Renders full list of up to 25 items on news_feed.html. Each card: thumbnail + title + snippet + source link + date</td></tr>
                <tr><td><code>frontend/js/display_top_four_news_items.js</code></td><td><code>GET /api/blog/news?limit=4</code></td><td><code>#news-feed</code></td><td>Renders 4 snippet cards on news_and_blog.html. Same card format as full feed</td></tr>
                <tr><td><code>frontend/js/news_feed_hero.js</code></td><td><code>GET /api/v1/news_feed_content</code></td><td><code>#hero-placeholder</code></td><td>Injects pre-rendered HTML fragment into the hero area of news_feed.html</td></tr>
                <tr><td><code>frontend/js/widgets/wgt_news_crawler.js</code></td><td><code>POST /api/v1/news_run</code></td><td>Dashboard widget status</td><td>Triggers crawl manually or on schedule. Auto-poll interval: 30 days (CRAWL_INTERVAL_MS)</td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Frontend — Public Pages</summary>
        <table class="glossary-table">
            <thead><tr><th>Page</th><th>Purpose</th><th>News Section</th></tr></thead>
            <tbody>
                <tr><td><code>frontend/news_and_blog.html</code></td><td>Combined news &amp; blog public page</td><td>Shows 4 snippet cards via <code>display_top_four_news_items.js</code></td></tr>
                <tr><td><code>frontend/news_feed.html</code></td><td>Dedicated full news feed page</td><td>Full 25-item feed via <code>display_news_feed.js</code> and hero via <code>news_feed_hero.js</code></td></tr>
            </tbody>
        </table>
    </details>

    <details class="glossary-section">
        <summary>Environment Variables</summary>
        <table class="glossary-table">
            <thead><tr><th>Variable</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td><code>UNSPLASH_ACCESS_KEY</code></td><td>For image fallback</td><td>API key from https://unsplash.com/developers. Free tier: 50 req/hour. Used when article has no og:image. Set in .env file.</td></tr>
            </tbody>
        </table>
    </details>

</body>
</html>
```

### Checkpoint 5

- [ ] `news_feed_architecture.html` has been fully replaced with the above content
- [ ] Both ASCII diagrams render correctly (dark background, monospace font)
- [ ] The domain pool note at the base of Diagram 1 is present and points to `news_sources.toml`
- [ ] All 6 collapsible sections open and display correct tables
- [ ] "Back to Dashboard" link works
- [ ] Page renders correctly in browser without the Mermaid library

---

## Phase 6: Second-Pass Verification (MANDATORY)

### 6A: Verify domain config

```bash
cat news_sources.toml
```
- [ ] File exists at project root
- [ ] Contains `crawl_interval_days = 30`
- [ ] Contains 4 `[[sources]]` entries with `name`, `domain`, `rss_url`, `scrape_fallback`

### 6B: Verify Cargo dependencies

```bash
grep -A5 "\[dependencies\]" app/app_core/Cargo.toml
```
- [ ] `rss = "2"` present
- [ ] `reqwest` with json feature present
- [ ] `scraper = "0.19"` present
- [ ] `toml = "0.8"` present
- [ ] `urlencoding = "2"` present

### 6C: Verify Rust compiles

```bash
cd app && cargo check
```
- [ ] Zero errors
- [ ] Warnings only (acceptable)

### 6D: Verify DB method exists

```bash
grep -n "trim_news_feed_to_limit" app/app_storage/src/sqlite.rs
```
- [ ] Returns at least one match

### 6E: Verify widget interval

```bash
grep -n "CRAWL_INTERVAL_MS\|30 \* 24" frontend/js/widgets/wgt_news_crawler.js
```
- [ ] `CRAWL_INTERVAL_MS` is defined
- [ ] No `300000` remains

### 6F: Verify frontend thumbnail rendering

```bash
grep -n "picture_url\|onerror" frontend/js/display_news_feed.js
grep -n "picture_url\|onerror" frontend/js/display_top_four_news_items.js
```
- [ ] Both files reference `picture_url`
- [ ] Both files have `onerror="this.style.display='none'"`

### 6G: Verify architecture page

- [ ] `news_feed_architecture.html` contains `📁 Domain search pool lives in:  news_sources.toml`
- [ ] No Mermaid `<script>` tags
- [ ] Both `<pre class="glossary-diagram">` blocks present
- [ ] 6 `<details class="glossary-section">` blocks present

### 6H: Verify no orphaned mock data calls

```bash
grep -n "seed_mock_data" app/app_ui/src/api_news.rs
```
- [ ] `seed_mock_data()` is no longer called from `handle_news_run()` — replaced by `crawl_sources()`

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `news_sources.toml` | CREATE | Domain config with 4 sources, RSS URLs, scrape_fallback, crawl_interval_days |
| `app/app_core/src/types/blog_and_news/news.rs` | MODIFY | Add `NewsSource`, `NewsConfig` structs; add `crawl_sources()`, `fetch_rss()`, `scrape_domain()`, `fetch_article_image()`, `fetch_unsplash_image()` |
| `app/app_core/Cargo.toml` | MODIFY | Add `rss`, `scraper`, `toml`, `urlencoding` dependencies |
| `app/app_ui/src/api_news.rs` | MODIFY | Replace `seed_mock_data()` with `crawl_sources()`; add `trim_news_feed_to_limit(25)` call |
| `app/app_storage/src/sqlite.rs` | MODIFY | Add `trim_news_feed_to_limit()` method |
| `frontend/js/display_news_feed.js` | MODIFY | Add thumbnail rendering (picture_url → img tag with onerror guard) |
| `frontend/js/display_top_four_news_items.js` | MODIFY | Same thumbnail rendering as above |
| `frontend/js/widgets/wgt_news_crawler.js` | MODIFY | Update auto-poll interval from 300000ms to monthly (CRAWL_INTERVAL_MS) |
| `frontend/private/news_feed_architecture.html` | MODIFY | Replace placeholder with full ASCII diagrams and file/function reference tables |

---

## Notes for Implementation Agent

- **Work sequentially:** Complete and checkpoint each phase before starting the next.
- **Do NOT rename existing struct fields** (`picture_url`, `raw_image_url`, `snippet`, `contents`, etc.) — the DB schema is locked.
- **`seed_mock_data()` should be kept** but NOT called from `handle_news_run()`. It is still useful for local development and testing.
- **Unsplash fallback is optional at runtime** — if `UNSPLASH_ACCESS_KEY` is not set, `fetch_unsplash_image()` returns `None` and the article is stored without an image. This is not an error.
- **The architecture page (Phase 5) has NO backend dependencies** — it can be written at any point, but do it after Phase 4 so the diagrams accurately reflect what was built.

---

**End of Plan**
