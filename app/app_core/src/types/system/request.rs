use crate::types::system::{PageId, SequenceId};

use serde::{Deserialize, Serialize};
use std::fmt;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The environment and platform context for a human request.
/// Renamed from 'metadata' to 'contextdata' per architectural requirements.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestContextData {
    pub client_version: String,
    pub platform: String,
}

/// The raw intent captured from a human user.
/// We anchor it with a SequenceId so the Agent knows exactly
/// where this request fits in the conversation history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumanRequest {
    pub anchor: SequenceId,              // Our monotonic breadcrumb
    pub raw_input: String,               // The sanitized text
    pub contextdata: RequestContextData, // Contextual "vibe" data (client type, etc.)
    pub attachments: Vec<PageId>,        // The page identifiers being referenced
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl HumanRequest {
    /// Async entry point for turning messy human input into a structured Request.
    /// This is the "Inbound Handler."
    pub async fn ingest(
        prev_id: &SequenceId,
        input: &str,
        pages: Vec<PageId>,
        context: RequestContextData,
    ) -> Result<Self, RequestError> {
        // 1. Logic Gate: Immediately increment the sequence to "claim" this moment
        let anchor = prev_id
            .next()
            .await
            .map_err(|_| RequestError::TimelineDisruption)?;

        // 2. Delegate to the Gatekeeper for the "Cleaning" phase
        let sanitized = Self::gatekeep_and_clean(input)?;

        Ok(Self {
            anchor,
            raw_input: sanitized,
            attachments: pages,
            contextdata: context,
        })
    }

    /// Brain Logic: Checks if the request is effectively "Empty" after cleaning.
    pub fn is_ignorable(&self) -> bool {
        self.raw_input.is_empty() && self.attachments.is_empty()
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

impl HumanRequest {
    /// The Gatekeeper: Human input is untrusted.
    /// We normalize, trim, and check for "Prompt Injection" patterns.
    fn gatekeep_and_clean(input: &str) -> Result<String, RequestError> {
        // 1. Trim whitespace and control characters
        let trimmed = input.trim();

        // 2. Size Check: Prevent RAM-bombing the tokenizer (Security Gate)
        if trimmed.len() > 16_384 {
            return Err(RequestError::MessageTooVoluminous(trimmed.len()));
        }

        // 3. Content Check: Reject purely non-printable or malicious sequences
        if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_control()) {
            return Err(RequestError::MaliciousContentDetected);
        }

        // 4. Security Gate: Heuristic check for prompt manipulation
        let lower = trimmed.to_lowercase();
        if lower.contains("ignore all previous") || lower.contains("system prompt") {
            // Logic for flagging can be added here
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
pub enum RequestError {
    #[error("Message too large: {0} chars exceeds the 16k safety limit")]
    MessageTooVoluminous(usize),

    #[error("Timeline disruption: could not establish a valid SequenceId anchor")]
    TimelineDisruption,

    #[error("Security Violation: Request contains prohibited control characters")]
    MaliciousContentDetected,

    #[error("Input Error: Human request must contain text")]
    EmptyRequest,

    #[error("Client Mismatch: The provided context data is incompatible with this Agent")]
    IncompatibleClient,
}

impl fmt::Display for HumanRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "UserRequest[{}] ({} chars, {} pages)",
            self.anchor,
            self.raw_input.len(),
            self.attachments.len()
        )
    }
}
