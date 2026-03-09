use crate::server::AppState;
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

use app_core::types::dtos::{ContactResponse, ContactTriageResponse};

/// Retrieves the list of unread contact messages from SQLite.
///
/// Returns a vector of `ContactResponse` objects formatted for the dashboard widgets.
pub async fn handle_get_unread_contacts(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_unread_contacts().await {
        Ok(messages) => {
            let responses: Vec<ContactResponse> = messages
                .into_iter()
                .map(|m| ContactResponse {
                    msg_id: m.id.to_string(),
                    name: m.sender.name,
                    email: m.sender.email,
                    subject: m.subject,
                    body: m.body,
                    source_type: "Human".to_string(),
                    sent_at: m.sent_at,
                })
                .collect();
            (StatusCode::OK, Json(responses)).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

/// Marks a specific contact message as read in SQLite.
///
/// Expects a `MarkReadRequest` payload containing the ULID of the contact.
pub async fn handle_mark_contact_read(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> impl IntoResponse {
    use app_core::types::ApiResponse;
    match state.storage.sqlite.mark_contact_read(&id).await {
        Ok(_) => Json(ApiResponse::<()>::success("Contact marked as read", None)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Failed to mark read: {}", e))),
        )
            .into_response(),
    }
}

/// Provides a triage summary (count and status) of unread contacts.
///
/// Returns a `ContactTriageResponse` which powers the high-level dashboard metrics.
pub async fn handle_contact_triage(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_unread_contacts().await {
        Ok(contacts) => {
            let count = contacts.len();
            let summary = if count == 0 {
                "No new messages.".to_string()
            } else {
                format!("{} new messages requiring attention.", count)
            };
            let response = ContactTriageResponse {
                new: count,
                critical: 0,
                summary,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

/// Public endpoint to store a new contact message.
///
/// Uses the `ContactRequest` DTO for strict type safety and security gatekeeping.
pub async fn handle_store_contact(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<app_core::types::ContactRequest>,
) -> impl IntoResponse {
    use app_core::types::ApiResponse;
    // For now, we reuse the existing SQLite store_contact, which takes Contact.
    // In a real scenario, we might want a separate request-to-contact mapper.
    let subject = payload.subject.as_deref().unwrap_or("Website Contact Form");
    match state
        .storage
        .sqlite
        .store_contact(&payload.name, &payload.email, subject, &payload.message)
        .await
    {
        Ok(_) => Json(ApiResponse::<()>::success(
            "Thank you for your message. We will be in touch.",
            None,
        ))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Failed to save contact: {}", e))),
        )
            .into_response(),
    }
}
