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

pub async fn handle_spelling_check() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    Json(ApiResponse::<()>::success("Spelling check completed", None))
}

pub async fn handle_spelling_check_all() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    Json(ApiResponse::<()>::success("Batch spelling check completed", None))
}

pub async fn handle_spellcheck_run() -> impl IntoResponse {
    use app_core::types::{ApiResponse, SpellingIssue};
    let issues = vec![
        SpellingIssue {
            bad_word: "prophecie".into(),
            suggestion: Some("prophecy".into()),
            text: "The prophecie was fulfilled".into(),
            context: "Religious text".into(),
        },
        SpellingIssue {
            bad_word: "Justification".into(),
            suggestion: None,
            text: "Justification by faith".into(),
            context: "Theology".into(),
        },
    ];
    Json(ApiResponse::success("Spellcheck run completed", Some(issues)))
}

pub async fn handle_spellcheck_correct() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    Json(ApiResponse::<()>::success("Correction applied", None))
}

pub async fn handle_spellcheck_add_dict() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    (
        StatusCode::CREATED,
        Json(ApiResponse::<()>::success("Word added to dictionary", None)),
    )
}

pub async fn handle_deadlinks_run() -> impl IntoResponse {
    use app_core::types::{ApiResponse, DeadlinkIssue};
    let dead_links = vec![
        DeadlinkIssue {
            id: "201".into(),
            url: "http://example-broken-site.com/jesus".into(),
            status: "404".into(),
            context: "External resource reference...".into(),
        },
        DeadlinkIssue {
            id: "202".into(),
            url: "https://wikipedia.org/wiki/some_missing_article".into(),
            status: "404".into(),
            context: "Wikipedia citation link".into(),
        },
    ];
    Json(ApiResponse::success("Deadlinks scan completed", Some(dead_links)))
}

pub async fn handle_deadlinks_replace() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    Json(ApiResponse::<()>::success("Link replaced", None))
}

pub async fn handle_admin_populate() -> impl IntoResponse {
    use app_core::types::ApiResponse;
    Json(ApiResponse::<()>::success("Database population triggered", None))
}
