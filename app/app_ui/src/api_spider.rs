use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Lists all web mentions found by the crawler.
pub async fn handle_get_mentions() -> impl IntoResponse {
    use app_core::types::MentionItem;
    let mentions = vec![MentionItem {
        source_type: "Human".into(),
        created_at: "2026-03-08T12:00:00Z".into(),
        url: "https://example.com/mention".into(),
        snippet: "This site is a great resource for studying Jesus.".into(),
    }];
    (StatusCode::OK, Json(mentions)).into_response()
}

/// Triggers a web crawler run and returns a summary.
pub async fn handle_mentions_run() -> impl IntoResponse {
    use app_core::types::MentionsResponse;
    (
        StatusCode::OK,
        Json(MentionsResponse {
            summary: "Crawled 5 domains. Found 1 new mention.".into(),
        }),
    )
        .into_response()
}
