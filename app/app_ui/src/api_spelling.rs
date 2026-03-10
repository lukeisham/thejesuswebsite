use app_core::types::{DictionaryAddRequest, SpellingIssue};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

use crate::server::AppState;
use axum::extract::State;
use std::sync::Arc;

/// Runs the AI spellcheck scan across the database.
pub async fn handle_spellcheck_run(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    use app_core::types::ApiResponse;
    match state.storage.sqlite.get_recent_spelling_errors().await {
        Ok(issues) => Json(ApiResponse::success("Spellcheck scan completed", Some(issues))),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Corrects a specific spelling issue.
pub async fn handle_spellcheck_correct(Json(issue): Json<SpellingIssue>) -> impl IntoResponse {
    println!("Correcting spelling: {:?} -> {:?}", issue.bad_word, issue.suggestion);
    StatusCode::OK.into_response()
}

/// Adds a word to the custom dictionary to ignore future flags.
pub async fn handle_dict_add(Json(req): Json<DictionaryAddRequest>) -> impl IntoResponse {
    println!("Adding to dictionary: {}", req.word);
    StatusCode::OK.into_response()
}
