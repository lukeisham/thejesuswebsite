use serde::{Deserialize, Serialize};
use std::fmt;
use url::Url;

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

/// A human-readable label for a URL (e.g., "Documentation", "Homepage").
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UrlName(pub String);

impl fmt::Display for UrlName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A validated, absolute URL wrapper.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidUrl(pub Url);

impl fmt::Display for ValidUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// The composite type combining the name and the resource locator.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NamedUrl {
    pub name: UrlName,
    pub target: ValidUrl,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl NamedUrl {
    /// Async-ready constructor for creating a named URL.
    /// This allows for future integration with DNS pre-fetching or
    /// availability pings without breaking the API.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn new(name: &str, target: &str) -> Result<NamedUrl, UrlError> {
        let name = UrlName::parse(name)?;
        let target = ValidUrl::parse(target)?;

        Ok(Self { name, target })
    }

    /// Returns the domain of the underlying URL.
    pub fn domain(&self) -> Option<&str> {
        self.target.0.domain()
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

impl UrlName {
    pub fn parse(raw: &str) -> Result<Self, UrlError> {
        let trimmed = raw.trim();

        // Gatekeeper: Reject empty or excessively long names
        if trimmed.is_empty() {
            return Err(UrlError::EmptyName);
        }
        if trimmed.len() > 64 {
            return Err(UrlError::NameTooLong);
        }

        Ok(Self(trimmed.to_string()))
    }
}

impl ValidUrl {
    pub fn parse(raw: &str) -> Result<Self, UrlError> {
        // Gatekeeper: Enforce absolute URLs and HTTPS-only for security
        let parsed = Url::parse(raw).map_err(|_| UrlError::InvalidFormat)?;

        if parsed.scheme() != "https" && parsed.scheme() != "http" {
            return Err(UrlError::InsecureProtocol);
        }

        Ok(Self(parsed))
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
pub enum UrlError {
    #[error("URL Name cannot be empty")]
    EmptyName,

    #[error("URL Name exceeds 64 characters")]
    NameTooLong,

    #[error("Invalid URL format: must be a valid absolute URI")]
    InvalidFormat,

    #[error("Security violation: Only HTTP or HTTPS protocols are allowed")]
    InsecureProtocol,
}

impl fmt::Display for NamedUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.name.0, self.target.0)
    }
}
