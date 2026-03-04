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

pub async fn handle_wiki_rankings() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub wiki ranking"])).into_response()
}

pub async fn handle_wiki_reanalyse() -> impl IntoResponse {
    (StatusCode::OK, "Re-analysis triggered (Stub)").into_response()
}

pub async fn handle_get_challenges() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub challenge"])).into_response()
}

pub async fn handle_post_challenge() -> impl IntoResponse {
    (StatusCode::CREATED, "Challenge created (Stub)").into_response()
}
