use crate::server::AppState;
use app_core::types::ApiResponse;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Creates a new source using the CreateSourceRequest DTO.
/// Bridges the flat JS shape to the core Source model.
pub async fn handle_create_source(
    State(state): State<Arc<AppState>>,
    Json(req): Json<app_core::types::CreateSourceRequest>,
) -> impl IntoResponse {
    use std::convert::TryInto;
    let source: app_core::types::system::source::Source = match req.try_into() {
        Ok(s) => s,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e))).into_response()
        }
    };

    match state.storage.sqlite.create_source(&source).await {
        Ok(id) => Json(ApiResponse::<i64>::success("Source created", Some(id))).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::<()>::error(e.to_string())))
                .into_response()
        }
    }
}

/// Deletes a source by ID.
pub async fn handle_delete_source(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.storage.sqlite.delete_source(id).await {
        Ok(_) => Json(ApiResponse::<()>::success("Source deleted", None)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::<()>::error(e.to_string())))
                .into_response()
        }
    }
}

/// Lists all sources. Returns the standard core Source shape.
pub async fn handle_get_sources(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_sources().await {
        Ok(sources) => {
            Json(ApiResponse::success("Sources retrieved", Some(sources))).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::<()>::error(e.to_string())))
                .into_response()
        }
    }
}
