use serde::{Deserialize, Serialize};
use std::fmt;
use std::num::NonZeroU64;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A monotonic Sequence Identifier.
/// Uses NonZeroU64 to ensure 0 is never a valid sequence,
/// often useful for database optimization and "None" representation.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct SequenceId(NonZeroU64);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SequenceId {
    /// Initializer for the start of a stream.
    pub fn first() -> Self {
        // Safe unwrap because 1 is non-zero.
        Self(NonZeroU64::new(1).expect("Static 1 is non-zero"))
    }

    /// Async-ready increment logic.
    /// Returns the NEXT sequence ID in the chain.
    pub async fn next(&self) -> Result<Self, SequenceError> {
        let current_val = self.0.get();

        // Gatekeeping inside the brain: prevent overflow panics
        let next_val = current_val
            .checked_add(1)
            .ok_or(SequenceError::SequenceOverflow)?;

        // Safety: adding 1 to a NonZeroU64 is guaranteed non-zero
        Ok(Self(NonZeroU64::new(next_val).unwrap()))
    }

    /// Pure value getter.
    pub fn value(&self) -> u64 {
        self.0.get()
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

impl TryFrom<u64> for SequenceId {
    type Error = SequenceError;

    /// The Gatekeeper: Validates that we aren't injecting 0
    /// into a monotonic sequence system.
    fn try_from(value: u64) -> Result<Self, Self::Error> {
        NonZeroU64::new(value)
            .map(SequenceId)
            .ok_or(SequenceError::InvalidZeroValue)
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
pub enum SequenceError {
    #[error("Sequence overflow: cannot increment beyond u64::MAX")]
    SequenceOverflow,

    #[error("Invalid sequence value: SequenceId cannot be zero")]
    InvalidZeroValue,

    #[error("Gap detected: incoming sequence is out of order")]
    DiscontinuityDetected,
}

impl fmt::Display for SequenceId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SEQ-{}", self.0)
    }
}
