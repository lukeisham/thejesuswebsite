# Agent Integration Plan — All Widgets → Brain

Generated: 2026-03-09 (Rev 2 — aligned with agent_guide.yml v1.2.0)
Scope: Connect every dashboard widget (except DB Populator) to the AI agent so the agent can observe, act on, and report widget data.

**Governing document:** `agent_guide.yml` — every change in this plan MUST comply with its logic constraints, priority hierarchy, interaction modes, and chat rules.

---

## Engineering Checklist (Apply to Every Change)

- [ ] No panics — use `?` or `unwrap_or_else`, never `unwrap()`
- [ ] All async functions use `async fn` + `await`
- [ ] New custom events use the existing `window.dispatchEvent(new CustomEvent(...))` pattern
- [ ] All event names end with `Event` (e.g. `SecurityAlertEvent`, `NewsCompleteEvent`)
- [ ] `pushToViewer()` calls use the existing function in `wgt_agent-chat.js` — do not duplicate it
- [ ] New Intent variants map 1-to-1 with a domain engine stub
- [ ] Doc comments (`///`) on every new public function, struct, and enum variant
- [ ] Widget card IDs follow the existing `wgt-*` pattern
- [ ] Auth tokens included on all admin endpoints: `Authorization: Bearer ${sessionStorage.getItem('auth_token')}`

### agent_guide.yml Compliance Checklist (NEW — Apply to Every Change)

- [ ] **Schema Versioning (§5):** Any change to `Record` struct MUST simultaneously update `SCHEMA_VERSION`, SQL/ChromaDB migrations, and `agent_guide.yml`
- [ ] **Contextual Anchoring (§7 chat_rules):** Every agent response about research MUST cite a UUID from `Record.rs` or a ChromaDB collection name
- [ ] **Data-First (§7 chat_rules):** Agent references existing data before collecting new data
- [ ] **Verification (§7 chat_rules):** Agent asks "Proceed with deployment?" before executing heavy Rust tool-calls (Wiki_Engine, Challenge_Engine, Link_Janitor, Vector_Embedder)
- [ ] **Interaction Mode Detection (§7 interaction_modes):** Agent classifies each query into Execution / Collaborative / Review / Monitor mode and adjusts response vibe accordingly
- [ ] **Priority Hierarchy (§6):** Alert severity and processing order follows Priority 1 (Token Usage) through Priority 8 (Server Status)
- [ ] **Absorption Model (§3):** Wrapper widgets absorb their detail panel scripts — events emit from the wrapper, not the detail script
- [ ] **Merge Logic (§5):** Never overwrite existing UUIDs; merge new Metadata only
- [ ] **Helpful (§7 chat_rules):** Always explain concepts and offer step-by-step guidance

---

## Misalignment Summary (What Rev 1 Got Wrong)

| # | agent_guide.yml Section | Rev 1 Problem | Rev 2 Fix |
|---|-------------------------|---------------|-----------|
| 1 | §2 Capabilities | Plan never routes through the 4 Rust-backed tools (Wikipedia_Engine, Challenge_Engine, Link_Janitor, Vector_Embedder) | Phase 3 now dispatches to actual tool paths, not just widgetState reads |
| 2 | §3 Widget Inventory "Absorbs" | Plan treated wrapper widgets and detail panel scripts as separate event emitters | Phase 1 now emits events from the wrapper only; detail scripts feed data up to their wrapper |
| 3 | §5 Logic Constraint: Schema Versioning | Plan had no schema versioning awareness | Added to engineering checklist; Phase 3 guards Record mutations |
| 4 | §5 Logic Constraint: Contextual Anchoring | `build_widget_summary()` and `build_status_summary()` never cited UUIDs | Phase 3 responses now include `anchored_to` field with UUID or collection reference |
| 5 | §6 Priority Hierarchy (1–8) | Alert thresholds treated all widgets equally | Phase 5 now orders alerts by §6 priority and applies different severity thresholds |
| 6 | §7 Interaction Modes | `try_widget_command()` used a single response style | Phase 3 now detects Execution/Collaborative/Review/Monitor mode and adjusts vibe |
| 7 | §7 Chat Rule: Verification | Phase 4 auto-triggered widget actions with no confirmation | Phase 4 now requires "Proceed?" confirmation before heavy tool-calls |

---

## Architecture Overview

### Current State

```
┌──────────────────┐     CrawlSummaryEvent      ┌─────────────────┐
│  widget_spider   │ ──────────────────────────► │                 │
└──────────────────┘                             │  wgt_agent-chat │
┌──────────────────┐     ContactSummaryEvent     │                 │
│  widget_contact  │ ──────────────────────────► │  Listens for 2  │
└──────────────────┘                             │  events only    │
                                                 │                 │
                              POST /api/v1/      │  Pushes to      │
                              agent/chat  ◄──────│  System Data    │
                                                 │  Viewer         │
                                                 └─────────────────┘
```

Only 2 of 17 non-agent widgets emit events. The other 15 are islands.

### Target State

```
┌──────────────────────────────────────────────────────────────┐
│                    WIDGET EVENT BUS                           │
│                                                              │
│  wgt_page_metrics ──► PageMetricsEvent (absorbs spider)     │
│  wgt_spelling ──────► SpellingCompleteEvent (absorbs spchk) │
│  wgt_contact_triage ► ContactTriageEvent (absorbs contact)  │
│  wgt_agent_workflow ► WorkflowQueueEvent (absorbs queue)    │
│  wgt_server_metrics ► ServerMetricsEvent (absorbs srv info) │
│  wgt_security ──────► SecurityAlertEvent (absorbs sec det.) │
│  wgt_sources ───────► SourcesUpdateEvent (absorbs src det.) │
│  wgt_users ─────────► UsersUpdateEvent (absorbs usr mgr)   │
│  wgt_deadlinks ─────► DeadlinksEvent                        │
│  wgt_token_metrics ─► TokenMetricsEvent                     │
│  wgt_news_crawler ──► NewsCompleteEvent                     │
│  wgt_wiki_interface ► WikiSyncEvent                         │
│  wgt_wiki_weights ──► WikiWeightsEvent                      │
│  wgt_challenge_ranker ChallengeSortEvent                    │
│  wgt_research_suggest ResearchSuggestEvent                  │
│  wgt_draft_results ─► DraftCountsEvent                      │
│  wgt_self_reflection► ReflectionUpdateEvent                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    wgt_agent-chat       │
              │                         │
              │  widgetState map        │
              │  + interaction mode     │
              │    detection            │
              │  + priority-ordered     │
              │    alert system         │
              └────────────┬────────────┘
                           │
              POST /api/v1/agent/chat
              { message, widget_context,
                interaction_mode }
                           │
                           ▼
              ┌─────────────────────────┐
              │    Agent Brain          │
              │                         │
              │  mode-aware responses   │
              │  Rust tool dispatch:    │
              │   Wikipedia_Engine      │
              │   Challenge_Engine      │
              │   Link_Janitor          │
              │   Vector_Embedder       │
              │  UUID-anchored output   │
              │  verification prompts   │
              └─────────────────────────┘
```

Key differences from Rev 1: events emit from the **wrapper** widget (not the detail script), the agent detects **interaction mode**, dispatches through **actual Rust tools**, and responses are **UUID-anchored**.

---

## Phase 1 — Event Bus (Frontend Only)

**Goal:** Every wrapper widget emits a summary event after each successful data fetch. Detail panel scripts feed data to their parent wrapper — they do NOT emit their own events.

### 1.1 Add `dispatchWidgetEvent` helper

**New file:** `frontend/js/widgets/widget_event_bus.js`

```javascript
/**
 * widget_event_bus.js
 * Shared event dispatch helper for all widgets.
 * Import this in every WRAPPER widget that needs to notify the agent.
 * Detail panel scripts (widget_*.js in private/js/) should NOT import this
 * directly — they feed data to their wrapper via DOM or shared state.
 *
 * Ref: agent_guide.yml §3 — wrapper widgets absorb their detail scripts.
 */

/**
 * Dispatch a widget summary event on the window.
 * @param {string} widgetId   — the wrapper card ID, e.g. 'wgt-security'
 * @param {string} eventName  — e.g. 'SecurityAlertEvent'
 * @param {object} summary    — plain JS object with the key data
 */
export function dispatchWidgetEvent(widgetId, eventName, summary) {
    window.dispatchEvent(new CustomEvent(eventName, {
        detail: {
            widget: widgetId,
            timestamp: new Date().toISOString(),
            ...summary
        }
    }));
}
```

### 1.2 Absorption Model — Detail Scripts Feed Wrapper Widgets

Per `agent_guide.yml` §3, these absorption relationships exist:

| Wrapper Widget | Absorbs (Detail Script) | Integration Pattern |
|---------------|------------------------|---------------------|
| `wgt_page_metrics.js` | `widget_spider.js` | Spider dispatches `CrawlSummaryEvent` → Page Metrics wrapper listens, merges into its own `PageMetricsEvent` |
| `wgt_spelling.js` | `widget_spellcheck.js` | Spellcheck detail writes to shared DOM → Spelling wrapper reads DOM state, emits `SpellingCompleteEvent` |
| `wgt_contact_triage.js` | `widget_contact.js` | Contact detail dispatches `ContactSummaryEvent` → Triage wrapper listens, merges into `ContactTriageEvent` |
| `wgt_agent_workflow.js` | `show_queue.js` | Queue display absorbed into workflow widget polling — `show_queue.js` should be deprecated |
| `wgt_server_metrics.js` | `show_server_info.js` | Server info absorbed into server metrics polling — `show_server_info.js` should be deprecated |
| `wgt_agent-self_reflection.js` | `show_trace_reasoning.js` | Trace display absorbed into self-reflection polling — `show_trace_reasoning.js` should be deprecated |
| `wgt_security.js` | `widget_security.js` | Security detail renders logs → Security wrapper reads alert count, emits `SecurityAlertEvent` |
| `wgt_sources.js` | `widget_sources.js` | Sources detail renders CRUD → Sources wrapper reads count, emits `SourcesUpdateEvent` |
| `wgt_users.js` | `widget_user_manager.js` | User manager detail renders CRUD → Users wrapper reads count, emits `UsersUpdateEvent` |

**Implementation rule:** The detail script can still dispatch its own DOM-level events internally (like `CrawlSummaryEvent`), but the **wrapper** is the only script that calls `dispatchWidgetEvent()` to the event bus. This keeps the agent's event surface clean — one event per widget, not duplicates from wrapper + detail.

### 1.3 Widget-by-Widget Event Additions

For each wrapper widget, add one `dispatchWidgetEvent()` call at the end of its successful fetch path.

---

#### `wgt_token_metrics.js` — Emit `TokenMetricsEvent` — **Priority 1 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

// After computing percentage:
dispatchWidgetEvent('wgt-token-metrics', 'TokenMetricsEvent', {
    used: data.used,
    limit: data.limit,
    percent: Math.round((data.used / data.limit) * 100),
    priority: 1  // agent_guide.yml §6
});
```

---

#### `wgt_contact_triage.js` — Emit `ContactTriageEvent` — **Priority 2 per §6**

This wrapper absorbs `widget_contact.js`. Listen for the existing `ContactSummaryEvent` from the detail script and merge:

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

// After own fetch completes:
dispatchWidgetEvent('wgt-contact-triage', 'ContactTriageEvent', {
    new_count: data.new || 0,
    critical_count: data.critical || 0,
    priority: 2  // agent_guide.yml §6
});

// Also absorb detail script events:
window.addEventListener('ContactSummaryEvent', (e) => {
    // Merge detail data into next triage event cycle — do NOT re-emit separately
    if (e.detail) lastContactDetail = e.detail;
});
```

---

#### `wgt_draft_results.js` — Emit `DraftCountsEvent` — **Priority 3 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-draft-results', 'DraftCountsEvent', {
    records: data.records,
    essays: data.essays,
    responses: data.responses,
    priority: 3  // agent_guide.yml §6 — Incomplete Records
});
```

---

#### `wgt_wiki_interface.js` — Emit `WikiSyncEvent` — **Priority 3 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-wiki-interface', 'WikiSyncEvent', {
    running: data.running,
    last_run: data.last_run,
    priority: 3  // agent_guide.yml §6 — Wiki-Merge Status
});
```

---

#### `wgt_wiki_weights.js` — Emit `WikiWeightsEvent` — **Priority 3 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-wiki-weights', 'WikiWeightsEvent', {
    weight_count: Array.isArray(data) ? data.length : 0,
    priority: 3
});
```

---

#### `wgt_research_suggest.js` — Emit `ResearchSuggestEvent` — **Priority 4 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-research-suggest', 'ResearchSuggestEvent', {
    suggestion_count: Array.isArray(data.suggestions) ? data.suggestions.length : 0,
    suggestions: data.suggestions,
    priority: 4  // agent_guide.yml §6 — Potential Essays & Research
});
```

---

#### `wgt_challenge_ranker.js` — Emit `ChallengeSortEvent` — **Priority 4 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-challenge-ranker', 'ChallengeSortEvent', {
    status: 'sorted',
    priority: 4
});
```

---

#### `wgt_agent-self_reflection.js` — Emit `ReflectionUpdateEvent` — **Priority 5 per §6**

This wrapper absorbs `show_trace_reasoning.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-agent-reflection', 'ReflectionUpdateEvent', {
    has_trace: !!traceData.steps,
    has_reflection: !!reflectionData.reflection,
    step_count: traceData.steps ? traceData.steps.length : 0,
    priority: 5  // agent_guide.yml §6 — Self-reflection
});
```

---

#### `wgt_spelling.js` — Emit `SpellingCompleteEvent` — **Priority 5 per §6**

This wrapper absorbs `widget_spellcheck.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-spelling', 'SpellingCompleteEvent', {
    errors_count: data.errors_count || 0,
    priority: 5
});
```

---

#### `wgt_sources.js` — Emit `SourcesUpdateEvent` — **Priority 6 per §6**

This wrapper absorbs `widget_sources.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-sources', 'SourcesUpdateEvent', {
    source_count: Array.isArray(data) ? data.length : 0,
    priority: 6  // agent_guide.yml §6 — ChromaDB Status
});
```

---

#### `wgt_deadlinks.js` — Emit `DeadlinksEvent` — **Priority 6 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-deadlinks', 'DeadlinksEvent', {
    dead_count: data.dead_links ? data.dead_links.length : 0,
    priority: 6
});
```

---

#### `wgt_news_crawler.js` — Emit `NewsCompleteEvent` — **Priority 6 per §6**

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-news-crawler', 'NewsCompleteEvent', {
    status: 'completed',
    raw_message: message,
    priority: 6
});
```

---

#### `wgt_page_metrics.js` — Emit `PageMetricsEvent` — **Priority 7 per §6**

This wrapper absorbs `widget_spider.js`. Listen for `CrawlSummaryEvent` and merge:

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-page-metrics', 'PageMetricsEvent', {
    metrics: data,
    priority: 7  // agent_guide.yml §6 — User metrics: Views, Mentions, Rankings
});

// Absorb spider detail events:
window.addEventListener('CrawlSummaryEvent', (e) => {
    if (e.detail) lastCrawlSummary = e.detail;
});
```

---

#### `wgt_users.js` — Emit `UsersUpdateEvent` — **Priority 7 per §6**

This wrapper absorbs `widget_user_manager.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-users', 'UsersUpdateEvent', {
    user_count: Array.isArray(data) ? data.length : 0,
    priority: 7
});
```

---

#### `wgt_security.js` — Emit `SecurityAlertEvent` — **Priority 7 per §6**

This wrapper absorbs `widget_security.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-security', 'SecurityAlertEvent', {
    total_logs: Array.isArray(data) ? data.length : 0,
    critical_count: critical,
    event_types: Array.isArray(data)
        ? [...new Set(data.map(l => l.event_type))]
        : [],
    priority: 7
});
```

---

#### `wgt_server_metrics.js` — Emit `ServerMetricsEvent` — **Priority 8 per §6**

This wrapper absorbs `show_server_info.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-server-metrics', 'ServerMetricsEvent', {
    cpu: data.cpu,
    memory: data.memory,
    uptime: data.uptime || 'unknown',
    priority: 8  // agent_guide.yml §6 — Server Status (lowest priority)
});
```

---

#### `wgt_agent_workflow.js` — Emit `WorkflowQueueEvent`

This wrapper absorbs `show_queue.js`.

```javascript
import { dispatchWidgetEvent } from './widget_event_bus.js';

dispatchWidgetEvent('wgt-agent-workflow', 'WorkflowQueueEvent', {
    running: data.running,
    pending: data.pending,
    priority: 5
});
```

---

## Phase 2 — Agent Chat Collects Widget State + Detects Interaction Mode

**Goal:** `wgt_agent-chat.js` listens for all widget events, maintains a priority-ordered `widgetState` map, and detects the user's interaction mode per `agent_guide.yml` §7.

### 2.1 Interaction Mode Detection

Per `agent_guide.yml` §7, detect mode from the user's message:

```javascript
/**
 * Detect interaction mode per agent_guide.yml §7.
 * @param {string} message — the user's raw chat input
 * @returns {'execution'|'collaborative'|'review'|'monitor'}
 */
function detectInteractionMode(message) {
    const lower = message.toLowerCase();

    // Execution: brief commands — "Do X", "Run Y", "Trigger Z"
    if (/^(do |run |trigger |start |stop |check |sync |sort |crawl )/i.test(lower)) {
        return 'execution';
    }

    // Review: "Check this", "Is this right?", "Verify", "Audit"
    if (lower.includes('check this') || lower.includes('is this right')
        || lower.includes('verify') || lower.includes('audit')
        || lower.includes('review')) {
        return 'review';
    }

    // Monitor: "getting high", "should I throttle", threshold language
    if (lower.includes('getting high') || lower.includes('throttle')
        || lower.includes('too many') || lower.includes('limit')
        || lower.includes('warning') || lower.includes('alert')) {
        return 'monitor';
    }

    // Collaborative: "What do you think?", "Brainstorm", "How", questions
    if (lower.includes('what do you think') || lower.includes('brainstorm')
        || lower.includes('how should') || lower.includes('suggest')
        || lower.includes('help me') || lower.endsWith('?')) {
        return 'collaborative';
    }

    // Default to collaborative (most helpful)
    return 'collaborative';
}
```

### 2.2 Widget State Collector (Priority-Ordered)

**Insert after line 31** in `wgt_agent-chat.js`:

```javascript
// ── Widget State Collector (Priority-Ordered per agent_guide.yml §6) ──
const widgetState = {};

const WIDGET_EVENTS = [
    'TokenMetricsEvent',       // Priority 1
    'ContactTriageEvent',      // Priority 2
    'DraftCountsEvent',        // Priority 3
    'WikiSyncEvent',           // Priority 3
    'WikiWeightsEvent',        // Priority 3
    'ResearchSuggestEvent',    // Priority 4
    'ChallengeSortEvent',      // Priority 4
    'ReflectionUpdateEvent',   // Priority 5
    'WorkflowQueueEvent',      // Priority 5
    'SpellingCompleteEvent',   // Priority 5
    'SourcesUpdateEvent',      // Priority 6
    'DeadlinksEvent',          // Priority 6
    'NewsCompleteEvent',       // Priority 6
    'PageMetricsEvent',        // Priority 7
    'UsersUpdateEvent',        // Priority 7
    'SecurityAlertEvent',      // Priority 7
    'ServerMetricsEvent'       // Priority 8
];

WIDGET_EVENTS.forEach(eventName => {
    window.addEventListener(eventName, (e) => {
        if (e.detail) {
            widgetState[e.detail.widget || eventName] = {
                event: eventName,
                data: e.detail,
                priority: e.detail.priority || 99,
                received_at: new Date().toISOString()
            };
        }
    });
});
// ── End Widget State Collector ──
```

### 2.3 Send Widget Context + Interaction Mode with Chat Messages

**Modify `handleChatSubmit()`** — change the fetch body from:

```javascript
body: JSON.stringify({ message })
```

To:

```javascript
body: JSON.stringify({
    message,
    widget_context: widgetState,
    interaction_mode: detectInteractionMode(message)
})
```

---

## Phase 3 — Backend: Agent Gains Dashboard Awareness + Tool Dispatch + Mode-Aware Responses

**Goal:** The agent receives widget context AND interaction mode, dispatches to actual Rust tools (§2), anchors responses with UUIDs (§7 chat_rules), and adapts its response vibe to the detected mode (§7 interaction_modes).

### 3.1 New Request DTO

**File:** `app/app_core/src/types/dtos.rs`

```rust
/// Chat request from the dashboard.
/// Includes live widget state and the detected interaction mode
/// per agent_guide.yml §7.
#[derive(Debug, Deserialize)]
pub struct AgentChatRequest {
    pub message: String,
    #[serde(default)]
    pub widget_context: Option<serde_json::Value>,
    #[serde(default = "default_mode")]
    pub interaction_mode: String,
}

fn default_mode() -> String {
    "collaborative".to_string()
}

/// Interaction mode per agent_guide.yml §7.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InteractionMode {
    /// Brief commands — "Do X". Vibe: concise, silent, report success/failure only.
    Execution,
    /// Questions, brainstorming. Vibe: iterative, analytical, suggest 3 alternatives.
    Collaborative,
    /// Audit requests. Vibe: critical, detailed, security-first, highlight breaking changes.
    Review,
    /// Threshold/alert language. Vibe: prompt, clear, concise.
    Monitor,
}

impl InteractionMode {
    pub fn from_str(s: &str) -> Self {
        match s {
            "execution" => Self::Execution,
            "review" => Self::Review,
            "monitor" => Self::Monitor,
            _ => Self::Collaborative,
        }
    }
}
```

### 3.2 Update `handle_agent_chat` handler

**File:** `app/app_ui/src/api_agents.rs` (or wherever `/api/v1/agent/chat` lives)

```rust
use app_core::types::dtos::{AgentChatRequest, InteractionMode};

pub async fn handle_agent_chat(
    State(state): State<AppState>,
    Json(req): Json<AgentChatRequest>,
) -> impl IntoResponse {
    let mode = InteractionMode::from_str(&req.interaction_mode);

    let result = state.brain.as_ref()
        .unwrap()
        .process_query_with_context(
            &req.message,
            req.widget_context.as_ref(),
            &mode,
        )
        .await;

    match result {
        Ok(response) => {
            let mut body = serde_json::json!({
                "response": response.data,
                "data": serde_json::from_str::<serde_json::Value>(&response.data).ok(),
                "confidence": response.confidence
            });

            // Pass through action field if present (Phase 4)
            if let Some(action) = response.metadata.iter()
                .find(|(k, _)| k == "action")
                .map(|(_, v)| v.clone())
            {
                body["action"] = serde_json::Value::String(action);
            }

            // Pass through verification_required flag (§7 chat_rules)
            if let Some(_) = response.metadata.iter()
                .find(|(k, _)| k == "verification_required")
            {
                body["verification_required"] = serde_json::Value::Bool(true);
            }

            (StatusCode::OK, Json(body)).into_response()
        }
        Err(e) => {
            let body = serde_json::json!({
                "response": format!("Error: {e}"),
                "success": false
            });
            (StatusCode::INTERNAL_SERVER_ERROR, Json(body)).into_response()
        }
    }
}
```

### 3.3 New Agent Method: `process_query_with_context`

**File:** `app/app_brain/src/agent.rs`

```rust
use app_core::types::dtos::InteractionMode;

impl Agent {
    /// Process a query with dashboard context and interaction mode.
    /// Complies with agent_guide.yml §2 (tool dispatch), §5 (constraints),
    /// §6 (priority), §7 (modes + chat rules).
    pub async fn process_query_with_context(
        &self,
        raw_query: &str,
        widget_context: Option<&serde_json::Value>,
        mode: &InteractionMode,
    ) -> Result<AgentResponse, AgentError> {
        let safe_query = Self::sanitize(raw_query)?;
        let intent = self.determine_intent(&safe_query);

        // Widget-specific commands use dashboard context
        if let Some(ctx) = widget_context {
            if let Some(widget_response) = self.try_widget_command(&safe_query, ctx, mode).await {
                return Ok(widget_response);
            }
        }

        // Domain engine dispatch (existing intents)
        self.dispatch_intent(&safe_query, intent, mode).await
    }

    /// Dispatch to domain engines per agent_guide.yml §2.
    async fn dispatch_intent(
        &self,
        query: &str,
        intent: Intent,
        mode: &InteractionMode,
    ) -> Result<AgentResponse, AgentError> {
        match intent {
            Intent::Wikipedia => {
                // §2: Wikipedia_Engine — weekly rank/merge Wikipedia metadata
                // §7 Verification: heavy tool-call, requires confirmation
                let result = WikiEngine::calculate(query).await
                    .map_err(|e| AgentError::UnknownIntent)?;
                let mut response = AgentResponse {
                    data: result,
                    confidence: 0.8,
                    metadata: vec![],
                };
                self.apply_mode_vibe(&mut response, mode, "Wikipedia Engine");
                Ok(response)
            }
            Intent::Challenge => {
                // §2: Challenge_Engine — academic vs popular sorting & ranking
                let result = ChallengeEngine::run(query).await
                    .map_err(|e| AgentError::UnknownIntent)?;
                let mut response = AgentResponse {
                    data: result,
                    confidence: 0.8,
                    metadata: vec![],
                };
                self.apply_mode_vibe(&mut response, mode, "Challenge Engine");
                Ok(response)
            }
            Intent::Essay => {
                // Future: EssayEngine
                let dummy = serde_json::json!({
                    "draft_type": "Essay",
                    "title": "Agent Draft",
                    "content": "Essay draft generated. Click 'Edit in CRUD' to refine.",
                    "status": "Ready for review"
                });
                let mut response = AgentResponse {
                    data: dummy.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                };
                self.apply_mode_vibe(&mut response, mode, "Essay Engine");
                Ok(response)
            }
            Intent::Record => {
                // §7 chat_rules: Data-First — reference existing data.
                // §7 chat_rules: Contextual Anchoring — cite UUID.
                let dummy = serde_json::json!({
                    "draft_type": "Record",
                    "anchored_to": "chromadb://records",
                    "source": "Agent Search",
                    "data": "Found records matching query. Referencing existing collection."
                });
                let mut response = AgentResponse {
                    data: dummy.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                };
                self.apply_mode_vibe(&mut response, mode, "Record Engine");
                Ok(response)
            }
            Intent::Response => {
                let mut parent_id = None;
                if let Some(idx) = query.to_uppercase().find("CHAL-") {
                    let id_part: String = query[idx..]
                        .chars()
                        .take_while(|c| c.is_alphanumeric() || *c == '-')
                        .collect();
                    parent_id = Some(id_part.to_uppercase());
                }
                let dummy = serde_json::json!({
                    "draft_type": "Response",
                    "anchored_to": parent_id.as_deref().unwrap_or("none"),
                    "content": format!("Response draft. Challenge ID: {:?}", parent_id),
                    "parent_id": parent_id
                });
                let mut response = AgentResponse {
                    data: dummy.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                };
                self.apply_mode_vibe(&mut response, mode, "Response Engine");
                Ok(response)
            }
            Intent::WidgetCommand | Intent::StatusReport => {
                // Handled in try_widget_command — if we reach here, no context
                Err(AgentError::UnknownIntent)
            }
            Intent::Unknown => Err(AgentError::UnknownIntent),
        }
    }

    /// Apply interaction mode vibe to a response per agent_guide.yml §7.
    fn apply_mode_vibe(
        &self,
        response: &mut AgentResponse,
        mode: &InteractionMode,
        tool_name: &str,
    ) {
        match mode {
            InteractionMode::Execution => {
                // §7: "Concise, silent, report success/failure only."
                response.metadata.push(("vibe".to_string(), "execution".to_string()));
            }
            InteractionMode::Collaborative => {
                // §7: "Iterative, analytical, proactive. Suggest 3 alternatives."
                response.metadata.push(("vibe".to_string(), "collaborative".to_string()));
            }
            InteractionMode::Review => {
                // §7: "Critical, detailed, security-first. Highlight breaking changes."
                response.metadata.push(("vibe".to_string(), "review".to_string()));
            }
            InteractionMode::Monitor => {
                // §7: "Prompt, clear, concise."
                response.metadata.push(("vibe".to_string(), "monitor".to_string()));
            }
        }

        // §7 chat_rules: Verification for heavy tool-calls
        let heavy_tools = ["Wikipedia Engine", "Challenge Engine", "Link Janitor", "Vector Embedder"];
        if heavy_tools.contains(&tool_name) {
            response.metadata.push((
                "verification_required".to_string(),
                format!("Proceed with {}?", tool_name),
            ));
        }
    }
}
```

### 3.4 Widget Command Handler (UUID-Anchored, Mode-Aware)

```rust
impl Agent {
    /// Handle widget-specific commands.
    /// §7 chat_rules: Contextual Anchoring — responses cite collection/UUID.
    /// §7 chat_rules: Data-First — reference existing data.
    async fn try_widget_command(
        &self,
        query: &str,
        context: &serde_json::Value,
        mode: &InteractionMode,
    ) -> Option<AgentResponse> {
        let lower = query.to_lowercase();

        // "status" / "dashboard" / "overview" → priority-ordered summary
        if lower.contains("status") || lower.contains("dashboard") || lower.contains("overview") {
            return Some(self.build_status_summary(context, mode));
        }

        // Widget-specific queries — all anchored to their data source
        let widget_queries: Vec<(&str, &[&str], &str, &str)> = vec![
            // (widget_id, trigger_keywords, label, anchored_to)
            ("wgt-token-metrics", &["token", "usage", "cost", "budget"], "Token Metrics", "system://token_ledger"),
            ("wgt-contact-triage", &["contact", "message", "inbox"], "Contact Triage", "chromadb://contacts"),
            ("wgt-draft-results", &["draft", "incomplete"], "Draft Results", "chromadb://records"),
            ("wgt-wiki-interface", &["wiki sync", "wikipedia status"], "Wiki Interface", "chromadb://wikipedia"),
            ("wgt-wiki-weights", &["weight", "wiki weight"], "Wiki Weights", "chromadb://wiki_weights"),
            ("wgt-research-suggest", &["research", "suggest"], "Research Suggestions", "chromadb://records"),
            ("wgt-challenge-ranker", &["challenge", "claim", "rank"], "Challenge Ranker", "chromadb://challenges"),
            ("wgt-agent-reflection", &["reflection", "trace", "reasoning"], "Self-Reflection", "system://agent_trace"),
            ("wgt-spelling", &["spelling", "spellcheck", "grammar"], "Spelling", "chromadb://records"),
            ("wgt-sources", &["source", "bibliography", "citation"], "Sources", "chromadb://sources"),
            ("wgt-deadlinks", &["deadlink", "broken link", "dead link"], "Deadlinks", "system://link_check"),
            ("wgt-news-crawler", &["news", "crawl"], "News Crawler", "chromadb://news"),
            ("wgt-page-metrics", &["page", "views", "mentions", "ranking"], "Page Metrics", "system://page_scraper"),
            ("wgt-users", &["user", "admin"], "Users", "system://user_registry"),
            ("wgt-security", &["security", "alert", "honeypot", "login fail"], "Security", "system://security_log"),
            ("wgt-server-metrics", &["server", "cpu", "memory", "disk"], "Server Metrics", "system://server_health"),
        ];

        for (widget_id, keywords, label, anchor) in &widget_queries {
            if keywords.iter().any(|kw| lower.contains(kw)) {
                return self.build_widget_summary(context, widget_id, label, anchor, mode);
            }
        }

        None
    }

    /// Build a priority-ordered dashboard summary.
    /// §6: Respects Priority 1 (Token) through Priority 8 (Server).
    fn build_status_summary(
        &self,
        context: &serde_json::Value,
        mode: &InteractionMode,
    ) -> AgentResponse {
        let mut entries: Vec<(u8, String, String)> = Vec::new();

        if let Some(obj) = context.as_object() {
            for (key, val) in obj {
                let priority = val.pointer("/data/priority")
                    .and_then(|p| p.as_u64())
                    .unwrap_or(99) as u8;
                let event = val.get("event")
                    .and_then(|e| e.as_str())
                    .unwrap_or("unknown");
                entries.push((priority, key.clone(), event.to_string()));
            }
        }

        // Sort by priority (§6 order)
        entries.sort_by_key(|(p, _, _)| *p);

        let summary = if entries.is_empty() {
            "No widget data available yet. Widgets will report once they poll their endpoints.".to_string()
        } else {
            entries.iter()
                .map(|(p, key, event)| format!("P{} • {} — {}", p, key, event))
                .collect::<Vec<_>>()
                .join("\n")
        };

        let vibe_note = match mode {
            InteractionMode::Execution => "",
            InteractionMode::Collaborative =>
                "\n\nWould you like me to drill into any specific widget? I can suggest actions for the highest-priority items.",
            InteractionMode::Review =>
                "\n\nReview mode: I'll flag any widgets showing anomalous data or breaking changes.",
            InteractionMode::Monitor =>
                "\n\nMonitoring active. I'll alert you if thresholds are crossed.",
        };

        AgentResponse {
            data: serde_json::json!({
                "type": "dashboard_summary",
                "anchored_to": "system://dashboard",
                "summary": format!("Dashboard Status (priority order):\n{}{}", summary, vibe_note),
                "widget_count": entries.len(),
                "widget_states": context
            }).to_string(),
            confidence: 1.0,
            metadata: vec![
                ("source".to_string(), "widget_context".to_string()),
                ("vibe".to_string(), format!("{:?}", mode).to_lowercase()),
            ],
        }
    }

    /// Build a single-widget summary with UUID anchoring.
    /// §7 chat_rules: Contextual Anchoring — cite UUID/collection.
    /// §7 chat_rules: Data-First — reference existing data.
    fn build_widget_summary(
        &self,
        context: &serde_json::Value,
        widget_id: &str,
        label: &str,
        anchored_to: &str,
        mode: &InteractionMode,
    ) -> Option<AgentResponse> {
        let widget_data = context.get(widget_id)?;
        let priority = widget_data.pointer("/data/priority")
            .and_then(|p| p.as_u64())
            .unwrap_or(99);

        let vibe_suffix = match mode {
            InteractionMode::Execution => String::new(),
            InteractionMode::Collaborative =>
                format!("\n\nSuggested actions: 1) Refresh data, 2) View details, 3) Export to System Data Viewer"),
            InteractionMode::Review =>
                format!("\n\nReview notes: Checking for anomalies in {} data...", label),
            InteractionMode::Monitor =>
                format!("\n\nMonitoring {} — current priority level: P{}", label, priority),
        };

        Some(AgentResponse {
            data: serde_json::json!({
                "type": "widget_summary",
                "widget": widget_id,
                "label": label,
                "anchored_to": anchored_to,
                "priority": priority,
                "state": widget_data,
                "notes": vibe_suffix.trim()
            }).to_string(),
            confidence: 0.95,
            metadata: vec![
                ("source".to_string(), widget_id.to_string()),
                ("vibe".to_string(), format!("{:?}", mode).to_lowercase()),
            ],
        })
    }
}
```

### 3.5 Updated `Intent` Enum and `determine_intent()`

```rust
pub enum Intent {
    Essay,
    Wikipedia,
    Record,
    Challenge,
    Response,
    /// A command targeting a specific widget.
    WidgetCommand,
    /// A request for a dashboard-wide status report.
    StatusReport,
    /// Fallback.
    Unknown,
}

fn determine_intent(&self, query: &str) -> Intent {
    let lower = query.to_lowercase();

    // StatusReport — broadest dashboard query
    if lower.contains("status") || lower.contains("dashboard") || lower.contains("overview") {
        return Intent::StatusReport;
    }

    // WidgetCommand — widget-specific keywords
    // Note: "source" is here (not Record) to match wgt_sources widget.
    // Use "cite" for Record intent instead.
    if lower.contains("security") || lower.contains("spelling") || lower.contains("token")
        || lower.contains("server") || lower.contains("news") || lower.contains("deadlink")
        || lower.contains("contact") || lower.contains("draft") || lower.contains("user")
        || lower.contains("source") || lower.contains("alert") || lower.contains("page metric")
    {
        return Intent::WidgetCommand;
    }

    // Domain engines (§2 tools)
    if lower.contains("essay") || lower.contains("argument") || lower.contains("thesis") {
        Intent::Essay
    } else if lower.contains("wiki") || lower.contains("history") || lower.contains("historical") {
        Intent::Wikipedia
    } else if lower.contains("record") || lower.contains("cite") {
        Intent::Record
    } else if lower.contains("challenge") || lower.contains("claim") || lower.contains("fact") {
        Intent::Challenge
    } else if lower.contains("response") || lower.contains("reply") || lower.contains("answer") {
        Intent::Response
    } else {
        Intent::Unknown
    }
}
```

---

## Phase 4 — Agent Can Trigger Widget Actions (WITH Verification)

**Goal:** The agent can trigger widget actions, but per `agent_guide.yml` §7 chat_rules, it MUST ask "Proceed with deployment?" before executing heavy Rust tool-calls (Wiki_Engine, Challenge_Engine, Link_Janitor, Vector_Embedder).

### 4.1 Verification Protocol

**Two tiers of actions:**

| Tier | Widgets | Verification Required? |
|------|---------|----------------------|
| **Light** (frontend-only, no Rust tool) | News Crawler, Spelling Check, Page Scraper, Deadlinks scan | No — agent triggers immediately |
| **Heavy** (invokes §2 Rust tool) | Wiki Sync (Wikipedia_Engine), Challenge Sort (Challenge_Engine), Deadlinks replace (Link_Janitor), DB operations (Vector_Embedder) | **YES — agent asks "Proceed with [tool]?" and waits** |

### 4.2 Frontend Verification Handler

In `wgt_agent-chat.js`, replace the simple `executeAgentAction` with a two-step flow:

```javascript
/**
 * Handle agent response actions.
 * Light actions execute immediately.
 * Heavy actions show a confirmation prompt per agent_guide.yml §7.
 */
function handleAgentAction(result) {
    if (!result.action) return;

    if (result.verification_required) {
        // Heavy tool-call — show confirmation in chat
        showVerificationPrompt(result.action, result.response);
    } else {
        // Light action — execute immediately
        executeAgentAction(result.action);
    }
}

let pendingAction = null;

function showVerificationPrompt(action, context) {
    pendingAction = action;

    const promptDiv = document.createElement('div');
    promptDiv.style.cssText = "margin:8px 0; padding:10px; background:#fff3cd; border:1px solid #ffc107; border-radius:4px;";
    promptDiv.innerHTML = `
        <strong>Verification Required (agent_guide.yml §7):</strong><br>
        ${context}<br><br>
        <button id="verify-proceed" style="margin-right:8px; padding:4px 12px; background:#28a745; color:white; border:none; border-radius:3px; cursor:pointer;">Proceed</button>
        <button id="verify-cancel" style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:3px; cursor:pointer;">Cancel</button>
    `;

    const history = document.getElementById('chat-messages');
    history.appendChild(promptDiv);
    history.scrollTop = history.scrollHeight;

    document.getElementById('verify-proceed').addEventListener('click', () => {
        promptDiv.remove();
        if (pendingAction) {
            executeAgentAction(pendingAction);
            appendMessage('System', `Confirmed: executing ${pendingAction.replace(/_/g, ' ')}`, false);
            pendingAction = null;
        }
    });

    document.getElementById('verify-cancel').addEventListener('click', () => {
        promptDiv.remove();
        appendMessage('System', 'Action cancelled by admin.', false);
        pendingAction = null;
    });
}

/**
 * Execute a confirmed action.
 */
function executeAgentAction(action) {
    const actionMap = {
        'run_news_crawler':    'wgt-news-crawler',
        'run_spelling_check':  'wgt-spelling',
        'run_wiki_sync':       'wgt-wiki-interface',
        'run_challenge_sort':  'wgt-challenge-ranker',
        'run_page_scraper':    'wgt-page-metrics',
        'run_deadlinks':       'wgt-deadlinks',
    };

    const widgetId = actionMap[action];
    if (!widgetId) {
        console.warn(`[Agent] Unknown action: ${action}`);
        return;
    }

    const widget = document.getElementById(widgetId);
    if (!widget) {
        console.warn(`[Agent] Widget not found: ${widgetId}`);
        return;
    }

    const triggerBtn = widget.querySelector('.wgt-trigger');
    if (triggerBtn) {
        triggerBtn.click();
        appendMessage('System', `Agent triggered: ${action.replace(/_/g, ' ')}`, false);
    }
}
```

### 4.3 Backend: Heavy vs Light Actions

In `try_widget_command()`, mark heavy tool-calls with `verification_required`:

```rust
// Check for action commands: "run X", "trigger Y", "start Z"
if lower.contains("run") || lower.contains("trigger") || lower.contains("start") {
    // Heavy tools per §2 — require verification
    let heavy_actions: Vec<(&str, &str, &str)> = vec![
        ("wiki", "run_wiki_sync", "Wikipedia_Engine: Weekly rank/merge Wikipedia metadata"),
        ("challenge", "run_challenge_sort", "Challenge_Engine: Academic vs popular sorting"),
        ("deadlink", "run_deadlinks", "Link_Janitor: Scan for deadlinks in resources.html"),
    ];

    for (keyword, action, description) in &heavy_actions {
        if lower.contains(keyword) {
            return Some(AgentResponse {
                data: serde_json::json!({
                    "type": "command",
                    "message": format!("Proceed with {}?", description),
                    "anchored_to": format!("tool://{}", action)
                }).to_string(),
                confidence: 1.0,
                metadata: vec![
                    ("action".to_string(), action.to_string()),
                    ("verification_required".to_string(), description.to_string()),
                ],
            });
        }
    }

    // Light actions — no verification
    let light_actions: Vec<(&str, &str)> = vec![
        ("news", "run_news_crawler"),
        ("spelling", "run_spelling_check"),
        ("spellcheck", "run_spelling_check"),
        ("scrape", "run_page_scraper"),
        ("page", "run_page_scraper"),
    ];

    for (keyword, action) in &light_actions {
        if lower.contains(keyword) {
            return Some(AgentResponse {
                data: serde_json::json!({
                    "type": "command",
                    "message": format!("Triggering {} now.", action.replace('_', " "))
                }).to_string(),
                confidence: 1.0,
                metadata: vec![
                    ("action".to_string(), action.to_string()),
                ],
            });
        }
    }
}
```

---

## Phase 5 — Proactive Alerts (Priority-Ordered per §6)

**Goal:** Alerts fire in priority order per `agent_guide.yml` §6 with differentiated severity.

```javascript
/**
 * Check alert thresholds per agent_guide.yml §6 priority order.
 * Priority 1 alerts are always shown.
 * Lower-priority alerts only show if no higher-priority alert is active.
 */
const activeAlerts = new Set();

function checkAlertThresholds(eventName, detail) {
    // §7 chat_rules: "Proactive: Offer up contact summaries, token usage or
    // server stats when appropriate."

    // Priority 1 — Token Usage (ALWAYS alert)
    if (eventName === 'TokenMetricsEvent' && detail.percent > 80) {
        const severity = detail.percent > 95 ? 'CRITICAL' : detail.percent > 90 ? 'WARNING' : 'INFO';
        showAlert(1, `[${severity}] Token usage at ${detail.percent}% (${detail.used}/${detail.limit})`);
    }

    // Priority 2 — Critical Contact Triage
    if (eventName === 'ContactTriageEvent' && detail.critical_count > 0) {
        showAlert(2, `${detail.critical_count} critical contact(s) need triage`);
    }

    // Priority 3 — Incomplete Records / Wiki-Merge
    if (eventName === 'DraftCountsEvent') {
        const total = (detail.records || 0) + (detail.essays || 0) + (detail.responses || 0);
        if (total > 10) {
            showAlert(3, `${total} drafts pending (${detail.records}R / ${detail.essays}E / ${detail.responses}Rsp)`);
        }
    }

    // Priority 5 — Self-reflection anomaly
    if (eventName === 'ReflectionUpdateEvent' && !detail.has_trace && !detail.has_reflection) {
        showAlert(5, 'Agent self-reflection data unavailable — trace may be stale');
    }

    // Priority 6 — Deadlinks
    if (eventName === 'DeadlinksEvent' && detail.dead_count > 0) {
        showAlert(6, `${detail.dead_count} dead link(s) detected`);
    }

    // Priority 5 — Spelling (only if many errors)
    if (eventName === 'SpellingCompleteEvent' && detail.errors_count > 20) {
        showAlert(5, `${detail.errors_count} spelling errors found across database`);
    }

    // Priority 7 — Security alerts
    if (eventName === 'SecurityAlertEvent' && detail.critical_count > 5) {
        showAlert(7, `Security: ${detail.critical_count} critical events (${detail.event_types.join(', ')})`);
    }
}

function showAlert(priority, message) {
    const alertKey = `P${priority}`;

    // Deduplicate — don't spam the same priority level
    if (activeAlerts.has(alertKey)) return;
    activeAlerts.add(alertKey);

    // Clear dedup after 60 seconds
    setTimeout(() => activeAlerts.delete(alertKey), 60000);

    appendMessage(`Alert [P${priority}]`, message, true);
}
```

---

## Implementation Order

| Batch | Phase | What | Files Changed | Risk | §ref |
|-------|-------|------|---------------|------|------|
| 1 | 1.1 | Create `widget_event_bus.js` | 1 new file | None | §3 |
| 2 | 1.2–1.3 | Add absorption model + events to 17 wrappers | 17 JS files | Low | §3, §6 |
| 3 | 2.1 | Add interaction mode detection to chat widget | 1 JS file | Low | §7 |
| 4 | 2.2–2.3 | Add priority-ordered state collector + send context | 1 JS file | Low | §6 |
| 5 | 3.1 | Add `AgentChatRequest` + `InteractionMode` DTOs | `dtos.rs` | None | §7 |
| 6 | 3.2 | Update chat handler with mode + verification | `api_agents.rs` | Low | §7 |
| 7 | 3.3–3.4 | `process_query_with_context` + UUID-anchored widget commands | `agent.rs` | Medium | §2, §5, §7 |
| 8 | 3.5 | Updated intent routing | `agent.rs` | Medium | §2 |
| 9 | 4.1–4.3 | Verification protocol for heavy tool-calls | `wgt_agent-chat.js`, `agent.rs` | Medium | §2, §7 |
| 10 | 5 | Priority-ordered proactive alerts | `wgt_agent-chat.js` | Low | §6, §7 |

**Batches 1–4 are frontend-only and deploy-safe.** Batches 5–8 are backend. Batch 9 adds the verification loop. Batch 10 adds proactive behaviour.

---

## Testing Checklist

1. **Event emission:** Trigger any widget → confirm `CustomEvent` fires from the **wrapper** (not detail script)
2. **Absorption:** Trigger spider crawl → confirm `CrawlSummaryEvent` is absorbed by `wgt_page_metrics` into `PageMetricsEvent`
3. **Priority ordering:** Type `Object.values(widgetState).sort((a,b) => a.priority - b.priority)` in console → confirm P1 token metrics appears first
4. **Interaction mode:** Send "Do run the news crawler" → confirm `interaction_mode: "execution"` in POST body
5. **Mode-aware response:** Ask "What do you think about the token usage?" → confirm response includes 3 suggestions (Collaborative vibe)
6. **UUID anchoring:** Ask "how many sources?" → confirm response includes `"anchored_to": "chromadb://sources"`
7. **Heavy tool verification:** Type "sync wikipedia" → confirm yellow "Proceed with Wikipedia_Engine?" prompt appears before action executes
8. **Light tool no-verify:** Type "run news crawler" → confirm action triggers immediately with no prompt
9. **Priority alerts:** Set token usage to 96% → confirm `[CRITICAL] P1` alert appears; set to 82% → confirm `[INFO] P1` alert
10. **Data-First:** Ask about records → confirm response references existing ChromaDB collection, not "collecting new data"
11. **No regressions:** All traffic lights, detail panels, auto-poll checkboxes, and System Data Viewer still function

---

## Deprecated Scripts (Per §3 Absorption)

After full integration, these scripts should be marked deprecated and eventually removed. Their functionality is absorbed into wrapper widgets:

| Script to Deprecate | Absorbed By |
|---------------------|-------------|
| `show_queue.js` | `wgt_agent_workflow.js` |
| `show_server_info.js` | `wgt_server_metrics.js` |
| `show_trace_reasoning.js` | `wgt_agent-self_reflection.js` |

The detail panel scripts (`widget_*.js` in `private/js/`) are NOT deprecated — they still render the expanded panels. They just no longer emit events directly to the agent bus.
