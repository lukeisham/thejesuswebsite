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

/// Categories of New Testament Greek Manuscripts based on the Gregory-Aland system.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ManuscriptCategory {
    Papyri,     // e.g., P52
    Uncial,     // e.g., 01 (Sinaiticus)
    Minuscule,  // e.g., 1739
    Lectionary, // e.g., l241 (starts with 'l')
}

/// A validated Gregory-Aland (GA) Manuscript Number.
/// Example: "P46", "01", "1739", "L241"
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GregoryAlandId {
    pub category: ManuscriptCategory,
    pub number: u32,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl GregoryAlandId {
    /// Async-ready constructor.
    /// In a production environment, this might check the INTF (Institute for
    /// New Testament Textual Research) virtual manuscript room database.
    pub async fn parse(raw: &str) -> Result<Self, ManuscriptError> {
        let cleaned = raw.trim().to_uppercase();

        // Delegate to the Gatekeeper for structural validity
        Self::gatekeep_format(&cleaned)
    }

    /// Provides the canonical representation (e.g., "𝔓52" or "01").
    pub fn canonical_format(&self) -> String {
        match self.category {
            ManuscriptCategory::Papyri => format!("P{}", self.number),
            ManuscriptCategory::Uncial => format!("{:02}", self.number), // Uncials often use leading zeros
            ManuscriptCategory::Minuscule => self.number.to_string(),
            ManuscriptCategory::Lectionary => format!("L{}", self.number),
        }
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

impl GregoryAlandId {
    /// Security & Validity Gate: Enforces the rules of the GA system.
    fn gatekeep_format(s: &str) -> Result<Self, ManuscriptError> {
        if s.is_empty() {
            return Err(ManuscriptError::EmptyId);
        }

        // 1. Check for Papyri (starts with P)
        if s.starts_with('P') || s.starts_with('𝔓') {
            let num = s
                .trim_start_matches(|c| c == 'P' || c == '𝔓')
                .parse::<u32>()
                .map_err(|_| ManuscriptError::InvalidNumericValue)?;
            return Ok(Self {
                category: ManuscriptCategory::Papyri,
                number: num,
            });
        }

        // 2. Check for Lectionaries (starts with L or l)
        if s.starts_with('L') {
            let num = s
                .trim_start_matches('L')
                .parse::<u32>()
                .map_err(|_| ManuscriptError::InvalidNumericValue)?;
            return Ok(Self {
                category: ManuscriptCategory::Lectionary,
                number: num,
            });
        }

        // 3. Handle Uncials vs Minuscules
        let num = s
            .parse::<u32>()
            .map_err(|_| ManuscriptError::InvalidFormat)?;

        // Logic Gate: GA Uncials are traditionally denoted by a leading zero or
        // are within the 01-0322 range.
        if s.starts_with('0') || num < 1000 && s.len() > 1 {
            Ok(Self {
                category: ManuscriptCategory::Uncial,
                number: num,
            })
        } else {
            Ok(Self {
                category: ManuscriptCategory::Minuscule,
                number: num,
            })
        }
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
pub enum ManuscriptError {
    #[error("Manuscript ID cannot be empty")]
    EmptyId,

    #[error("Invalid GA format: manuscript must start with P, L, or be a number")]
    InvalidFormat,

    #[error("Numeric component of the ID is malformed or too large")]
    InvalidNumericValue,

    #[error("Manuscript not found in the Gregory-Aland registry")]
    RegistryNotFound,
}

impl fmt::Display for GregoryAlandId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.canonical_format())
    }
}
