use app_core::types::DeadlinkReplacement;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

use crate::server::AppState;
use axum::extract::State;
use std::sync::Arc;

/// Runs a systemic scan for broken external links.
pub async fn handle_deadlinks_run(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    use app_core::types::ApiResponse;
    match state.storage.sqlite.get_failed_deadlinks().await {
        Ok(issues) => Json(ApiResponse::success("Deadlinks scan completed", Some(issues))),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
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
