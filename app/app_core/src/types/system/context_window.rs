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

/// The maximum capacity of the AI Model (e.g., 128k).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct ModelLimit(u32);

impl ModelLimit {
    pub fn value(&self) -> u32 {
        self.0
    }
}

/// The tokens currently consumed by the workspace/prompt.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct WorkspaceUsage(u32);

impl WorkspaceUsage {
    pub fn value(&self) -> u32 {
        self.0
    }
}

/// The available space left for the model to generate a response.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct RemainingCapacity(u32);

impl RemainingCapacity {
    pub fn value(&self) -> u32 {
        self.0
    }
}

/// The unified state of an AI context session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextWindow {
    pub limit: ModelLimit,
    pub used: WorkspaceUsage,
    pub available: RemainingCapacity,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl ContextWindow {
    /// Async-ready calculation of the context state.
    /// Logic: Available = Limit - Used.
    pub async fn calculate(limit: u32, used: u32) -> Result<Self, ContextError> {
        // The Brain delegates to the Gatekeeper for safety
        let limit_t = ModelLimit::validate(limit)?;
        let used_t = WorkspaceUsage(used);

        // Logical check: Prompt cannot exceed the model's physical limit
        let remaining_val = limit
            .checked_sub(used)
            .ok_or(ContextError::ContextOverflow { limit, used })?;

        Ok(Self {
            limit: limit_t,
            used: used_t,
            available: RemainingCapacity(remaining_val),
        })
    }

    /// Determines if there is enough "Breathing Room" for a 512-token response.
    pub fn has_adequate_generation_space(&self, required: u32) -> bool {
        self.available.0 >= required
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

impl ModelLimit {
    pub fn validate(tokens: u32) -> Result<Self, ContextError> {
        // Gatekeeper: A model with 0 context is unusable.
        // Also enforcing a reasonable upper bound (e.g., 2M tokens) for safety.
        if tokens == 0 {
            return Err(ContextError::InvalidModelLimit);
        }
        if tokens > 2_000_000 {
            return Err(ContextError::LimitExceedsSafetyThreshold);
        }
        Ok(Self(tokens))
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
pub enum ContextError {
    #[error("Model context limit cannot be zero")]
    InvalidModelLimit,

    #[error("Context Overflow: Prompt ({used} tokens) exceeds Model Limit ({limit} tokens)")]
    ContextOverflow { limit: u32, used: u32 },

    #[error("Safety Violation: Requested context limit is beyond architectural maximum")]
    LimitExceedsSafetyThreshold,

    #[error("Tokenization Error: Failed to compute workspace usage")]
    TokenizationFailure,
}

impl fmt::Display for ContextWindow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Context: {}/{} tokens used ({} available for completion)",
            self.used.0, self.limit.0, self.available.0
        )
    }
}
