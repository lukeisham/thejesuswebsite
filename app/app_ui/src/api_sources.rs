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

pub async fn handle_create_source() -> impl IntoResponse {
    (StatusCode::CREATED, "Source created (Stub)").into_response()
}

pub async fn handle_delete_source() -> impl IntoResponse {
    (StatusCode::OK, "Source deleted (Stub)").into_response()
}

pub async fn handle_get_sources() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub source"])).into_response()
}
