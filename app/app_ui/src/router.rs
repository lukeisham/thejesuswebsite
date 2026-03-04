use crate::{server::AppState, ws};
use axum::{
    handler::HandlerWithoutStateExt,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::services::ServeDir;

/// Creates the primary router for the app_ui service.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // 1. Health check (Architectural requirement)
        .route("/health", get(handle_health))
        // 2. WebSocket Route
        .route("/ws", get(ws::ws_handler))
        // 3. API v1 Endpoints
        .nest("/api/v1", api_routes())
        // 4. Shared State Injection
        .with_state(state)
        // 5. Serve all frontend files (HTML, JS, CSS) from the root and map to /
        .fallback_service(ServeDir::new("frontend").fallback(handle_404.into_service()))
}

/// Sub-router for API endpoints.
fn api_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/challenge", post(handle_challenge))
        .route("/search/essays", get(handle_essay_search))
}

// --- Handler Stubs ---

async fn handle_health() -> &'static str {
    "HEALTHY (app_ui is running)"
}

async fn handle_challenge() -> &'static str {
    "Challenge logic triggered"
}

async fn handle_essay_search() -> &'static str {
    "Searching essays..."
}

async fn handle_404() -> (axum::http::StatusCode, &'static str) {
    (axum::http::StatusCode::NOT_FOUND, "Resource not found")
}
