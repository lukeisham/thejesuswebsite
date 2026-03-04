use serde::{Deserialize, Serialize};
use std::fmt;
use std::num::NonZeroU64;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A unique identifier for a historical place in the Pleiades Gazetteer.
/// Example: 579885 (Syracuse)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct PleiadesId(NonZeroU64);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl PleiadesId {
    /// Async-ready constructor for a Pleiades ID.
    /// In a high-vibe setup, this could verify existence against a local
    /// GeoJSON cache or the Pleiades API.
    pub async fn from_raw(id: u64) -> Result<Self, PleiadesError> {
        // Delegate to the Gatekeeper for structural integrity
        let valid_id = NonZeroU64::new(id).ok_or(PleiadesError::InvalidZeroId)?;

        let instance = Self(valid_id);

        // Logical Gate: Ensure the ID is within a plausible historical range
        instance.gatekeep_range()?;

        Ok(instance)
    }

    /// Returns the canonical URI for the Pleiades resource.
    pub fn uri(&self) -> String {
        return format!("https://pleiades.stoa.org/places/{}", self.0);
    }

    /// Pure value getter.
    pub fn value(&self) -> u64 {
        self.0.get()
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

impl PleiadesId {
    /// Security & Integrity Gate:
    /// Prevents the system from processing IDs that are impossibly large or
    /// known to be outside the gazetteer's current allocation strategy.
    fn gatekeep_range(&self) -> Result<(), PleiadesError> {
        let val = self.0.get();

        // Pleiades IDs are currently significantly lower than this,
        // but we set a safe ceiling to prevent database overflow attacks.
        const MAX_PLAUSIBLE_ID: u64 = 10_000_000_000;

        if val > MAX_PLAUSIBLE_ID {
            return Err(PleiadesError::IdOutOfRange(val));
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

#[derive(Debug, thiserror::Error)]
pub enum PleiadesError {
    #[error("Pleiades ID cannot be zero")]
    InvalidZeroId,

    #[error("Pleiades ID {0} is outside the allowed safety range")]
    IdOutOfRange(u64),

    #[error("Network Error: Could not resolve Pleiades ID via API")]
    ResolutionFailure,

    #[error("Data Integrity: Pleiades resource has been deprecated or merged")]
    ResourceDeprecated,
}

impl fmt::Display for PleiadesId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "pleiades:{}", self.0)
    }
}
