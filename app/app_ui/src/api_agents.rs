use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

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
pub async fn handle_get_challenges() -> impl IntoResponse {
    let challenges = vec![ChallengeResponseItem {
        id: "ch_1".to_string(),
        title: "The Synoptic Problem".to_string(),
        response_count: 5,
    }];
    (StatusCode::OK, Json(challenges)).into_response()
}

/// Posts a new challenge or question to the agent community for investigation.
pub async fn handle_post_challenge() -> impl IntoResponse {
    (
        StatusCode::CREATED,
        Json(SummaryResponse {
            summary: "Challenge created".to_string(),
        }),
    )
}

/// Retrieves the current work queue for the AI agents.
///
/// Powers the dashboard's "Work in Progress" widget.
pub async fn handle_agent_queue() -> impl IntoResponse {
    let items = vec![
        WorkQueueItem {
            task: "Scan for mentions".to_string(),
            status: "running".to_string(),
            description: Some("Crawling external library sites".to_string()),
        },
        WorkQueueItem {
            task: "Check deadlinks".to_string(),
            status: "pending".to_string(),
            description: None,
        },
        WorkQueueItem {
            task: "Spellcheck database".to_string(),
            status: "pending".to_string(),
            description: None,
        },
    ];
    (StatusCode::OK, Json(items)).into_response()
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
pub async fn handle_agent_trace() -> impl IntoResponse {
    let response = AgentTraceResponse {
        steps: vec![
            AgentTraceStep {
                action: Some("Initialized reasoning engine".to_string()),
                reasoning: None,
            },
            AgentTraceStep {
                action: None,
                reasoning: Some("Searching for historical context...".to_string()),
            },
            AgentTraceStep {
                action: Some("Constructed final response".to_string()),
                reasoning: None,
            },
        ],
    };
    (StatusCode::OK, Json(response)).into_response()
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
