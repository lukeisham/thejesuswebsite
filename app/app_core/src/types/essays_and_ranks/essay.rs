use crate::types::system::{Metadata, Picture, Source};
use serde::{Deserialize, Serialize};

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

use crate::types::system::PublicationStatus;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Essay {
    pub metadata: Metadata,
    pub title: String,
    pub author: String,
    pub text: String,
    pub cover_image: Option<Picture>,
    pub bibliography: Vec<Source>,
    pub status: PublicationStatus,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Essay {
    /// Async-first initialization.
    /// Takes existing Metadata, as it's defined elsewhere.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn compose(
        title: String,
        body: String,
        author: String,
        metadata: Metadata,
    ) -> Result<Self, EssayError> {
        Ok(Self {
            metadata,
            title,
            author,
            text: body,
            cover_image: None,
            bibliography: Vec::new(),
            status: PublicationStatus::Unpublished,
        })
    }

    /// Transitions the essay to a published state.
    /// This is an async operation to allow for future integration with
    /// background indexing or notification services.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn publish(&mut self) -> Result<(), EssayError> {
        // Consult the Gatekeeper before changing state
        self.check_publication_readiness()?;

        self.status = PublicationStatus::Published;
        // Logic for updating metadata timestamps would go here

        Ok(())
    }

    pub async fn add_source(&mut self, source: Source) {
        self.bibliography.push(source);
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

impl Essay {
    /// Strictly validates the essay's state.
    /// Returns a Result to avoid panics and enforce error handling upstream.
    pub fn check_publication_readiness(&self) -> Result<(), EssayError> {
        // Type Safety: Ensure title isn't just whitespace
        if self.title.trim().is_empty() {
            return Err(EssayError::IncompleteContent("Title is required for publication."));
        }

        // Security Gatekeeping: Basic length check to prevent "empty" spam
        if self.text.trim().len() < 100 {
            return Err(EssayError::IncompleteContent(
                "Essay body is too short to meet quality standards.",
            ));
        }

        // Logic check: Ensure bibliography isn't empty if citations are expected
        if self.bibliography.is_empty() && self.text.contains("[") {
            return Err(EssayError::ValidationWarning(
                "Citations detected but bibliography is empty.",
            ));
        }

        Ok(())
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EssayError {
    /// Used when the essay doesn't meet the structural requirements for a state change.
    IncompleteContent(&'static str),
    /// Used when a logic mismatch is found (e.g., citations without sources).
    ValidationWarning(&'static str),
    /// For unauthorized modifications.
    AccessDenied,
    /// For issues during async operations.
    InternalConcurrencyIssue,
}

impl std::fmt::Display for EssayError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::IncompleteContent(msg) => write!(f, "Content Error: {}", msg),
            Self::ValidationWarning(msg) => write!(f, "Validation Warning: {}", msg),
            Self::AccessDenied => write!(f, "Security: Access Denied"),
            Self::InternalConcurrencyIssue => write!(f, "System: Async operation failed"),
        }
    }
}

impl std::error::Error for EssayError {}
