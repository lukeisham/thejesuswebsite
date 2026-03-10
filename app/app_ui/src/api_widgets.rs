use crate::server::AppState;
use app_core::types::dtos::{PopulateRequest, PopulateResponse};
use app_core::types::jesus::{
    Classification, ContentEntry, InteractiveMap, MapType, TimelineEntry, TimelineEra,
};
use app_core::types::record::record::Record;
use app_core::types::system::bible_verse::{BibleBook, BibleVerse};
use app_core::types::system::bible_verse_parser::parse_bible_ref_sync;
use app_core::types::system::{EntryToggle, Metadata};
use app_core::types::ApiResponse;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use std::sync::Arc;
use ulid::Ulid;
use uuid::Uuid;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

// --- Legacy spelling handlers removed (now in api_spelling.rs) ---

// --- Legacy deadlinks handlers removed (now in api_deadlinks.rs) ---

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                          2. DB POPULATOR HANDLER                           //
//                     (Bulk Record Creation Pipeline)                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Handles bulk database population from the DB Populator widget.
///
/// Pipeline:
///   1. If `wipe: true`, delete all records from SQLite + ChromaDB
///   2. For each item: parse Bible ref strings → build Record → store
///   3. Return counts of successful/failed insertions
pub async fn handle_admin_populate(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PopulateRequest>,
) -> impl IntoResponse {
    let total_requested = payload.records.len();
    let mut successful: usize = 0;
    let mut failed: usize = 0;
    let mut errors: Vec<String> = Vec::new();

    // ── Step 1: Wipe if requested ────────────────────────────────────
    if payload.wipe {
        // Wipe SQLite
        if let Err(e) = state.storage.sqlite.wipe_records().await {
            let msg = format!("SQLite wipe failed: {}", e);
            errors.push(msg.clone());
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::<()>::error(msg)))
                .into_response();
        }

        // Wipe ChromaDB (non-fatal — ChromaDB may not be connected)
        if let Err(e) = state.storage.chroma.wipe_records().await {
            errors.push(format!("ChromaDB wipe warning: {} (continuing)", e));
        }
    }

    // ── Step 2: Process each record ──────────────────────────────────
    for item in &payload.records {
        match build_record_from_item(item) {
            Ok(record) => {
                // Store in SQLite
                if let Err(e) = state.storage.sqlite.store_record(&record).await {
                    failed += 1;
                    errors.push(format!("SQLite store '{}': {}", item.name, e));
                    continue;
                }

                // Store in ChromaDB (non-fatal)
                if let Err(e) = state.storage.chroma.store_record(&record).await {
                    errors.push(format!(
                        "ChromaDB store '{}': {} (record still in SQLite)",
                        item.name, e
                    ));
                }

                successful += 1;
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("Build '{}': {}", item.name, e));
            }
        }
    }

    // ── Step 3: Return result ────────────────────────────────────────
    let response = PopulateResponse {
        total_requested,
        successful,
        failed,
        errors,
    };

    let msg = format!(
        "Population complete: {} successful, {} failed out of {} requested",
        successful, failed, total_requested
    );

    Json(ApiResponse::success(msg, Some(response))).into_response()
}

/// Standalone wipe endpoint — deletes all records without repopulating.
pub async fn handle_admin_wipe_records(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    // Wipe SQLite
    let sqlite_count = match state.storage.sqlite.wipe_records().await {
        Ok(count) => count,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(format!("SQLite wipe failed: {}", e))),
            )
                .into_response();
        }
    };

    // Wipe ChromaDB (non-fatal)
    let chroma_status = match state.storage.chroma.wipe_records().await {
        Ok(_) => "wiped".to_string(),
        Err(e) => format!("warning: {}", e),
    };

    let msg = format!(
        "All records wiped. SQLite: {} rows deleted. ChromaDB: {}",
        sqlite_count, chroma_status
    );

    Json(ApiResponse::<()>::success(msg, None)).into_response()
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                          3. RECORD BUILDER                                 //
//                  (Transform PopulateRecordItem → Record)                   //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Builds a full Record from a PopulateRecordItem.
///
/// - Parses primary_verse_str → BibleVerse (falls back to ExtraCanonical(0) ch1:v1)
/// - Parses secondary_verse_str → Option<BibleVerse>
/// - Builds Record with defaults for empty fields
fn build_record_from_item(
    item: &app_core::types::dtos::PopulateRecordItem,
) -> Result<Record, String> {
    // Parse category
    let category = match item.category.to_lowercase().as_str() {
        "event" => Classification::Event,
        "location" => Classification::Location,
        "person" => Classification::Person,
        "theme" => Classification::Theme,
        _ => Classification::Theme, // default
    };

    // Parse primary verse (fall back to ExtraCanonical placeholder)
    let primary_verse = if item.primary_verse_str.is_empty() {
        BibleVerse {
            book: BibleBook::ExtraCanonical(0),
            chapter: 1,
            verse: 1,
        }
    } else {
        parse_bible_ref_sync(&item.primary_verse_str).unwrap_or(BibleVerse {
            book: BibleBook::ExtraCanonical(0),
            chapter: 1,
            verse: 1,
        })
    };

    // Parse secondary verse (optional)
    let secondary_verse = item
        .secondary_verse_str
        .as_ref()
        .filter(|s| !s.is_empty())
        .and_then(|s| parse_bible_ref_sync(s).ok());

    // Truncate name to 80 chars
    let name = if item.name.len() > 80 {
        item.name[..80].to_string()
    } else {
        item.name.clone()
    };

    // Build description as a Vec<String> (single paragraph)
    let description = if item.description.is_empty() {
        Vec::new()
    } else {
        vec![item.description.clone()]
    };

    Ok(Record {
        id: Ulid::new(),
        metadata: Metadata {
            id: Ulid::new(),
            keywords: Vec::new(),
            toggle: EntryToggle::Record,
        },
        name: name.clone(),
        picture_bytes: Vec::new(),
        description,
        bibliography: Vec::new(),
        timeline: TimelineEntry {
            id: Uuid::new_v4(),
            event_name: name.clone(),
            // Derive a sensible default era from category since PopulateRecordItem has no era field.
            // The DB stores era as NOT NULL so we must always provide a value.
            era: Some(match category {
                Classification::Event => TimelineEra::Ministry,
                Classification::Location => TimelineEra::Ministry,
                Classification::Person => TimelineEra::Ministry,
                Classification::Theme => TimelineEra::Theme,
            }),
            description: String::new(),
        },
        map_data: InteractiveMap {
            map_id: Uuid::new_v4(),
            label: MapType::Overview,
            version: 1,
            points: Vec::new(),
        },
        category,
        content: ContentEntry {
            id: Uuid::new_v4(),
            title: name,
            body: item.description.clone(),
            category: None,
        },
        primary_verse,
        secondary_verse,
        created_at: Utc::now(),
        updated_at: None,
    })
}
