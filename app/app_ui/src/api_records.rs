use axum::extract::Query;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub async fn handle_save_record_draft() -> impl IntoResponse {
    (StatusCode::OK, "Record draft saved (Stub)").into_response()
}

pub async fn handle_publish_record() -> impl IntoResponse {
    (StatusCode::OK, "Record published (Stub)").into_response()
}

pub async fn handle_record_list() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(vec![serde_json::json!({
            "id": "rec_01",
            "title": "Healing of the Centurion's Servant",
            "type": "Miracle",
            "published": true
        })]),
    )
        .into_response()
}

pub async fn handle_get_draft_records() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(vec![serde_json::json!({
            "id": "draft_01",
            "title": "New Archeological Find in Capernaum",
            "type": "Site",
            "published": false
        })]),
    )
        .into_response()
}

pub async fn handle_update_parent() -> impl IntoResponse {
    (StatusCode::OK, "Parent updated (Stub)").into_response()
}

pub async fn handle_record_search() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub record match"])).into_response()
}

pub async fn handle_record_map() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub map data"])).into_response()
}

pub async fn handle_record_timeline() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub timeline data"])).into_response()
}

pub async fn handle_record_tree() -> impl IntoResponse {
    (StatusCode::OK, Json(vec!["Stub tree data"])).into_response()
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
    /// Bible reference string — e.g. "John 3:16" or "John+3:16"
    pub q: String,
}

/// The JSON response shape returned to the frontend.
#[derive(Serialize)]
pub struct ExpandVerseResponse {
    pub passages: Vec<String>,
    pub canonical: String,
}

/// **GET /api/v1/expand_verse?q=Book+Ch:V**
///
/// Securely proxies a request to the ESV API v3, attaching the
/// server-side `ESV_API_KEY` from the environment. Returns the
/// passage text directly so the key is never exposed to the browser.
pub async fn handle_expand_verse(Query(params): Query<ExpandVerseQuery>) -> impl IntoResponse {
    // --- 1. Read key from environment ---
    let api_key = match std::env::var("ESV_API_KEY") {
        Ok(k) if !k.is_empty() => k,
        _ => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error": "ESV_API_KEY is not configured on this server."
                })),
            )
                .into_response();
        }
    };

    // --- 2. Build the ESV API URL ---
    let mut query_params = HashMap::new();
    query_params.insert("q", params.q.clone());
    query_params.insert("include-headings", "false".to_string());
    query_params.insert("include-footnotes", "false".to_string());
    query_params.insert("include-verse-numbers", "false".to_string());
    query_params.insert("include-passage-references", "false".to_string());
    query_params.insert("include-short-copyright", "true".to_string());

    // --- 3. Make the outbound request ---
    let client = reqwest::Client::new();
    let esv_result = client
        .get("https://api.esv.org/v3/passage/text/")
        .header("Authorization", format!("Token {}", api_key))
        .query(&query_params)
        .send()
        .await;

    match esv_result {
        Ok(resp) if resp.status().is_success() => match resp.json::<serde_json::Value>().await {
            Ok(body) => (StatusCode::OK, Json(body)).into_response(),
            Err(e) => (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({ "error": format!("ESV parse error: {}", e) })),
            )
                .into_response(),
        },
        Ok(resp) => {
            let status = resp.status().as_u16();
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({
                    "error": format!("ESV API returned HTTP {}", status)
                })),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": format!("ESV request failed: {}", e) })),
        )
            .into_response(),
    }
}
