use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

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

/// The fundamental classification for an entry.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Classification {
    Event,
    Location,
    Person,
    Theme,
}

/// The core structure for a Classified Entry.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedEntry {
    pub id: Uuid,
    pub label: String,
    /// Wrapped in Option to allow the Gatekeeper to enforce a choice.
    pub classification: Option<Classification>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl TypedEntry {
    /// Async-ready constructor for a new classified entry.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn new(label: String, classification: Option<Classification>) -> Self {
        Self {
            id: Uuid::new_v4(),
            label,
            classification,
        }
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn finalize(&self) -> Result<Classification, TypeError> {
        self.verify_classification()
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

pub trait TypeSecurity {
    fn verify_classification(&self) -> Result<Classification, TypeError>;
}

impl TypeSecurity for TypedEntry {
    /// STRICT RULE: Returns an error if one of the four types is not selected.
    fn verify_classification(&self) -> Result<Classification, TypeError> {
        match self.classification {
            Some(class) => Ok(class),
            None => Err(TypeError::MissingTypeSelection(
                "Classification Required: You must select one of the following: \
                event, location, person, or theme."
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Serialize, Deserialize)]
pub enum TypeError {
    /// The specific error triggered when the 'type' is missing.
    MissingTypeSelection(String),
    SystemConflict(String),
}

impl fmt::Display for TypeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingTypeSelection(msg) => write!(f, "🏷️ TYPE ERROR: {}", msg),
            Self::SystemConflict(msg) => write!(f, "System Conflict: {}", msg),
        }
    }
}

impl std::error::Error for TypeError {}
