use crate::server::AppState;
use app_brain::agent::{Agent, BrainAgent};
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct AgentChatRequest {
    pub message: String,
    pub interaction_mode: Option<String>,
    pub widget_context: Option<serde_json::Value>,
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

    match agent
        .orchestrate_with_context(payload.message, payload.interaction_mode, payload.widget_context)
        .await
    {
        Ok(result) => {
            let mut res_json = serde_json::json!({
                "response": result.data.clone(),
                "success": true,
            });

            // Extract metadata fields for Phase 4 helpers
            if let Some((_, action)) = result.metadata.iter().find(|(k, _)| k == "action") {
                res_json["action"] = serde_json::Value::String(action.clone());
            }
            if result
                .metadata
                .iter()
                .any(|(k, _)| k == "verification_required")
            {
                res_json["verification_required"] = serde_json::Value::Bool(true);
            }

            // If the data is JSON (from try_widget_command), parse it
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result.data) {
                if let Some(resp_msg) = parsed.get("response") {
                    res_json["response"] = resp_msg.clone();
                }
                res_json["data"] = parsed;
            }

            (StatusCode::OK, Json(res_json)).into_response()
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "response": format!("Agent Error: {}", e),
                "success": false
            })),
        )
            .into_response(),
    }
}
