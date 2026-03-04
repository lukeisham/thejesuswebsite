pub mod chroma;
pub mod manager;

use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tracing::info;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                          (Storage Containers)                              //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Clone)]
pub struct SqliteStorage {
    pub pool: SqlitePool,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Initialization Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Initializes the dynamic SQLite database, runs migrations, and seeds data.
pub async fn initialize_sqlite(db_url: &str) -> Result<SqliteStorage, Box<dyn std::error::Error>> {
    info!("📂 Initializing SQLite storage at {}...", db_url);

    let options = SqliteConnectOptions::from_str(db_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

    let pool = SqlitePool::connect_with(options).await?;

    // 1. Run Schema
    let schema = include_str!("../database/schema.sql");
    sqlx::query(schema).execute(&pool).await?;

    // 2. Run Seed
    let seed = include_str!("../database/seed.sql");
    sqlx::query(seed).execute(&pool).await?;

    info!("✅ SQLite storage initialized and seeded.");
    Ok(SqliteStorage { pool })
}
