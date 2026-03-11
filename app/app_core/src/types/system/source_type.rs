use serde::{Deserialize, Serialize};
use std::fmt;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                           (Data Types & Schema)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Categorises a source as a book, journal article, or web page.
/// Used on `Source` to distinguish bibliography entry formatting.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SourceType {
    Book,
    Article,
    WebSource,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic)                                  //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SourceType {
    /// Parses a human-friendly string into a `SourceType`.
    /// Accepts: "book", "article", "websource", "web", "url".
    pub fn parse(s: &str) -> Result<Self, SourceTypeError> {
        SourceTypeGatekeeper::new(s).map(|gk| gk.into_inner())
    }

    /// Returns the canonical string representation for SQLite storage.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Book => "Book",
            Self::Article => "Article",
            Self::WebSource => "WebSource",
        }
    }
}

impl Default for SourceType {
    fn default() -> Self {
        Self::WebSource
    }
}

impl fmt::Display for SourceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Input Validation)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A validated `SourceType`. Possession of this type guarantees the input
/// string mapped to a known variant.
pub struct SourceTypeGatekeeper(SourceType);

impl SourceTypeGatekeeper {
    /// Validates the input string against known source type labels.
    pub fn new(s: &str) -> Result<Self, SourceTypeError> {
        match s.trim().to_lowercase().as_str() {
            "book" => Ok(Self(SourceType::Book)),
            "article" => Ok(Self(SourceType::Article)),
            "websource" | "web" | "url" => Ok(Self(SourceType::WebSource)),
            _ => Err(SourceTypeError::InvalidType(s.to_string())),
        }
    }

    /// Provides read-only access to the validated source type.
    pub fn value(&self) -> &SourceType {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated source type.
    pub fn into_inner(self) -> SourceType {
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
pub enum SourceTypeError {
    InvalidType(String),
}

impl std::error::Error for SourceTypeError {}

impl fmt::Display for SourceTypeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidType(s) => {
                write!(
                    f,
                    "Unknown source type \"{}\". Expected: book, article, or websource.",
                    s
                )
            }
        }
    }
}
