use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

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

/// A Universally Unique Lexicographically Sortable Identifier.
/// Wrapped in a Newtype pattern for Type Safety and Gatekeeping.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct UlidNumber(pub ulid::Ulid);

impl UlidNumber {
    /// Internal helper to expose the inner bytes if needed for DB storage.
    pub fn to_bytes(&self) -> [u8; 16] {
        self.0.to_bytes()
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

impl UlidNumber {
    /// Async-friendly generation.
    /// While ULID generation is generally fast, wrapping it allows for
    /// integration into async telemetry or entropy-gathering hooks.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn generate() -> UlidNumber {
        // Generating a ULID is usually synchronous, but we provide an
        // async entry point to respect the "Async First" rule.
        Self(ulid::Ulid::new())
    }

    /// Returns the timestamp component of the ULID.
    pub fn datetime(&self) -> std::time::SystemTime {
        self.0.datetime()
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

impl FromStr for UlidNumber {
    type Err = UlidError;

    /// The Gatekeeper: Strict validation on string input.
    /// Prevents malformed strings from entering the system.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // 1. Length Check (ULIDs are exactly 26 chars)
        if s.len() != 26 {
            return Err(UlidError::InvalidLength(s.len()));
        }

        // 2. Format Check
        ulid::Ulid::from_string(s)
            .map(UlidNumber)
            .map_err(|_| UlidError::InvalidFormat)
    }
}

impl TryFrom<[u8; 16]> for UlidNumber {
    type Error = UlidError;

    fn try_from(bytes: [u8; 16]) -> Result<Self, Self::Error> {
        let inner = ulid::Ulid::from_bytes(bytes);
        // Additional business logic security gates could go here
        // (e.g., rejecting IDs from the far future).
        Ok(Self(inner))
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, thiserror::Error)]
pub enum UlidError {
    #[error("Invalid ULID length: expected 26, got {0}")]
    InvalidLength(usize),

    #[error("Invalid ULID format: string contains non-Crockford Base32 characters")]
    InvalidFormat,

    #[error("Source entropy failure")]
    EntropyError,
}

// Ensure we never panic when displaying the ID
impl fmt::Display for UlidNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.to_string())
    }
}
