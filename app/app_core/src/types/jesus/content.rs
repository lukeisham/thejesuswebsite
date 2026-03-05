use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The fundamental categories for all spiritual and historical data.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Content {
    Miracle,
    Parable,
    Saying,
    Sermon,
    Other,
}

/// The base data structure for a Content Entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentEntry {
    pub id: Uuid,
    pub title: String,
    pub body: String,
    /// Wrapped in Option to catch cases where the user fails to select a type.
    pub category: Option<Content>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl ContentEntry {
    /// Async-first constructor.
    pub async fn new(title: String, body: String, category: Option<Content>) -> Self {
        Self {
            id: Uuid::new_v4(),
            title,
            body,
            category,
        }
    }

    /// High-level handler to "finalize" content for the app.
    /// This is where the Brain consults the Gatekeeper.
    pub async fn process(&self) -> Result<Content, EntryError> {
        self.validate_content_selection()
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

pub trait SecurityGuard {
    fn validate_content_selection(&self) -> Result<Content, EntryError>;
}

impl SecurityGuard for ContentEntry {
    /// STRICT RULE: Returns an error if one of the five (six) options is not selected.
    fn validate_content_selection(&self) -> Result<Content, EntryError> {
        match self.category {
            Some(valid_type) => Ok(valid_type),
            None => Err(EntryError::MissingSelection(
                "Selection Required: You must categorize this content as either: \
                miracle, parable, saying, sermon, or other."
                    .into(),
            )),
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

#[derive(Debug, Serialize, Deserialize)]
pub enum EntryError {
    /// The specific error triggered when the 'Content' type is missing.
    MissingSelection(String),
    ValidationFailure(String),
    UnauthorizedAccess,
}

impl fmt::Display for EntryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingSelection(msg) => write!(f, "🚨 CATEGORY ERROR: {}", msg),
            Self::ValidationFailure(msg) => write!(f, "Validation failed: {}", msg),
            Self::UnauthorizedAccess => write!(f, "Gatekeeper: Access Denied."),
        }
    }
}

impl std::error::Error for EntryError {}
