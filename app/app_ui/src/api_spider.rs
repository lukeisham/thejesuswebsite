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

pub async fn handle_get_mentions() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub mention"])).into_response()
}

pub async fn handle_mentions_run() -> impl IntoResponse {
    (StatusCode::OK, "Mentions run triggered (Stub)").into_response()
}
