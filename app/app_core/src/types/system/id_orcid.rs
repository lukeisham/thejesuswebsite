use serde::{Deserialize, Serialize};
use std::fmt;

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

/// A validated ORCID iD.
/// Stored as a normalized string (0000-0000-0000-0000) to preserve
/// the 'X' checksum digit if present.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct OrcidId(String);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl OrcidId {
    /// Async-ready constructor.
    /// Useful if you want to verify the ORCID against the Public API
    /// to ensure the record isn't just valid, but actually exists.
    pub async fn parse(raw: &str) -> Result<Self, OrcidError> {
        // Delegate to the Gatekeeper
        let normalized = Self::gatekeep_and_normalize(raw)?;

        Ok(Self(normalized))
    }

    /// Returns the canonical URI for the researcher's profile.
    pub fn uri(&self) -> String {
        return format!("https://orcid.org/{}", self.0);
    }

    /// Returns the canonical URI for the researcher's profile.
    pub fn canonical_format(&self) -> String {
        return format!("[ORCID] {}", self.0);
    }

    /// Returns the ID without hyphens.
    pub fn compact(&self) -> String {
        self.0.replace('-', "")
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

impl OrcidId {
    /// The Gatekeeper: Implements ISO/IEC 7064:2003, MOD 11-2 Checksum.
    fn gatekeep_and_normalize(raw: &str) -> Result<String, OrcidError> {
        // 1. Remove hyphens and whitespace
        let compact: String = raw
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == 'X' || *c == 'x')
            .collect();

        // 2. Structural check (must be 16 characters)
        if compact.len() != 16 {
            return Err(OrcidError::InvalidLength(compact.len()));
        }

        let compact = compact.to_uppercase();
        let base_digits = &compact[..15];
        let check_digit = compact.chars().last().ok_or(OrcidError::InvalidCharacter)?;

        // 3. Checksum Validation (Brain logic moved to Gatekeeper for safety)
        let mut total = 0;
        for c in base_digits.chars() {
            let digit = c.to_digit(10).ok_or(OrcidError::InvalidCharacter)?;
            total = (total + digit) * 2;
        }

        let remainder = total % 11;
        let result = (12 - remainder) % 11;

        let expected_check = if result == 10 {
            'X'
        } else {
            char::from_digit(result, 10).ok_or(OrcidError::ChecksumMismatch)?
        };

        if check_digit != expected_check {
            return Err(OrcidError::ChecksumMismatch);
        }

        // 4. Return formatted: 0000-0000-0000-0000
        Ok(format!(
            "{}-{}-{}-{}",
            &compact[0..4],
            &compact[4..8],
            &compact[8..12],
            &compact[12..16]
        ))
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
pub enum OrcidError {
    #[error("Invalid ORCID length: expected 16 digits, found {0}")]
    InvalidLength(usize),

    #[error("ORCID contains invalid characters (only digits and 'X' allowed)")]
    InvalidCharacter,

    #[error("ORCID Checksum failed (ISO/IEC 7064:2003)")]
    ChecksumMismatch,

    #[error("ORCID Profile not found via public registry")]
    RegistryNotFound,
}

impl fmt::Display for OrcidId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
