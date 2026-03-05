use app_storage::chroma::ChromaConfig;
use app_ui::{server, server::AppState};
use dotenvy::dotenv;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Load environment variables (.env)
    dotenv().ok();

    // 2. Initialize Tracing/Logging
    tracing_subscriber::fmt::init();

    info!("🚀 Starting App UI Backend...");

    // 3. Initialize Shared Application State

    // Configs should ideally come from env
    let storage_config = Arc::new(ChromaConfig {
        url: std::env::var("CHROMA_ENDPOINT")
            .unwrap_or_else(|_| "http://localhost:8000".to_string()),
        collection_name: std::env::var("CHROMA_COLLECTION")
            .unwrap_or_else(|_| "essays".to_string()),
        database: None,
    });

    let session_secret =
        std::env::var("SESSION_SECRET").expect("SESSION_SECRET must be set in .env");

    let slack_webhook_url =
        std::env::var("SLACK_WEBHOOK_URL").expect("SLACK_WEBHOOK_URL must be set in .env");

    let pending_passcodes = Arc::new(RwLock::new(HashMap::new()));

    // Brain (Candle) might not be fully loaded yet
    let brain = None; // Placeholder for future model loading

    // Session Registry for WebSockets
    let sessions = Arc::new(RwLock::new(HashMap::new()));

    let app_state = Arc::new(AppState {
        brain,
        storage_config,
        sessions,
        session_secret,
        slack_webhook_url,
        pending_passcodes,
    });

    // 4. Run the Server
    match server::run(app_state).await {
        Ok(_) => info!("✅ Server shut down gracefully."),
        Err(e) => {
            error!("❌ Critical server error: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
