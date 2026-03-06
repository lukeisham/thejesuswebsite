use crate::{middleware, router};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing;

// Architectural imports
use app_brain::candle::CandleEngine;
use app_core::types::blog_and_news::news::NewsEngine;
use app_storage::chroma::ChromaConfig;
use axum::extract::ws::Message;
use std::collections::HashMap;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// A registry for active WebSocket sessions.
/// This allows the system to broadcast messages to specific clients.
pub type SessionRegistry = RwLock<HashMap<String, mpsc::Sender<Message>>>;

/// The Shared State for the entire application.
/// This holds your database pools, LLM agents (app_brain), and config.
pub struct AppState {
    pub brain: Option<Arc<CandleEngine>>,
    pub storage_config: Arc<ChromaConfig>,
    pub sessions: Arc<SessionRegistry>,
    pub session_secret: String,
    pub slack_webhook_url: String,
    pub news_engine: Arc<NewsEngine>,
    pub pending_passcodes:
        Arc<tokio::sync::RwLock<std::collections::HashMap<String, (String, std::time::Instant)>>>,
}

/// The entry point for starting the web service.
pub async fn run(state: Arc<AppState>) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize Logging - Removed (now in main.rs)

    // 2. Compose the Router
    // We pull the routes from router.rs and apply global middleware
    let app = middleware::apply_standard_layers(router::create_router(state));

    // 3. Bind Address (Defaults to 0.0.0.0:3000 for Docker compatibility)
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = TcpListener::bind(addr).await?;

    tracing::info!("Server listening on {}", addr);

    // 4. Start the server with Graceful Shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Listens for OS signals (SIGINT/SIGTERM) to shut down the server cleanly.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { tracing::info!("Shutdown signal received (Ctrl+C)"); },
        _ = terminate => { tracing::info!("Shutdown signal received (SIGTERM)"); },
    }
}
