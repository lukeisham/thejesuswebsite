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

/// The contract every agent orchestrator must satisfy.
/// Implement this on any struct that routes queries to engine modules.
#[async_trait]
pub trait BrainAgent {
    /// Route a raw user query to the appropriate domain engine
    /// and return a typed response.
    async fn orchestrate(&self, input: String) -> Result<AgentResponse, AgentError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Orchestration Logic)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The primary orchestrator.
/// Holds the inference engine and routes queries to domain modules.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Agent {
    #[allow(dead_code)]
    engine: CandleEngine,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Agent {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(engine: CandleEngine) -> Self {
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

    /// Main entry point: sanitise → classify intent → dispatch to engine.
    pub async fn process_query(&self, raw_query: &str) -> Result<AgentResponse, AgentError> {
        self.process_query_internal(raw_query).await.map_err(|e| {
            e.downcast::<AgentError>()
                .unwrap_or(AgentError::UnknownIntent)
        })
    }

    pub(crate) async fn process_query_internal(
        &self,
        raw_query: &str,
    ) -> anyhow::Result<AgentResponse> {
        // Step 1 — Gatekeeper: sanitise and size-check the raw input.
        let safe_query = Self::sanitize(raw_query)?;

        // Step 2 — Brain: classify query intent via keyword heuristic.
        let intent = self.determine_intent(&safe_query);

        // Step 3 — Dispatch: hand off to the relevant domain engine.
        //   Each arm will delegate to its module once sub-modules are built.
        //   `todo!()` is intentional — it makes the slot visible and compile-safe.
        match intent {
            Intent::Essay => {
                // Future: essay_search::EssayEngine::search(&safe_query).await
                todo!("EssayEngine not yet implemented")
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
                todo!("RecordEngine not yet implemented")
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
                todo!("ResponseEngine not yet implemented")
            }
            Intent::Unknown => Err(anyhow::Error::new(AgentError::UnknownIntent)),
        }
    }

    /// Keyword-based intent classifier.
    /// Replace with embedding-based routing once CandleEngine is wired up.
    fn determine_intent(&self, query: &str) -> Intent {
        let lower = query.to_lowercase();

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
