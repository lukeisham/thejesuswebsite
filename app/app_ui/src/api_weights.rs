use crate::server::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug)]
pub struct WikiWeight {
    pub id: String,
    pub name: String,
    pub match_target: String,
    pub match_value: String,
    pub weight_score: i32,
}

#[derive(Deserialize)]
pub struct CreateWikiWeight {
    pub name: String,
    pub match_target: String,
    pub match_value: String,
    pub weight_score: i32,
}

pub async fn handle_get_weights(State(_state): State<Arc<AppState>>) -> impl IntoResponse {
    let mock_data = vec![WikiWeight {
        id: ulid::Ulid::new().to_string(),
        name: "Educational Boost".into(),
        match_target: "url".into(),
        match_value: ".edu".into(),
        weight_score: 15,
    }];

    (StatusCode::OK, Json(mock_data))
}

pub async fn handle_create_weight(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<CreateWikiWeight>,
) -> impl IntoResponse {
    let new_weight = WikiWeight {
        id: ulid::Ulid::new().to_string(),
        name: payload.name,
        match_target: payload.match_target,
        match_value: payload.match_value,
        weight_score: payload.weight_score,
    };

    (StatusCode::CREATED, Json(new_weight))
}

pub async fn handle_update_weight(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<CreateWikiWeight>,
) -> impl IntoResponse {
    let updated = WikiWeight {
        id,
        name: payload.name,
        match_target: payload.match_target,
        match_value: payload.match_value,
        weight_score: payload.weight_score,
    };

    (StatusCode::OK, Json(updated))
}

pub async fn handle_delete_weight(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<String>,
) -> impl IntoResponse {
    StatusCode::NO_CONTENT
}
