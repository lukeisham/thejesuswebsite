use crate::server::AppState;
use axum::{
    extract::{Request, State},
    http::{header, Method, StatusCode},
    middleware::Next,
    response::Response,
    Router,
};
use std::sync::Arc;
use std::time::Duration;
use tower_http::{
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE GATEKEEPER                              //
//                         (Standard Layers & Security)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The entry point for all global middleware.
/// This is what you call in router.rs using `.layer()`.
pub fn apply_standard_layers(router: Router) -> Router {
    router
        // 1. Trace ID & Logging
        // Logs the start and end of every request with timing
        .layer(TraceLayer::new_for_http())
        // 2. CORS (Cross-Origin Resource Sharing)
        // Gold standard: Strict in production, permissive in dev
        .layer(custom_cors())
        // 3. Global Timeout
        // Ensures no request (like a hung LLM call) stays open forever
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
}

/// Gold-standard CORS configuration
fn custom_cors() -> CorsLayer {
    CorsLayer::new()
        // In production, replace .allow_origin(Any) with your actual domain
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
        ])
        .allow_headers(Any)
}

/// Authorization Middleware
pub async fn auth_guard(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = if let Some(auth_header) = auth_header {
        if auth_header.starts_with("Bearer ") {
            auth_header[7..].trim()
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let now = chrono::Utc::now().timestamp();
    let query = "SELECT role FROM sessions WHERE token = ? AND expires_at > ?";
    let pool = &state.storage.sqlite.pool;

    let result = sqlx::query(query)
        .bind(token)
        .bind(now)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(row) = result {
        use sqlx::Row;
        let role: String = row.get("role");
        req.extensions_mut().insert(role);
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}
