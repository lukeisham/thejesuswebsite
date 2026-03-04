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
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SearchWord(pub(crate) String);

impl SearchWord {
    /// Access the underlying string value safely.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SearchWord {
    /// Delegates validation to `SearchGatekeeper` and returns the word on success.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(input: String) -> Result<Self, SearchError> {
        Ok(SearchGatekeeper::new(input)?.into_inner())
    }
}

// Display implementation for seamless logging/UI
impl fmt::Display for SearchWord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
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

/// A validated `SearchWord`. Possession of this type is proof that length
/// and injection-safety rules were satisfied at construction time.
pub struct SearchGatekeeper(SearchWord);

impl SearchGatekeeper {
    const MAX_LENGTH: usize = 100;
    const MIN_LENGTH: usize = 1;

    /// Validates and normalizes the input, then returns a type-safe wrapper.
    pub fn new(input: String) -> Result<Self, SearchError> {
        let trimmed = input.trim();

        if trimmed.len() < Self::MIN_LENGTH {
            return Err(SearchError::EmptyInput);
        }
        if trimmed.len() > Self::MAX_LENGTH {
            return Err(SearchError::TooLong {
                max: Self::MAX_LENGTH,
                found: trimmed.len(),
            });
        }

        let forbidden = ['<', '>', '{', '}', '[', ']', '$', ';'];
        if trimmed.contains(|c| forbidden.contains(&c)) {
            return Err(SearchError::ForbiddenCharacters);
        }

        Ok(Self(SearchWord(trimmed.to_string())))
    }

    /// Provides read-only access to the validated search word.
    pub fn value(&self) -> &SearchWord {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated search word.
    pub fn into_inner(self) -> SearchWord {
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
pub enum SearchError {
    EmptyInput,
    TooLong { max: usize, found: usize },
    ForbiddenCharacters,
}

impl std::error::Error for SearchError {}

impl fmt::Display for SearchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyInput => write!(f, "Search word cannot be empty or just whitespace."),
            Self::TooLong { max, found } => {
                write!(f, "Search word is too long (Max: {}, Found: {}).", max, found)
            }
            Self::ForbiddenCharacters => {
                write!(f, "Search word contains forbidden characters.")
            }
        }
    }
}
