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
    let items = if let Some(limit) = query.limit {
        state.news_engine.get_feed_limited(limit).await
    } else {
        state.news_engine.get_feed().await
    };

    (StatusCode::OK, Json(items))
}

/// POST /api/v1/news_run
/// Triggers the mock news crawler/seeder.
pub async fn handle_news_run(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let count = state.news_engine.seed_mock_data().await;
    (StatusCode::OK, format!("News crawler run complete. Seeded {} items.", count))
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
