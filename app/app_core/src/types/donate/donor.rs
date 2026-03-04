use serde::{Deserialize, Serialize};
use std::fmt;
use ulid::Ulid;

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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PrivacyLevel {
    Published,
    Unpublished,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Donor {
    pub id: Ulid,
    pub display_name: String,
    pub privacy: PrivacyLevel,
    pub total_contributed_cents: u64,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Donor {
    /// Async-ready constructor.
    /// Logic: Mandatory fallback to 'Anonymous Unpublished' if name is missing.
    /// Delegates name validation to `DonorGatekeeper`.
    pub async fn try_new(
        name: Option<String>,
        initial_contribution: u64,
    ) -> Result<Self, DonorError> {
        let (final_name, final_privacy) = match name {
            Some(n) if !n.trim().is_empty() => {
                // Gate: only constructible if name passes validation
                let gated = DonorGatekeeper::new(n)?;
                (gated.into_inner(), PrivacyLevel::Published)
            }
            // The "Strict Rule" Fallback
            _ => ("Anonymous".to_string(), PrivacyLevel::Unpublished),
        };

        Ok(Self {
            id: Ulid::new(),
            display_name: final_name,
            privacy: final_privacy,
            total_contributed_cents: initial_contribution,
        })
    }

    /// Async handler to update the privacy toggle
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn set_privacy(&mut self, level: PrivacyLevel) {
        self.privacy = level;
    }

    /// Increments contribution without float-point risk
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn add_funds(&mut self, cents: u64) {
        self.total_contributed_cents += cents;
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

/// A validated donor display name. Possession of this type is proof that the
/// name has passed all length and injection-safety checks.
pub struct DonorGatekeeper(String);

impl DonorGatekeeper {
    /// Security Gatekeeping: Ensures names don't break the UI or carry scripts.
    /// Takes ownership and returns a type-safe wrapper on success.
    pub fn new(name: String) -> Result<Self, DonorError> {
        let trimmed = name.trim();

        if trimmed.len() > 64 {
            return Err(DonorError::NameTooLong);
        }

        // Security: Block common injection characters
        if trimmed
            .chars()
            .any(|c| matches!(c, '<' | '>' | '{' | '}' | '$'))
        {
            return Err(DonorError::IllegalCharacters);
        }

        Ok(Self(trimmed.to_string()))
    }

    /// Provides read-only access to the validated name.
    pub fn value(&self) -> &str {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated name.
    pub fn into_inner(self) -> String {
        self.0
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
#[derive(Debug, Serialize, Deserialize)]
pub enum DonorError {
    NameTooLong,
    IllegalCharacters,
    InvalidRequest(String),
}

impl std::error::Error for DonorError {}

impl fmt::Display for DonorError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NameTooLong => write!(f, "Donor Name Error: Exceeds 64 character limit."),
            Self::IllegalCharacters => {
                write!(f, "Donor Security Error: Name contains prohibited characters.")
            }
            Self::InvalidRequest(m) => write!(f, "Donor Request Error: {}", m),
        }
    }
}
