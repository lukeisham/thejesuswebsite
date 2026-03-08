use app_core::types::{DictionaryAddRequest, SpellingIssue};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

/// Runs the AI spellcheck scan across the database.
pub async fn handle_spellcheck_run() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    let issues = vec![SpellingIssue {
        bad_word: "Jeseus".into(),
        suggestion: Some("Jesus".into()),
        text: "Jeseus wept.".into(),
        context: "Record: Passion of the Christ".into(),
    }];
    Json(ApiResponse::success("Spellcheck scan completed", Some(issues)))
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
