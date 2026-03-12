use crate::server::AppState;
use app_core::types::ApiResponse;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Saves a record draft using the DraftRecordRequest DTO.
pub async fn handle_save_record_draft(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<app_core::types::DraftRecordRequest>,
) -> impl IntoResponse {
    match state.storage.sqlite.save_record_draft(&payload).await {
        Ok(_) => {
            Json(ApiResponse::success(format!("Draft for {} saved", payload.name), Some(payload)))
                .into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::<()>::error(e.to_string())))
                .into_response()
        }
    }
}

/// Publishes a full record using the PublishRecordRequest DTO.
/// Bridges the complex JS timeline and map data to the Skeleton.
pub async fn handle_publish_record(
    State(state): State<Arc<AppState>>,
    Json(record_req): Json<app_core::types::PublishRecordRequest>,
) -> impl IntoResponse {
    use std::convert::TryInto;

    // Bridge the DTO to the core Record type
    let record: app_core::types::record::record::Record = match record_req.try_into() {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::error(format!("DTO Mapping Error: {}", e))),
            )
                .into_response()
        }
    };

    // Gatekeeper Validation
    use app_core::types::record::record::RecordGatekeeper;
    if let Err(e) = RecordGatekeeper::validate_name(&record.name) {
        return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e.to_string()))).into_response();
    }
    if !record.picture_bytes.is_empty() {
        if let Err(e) = RecordGatekeeper::validate_image_format(&record.picture_bytes) {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e.to_string()))).into_response();
        }
    }
    if let Err(e) = RecordGatekeeper::validate_description(&record.description) {
        return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e.to_string()))).into_response();
    }

    // Store in SQLite (Primary for metadata and listing)
    if let Err(e) = state.storage.sqlite.store_record(&record).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("SQLite Error: {}", e))),
        )
            .into_response();
    }

    // Store in ChromaDB (Vector search)
    match state.storage.chroma.store_record(&record).await {
        Ok(_) => (StatusCode::OK, Json(ApiResponse::<()>::success("Record published", None))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Chroma Error: {}", e))),
        )
            .into_response(),
    }
}

/// Deletes a single record by its ULID. Also removes it from ChromaDB.
pub async fn handle_delete_record(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Delete from SQLite
    match state.storage.sqlite.delete_record(&id).await {
        Ok(true) => {}
        Ok(false) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<()>::error(format!("Record {} not found", id))),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(format!("SQLite error: {}", e))),
            )
                .into_response();
        }
    }

    // Best-effort delete from ChromaDB (non-fatal if it fails)
    if let Err(e) = state.storage.chroma.delete_record(&id).await {
        tracing::warn!("ChromaDB delete failed for record {}: {}", id, e);
    }

    (
        StatusCode::OK,
        Json(ApiResponse::<()>::success(format!("Record {} deleted", id), None)),
    )
        .into_response()
}

/// Updates an existing record (upsert by id). Accepts the same PublishRecordRequest shape,
/// but preserves the original ULID so store_record's INSERT OR REPLACE acts as an update.
pub async fn handle_update_record(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(record_req): Json<app_core::types::PublishRecordRequest>,
) -> impl IntoResponse {
    use std::convert::TryInto;

    // Parse ULID from path
    let ulid = match id.parse::<ulid::Ulid>() {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::error(format!("Invalid record id: {}", id))),
            )
                .into_response();
        }
    };

    // Convert DTO → Record
    let mut record: app_core::types::record::record::Record = match record_req.try_into() {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::error(format!("DTO Mapping Error: {}", e))),
            )
                .into_response();
        }
    };

    // Override the auto-generated ULID with the original record's id
    record.id = ulid;
    record.updated_at = Some(chrono::Utc::now());

    // Gatekeeper Validation
    use app_core::types::record::record::RecordGatekeeper;
    if let Err(e) = RecordGatekeeper::validate_name(&record.name) {
        return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e.to_string()))).into_response();
    }
    if let Err(e) = RecordGatekeeper::validate_description(&record.description) {
        return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e.to_string()))).into_response();
    }

    // Upsert into SQLite (INSERT OR REPLACE keyed on id)
    if let Err(e) = state.storage.sqlite.store_record(&record).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("SQLite Error: {}", e))),
        )
            .into_response();
    }

    // Update ChromaDB (best-effort)
    if let Err(e) = state.storage.chroma.store_record(&record).await {
        tracing::warn!("ChromaDB update failed for record {}: {}", id, e);
    }

    (StatusCode::OK, Json(ApiResponse::<()>::success("Record updated", None))).into_response()
}

pub async fn handle_record_list(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    use app_core::types::record::record::Record;
    use app_core::types::RecordListResponse;

    // Check for semantic search query
    if let Some(q) = params.get("q") {
        if !q.trim().is_empty() {
            return match state.storage.chroma.query_records(q).await {
                Ok(docs) => {
                    let records: Vec<Record> = docs
                        .into_iter()
                        .filter_map(|json_str| serde_json::from_str(&json_str).ok())
                        .collect();
                    let response = RecordListResponse {
                        count: records.len(),
                        records,
                    };
                    (
                        StatusCode::OK,
                        Json(ApiResponse::success("Search results retrieved", Some(response))),
                    )
                        .into_response()
                }
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::<()>::error(format!("Search error: {}", e))),
                )
                    .into_response(),
            };
        }
    }

    // Default: List all from SQLite
    match state.storage.sqlite.get_records().await {
        Ok(records) => {
            let response = RecordListResponse {
                count: records.len(),
                records,
            };
            (StatusCode::OK, Json(ApiResponse::success("Records retrieved", Some(response))))
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Storage error: {}", e))),
        )
            .into_response(),
    }
}

pub async fn handle_get_draft_records(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_draft_records().await {
        Ok(drafts) => {
            Json(ApiResponse::success("Draft records retrieved", Some(drafts))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(format!("Storage error: {}", e))),
        )
            .into_response(),
    }
}

pub async fn handle_update_parent() -> impl IntoResponse {
    (StatusCode::OK, Json(ApiResponse::<()>::success("Parent updated", None))).into_response()
}

// DEPRECATED: Unified with handle_record_list via ?q= query param
pub async fn handle_record_search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    handle_record_list(State(state), Query(params)).await
}

// STUB: These will be handled by context-specific logic in future tasks
pub async fn handle_record_map() -> impl IntoResponse {
    (StatusCode::OK, Json(ApiResponse::success("Map data stub", Some(vec!["Stub"])))).into_response()
}

pub async fn handle_record_timeline() -> impl IntoResponse {
    (StatusCode::OK, Json(ApiResponse::success("Timeline data stub", Some(vec!["Stub"])))).into_response()
}

pub async fn handle_record_tree() -> impl IntoResponse {
    (StatusCode::OK, Json(ApiResponse::success("Tree data stub", Some(vec!["Stub"])))).into_response()
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                          ESV BIBLE VERSE PROXY                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Query params accepted by the /api/v1/expand_verse endpoint
#[derive(Deserialize)]
pub struct ExpandVerseQuery {
    pub q: String,
}

/// The JSON response shape returned to the frontend.
#[derive(Serialize)]
pub struct ExpandVerseResponse {
    pub passages: Vec<String>,
    pub canonical: String,
}

pub async fn handle_expand_verse(Query(params): Query<ExpandVerseQuery>) -> impl IntoResponse {
    let api_key = match std::env::var("ESV_API_KEY") {
        Ok(k) if !k.is_empty() => k,
        _ => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ApiResponse::<()>::error(
                    "ESV_API_KEY is not configured on this server.".to_string(),
                )),
            )
                .into_response();
        }
    };

    let mut query_params = HashMap::new();
    query_params.insert("q", params.q.clone());
    query_params.insert("include-headings", "false".to_string());
    query_params.insert("include-footnotes", "false".to_string());
    query_params.insert("include-verse-numbers", "false".to_string());
    query_params.insert("include-passage-references", "false".to_string());
    query_params.insert("include-short-copyright", "true".to_string());

    let client = reqwest::Client::new();
    let esv_result = client
        .get("https://api.esv.org/v3/passage/text/")
        .header("Authorization", format!("Token {}", api_key))
        .query(&query_params)
        .send()
        .await;

    match esv_result {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<app_core::types::EsvPassageResponse>().await {
                Ok(body) => {
                    Json(ApiResponse::success("Passages retrieved", Some(body))).into_response()
                }
                Err(e) => (
                    StatusCode::BAD_GATEWAY,
                    Json(ApiResponse::<()>::error(format!("ESV parse error: {}", e))),
                )
                    .into_response(),
            }
        }
        Ok(resp) => {
            let status = resp.status().as_u16();
            (
                StatusCode::BAD_GATEWAY,
                Json(ApiResponse::<()>::error(format!("ESV API returned HTTP {}", status))),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(ApiResponse::<()>::error(format!("ESV request failed: {}", e))),
        )
            .into_response(),
    }
}

pub async fn handle_draft_counts(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_draft_counts().await {
        Ok(counts) => (StatusCode::OK, Json(counts)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}
