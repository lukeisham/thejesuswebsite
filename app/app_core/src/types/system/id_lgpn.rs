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

/// A unique identifier for a specific individual in the
/// Lexicon of Greek Personal Names (LGPN).
/// Example: V5b-42791 (An individual named 'Sogenes')
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct LgpnId(NonZeroU64);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl LgpnId {
    /// Async-ready constructor for an LGPN ID.
    /// In a high-vibe setup, this would check against the LGPN XML
    /// exports or their SPARQL endpoint.
    pub async fn from_raw(id: u64) -> Result<Self, LgpnError> {
        // Delegate to the Gatekeeper for structural integrity
        let valid_id = NonZeroU64::new(id).ok_or(LgpnError::InvalidZeroId)?;

        let instance = Self(valid_id);

        // Logical Gate: Safety check against the known ID space
        instance.gatekeep_bounds()?;

        Ok(instance)
    }

    /// Returns the canonical URI for the person in the LGPN online database.
    pub fn uri(&self) -> String {
        return format!("http://www.lgpn.ox.ac.uk/id/V{}", self.0);
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

impl LgpnId {
    /// Security & Integrity Gate:
    /// Ensures we aren't creating IDs that are clearly outside the
    /// current lexicon's dataset (which currently spans volumes 1 through 6).
    fn gatekeep_bounds(&self) -> Result<(), LgpnError> {
        let val = self.0.get();

        // Security Gate: Ceiling to prevent memory/DB overflow attacks
        // using arbitrary large integers.
        const MAX_LGPN_EXPECTED: u64 = 50_000_000;

        if val > MAX_LGPN_EXPECTED {
            return Err(LgpnError::IdOutOfRange(val));
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
pub enum LgpnError {
    #[error("LGPN ID cannot be zero")]
    InvalidZeroId,

    #[error("LGPN ID {0} is outside the allowed safety range")]
    IdOutOfRange(u64),

    #[error("Prosopographical Conflict: ID has been merged or deleted in the master lexicon")]
    RecordConflict,

    #[error("API Timeout: LGPN server did not respond to validation request")]
    ResolutionTimeout,
}

impl fmt::Display for LgpnId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "LGPN-ID:{}", self.0)
    }
}
