/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

use crate::types::system::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

/// A single step in a system's reasoning process.
/// The SequenceId is placed first to ensure lexicographical
/// sorting and clear ownership of the timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceReasoning {
    pub id: SequenceId,            // The order in the thought-stream
    pub content: String,           // The actual reasoning/log logic
    pub created_at: DateTime<Utc>, // Temporal anchor
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl TraceReasoning {
    /// Async constructor to create a new reasoning step.
    /// We pass in the previous SequenceId to generate the next one safely.
    pub async fn emit(prev_id: &SequenceId, thought: String) -> Result<Self, TraceError> {
        // Business Logic: The Brain determines the next step in the sequence
        let next_id = prev_id
            .next()
            .await
            .map_err(|_| TraceError::SequenceFailure)?;

        // Gatekeeping check before instantiation
        Self::validate_content(&thought)?;

        Ok(Self {
            id: next_id,
            content: thought,
            created_at: Utc::now(),
        })
    }

    /// Provides a formatted view of the trace for debugging.
    pub fn summary(&self) -> String {
        let result = format!(
            "[{}] T+{}: {}",
            self.id,
            self.created_at.timestamp(),
            self.content
        );
        result
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security Gatekeeping & Validators)                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl TraceReasoning {
    /// The Gatekeeper: Ensures we don't bloat memory with massive traces
    /// and prevents empty or whitespace-only noise.
    fn validate_content(text: &str) -> Result<(), TraceError> {
        let trimmed = text.trim();

        if trimmed.is_empty() {
            return Err(TraceError::EmptyReasoning);
        }

        // Security Gate: Prevent "Log Injection" or Memory Exhaustion
        if trimmed.len() > 10_000 {
            return Err(TraceError::ReasoningTooLarge);
        }

        Ok(())
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
pub enum TraceError {
    #[error("Trace sequence failed to increment")]
    SequenceFailure,

    #[error("Reasoning content cannot be empty")]
    EmptyReasoning,

    #[error("Reasoning content exceeds safety limit (10k chars)")]
    ReasoningTooLarge,

    #[error("Trace integrity violation: timestamp is in the future")]
    TemporalAnomaly,
}

impl fmt::Display for TraceReasoning {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Trace({}): {}", self.id, self.content)
    }
}
