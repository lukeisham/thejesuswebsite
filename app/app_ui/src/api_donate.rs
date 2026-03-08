use crate::server::AppState;
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use std::sync::Arc;

/// Public endpoint to record a new donation.
/// Uses the DonorRequest DTO for type safety.
pub async fn handle_store_donor(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<app_core::types::DonorRequest>,
) -> impl IntoResponse {
    use app_core::types::ApiResponse;
    // Use the storage manager to record the donation
    match state
        .storage
        .sqlite
        .store_donor(&payload.donor_name, payload.amount)
        .await
    {
        Ok(_) => Json(ApiResponse::<()>::success(
            format!(
                "Thank you, {}, for your generous donation of ${:.2}.",
                payload.donor_name, payload.amount
            ),
            None,
        ))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Failed to record donation: {}", e))),
        )
            .into_response(),
    }
}
