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

/// A validated publication year in the range 1000–2100.
/// Used on `Source` to record when a book, article, or web page was published.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct PublicationYear(u16);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic)                                  //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl PublicationYear {
    /// Delegates construction and validation to `PublicationYearGatekeeper`.
    pub fn try_new(year: u16) -> Result<Self, PublicationYearError> {
        PublicationYearGatekeeper::new(year).map(|gk| gk.into_inner())
    }

    /// Returns the inner year as `u16`.
    pub fn value(&self) -> u16 {
        self.0
    }
}

impl From<PublicationYear> for u16 {
    fn from(py: PublicationYear) -> u16 {
        py.0
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

/// A validated `PublicationYear`. Possession of this type guarantees the year
/// falls within the acceptable range.
pub struct PublicationYearGatekeeper(PublicationYear);

impl PublicationYearGatekeeper {
    const MIN_YEAR: u16 = 1000;
    const MAX_YEAR: u16 = 2100;

    /// Validates that `year` falls within 1000–2100 inclusive.
    pub fn new(year: u16) -> Result<Self, PublicationYearError> {
        if year < Self::MIN_YEAR || year > Self::MAX_YEAR {
            return Err(PublicationYearError::OutOfRange(year));
        }
        Ok(Self(PublicationYear(year)))
    }

    /// Provides read-only access to the validated year.
    pub fn value(&self) -> &PublicationYear {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated year.
    pub fn into_inner(self) -> PublicationYear {
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
pub enum PublicationYearError {
    OutOfRange(u16),
}

impl std::error::Error for PublicationYearError {}

impl fmt::Display for PublicationYearError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OutOfRange(y) => {
                write!(f, "Publication year {} is outside valid range 1000–2100.", y)
            }
        }
    }
}
