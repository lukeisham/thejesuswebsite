use axum::{http::Method, Router};
use std::time::Duration;
use tower_http::{
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

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
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any)
}
