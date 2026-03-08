pub mod chroma;
pub mod manager;
pub mod sqlite;

pub use manager::StorageManager;
pub use sqlite::SqliteStorage;

pub async fn initialize_storage() -> Result<(), Box<dyn std::error::Error>> {
    // Storage initialization logic
    Ok(())
}
