use crate::server::AppState;
use app_brain::agent::{Agent, BrainAgent};
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct AgentChatRequest {
    pub message: String,
}

#[derive(Serialize)]
pub struct AgentChatResponse {
    pub response: String,
    pub data: Option<String>,
}

pub async fn handle_agent_chat(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AgentChatRequest>,
) -> impl IntoResponse {
    let brain = match &state.brain {
        Some(b) => b.clone(),
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(AgentChatResponse {
                    response: "AI Agent is currently offline (model not loaded).".to_string(),
                    data: None,
                }),
            )
                .into_response();
        }
    };

    let agent = Agent::new(brain);

    match agent.orchestrate(payload.message).await {
        Ok(result) => {
            (
                StatusCode::OK,
                Json(AgentChatResponse {
                    response: "Task executed successfully.".to_string(),
                    data: Some(result.data), // This gets pushed to Drafts & Results viewer
                }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(AgentChatResponse {
                response: format!("Agent Error: {}", e),
                data: None,
            }),
        )
            .into_response(),
    }
}
