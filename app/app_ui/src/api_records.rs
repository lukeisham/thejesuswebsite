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

pub async fn handle_save_record_draft() -> impl IntoResponse {
    (StatusCode::OK, "Record draft saved (Stub)").into_response()
}

pub async fn handle_publish_record() -> impl IntoResponse {
    (StatusCode::OK, "Record published (Stub)").into_response()
}

pub async fn handle_update_parent() -> impl IntoResponse {
    (StatusCode::OK, "Parent updated (Stub)").into_response()
}

pub async fn handle_record_search() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub record match"])).into_response()
}

pub async fn handle_record_map() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub map data"])).into_response()
}

pub async fn handle_record_timeline() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub timeline data"])).into_response()
}

pub async fn handle_record_tree() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub tree data"])).into_response()
}
