use crate::{server::AppState, ws};
use axum::{
    handler::HandlerWithoutStateExt,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::services::ServeDir;

use crate::api_records::{
    handle_expand_verse, handle_get_draft_records, handle_publish_record, handle_record_list,
    handle_save_record_draft,
};
use crate::{
    api_blog, api_contacts, api_donate, api_security, api_sources, api_spider, api_users,
    api_widgets,
};

/// Creates the primary router for the app_ui service.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // 1. Health check (Architectural requirement)
        .route("/health", get(handle_health))
        // 2. WebSocket Route
        .route("/ws", get(ws::ws_handler))
        // 3. API v1 Endpoints
        .nest("/api/v1", api_routes())
        // 4. Auth Endpoints
        .nest("/api/auth", auth_routes())
        // 5. Widget operation endpoints
        .nest("/api/widgets", widget_routes())
        // 6. Blog Endpoints
        .nest("/api/blog", blog_routes())
        // 7. System Metrics
        .nest("/api/v1/system", system_routes())
        .route("/login", post(crate::login::handle_login))
        // 5. Shared State Injection
        .with_state(state.clone())
        // 6. Protected /private routes
        .nest(
            "/private",
            Router::new()
                .fallback_service(ServeDir::new("frontend/private"))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    crate::auth::auth_middleware,
                )),
        )
        // Public Form Endpoints
        .route("/api/contact", post(api_contacts::handle_store_contact))
        .route("/api/donate", post(api_donate::handle_store_donor))
        // Shared State Injection
        .with_state(state.clone())
        // 7. Serve all frontend files (HTML, JS, CSS) from the root and map to /
        // This won't overlap with /private because .nest takes precedence
        .fallback_service(ServeDir::new("frontend").fallback(handle_404.into_service()))
}

/// Sub-router for API endpoints.
fn api_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/agent/challenges", get(crate::api_agents::handle_get_challenges))
        .route("/agent/challenge", post(crate::api_agents::handle_post_challenge))
        .route("/agent/wiki/rankings", get(crate::api_agents::handle_wiki_rankings))
        .route("/agent/wiki/reanalyse", post(crate::api_agents::handle_wiki_reanalyse))
        .route("/search/essays", get(handle_essay_search))
        .route("/blog/news", get(crate::api_news::handle_get_news))
        .route("/expand_verse", get(handle_expand_verse))
        .route("/markdown", get(crate::api_tools::handle_markdown))
        .route("/agent/chat", post(crate::agent_api::handle_agent_chat))
        // Wiki Weights
        .route(
            "/weights/wikipedia",
            get(crate::api_weights::handle_get_weights)
                .post(crate::api_weights::handle_create_weight),
        )
        .route(
            "/weights/wikipedia/:id",
            axum::routing::put(crate::api_weights::handle_update_weight)
                .delete(crate::api_weights::handle_delete_weight),
        )
        .route("/news_run", post(crate::api_news::handle_news_run))
        .route("/news_feed_content", get(crate::api_news::handle_news_feed_content))
        .route("/sources", get(api_sources::handle_get_sources))
        // Records & Drafts
        .route("/records", get(handle_record_list))
        .route("/records/drafts", get(handle_get_draft_records))
        .route("/records/draft", post(handle_save_record_draft))
        .route("/records/publish", post(handle_publish_record))
        // Admin Widget Endpoints
        .route("/admin/security/logs", get(api_security::handle_get_security_logs))
        .route(
            "/admin/users",
            get(api_users::handle_get_users).post(api_users::handle_create_user),
        )
        .route("/admin/users/:id", axum::routing::delete(api_users::handle_delete_user))
        .route(
            "/admin/mentions",
            get(api_spider::handle_get_mentions).post(api_spider::handle_mentions_run),
        )
        .route("/admin/contacts/unread", get(api_contacts::handle_get_unread_contacts))
        .route(
            "/admin/contacts/:id/read",
            axum::routing::patch(api_contacts::handle_mark_contact_read),
        )
        .route("/admin/sources", post(api_sources::handle_create_source))
        .route("/admin/sources/:id", axum::routing::delete(api_sources::handle_delete_source))
        // Batch 3 Routes
        .route("/agent/queue", get(crate::api_agents::handle_agent_queue))
        .route("/agent/queue/run-next", post(crate::api_agents::handle_agent_queue_run_next))
        .route("/tools/challenge/sort", post(crate::api_agents::handle_challenge_sort))
        .route("/contact/triage", get(api_contacts::handle_contact_triage))
        .route("/admin/populate", post(api_widgets::handle_admin_populate))
        // Batch 4 Routes
        .route("/spelling/check", post(api_widgets::handle_spelling_check))
        .route("/spelling/check-all", post(api_widgets::handle_spelling_check_all))
        .route("/metrics/tokens", get(crate::api_tools::handle_token_metrics))
        .route("/tools/wiki/status", get(crate::api_tools::handle_wiki_status))
        .route("/tools/wiki/sync", post(crate::api_tools::handle_wiki_sync))
        // Batch 5 Routes
        .route("/agent/trace", get(crate::api_agents::handle_agent_trace))
        .route("/agent/reflection", get(crate::api_agents::handle_agent_reflection))
        .route("/metrics/page", get(crate::api_tools::handle_page_metrics))
        .route("/metrics/server", get(crate::api_tools::handle_server_metrics))
        .route("/tools/scraper/run", post(crate::api_tools::handle_scraper_run))
        .route("/research/suggest", get(crate::api_agents::handle_research_suggest))
}

/// Sub-router for Blog content.
fn blog_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/posts", get(api_blog::handle_get_posts).post(api_blog::handle_create_post))
}

/// Sub-router for core system metrics and counts.
fn system_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/draft_counts", get(crate::api_records::handle_draft_counts))
        .route("/server-info", get(crate::api_tools::handle_server_metrics))
        .route("/work-queue", get(crate::api_agents::handle_agent_queue))
}

/// Sub-router for specific widget operational endpoints.
fn widget_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/deadlinks/run", get(crate::api_deadlinks::handle_deadlinks_run))
        .route("/deadlinks/replace", post(crate::api_deadlinks::handle_deadlinks_replace))
        .route("/spellcheck/run", get(crate::api_spelling::handle_spellcheck_run))
        .route("/spellcheck/correct", post(crate::api_spelling::handle_spellcheck_correct))
        .route("/spellcheck/dictionary/add", post(crate::api_spelling::handle_dict_add))
}

/// Sub-router for Auth endpoints.
fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/login", post(crate::login::handle_login))
        .route("/logout", post(crate::login::handle_logout))
}

// --- Handler Stubs ---

async fn handle_health() -> &'static str {
    "HEALTHY (app_ui is running)"
}

async fn handle_essay_search() -> &'static str {
    "Searching essays..."
}

async fn handle_404() -> (axum::http::StatusCode, &'static str) {
    (axum::http::StatusCode::NOT_FOUND, "Resource not found")
}
