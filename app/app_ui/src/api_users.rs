use app_core::types::ApiResponse;
use crate::server::AppState;
use app_core::types::system::User;
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Lists all users from the SQLite database.
pub async fn handle_get_users(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_users().await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Database error: {}", e))),
        )
            .into_response(),    }
}

/// Creates a new user using the CreateUserRequest DTO.
/// Bridges the frontend's flat shape to the core User model.
pub async fn handle_create_user(
    State(state): State<Arc<AppState>>,
    Json(req): Json<app_core::types::CreateUserRequest>,
) -> impl IntoResponse {
    use std::convert::TryInto;
    let user: User = match req.try_into() {
        Ok(u) => u,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::error(format!("Invalid user data: {}", e))),
            )
                .into_response()
        }
    };

    match state.storage.sqlite.create_user(&user).await {
        Ok(_) => (StatusCode::CREATED, Json(ApiResponse::<()>::success("User created", None))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Failed to create user: {}", e))),
        )
            .into_response(),    }
}

pub async fn handle_delete_user(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> impl IntoResponse {
    match state.storage.sqlite.delete_user(&id).await {
        Ok(_) => (StatusCode::OK, Json(ApiResponse::<()>::success("User deleted", None))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Failed to delete user: {}", e))),
        )
            .into_response(),    }
}
