use crate::server::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

use app_core::types::dtos::{
    AgentTraceResponse, AgentTraceStep, ChallengeResponseItem, RankingItem, ReflectionResponse,
    ResearchSuggestion, SummaryResponse, WorkQueueItem,
};

/// Returns the current weighted rankings of Wikipedia articles analyzed by the agents.
pub async fn handle_wiki_rankings() -> impl IntoResponse {
    let rankings = vec![RankingItem {
        rank: 1,
        title: "Historical Jesus".to_string(),
        score: 0.98,
    }];
    (StatusCode::OK, Json(rankings)).into_response()
}

/// Triggers a re-analysis of the Wikipedia corpus for specific keywords or themes.
pub async fn handle_wiki_reanalyse() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(SummaryResponse {
            summary: "Re-analysis triggered".to_string(),
        }),
    )
}

/// Retrieves the list of active historical or theological challenges found by the agents.
pub async fn handle_get_challenges(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut all_challenges = Vec::new();

    // Fetch popular challenges
    if let Ok(popular) = state.storage.sqlite.get_popular_challenges().await {
        for p in popular {
            all_challenges.push(ChallengeResponseItem {
                id: p.url.to_string(),
                title: p.name,
                response_count: 0, // Placeholder
            });
        }
    }

    // Fetch academic challenges (avoid duplicates by URL)
    if let Ok(academic) = state.storage.sqlite.get_academic_challenges().await {
        for a in academic {
            if !all_challenges.iter().any(|c| c.id == a.url.to_string()) {
                all_challenges.push(ChallengeResponseItem {
                    id: a.url.to_string(),
                    title: a.name,
                    response_count: 0, // Placeholder
                });
            }
        }
    }

    (StatusCode::OK, Json(all_challenges)).into_response()
}

/// Posts a new challenge or question to the agent community for investigation.
pub async fn handle_post_challenge() -> impl IntoResponse {
    // This would typically involve adding to the work queue or raw_challenges tables
    (
        StatusCode::CREATED,
        Json(SummaryResponse {
            summary: "Challenge created (Stub)".to_string(),
        }),
    )
}

/// Retrieves the current work queue for the AI agents.
pub async fn handle_agent_queue(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_work_queue().await {
        Ok(items) => (StatusCode::OK, Json(items)).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

/// Commands the next task in the agent's work queue to start immediately.
pub async fn handle_agent_queue_run_next() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(SummaryResponse {
            summary: "Running next task in queue".to_string(),
        }),
    )
}

/// Re-orders the challenges list based on priority or recent agent findings.
pub async fn handle_challenge_sort() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(SummaryResponse {
            summary: "Challenges sorted".to_string(),
        }),
    )
}

/// Returns the internal reasoning trace of the latest agent operation.
///
/// Used for debugging and auditing the "Chain of Thought" in complex research tasks.
pub async fn handle_agent_trace(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.sqlite.get_trace_reasoning().await {
        Ok(steps) => (StatusCode::OK, Json(AgentTraceResponse { steps })).into_response(),
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)).into_response()
        }
    }
}

/// Retrieves a self-reflection summary from the lead research agent.
pub async fn handle_agent_reflection() -> impl IntoResponse {
    let response = ReflectionResponse {
        reflection: "The agent is currently reflecting on its performance.".to_string(),
    };
    (StatusCode::OK, Json(response)).into_response()
}

/// Provides AI-generated research suggestions based on the current state of the database.
pub async fn handle_research_suggest() -> impl IntoResponse {
    let suggestions = vec![
        ResearchSuggestion {
            id: "s_1".to_string(),
            title: "Archaeology of Capernaum".to_string(),
            category: "Archeology".to_string(),
        },
        ResearchSuggestion {
            id: "s_2".to_string(),
            title: "Historical context of the Parables".to_string(),
            category: "History".to_string(),
        },
    ];
    (StatusCode::OK, Json(suggestions)).into_response()
}
