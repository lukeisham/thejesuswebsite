use app_storage::chroma::ChromaConfig;
use app_storage::manager::StorageManager;
use app_ui::{server, server::AppState};
use dotenvy::dotenv;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE ORCHESTRATOR                            //
//                           (Entry Point & Startup)                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

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

    // Brain (Candle) might not be fully loaded yet
    let brain: Option<Arc<app_brain::candle::CandleEngine>> = None; // Placeholder for future model loading

    // SQLite Initialization
    let db_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://thejesuswebsite.db".to_string());
    let sqlite = app_storage::initialize_sqlite(&db_url).await?;

    // Hybrid Storage Manager
    let engine: Arc<dyn app_core::types::traits::InferenceEngine> = match brain {
        Some(ref b) => b.clone(),
        None => Arc::new(app_storage::chroma::MockEngine::new(1536)),
    };

    let storage = StorageManager {
        sqlite: sqlite.clone(),
        chroma: Arc::new(
            app_storage::chroma::ChromaStorage::new(storage_config.clone(), engine).await?,
        ),
    };

    // Session Registry for WebSockets
    let sessions = Arc::new(RwLock::new(HashMap::new()));

    let app_state = Arc::new(AppState {
        brain,
        storage_config,
        storage,
        sessions,
        news: Arc::new(app_core::types::blog_and_news::NewsEngine::new()),
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
