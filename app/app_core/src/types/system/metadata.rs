use chrono::{DateTime, Utc};
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
pub enum EntryToggle {
    Record,
    Challenge,
    Response,
    Context,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub id: Ulid,
    pub author: String,
    pub keywords: Vec<String>,
    pub toggle: EntryToggle,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Metadata {
    /// Delegates construction and keyword validation to `MetadataGatekeeper`.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(
        author: String,
        keywords: Vec<String>,
        toggle: EntryToggle,
    ) -> Result<Metadata, MetadataError> {
        Ok(MetadataGatekeeper::new(author, keywords, toggle)?.into_inner())
    }

    pub fn author(&self) -> String {
        self.author.clone()
    }

    pub fn created_at(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from(self.id.datetime())
    }

    pub async fn switch_toggle(&mut self, new_state: EntryToggle) {
        self.toggle = new_state;
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

/// A validated `Metadata`. Possession of this type guarantees that keywords
/// are non-empty, within bounds (1–10), and free of blank entries.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct MetadataGatekeeper(Metadata);

impl MetadataGatekeeper {
    /// Enforces the strict rule of 1–10 keywords and prevents empty strings.
    pub fn new(
        author: String,
        keywords: Vec<String>,
        toggle: EntryToggle,
    ) -> Result<Self, MetadataError> {
        let count = keywords.len();

        if count < 1 {
            return Err(MetadataError::Underflow);
        }

        if count > 10 {
            return Err(MetadataError::Overflow);
        }

        if keywords.iter().any(|k| k.trim().is_empty()) {
            return Err(MetadataError::InvalidContent);
        }

        Ok(Self(Metadata {
            id: Ulid::new(),
            author,
            keywords,
            toggle,
        }))
    }

    /// Provides read-only access to the validated metadata.
    pub fn value(&self) -> &Metadata {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated metadata.
    pub fn into_inner(self) -> Metadata {
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
#[derive(Debug, Serialize)]
pub enum MetadataError {
    Underflow,      // Less than 1 keyword
    Overflow,       // More than 10 keywords
    InvalidContent, // Empty or whitespace keywords
}

impl std::error::Error for MetadataError {}

impl fmt::Display for MetadataError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Underflow => write!(f, "Validation failed: At least 1 keyword is required."),
            Self::Overflow => write!(f, "Validation failed: Maximum of 10 keywords allowed."),
            Self::InvalidContent => write!(f, "Validation failed: Keywords cannot be empty."),
        }
    }
}
