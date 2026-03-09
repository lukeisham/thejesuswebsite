use crate::server::AppState;
use app_core::types::WikiWeight;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct CreateWikiWeight {
    pub name: String,
    pub match_target: String,
    pub match_value: String,
    pub weight_score: i32,
}

pub async fn handle_get_weights(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_wiki_weights().await {
        Ok(weights) => (StatusCode::OK, Json(weights)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

pub async fn handle_create_weight(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateWikiWeight>,
) -> impl IntoResponse {
    let new_weight = WikiWeight {
        id: ulid::Ulid::new().to_string(),
        name: payload.name,
        match_target: payload.match_target,
        match_value: payload.match_value,
        weight_score: payload.weight_score,
    };

    match state.storage.sqlite.create_wiki_weight(&new_weight).await {
        Ok(_) => (StatusCode::CREATED, Json(new_weight)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

pub async fn handle_update_weight(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<CreateWikiWeight>,
) -> impl IntoResponse {
    let updated = WikiWeight {
        id: id.clone(),
        name: payload.name,
        match_target: payload.match_target,
        match_value: payload.match_value,
        weight_score: payload.weight_score,
    };

    match state.storage.sqlite.update_wiki_weight(&updated).await {
        Ok(_) => (StatusCode::OK, Json(updated)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

pub async fn handle_delete_weight(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.storage.sqlite.delete_wiki_weight(&id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}
