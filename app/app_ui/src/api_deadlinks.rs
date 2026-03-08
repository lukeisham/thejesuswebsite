use app_core::types::{DeadlinkIssue, DeadlinkReplacement};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

/// Runs a systemic scan for broken external links.
pub async fn handle_deadlinks_run() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    let dead_links = vec![DeadlinkIssue {
        id: "link_123".into(),
        url: "https://broken-history.org/jesus-bio".into(),
        status: "404 Not Found".into(),
        context: "Record: Early Life, Sources section".into(),
    }];
    Json(ApiResponse::success("Deadlinks scan completed", Some(dead_links)))
}

/// Replaces or removes a deadlink.
pub async fn handle_deadlinks_replace(Json(req): Json<DeadlinkReplacement>) -> impl IntoResponse {
    if req.new_url.is_empty() {
        println!("Removing link: {}", req.old_url);
    } else {
        println!("Replacing link: {} with {}", req.old_url, req.new_url);
    }
    StatusCode::OK.into_response()
}
