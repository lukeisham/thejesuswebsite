use serde::{Deserialize, Serialize};
use std::fmt;

use std::num::NonZeroU32;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// An atomic unit of text used by an AI model.
/// Wrapped in a Newtype to prevent accidental arithmetic with raw integers.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct AiToken {
    pub id: NonZeroU32,      // The vocabulary index
    pub weight: Option<f32>, // Logit/probability (optional Brain data)
}

impl PartialEq for AiToken {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for AiToken {}

impl std::hash::Hash for AiToken {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

impl PartialOrd for AiToken {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for AiToken {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.id.cmp(&other.id)
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl AiToken {
    /// Async-ready constructor.
    /// In a production vibe, this might fetch the token's string
    /// representation from a cached tokenizer map.
    pub async fn new(id: u32, weight: Option<f32>) -> Result<Self, TokenError> {
        let valid_id = NonZeroU32::new(id).ok_or(TokenError::InvalidZeroToken)?;

        // Gatekeeping logic inside the brain
        Self::validate_weight(weight)?;

        Ok(Self {
            id: valid_id,
            weight,
        })
    }

    /// Pure value accessor for the vocabulary index.
    pub fn index(&self) -> u32 {
        self.id.get()
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

impl AiToken {
    /// The Gatekeeper: Validates token weights (logits/probs).
    /// Ensures weights are not NaN or Infinite, which would crash downstream math.
    fn validate_weight(weight: Option<f32>) -> Result<(), TokenError> {
        if let Some(w) = weight {
            if w.is_nan() || w.is_infinite() {
                return Err(TokenError::UnstableWeight);
            }
        }
        Ok(())
    }

    /// Security Gate: Verifies the token ID is within the model's vocabulary limit.
    pub fn verify_bounds(&self, vocab_size: u32) -> Result<(), TokenError> {
        if self.id.get() >= vocab_size {
            return Err(TokenError::OutOfBounds(self.id.get(), vocab_size));
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
pub enum TokenError {
    #[error("Token ID 0 is reserved/invalid in this context")]
    InvalidZeroToken,

    #[error("Token ID {0} exceeds vocabulary size {1}")]
    OutOfBounds(u32, u32),

    #[error("Unstable weight detected: Weight must be a finite number (no NaN/Inf)")]
    UnstableWeight,

    #[error("Decoding failure: Token ID does not exist in vocabulary map")]
    MissingVocabularyMapping,
}

impl fmt::Display for AiToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.weight {
            Some(w) => write!(f, "Token#{} (p={:.4})", self.id, w),
            None => write!(f, "Token#{}", self.id),
        }
    }
}
