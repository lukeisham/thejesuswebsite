use crate::agent::{Agent, AgentError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                           (Data Types & Schema)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A request received by the Brain API layer.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiRequest {
    /// A unique identifier for the request, often a ULID.
    pub id: String,
    /// The raw query text from the user.
    pub query: String,
    /// Optional context or session tokens.
    pub session_token: Option<String>,
}

/// A structured response sent back to the UI/caller.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse {
    /// The identifier of the original request.
    pub id: String,
    /// The serialised response data (usually JSON).
    pub data: String,
    /// The confidence score from the AI agent (0.0 - 1.0).
    pub vibe_score: f32,
    /// Metadata about the execution (e.g. source, latency).
    pub metadata: Vec<(String, String)>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The primary interface for the UI layer to talk to the Brain.
/// Handles request routing, state management, and basic transformation.
pub async fn handle_brain_request(
    state: Arc<Agent>,
    payload: ApiRequest,
) -> Result<ApiResponse, AgentError> {
    // Stage 1 — Gatekeeper: Security check
    verify_session(payload.session_token.as_deref())?;

    // Stage 2 — Brain: Pass the heavy lifting to the Agent
    let agent_result = state.process_query(&payload.query).await?;

    // Stage 3 — Transformation: Map Agent response back to API schema
    Ok(ApiResponse {
        id: payload.id,
        data: agent_result.data,
        vibe_score: agent_result.confidence,
        metadata: agent_result.metadata,
    })
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Constraints)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A placeholder for session validation logic.
/// Always returns Ok for now, but provides a hook for future security layers.
fn verify_session(token: Option<&str>) -> Result<(), AgentError> {
    // Future work: integrate with a real auth provider or session store
    if let Some(_t) = token {
        // Validation logic here
    }
    Ok(())
}
