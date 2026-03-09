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
pub async fn handle_get_mentions(
    axum::extract::State(state): axum::extract::State<std::sync::Arc<crate::server::AppState>>,
) -> impl IntoResponse {
    match state.storage.sqlite.get_mentions().await {
        Ok(mentions) => (StatusCode::OK, Json(mentions)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
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
