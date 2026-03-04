use axum::http::StatusCode;
use axum::response::IntoResponse;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub async fn handle_spellcheck_run() -> impl IntoResponse {
    (StatusCode::OK, "Spellcheck run triggered (Stub)").into_response()
}

pub async fn handle_spellcheck_correct() -> impl IntoResponse {
    (StatusCode::OK, "Correction applied (Stub)").into_response()
}

pub async fn handle_spellcheck_add_dict() -> impl IntoResponse {
    (StatusCode::CREATED, "Word added to dictionary (Stub)").into_response()
}

pub async fn handle_deadlinks_run() -> impl IntoResponse {
    (StatusCode::OK, "Deadlinks run triggered (Stub)").into_response()
}

pub async fn handle_deadlinks_replace() -> impl IntoResponse {
    (StatusCode::OK, "Link replaced (Stub)").into_response()
}
