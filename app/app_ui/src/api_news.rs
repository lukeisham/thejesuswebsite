use crate::server::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct NewsQuery {
    pub limit: Option<usize>,
}

/// GET /api/blog/news
/// Returns the list of news items, optionally limited.
pub async fn handle_get_news(
    State(state): State<Arc<AppState>>,
    Query(query): Query<NewsQuery>,
) -> impl IntoResponse {
    match state.storage.sqlite.get_news_feed().await {
        Ok(items) => {
            let limit = query.limit.unwrap_or(items.len());
            let limited_items: Vec<_> = items.into_iter().take(limit).collect();
            (StatusCode::OK, Json(limited_items)).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

/// POST /api/v1/news_run
/// Triggers the news crawler/pipeline and persists to DB.
pub async fn handle_news_run(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    // 1. Load config
    let config = match app_core::types::NewsConfig::load("news_sources.toml") {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load news_sources.toml: {}", e),
            )
                .into_response();
        }
    };

    // 2. Crawl sources
    let raw_items = state.news_engine.crawl_sources(&config).await;
    let total_harvested = raw_items.len();

    // 3. Process and Persist
    let mut success_count = 0;
    for raw in raw_items {
        // Step 3A: Build NewsItem (Real image fetching from Phase 3)
        let picture_url = app_core::types::fetch_article_image(&raw.url, &raw.title)
            .await
            .and_then(|url_str| app_core::types::NewsGatekeeper::verify_url(&url_str).ok());

        let item = app_core::types::NewsItem {
            id: app_core::types::NewsItemId(uuid::Uuid::new_v4()),
            title: raw.title,
            source_url: match url::Url::parse(&raw.url) {
                Ok(u) => u,
                Err(_) => continue,
            },
            snippet: "AI-generated summary pending...".to_string(),
            contents: raw.raw_content,
            picture_url,
            harvested_at: chrono::Utc::now(),
        };

        if state.storage.sqlite.store_news_item(&item).await.is_ok() {
            success_count += 1;
        }
    }

    // 4. Enforce the 25-article cap
    let _ = state.storage.sqlite.trim_news_feed_to_limit(25).await;

    (
        StatusCode::OK,
        format!(
            "News crawler run complete. Harvested {} items. Persisted {} to DB. Feed trimmed to 25.",
            total_harvested, success_count
        ),
    )
    .into_response()
}

/// GET /api/v1/news_feed_content
/// Returns the HTML fragment for the news feed hero section.
pub async fn handle_news_feed_content(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let items = state.news_engine.get_feed().await;

    if items.is_empty() {
        return (
            StatusCode::OK,
            [("content-type", "text/html")],
            "<div>No news items seeded yet.</div>",
        )
            .into_response();
    }

    let mut html = String::from("<div class='news-feed-grid' style='display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;'>");

    for item in items {
        html.push_str(&format!(
            r#"<article class="feed-container" style="border: 1px solid var(--border-color); padding: 1rem;">
                <h4>{}</h4>
                <p style="font-size: 0.85rem; color: #666;">{}</p>
                <div style="font-size: 0.75rem; margin-top: 0.5rem;">
                    <a href="{}" target="_blank">Read Source →</a>
                    <span style="float: right;">{}</span>
                </div>
            </article>"#,
            item.title,
            item.snippet,
            item.source_url,
            item.harvested_at.format("%Y-%m-%d")
        ));
    }

    html.push_str("</div>");

    (StatusCode::OK, [("content-type", "text/html")], html).into_response()
}
