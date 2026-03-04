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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchDomain {
    pub url_scope: UrlDomain,
    pub subject_scope: SubjectDomain,
}

/// Restricts search to specific URL patterns (e.g., "edu", "org", or "wikipedia.org")
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UrlDomain(pub(crate) String);

/// Restricts search to loosely defined categories (e.g., "Theology", "History")
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SubjectDomain(pub(crate) String);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SearchDomain {
    /// Delegates construction to `DomainGatekeeper`.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_compose(url_raw: String, subject_raw: String) -> Result<Self, DomainError> {
        Ok(DomainGatekeeper::new(url_raw, subject_raw)?.into_inner())
    }
}

impl UrlDomain {
    pub fn try_new(input: String) -> Result<Self, DomainError> {
        if input.is_empty() {
            return Err(DomainError::EmptyInput("URL Domain".to_string()));
        }
        if input.contains('/') || input.contains(':') || input.contains('\\') {
            return Err(DomainError::SecurityViolation(
                "URL Domain must be a host pattern only (no protocols or paths)".to_string(),
            ));
        }
        if !input
            .chars()
            .all(|c| c.is_alphanumeric() || c == '.' || c == '-')
        {
            return Err(DomainError::InvalidFormat(
                "URL Domain contains illegal characters".to_string(),
            ));
        }
        Ok(Self(input.to_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl SubjectDomain {
    pub fn try_new(input: String) -> Result<Self, DomainError> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err(DomainError::EmptyInput("Subject Domain".to_string()));
        }
        if trimmed.len() > 50 {
            return Err(DomainError::LimitExceeded("Subject label too long (max 50)".to_string()));
        }
        if trimmed.contains(['<', '>', '{', '}', '$']) {
            return Err(DomainError::SecurityViolation(
                "Subject contains forbidden symbols".to_string(),
            ));
        }
        Ok(Self(trimmed.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
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

/// A validated `SearchDomain`. Possession of this type guarantees that both
/// URL and subject fields have passed security and format checks.
pub struct DomainGatekeeper(SearchDomain);

impl DomainGatekeeper {
    /// Validates both URL domain and subject, then wraps the `SearchDomain`.
    pub fn new(url_raw: String, subject_raw: String) -> Result<Self, DomainError> {
        if url_raw.is_empty() {
            return Err(DomainError::EmptyInput("URL Domain".to_string()));
        }

        if url_raw.contains('/') || url_raw.contains(':') || url_raw.contains('\\') {
            return Err(DomainError::SecurityViolation(
                "URL Domain must be a host pattern only (no protocols or paths)".to_string(),
            ));
        }

        if !url_raw
            .chars()
            .all(|c| c.is_alphanumeric() || c == '.' || c == '-')
        {
            return Err(DomainError::InvalidFormat(
                "URL Domain contains illegal characters".to_string(),
            ));
        }

        let trimmed_subject = subject_raw.trim();
        if trimmed_subject.is_empty() {
            return Err(DomainError::EmptyInput("Subject Domain".to_string()));
        }

        if trimmed_subject.len() > 50 {
            return Err(DomainError::LimitExceeded("Subject label too long (max 50)".to_string()));
        }

        if trimmed_subject.contains(['<', '>', '{', '}', '$']) {
            return Err(DomainError::SecurityViolation(
                "Subject contains forbidden symbols".to_string(),
            ));
        }

        Ok(Self(SearchDomain {
            url_scope: UrlDomain(url_raw.to_lowercase()),
            subject_scope: SubjectDomain(trimmed_subject.to_string()),
        }))
    }

    /// Provides read-only access to the validated domain.
    pub fn value(&self) -> &SearchDomain {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated domain.
    pub fn into_inner(self) -> SearchDomain {
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
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DomainError {
    EmptyInput(String),
    InvalidFormat(String),
    SecurityViolation(String),
    LimitExceeded(String),
}

impl std::error::Error for DomainError {}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyInput(ctx) => write!(f, "Domain Error: {} cannot be empty", ctx),
            Self::InvalidFormat(msg) => write!(f, "Domain Format Error: {}", msg),
            Self::SecurityViolation(msg) => write!(f, "Domain Security Alert: {}", msg),
            Self::LimitExceeded(msg) => write!(f, "Domain Constraint Error: {}", msg),
        }
    }
}
