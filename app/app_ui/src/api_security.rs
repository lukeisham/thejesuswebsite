use crate::server::AppState;
use app_core::types::system::SecurityEventType;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Log Structure & Types)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct SecurityLogger;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Logging & API Handlers)                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SecurityLogger {
    pub async fn log(
        state: Arc<AppState>,
        event: SecurityEventType,
        ip: Option<std::net::IpAddr>,
        detail: Option<String>,
    ) -> Result<(), String> {
        let ip_str = ip.map(|i| i.to_string());
        state
            .storage
            .sqlite
            .log_security_event(event, ip_str, detail)
            .await
            .map_err(|e| e.to_string())
    }
}

use app_core::types::dtos::SecurityLogResponse;

/// Retrieves the latest security logs from the SQLite database.
///
/// Returns a vector of `SecurityLogResponse` objects, which power the dashboard's
/// security monitoring widget. Ensures sensitive internal data is mapped to
/// a safe, frontend-friendly format.
pub async fn handle_get_security_logs(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_security_logs().await {
        Ok(logs) => {
            let responses: Vec<SecurityLogResponse> = logs
                .into_iter()
                .map(|l| SecurityLogResponse {
                    event_type: format!("{:?}", l.event_type),
                    created_at: l.created_at,
                    ip_address: l.ip_address,
                    details: l.details,
                })
                .collect();
            (StatusCode::OK, Json(responses)).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}
