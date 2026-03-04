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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AcademicArticleId {
    /// The raw string representation of a Digital Object Identifier (DOI)
    pub doi: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl AcademicArticleId {
    /// Delegates construction and DOI validation to `ArticleGatekeeper`.
    pub async fn try_new(raw_doi: String) -> Result<Self, AcademicArticleIdError> {
        Ok(ArticleGatekeeper::new(raw_doi)?.into_inner())
    }

    /// Returns the full proxy URL for the DOI (e.g., https://doi.org/...)
    pub fn canonical_format(&self) -> String {
        return format!("[DOI] {}", self.doi);
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

/// A validated `AcademicArticleId`. Possession of this type guarantees the
/// DOI has passed all format and security checks.
pub struct ArticleGatekeeper(AcademicArticleId);

impl ArticleGatekeeper {
    /// Validates DOI directory prefix and structure, then wraps the result.
    pub fn new(raw_doi: String) -> Result<Self, AcademicArticleIdError> {
        let trimmed = raw_doi.trim();

        if trimmed.is_empty() {
            return Err(AcademicArticleIdError::EmptyIdentifier);
        }

        // DOIs must start with the '10.' directory indicator
        if !trimmed.starts_with("10.") {
            return Err(AcademicArticleIdError::InvalidPrefix);
        }

        // DOIs must have a slash separating the registrant from the object
        if !trimmed.contains('/') {
            return Err(AcademicArticleIdError::MissingSeparator);
        }

        // Basic security: length check to prevent buffer-style attacks or spam
        if trimmed.len() > 255 {
            return Err(AcademicArticleIdError::IdentifierTooLong);
        }

        Ok(Self(AcademicArticleId {
            doi: trimmed.to_lowercase(),
        }))
    }

    /// Provides read-only access to the validated article ID.
    pub fn value(&self) -> &AcademicArticleId {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated article ID.
    pub fn into_inner(self) -> AcademicArticleId {
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

#[derive(Debug, Serialize)]
pub enum AcademicArticleIdError {
    EmptyIdentifier,
    InvalidPrefix,     // Doesn't start with "10."
    MissingSeparator,  // Missing the "/" between prefix and suffix
    IdentifierTooLong, // Exceeds safety limits
}

impl std::error::Error for AcademicArticleIdError {}

impl fmt::Display for AcademicArticleIdError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyIdentifier => write!(f, "DOI cannot be empty."),
            Self::InvalidPrefix => {
                write!(f, "Invalid DOI: Must start with the '10.' directory prefix.")
            }
            Self::MissingSeparator => {
                write!(f, "Invalid DOI: Must contain a '/' to separate prefix and suffix.")
            }
            Self::IdentifierTooLong => {
                write!(f, "DOI exceeds the maximum safety length of 255 characters.")
            }
        }
    }
}
