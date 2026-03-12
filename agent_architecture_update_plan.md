# Plan: Merge & Update Agent Architecture into a Single agent_architecture.html

## Context

Two existing stub architecture files (`agent_backend_architecture.html` and `agent_chat_architecture.html`) will be **merged into a single new file** `agent_architecture.html` that documents the complete 7-step agent lifecycle. This resolves the fragmented documentation and adds comprehensive ASCII diagrams, reference tables, and a glossary.

**Discrepancy resolved:** The user's process says "powered by a Deepseek API" but the codebase shows CandleEngine (BERT) + hardcoded "Claude 3.5 Sonnet". agent_guide.yml doesn't mention DeepSeek. Per user direction: **document DeepSeek as intended (⚠️)**, current code as legacy.

**Status markers:** ✅ = currently implemented, ⚠️ = intended / not yet built

**Files to create:** `frontend/private/agent_architecture.html` (new merged file)
**Files to delete:** `frontend/private/agent_backend_architecture.html`, `frontend/private/agent_chat_architecture.html`
**Files to update:** `frontend/private/dashboard.html` (replace two nav links with one)

---

## Batch Plan

### Batch 1: HTML Scaffold + Master 7-Step Overview Diagram

**What:** Create the new `agent_architecture.html` with full HTML boilerplate (CSS styles copied from existing architecture docs) and the master overview diagram.

**Diagram shows all 7 steps in a compact grid:**
- Row 1: Steps 1-3 (DeepSeek API ⚠️, agent_guide.yml, Agent Chat)
- Row 2: Steps 4-6 (System Health ✅, Contact Forms ✅, Mention Monitoring ✅/⚠️)
- Row 3: Step 7 in dashed-line box (Future Widgets — placeholder)

Each cell shows: step name, key widget/file, primary API endpoint, status marker.

---

### Batch 2: Step 1 (DeepSeek API) + Step 2 (agent_guide.yml) Detail Diagrams

**What:** Two detailed ASCII diagrams for the agent's power source and configuration.

**Step 1 — DeepSeek API ⚠️:**
- Current state: CandleEngine (BERT via Candle ML, Metal/CPU) in `candle.rs`, Agent::new() takes Arc<CandleEngine>, brain field in AppState is Option<Arc<CandleEngine>> — currently set to None at runtime
- Intended state: DeepSeek API replaces CandleEngine for LLM calls + intent classification
- Current LLM reference: "Claude 3.5 Sonnet" hardcoded in sqlite.rs get_server_metrics()
- Key files: `app/app_brain/src/candle.rs` (CandleEngine, try_new, embed), `app/app_brain/src/agent.rs` (Agent holds Arc<CandleEngine>)

**Step 2 — agent_guide.yml:**
- Diagram of the 7 YAML sections: source_of_truth, capabilities (4 tools), widgets (18), content_index, logic_constraints (6 rules), current_focus (P1-P8 priority), interaction_modes (4) + chat_rules (5)
- Version 1.2.0, last_updated 2026-03-05
- Shows how sections map to backend: interaction_modes → InteractionMode enum in agent.rs, current_focus → build_status_summary() priority ordering, capabilities → Rust tool paths

---

### Batch 3: Step 3 (Agent Chat) Detail Diagram

**What:** The largest single diagram — merges content from both old architecture files covering the full chat pipeline.

**Covers:**
1. Request flow: POST /api/v1/agent/chat → handle_agent_chat() → AppState.brain → Agent::new() → orchestrate_with_context() → sanitize() (16k limit) → determine_intent() (keyword classifier) → dispatch to engine or try_widget_command()
2. Interaction modes: detectInteractionMode() on frontend → forwarded as interaction_mode field → InteractionMode::from_str() on backend → vibe suffix on response
3. Heavy vs Light actions: Heavy (run_wiki_sync, run_challenge_sort, run_deadlinks, run_vector_embed) require verification_required: true. Light (run_news_crawler, run_spelling_check, run_page_scraper) execute immediately
4. Widget event bus: 17 events listened to, widgetState accumulator, 30s heartbeat
5. Proactive alerting: checkAlertThresholds() by priority (P1 token 3 tiers, P2 contacts, P3 drafts, P5 reflection+spelling, P6 deadlinks, P7 security), 60s dedup per priority

---

### Batch 4: Step 4 (System Health) + Step 5 (Contact Forms) Detail Diagrams

**What:** Two detailed diagrams for currently-implemented monitoring features.

**Step 4 — System Health Monitoring ✅:**
Three sub-flows, each showing: widget JS → HTTP endpoint → Rust handler → SQLite function → table → event dispatch
- Token Metrics: wgt_token_metrics.js (P1) → GET /api/v1/metrics/tokens → get_token_metrics() → tokens table → TokenMetricsEvent. Warning >80%
- Server Metrics: wgt_server_metrics.js (P8) → GET /api/v1/metrics/server → get_server_metrics() → ServerMetricsEvent {cpu, memory, uptime}
- Security Logs: wgt_security.js (P7) → GET /api/v1/admin/security/logs → get_security_logs() → security_logs table → SecurityAlertEvent. Filters Honeypot/LoginFail

**Step 5 — Contact Form Management ✅:**
Two sub-flows:
- Public path: store_contact.js → POST /api/contact → store_contact() → contacts + contact_messages tables
- Admin triage: wgt_contact_triage.js (P2) → GET /api/v1/contact/triage + widget_contact.js polls 10s → GET /api/v1/admin/contacts/unread → renderContacts() → PATCH /api/v1/admin/contacts/{id}/read → ContactTriageEvent alerts user on next login

---

### Batch 5: Step 6 (Mention Monitoring) + Step 7 (Future Widgets) Detail Diagrams

**What:** One implemented-feature diagram + one dashed-box placeholder.

**Step 6 — Website Mention Monitoring ✅ (monthly schedule ⚠️):**
- wgt_page_metrics.js (P7): fetchMetrics() polls 30s, GET /api/v1/metrics/page — reads page_metrics table (views, avg_time, bounce_rate)
- Scrape trigger: triggerScrape() → POST /api/v1/tools/scraper/run (LIGHT action)
- Mention storage: sqlite.rs get_mentions() + store_mention() → mentions table
- Absorbed widget_spider.js via CrawlSummaryEvent merge
- Note: monthly periodic scraping schedule is ⚠️ intended but not yet enforced

**Step 7 — Future Widget Capacity ⚠️ (placeholder):**
- Dashed-line box showing: 17 events currently, 16 widget types in try_widget_command()
- "To add a new widget" recipe: create wgt_[name].js, add event to WIDGET_EVENTS, add widget_id+keywords to agent.rs, register in agent_guide.yml
- Example placeholders: content analytics, backup status, external API health

---

### Batch 6: File & Function Reference Tables

**What:** 6 collapsible `<details>` sections with comprehensive reference tables.

1. **Backend — Agent Brain & Orchestration** — agent.rs (Agent, Intent enum 8 variants, InteractionMode 4 variants, AgentResponse, BrainAgent trait, orchestrate_with_context, determine_intent, try_widget_command, build_status_summary, sanitize, AgentError), candle.rs (CandleEngine, try_new, embed), thinking.rs (TraceReasoning, AgentOrchestrator, 5 logic gates)
2. **Backend — API Handlers** — agent_api.rs (handle_agent_chat, AgentChatRequest/Response), api_agents.rs (10 handlers with endpoint/method/status), api.rs (handle_brain_request, ApiRequest/Response)
3. **Backend — Storage** — sqlite.rs (12 agent-related functions) + 8 SQLite tables with columns
4. **Frontend — Agent Chat Widget** — wgt_agent-chat.js (10 functions, 3 element IDs, 17 events, widgetState, activeAlerts)
5. **Frontend — Monitoring & Triage Widgets** — wgt_token_metrics.js, wgt_server_metrics.js, wgt_security.js, wgt_contact_triage.js, wgt_page_metrics.js
6. **Frontend — Contact & Config** — widget_contact.js, store_contact.js, agent_guide.yml

---

### Batch 7: Terms Glossary + Dashboard Link Update + Old File Cleanup

**What:** Three tasks to wrap up.

**7a. Terms Glossary (~18 terms):**
DeepSeek API, CandleEngine, agent_guide.yml, Intent, InteractionMode, Heavy Action, Light Action, Widget Event Bus, widgetState, Priority Hierarchy, Proactive Alerting, Gatekeeper, try_widget_command(), build_status_summary(), Contact Triage, Mention Monitoring, Work Queue, TraceReasoning

**7b. Dashboard link update** in `frontend/private/dashboard.html`:
- Replace the two separate architecture nav links (Agent Backend + Agent Chat) with a single "Agent" link pointing to the new merged file

**7c. Delete old files:**
- `frontend/private/agent_backend_architecture.html`
- `frontend/private/agent_chat_architecture.html`

---

## Verification

- After each batch: check ASCII diagrams render without horizontal scroll at 960px
- After all batches: verify all 7 steps documented, ✅/⚠️ markers consistent, dashboard link works, old files removed
- Cross-check against agent_guide.yml sections to confirm nothing missed

## Files Modified

- `frontend/private/agent_architecture.html` — NEW (created in Batch 1, updated Batches 2-7)
- `frontend/private/dashboard.html` — updated nav link (Batch 7)
- `frontend/private/agent_backend_architecture.html` — DELETED (Batch 7)
- `frontend/private/agent_chat_architecture.html` — DELETED (Batch 7)
