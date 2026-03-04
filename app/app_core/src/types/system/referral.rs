use crate::types::system::*;
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

/// The priority level of the referral.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReferralPriority {
    Routine,
    Urgent,
    Critical,
}

/// A formal handoff or recommendation from the Agent to the User.
/// The SequenceId is the primary anchor for auditability.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentReferral {
    pub anchor: SequenceId,           // The "When" and "In what order"
    pub priority: ReferralPriority,   // The "How fast"
    pub subject: String,              // The "What"
    pub body: String,                 // The "Why/Context"
    pub action_url: Option<ValidUrl>, // The "Where to go next"
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl AgentReferral {
    /// Async-first constructor for a new referral.
    /// Requires the current SequenceId to maintain the chain of thought.
    pub async fn create(
        current_seq: &SequenceId,
        priority: ReferralPriority,
        subject: &str,
        body: &str,
        action_url: Option<ValidUrl>,
    ) -> Result<Self, ReferralError> {
        // 1. Logic Gate: Ensure content isn't empty
        if subject.trim().is_empty() || body.trim().is_empty() {
            return Err(ReferralError::EmptyContent);
        }

        // 2. Delegate security checks to the Gatekeeper
        Self::gatekeep_length(subject, 128)?;
        Self::gatekeep_length(body, 4096)?;

        Ok(Self {
            anchor: *current_seq,
            priority,
            subject: subject.to_string(),
            body: body.to_string(),
            action_url,
        })
    }

    /// Determines if the referral requires immediate UI interruption.
    pub fn is_interruptive(&self) -> bool {
        matches!(self.priority, ReferralPriority::Critical)
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

impl AgentReferral {
    /// Security Gate: Prevents "Buffer Stuffing" or UI-breaking content sizes.
    fn gatekeep_length(text: &str, max: usize) -> Result<(), ReferralError> {
        if text.len() > max {
            return Err(ReferralError::ContentTooLarge {
                actual: text.len(),
                limit: max,
            });
        }
        Ok(())
    }

    /// Security Gate: Ensures the Referral isn't pointing to an insecure URI.
    /// (Leveraging the ValidUrl's internal protocol check as well).
    pub fn verify_safety(&self) -> Result<(), ReferralError> {
        if let Some(ref url) = self.action_url {
            // We could add a blacklist check here (e.g., known phishing domains)
            if url.to_string().contains("malicious-site.com") {
                return Err(ReferralError::UnsafeUrlDetected);
            }
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
pub enum ReferralError {
    #[error("Referral content (subject or body) cannot be empty")]
    EmptyContent,

    #[error("Content exceeds safety limit: {actual} bytes (limit: {limit})")]
    ContentTooLarge { actual: usize, limit: usize },

    #[error("Security Violation: Referral points to a flagged or unsafe URL")]
    UnsafeUrlDetected,

    #[error("Identity Violation: Sequence ID does not match current Agent state")]
    SequenceMismatch,
}

impl fmt::Display for AgentReferral {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let p_tag = match self.priority {
            ReferralPriority::Routine => "[INFO]",
            ReferralPriority::Urgent => "[URGENT]",
            ReferralPriority::Critical => "[CRITICAL]",
        };
        write!(
            f,
            "{} {}: {} ({})",
            p_tag, self.anchor, self.subject, self.body
        )
    }
}
