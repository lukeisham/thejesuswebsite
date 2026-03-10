use crate::server::AppState;
use app_core::types::dtos::{
    AgentTraceStep, ApiResponse, ContactResponse, DeadlinkIssue, PageMetric, ReflectionResponse,
    SecurityLogResponse, ServerMetricsResponse, SpellingIssue, WorkQueueItem,
};
use app_core::types::system::DraftCounts;
use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
pub struct SystemFeedResponse {
    pub contacts: Vec<ContactResponse>,
    pub drafts: DraftCounts,
    pub security: Vec<SecurityLogResponse>,
    pub work_queue: Vec<WorkQueueItem>,
    pub reflections: Vec<ReflectionResponse>,
    pub trace: Vec<AgentTraceStep>,
    pub spelling: Vec<SpellingIssue>,
    pub deadlinks: Vec<DeadlinkIssue>,
    pub page_metrics: Vec<PageMetric>,
    pub server_metrics: ServerMetricsResponse,
}

/// Unified endpoint for the System Data Viewer feed.
/// Aggregates all 10 system categories into a single, efficient payload.
pub async fn handle_system_feed(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    // 1. Get Unread Contacts
    let contacts = state
        .storage
        .sqlite
        .get_unread_contacts()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|c| ContactResponse {
            msg_id: c.id.to_string(),
            name: c.sender.name,
            email: c.sender.email,
            subject: c.subject,
            body: c.body,
            source_type: "Human".to_string(),
            sent_at: c.sent_at,
        })
        .collect();

    // 2. Get Draft Counts
    let drafts = state
        .storage
        .sqlite
        .get_draft_counts()
        .await
        .unwrap_or_default();

    // 3. Get Security Logs
    let security = state
        .storage
        .sqlite
        .get_security_logs()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|l| SecurityLogResponse {
            event_type: format!("{:?}", l.event_type),
            created_at: l.created_at,
            ip_address: l.ip_address,
            details: l.details,
        })
        .collect();

    // 4. Get Work Queue
    let work_queue = state
        .storage
        .sqlite
        .get_work_queue()
        .await
        .unwrap_or_default();

    // 5. Get Agent Reflections
    let reflections = state
        .storage
        .sqlite
        .get_recent_reflections()
        .await
        .unwrap_or_default();

    // 6. Get Agent Trace
    let trace = state
        .storage
        .sqlite
        .get_trace_reasoning()
        .await
        .unwrap_or_default();

    // 7. Get Spelling Issues
    let spelling = state
        .storage
        .sqlite
        .get_recent_spelling_errors()
        .await
        .unwrap_or_default();

    // 8. Get Deadlinks
    let deadlinks = state
        .storage
        .sqlite
        .get_failed_deadlinks()
        .await
        .unwrap_or_default();

    // 9. Get Page Metrics
    let page_metrics = state
        .storage
        .sqlite
        .get_all_page_metrics()
        .await
        .unwrap_or_default();

    // 10. Get Server Metrics
    let server_metrics = state
        .storage
        .sqlite
        .get_server_metrics()
        .await
        .unwrap_or_else(|_| ServerMetricsResponse {
            ram_usage: "N/A".to_string(),
            disk_usage: "N/A".to_string(),
            llm_api: "N/A".to_string(),
            tokens_today: "0".to_string(),
            tokens_week: "0".to_string(),
            tokens_month: "0".to_string(),
        });

    let feed = SystemFeedResponse {
        contacts,
        drafts,
        security,
        work_queue,
        reflections,
        trace,
        spelling,
        deadlinks,
        page_metrics,
        server_metrics,
    };

    Json(ApiResponse::success("System feed retrieved", Some(feed)))
}
