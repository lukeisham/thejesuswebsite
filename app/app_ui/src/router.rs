use crate::{server::AppState, ws};
use axum::{
    extract::{Json, State},
    handler::HandlerWithoutStateExt,
    http::{header, header::HeaderValue, HeaderMap},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::services::ServeDir;

use crate::api_records::handle_expand_verse;

/// Creates the primary router for the app_ui service.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // 1. Health check (Architectural requirement)
        .route("/health", get(handle_health))
        // 2. WebSocket Route
        .route("/ws", get(ws::ws_handler))
        // 3. API v1 Endpoints
        .nest("/api/v1", api_routes())
        // 4. Auth Endpoints
        .nest("/api/auth", auth_routes())
        // 5. Shared State Injection
        .with_state(state.clone())
        // 6. Protected /private routes
        .nest(
            "/private",
            Router::new()
                .nest_service("/", ServeDir::new("frontend/private"))
                .route_layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    crate::auth::auth_middleware,
                )),
        )
        // 7. Serve all frontend files (HTML, JS, CSS) from the root and map to /
        // This won't overlap with /private because .nest takes precedence
        .fallback_service(ServeDir::new("frontend").fallback(handle_404.into_service()))
}

/// Sub-router for API endpoints.
fn api_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/challenge", post(handle_challenge))
        .route("/search/essays", get(handle_essay_search))
        .route("/expand_verse", get(handle_expand_verse))
}

/// Sub-router for Auth endpoints.
fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/send-passcode", post(crate::login::handle_send_passcode))
        .route("/verify-passcode", post(crate::login::handle_verify_passcode))
        .route("/logout", post(crate::login::handle_logout))
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
