use crate::candle::CandleEngine;
use crate::challenge_engine::ChallengeEngine;
use crate::wiki_engine::WikiEngine;
use async_trait::async_trait;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                           (Traits & Data Types)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The intent category derived from a user's raw query.
/// Each variant maps to a domain engine sub-module.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Eq)]
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
    /// Fallback when no confident intent can be determined.
    Unknown,
}

/// A structured result returned by the Agent to the API layer.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone)]
pub struct AgentResponse {
    /// The primary response payload, serialised as a JSON string.
    pub data: String,
    /// A 0.0–1.0 score indicating model confidence in this response.
    pub confidence: f32,
    /// Optional key-value metadata (e.g. source module, latency).
    pub metadata: Vec<(String, String)>,
}

/// Interaction mode per agent_guide.yml §7.
/// Detected from the user's chat message by the frontend and forwarded
/// in the `interaction_mode` field of the request body.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InteractionMode {
    /// Brief commands ("Do X", "Run Y"). Vibe: concise, no preamble.
    Execution,
    /// Questions and brainstorming. Vibe: iterative, suggest 3 alternatives.
    Collaborative,
    /// Audit / verification requests. Vibe: methodical, flag anomalies.
    Review,
    /// Observation / threshold queries. Vibe: short, alert-aware.
    Monitor,
}

impl InteractionMode {
    /// Parse a string forwarded from the JS `detectInteractionMode` function.
    pub fn from_str(s: &str) -> Self {
        match s {
            "execution" => Self::Execution,
            "review"    => Self::Review,
            "monitor"   => Self::Monitor,
            _           => Self::Collaborative, // default
        }
    }
}

/// The contract every agent orchestrator must satisfy.
/// Implement this on any struct that routes queries to engine modules.
#[async_trait]
pub trait BrainAgent {
    /// Route a raw user query to the appropriate domain engine
    /// and return a typed response.
    async fn orchestrate(&self, input: String) -> Result<AgentResponse, AgentError>;

    /// Context-aware orchestration.
    async fn orchestrate_with_context(
        &self,
        input: String,
        mode: Option<String>,
        context: Option<serde_json::Value>,
    ) -> Result<AgentResponse, AgentError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Orchestration Logic)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

use std::sync::Arc;

/// The primary orchestrator.
/// Holds the inference engine and routes queries to domain modules.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Agent {
    #[allow(dead_code)]
    engine: Arc<CandleEngine>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Agent {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(engine: Arc<CandleEngine>) -> Self {
        Self { engine }
    }

    /// WASM-specific entry point for query processing.
    /// Converts Rust-native errors into JsError for the frontend.
    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = process_query)]
    pub async fn wasm_process_query(&self, raw_query: &str) -> Result<AgentResponse, JsError> {
        self.process_query(raw_query)
            .await
            .map_err(|e| JsError::new(&e.to_string()))
    }

    /// Main entry point: sanitize → classify intent → dispatch to engine.
    pub async fn process_query(&self, raw_query: &str) -> Result<AgentResponse, AgentError> {
        self.process_query_with_context(raw_query, None, None).await
    }

    /// Context-aware entry point.
    pub async fn process_query_with_context(
        &self,
        raw_query: &str,
        mode: Option<String>,
        context: Option<serde_json::Value>,
    ) -> Result<AgentResponse, AgentError> {
        self.process_query_internal(raw_query, mode, context)
            .await
            .map_err(|e| {
                e.downcast::<AgentError>()
                    .unwrap_or(AgentError::UnknownIntent)
            })
    }

    pub(crate) async fn process_query_internal(
        &self,
        raw_query: &str,
        mode: Option<String>,
        context: Option<serde_json::Value>,
    ) -> anyhow::Result<AgentResponse> {
        // Step 1 — Gatekeeper: sanitize and size-check the raw input.
        let safe_query = Self::sanitize(raw_query)?;

        // Log context for Phase 3 audit
        if let Some(m) = &mode {
            println!("[Agent Brain] Interaction Mode: {}", m);
        }
        if let Some(ctx) = &context {
            println!(
                "[Agent Brain] Context Received: {} widgets",
                ctx.as_object().map(|o| o.len()).unwrap_or(0)
            );
        }

        // Step 2 — Brain: classify query intent via keyword heuristic.
        let intent = self.determine_intent(&safe_query);

        // Step 3 — Dispatch: hand off to the relevant domain engine.
        //   Each arm will delegate to its module once sub-modules are built.
        //   `todo!()` is intentional — it makes the slot visible and compile-safe.
        match intent {
            Intent::WidgetCommand | Intent::StatusReport => {
                if let Some(ctx) = context {
                    // This is handled by process_query_with_context calling try_widget_command
                    // But we keep it here for exhaustive match if called via orchestrate
                    if let Some(res) = self
                        .try_widget_command(
                            &safe_query,
                            &ctx,
                            mode.as_deref().unwrap_or("collaborative"),
                        )
                        .await
                    {
                        return Ok(res);
                    }
                }
                Err(anyhow::Error::new(AgentError::UnknownIntent))
            }
            Intent::Essay => {
                // Future: essay_search::EssayEngine::search(&safe_query).await
                let dummy_json = serde_json::json!({
                    "draft_type": "Essay",
                    "title": "Agent Draft",
                    "content": "This is a generated essay draft. Please click 'Edit in CRUD' to move this to the editor.",
                    "status": "Ready for review"
                });

                Ok(AgentResponse {
                    data: dummy_json.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                })
            }
            Intent::Wikipedia => {
                let result = WikiEngine::calculate(&safe_query).await?;
                Ok(AgentResponse {
                    data: result,
                    confidence: 0.8,
                    metadata: vec![],
                })
            }
            Intent::Record => {
                // Future: record_search::RecordEngine::search(&safe_query).await
                let dummy_json = serde_json::json!({
                    "draft_type": "Record",
                    "id": "REC-001",
                    "source": "Agent Search",
                    "data": "Found 3 records matching your query."
                });

                Ok(AgentResponse {
                    data: dummy_json.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                })
            }
            Intent::Challenge => {
                let result = ChallengeEngine::run(&safe_query).await?;
                Ok(AgentResponse {
                    data: result,
                    confidence: 0.8,
                    metadata: vec![],
                })
            }
            Intent::Response => {
                // Future: response_calculations::ResponseEngine::generate(&safe_query).await

                // Temporary heuristic to extract parent_id
                // Assumes format like CHAL-1234 or chal-1234
                let mut parent_id = None;
                if let Some(idx) = safe_query.to_uppercase().find("CHAL-") {
                    let id_part: String = safe_query[idx..]
                        .chars()
                        .take_while(|c| c.is_alphanumeric() || *c == '-')
                        .collect();
                    parent_id = Some(id_part.to_uppercase());
                }

                let dummy_json = serde_json::json!({
                    "draft_type": "Response",
                    "topic": "User query",
                    "content": format!("This is a drafted response. Extracted Challenge ID: {:?}", parent_id),
                    "parent_id": parent_id
                });

                Ok(AgentResponse {
                    data: dummy_json.to_string(),
                    confidence: 0.9,
                    metadata: vec![],
                })
            }
            Intent::Unknown => Err(anyhow::Error::new(AgentError::UnknownIntent)),
        }
    }

    /// Handle widget-specific commands and status reports.
    /// §7 chat_rules: Contextual Anchoring — responses cite collection/UUID.
    /// §7 chat_rules: Data-First — reference existing data before collecting new data.
    /// §4 agent_guide.yml: Heavy tool-calls require admin verification before execution.
    async fn try_widget_command(
        &self,
        query: &str,
        context: &serde_json::Value,
        mode_str: &str,
    ) -> Option<AgentResponse> {
        let lower = query.to_lowercase();
        let mode = InteractionMode::from_str(mode_str);

        // 1. Status/Overview check — priority-ordered dashboard summary
        if lower.contains("status") || lower.contains("dashboard") || lower.contains("overview") {
            return Some(self.build_status_summary(context, &mode));
        }

        // 2. Action triggers (Heavy vs Light per §4)
        if lower.contains("run")
            || lower.contains("trigger")
            || lower.contains("start")
            || lower.contains("sync")
        {
            // Heavy actions — Rust-backed tools that need admin verification (§7 chat_rules)
            let heavy_actions: &[(&str, &str, &str)] = &[
                ("wiki",      "run_wiki_sync",      "Wikipedia_Engine: Weekly rank/merge Wikipedia data"),
                ("challenge", "run_challenge_sort", "Challenge_Engine: Academic vs popular sorting"),
                ("deadlink",  "run_deadlinks",      "Link_Janitor: Scan all pages for broken links"),
                ("embed",     "run_vector_embed",   "Vector_Embedder: Re-embed records into ChromaDB"),
            ];
            for &(kw, act, desc) in heavy_actions {
                if lower.contains(kw) {
                    return Some(AgentResponse {
                        data: serde_json::json!({
                            "response": format!("Proceed with {}?", desc),
                            "action": act,
                            "verification_required": true
                        })
                        .to_string(),
                        confidence: 1.0,
                        metadata: vec![
                            ("action".to_string(), act.to_string()),
                            ("verification_required".to_string(), "true".to_string()),
                        ],
                    });
                }
            }

            // Light actions — execute immediately, no verification required
            let light_actions: &[(&str, &str)] = &[
                ("news",     "run_news_crawler"),
                ("spelling", "run_spelling_check"),
                ("scrape",   "run_page_scraper"),
            ];
            for &(kw, act) in light_actions {
                if lower.contains(kw) {
                    return Some(AgentResponse {
                        data: serde_json::json!({
                            "response": format!("Triggering {} now.", act.replace('_', " ")),
                            "action": act
                        })
                        .to_string(),
                        confidence: 1.0,
                        metadata: vec![("action".to_string(), act.to_string())],
                    });
                }
            }
        }

        // 3. Widget-specific lookups — all anchored to their data source (§7 Contextual Anchoring)
        // Tuple: (widget_id, trigger_keywords, display_label, anchored_to)
        let widget_queries: &[(&str, &[&str], &str, &str)] = &[
            ("wgt-token-metrics",    &["token", "usage", "cost", "budget"],                 "Token Metrics",        "system://token_ledger"),
            ("wgt-contact-triage",   &["contact", "message", "inbox", "triage"],            "Contact Triage",       "chromadb://contacts"),
            ("wgt-draft-results",    &["draft", "incomplete", "pending"],                   "Draft Results",        "chromadb://records"),
            ("wgt-wiki-interface",   &["wiki sync", "wikipedia status", "wiki interface"],  "Wiki Interface",       "chromadb://wikipedia"),
            ("wgt-wiki-weights",     &["weight", "wiki weight", "wikipedia weight"],        "Wiki Weights",         "chromadb://wiki_weights"),
            ("wgt-research-suggest", &["research", "suggest", "suggestion"],                "Research Suggestions", "chromadb://records"),
            ("wgt-challenge-ranker", &["challenge", "claim", "rank"],                       "Challenge Ranker",     "chromadb://challenges"),
            ("wgt-agent-reflection", &["reflection", "trace", "reasoning", "self"],        "Self-Reflection",      "system://agent_trace"),
            ("wgt-spelling",         &["spelling", "spellcheck", "grammar"],                "Spelling",             "chromadb://records"),
            ("wgt-sources",          &["source", "bibliography", "citation"],               "Sources",              "chromadb://sources"),
            ("wgt-deadlinks",        &["deadlink", "broken link", "dead link"],             "Deadlinks",            "system://link_check"),
            ("wgt-news-crawler",     &["news", "crawl", "crawler"],                         "News Crawler",         "chromadb://news"),
            ("wgt-page-metrics",     &["page", "views", "mentions", "ranking"],             "Page Metrics",         "system://page_scraper"),
            ("wgt-users",            &["user", "admin", "accounts"],                        "Users",                "system://user_registry"),
            ("wgt-security",         &["security", "alert", "honeypot", "login fail"],     "Security",             "system://security_log"),
            ("wgt-server-metrics",   &["server", "cpu", "memory", "disk"],                  "Server Metrics",       "system://server_health"),
        ];

        for &(widget_id, keywords, label, anchor) in widget_queries {
            if keywords.iter().any(|kw| lower.contains(kw)) {
                return self.build_widget_summary(context, widget_id, label, anchor, &mode);
            }
        }

        None
    }

    /// Build a priority-ordered dashboard summary.
    /// §6: Respects Priority 1 (Token) through Priority 8 (Server).
    /// §7: Mode-aware vibe suffix appended to the summary.
    fn build_status_summary(&self, context: &serde_json::Value, mode: &InteractionMode) -> AgentResponse {
        let mut entries: Vec<(u64, String, String)> = Vec::new();

        if let Some(obj) = context.as_object() {
            for (key, val) in obj {
                // widgetState shape: { event, data: { widget, priority, ... }, priority, received_at }
                let priority = val.pointer("/data/priority")
                    .and_then(|p| p.as_u64())
                    .or_else(|| val.get("priority").and_then(|p| p.as_u64()))
                    .unwrap_or(99);
                let event = val.get("event")
                    .and_then(|e| e.as_str())
                    .unwrap_or("unknown");
                entries.push((priority, key.clone(), event.to_string()));
            }
        }

        // Sort ascending so P1 (highest priority) comes first
        entries.sort_by_key(|(p, _, _)| *p);

        let summary = if entries.is_empty() {
            "No widget data available yet. Widgets will report once they poll their endpoints.".to_string()
        } else {
            entries
                .iter()
                .map(|(p, key, event)| format!("P{} • {} — {}", p, key, event))
                .collect::<Vec<_>>()
                .join("\n")
        };

        let vibe_note = match mode {
            InteractionMode::Execution    => "",
            InteractionMode::Collaborative =>
                "\n\nWould you like me to drill into any specific widget? I can suggest actions for the highest-priority items.",
            InteractionMode::Review =>
                "\n\nReview mode: I will flag any widgets showing anomalous data or threshold breaches.",
            InteractionMode::Monitor =>
                "\n\nMonitoring active. I will alert you if priority thresholds are crossed.",
        };

        AgentResponse {
            data: serde_json::json!({
                "type": "dashboard_summary",
                "anchored_to": "system://dashboard",
                "response": format!("Dashboard Status (priority order):\n{}{}", summary, vibe_note),
                "widget_count": entries.len()
            })
            .to_string(),
            confidence: 1.0,
            metadata: vec![
                ("source".to_string(), "widget_context".to_string()),
                ("vibe".to_string(),   format!("{:?}", mode).to_lowercase()),
            ],
        }
    }

    /// Build a single-widget summary with UUID anchoring.
    /// §7 chat_rules: Contextual Anchoring — cite collection or system:// source.
    /// §7 chat_rules: Data-First — reference the existing widget state.
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
            .or_else(|| widget_data.get("priority").and_then(|p| p.as_u64()))
            .unwrap_or(99);

        let vibe_suffix: String = match mode {
            InteractionMode::Execution    => String::new(),
            InteractionMode::Collaborative =>
                format!("\n\nSuggested actions: 1) Refresh data, 2) View details panel, 3) Export to System Data Viewer"),
            InteractionMode::Review =>
                format!("\n\nReview notes: Checking {} (P{}) for anomalies...", label, priority),
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
                "response": format!("{} (anchored to {}):{}", label, anchored_to, vibe_suffix)
            })
            .to_string(),
            confidence: 0.95,
            metadata: vec![
                ("source".to_string(), widget_id.to_string()),
                ("vibe".to_string(),   format!("{:?}", mode).to_lowercase()),
            ],
        })
    }

    /// Keyword-based intent classifier.
    /// Replace with embedding-based routing once CandleEngine is wired up.
    fn determine_intent(&self, query: &str) -> Intent {
        let lower = query.to_lowercase();

        if lower.contains("status") || lower.contains("dashboard") || lower.contains("overview") {
            return Intent::StatusReport;
        }

        if lower.contains("security")
            || lower.contains("spelling")
            || lower.contains("token")
            || lower.contains("server")
            || lower.contains("news")
            || lower.contains("deadlink")
            || lower.contains("contact")
            || lower.contains("draft")
            || lower.contains("user")
            || lower.contains("source")
            || lower.contains("alert")
        {
            return Intent::WidgetCommand;
        }

        if lower.contains("essay") || lower.contains("argument") || lower.contains("thesis") {
            Intent::Essay
        } else if lower.contains("wiki")
            || lower.contains("history")
            || lower.contains("historical")
        {
            Intent::Wikipedia
        } else if lower.contains("record") || lower.contains("source") || lower.contains("cite") {
            Intent::Record
        } else if lower.contains("challenge") || lower.contains("claim") || lower.contains("fact") {
            Intent::Challenge
        } else if lower.contains("response") || lower.contains("reply") || lower.contains("answer")
        {
            Intent::Response
        } else {
            Intent::Unknown
        }
    }
}

#[async_trait]
impl BrainAgent for Agent {
    async fn orchestrate(&self, input: String) -> Result<AgentResponse, AgentError> {
        self.process_query(&input).await
    }

    async fn orchestrate_with_context(
        &self,
        input: String,
        mode: Option<String>,
        context: Option<serde_json::Value>,
    ) -> Result<AgentResponse, AgentError> {
        self.process_query_with_context(&input, mode, context).await
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Input Validation)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Agent {
    /// Sanitise raw user input.
    /// Enforces a character limit and strips leading/trailing whitespace.
    /// Rejects inputs consisting entirely of control characters.
    fn sanitize(input: &str) -> Result<String, AgentError> {
        let trimmed = input.trim();

        if trimmed.len() > 16_384 {
            return Err(AgentError::QueryTooLong(trimmed.len()));
        }

        if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_control()) {
            return Err(AgentError::MaliciousInput);
        }

        Ok(trimmed.to_string())
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Query too long: {0} chars exceeds the 16k safety limit")]
    QueryTooLong(usize),

    #[error("Security Violation: input contains only control characters")]
    MaliciousInput,

    #[error("Unknown intent: query could not be routed to any domain engine")]
    UnknownIntent,
}
