use serde::{Deserialize, Serialize};
use std::fmt;
use std::num::NonZeroU32;

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

/// A unique identifier for an archaeological site as registered by the
/// Israel Antiquities Authority (IAA).
/// Example: 1548 (The Site of Tel Megiddo)
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct IaaSiteId(NonZeroU32);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl IaaSiteId {
    /// Async-ready constructor for an IAA Site ID.
    /// In production, this would be an entry point for verifying the site
    /// exists in the 'Govmap' or IAA 'Atarim' database.
    pub async fn from_raw(id: u32) -> Result<Self, IaaError> {
        // Delegate to the Gatekeeper for structural integrity
        let valid_id = NonZeroU32::new(id).ok_or(IaaError::InvalidZeroId)?;

        let instance = Self(valid_id);

        // Logical Gate: Validate against known administrative boundaries
        instance.gatekeep_bounds()?;

        Ok(instance)
    }

    /// Generates a link to the Israel Antiquities Authority's
    /// 'Archaeological Survey of Israel' map.
    pub fn survey_map_uri(&self) -> String {
        let s = format!("https://survey.antiquities.org.il/#/main/site/{}", self.0);
        return s;
    }

    /// Pure value getter.
    pub fn value(&self) -> u32 {
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

impl IaaSiteId {
    /// Security & Integrity Gate:
    /// Prevents the use of impossibly high IDs that could be used for
    /// index-exhaustion or database scraping attacks.
    fn gatekeep_bounds(&self) -> Result<(), IaaError> {
        let val = self.0.get();

        // Security Gate: Ceiling for current known site registries.
        // Most IAA site IDs are currently well under 1,000,000.
        const MAX_IAA_SITE_ID: u32 = 5_000_000;

        if val > MAX_IAA_SITE_ID {
            return Err(IaaError::IdOutOfRange(val));
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
pub enum IaaError {
    #[error("IAA Site ID cannot be zero")]
    InvalidZeroId,

    #[error("IAA Site ID {0} is outside the allowed safety range (1-5,000,000)")]
    IdOutOfRange(u32),

    #[error("GIS Error: Site ID does not map to a recognized coordinate in the IAA registry")]
    UnrecognizedSite,

    #[error("Permission Denied: Access to site metadata is restricted by the IAA")]
    AccessRestricted,
}

impl fmt::Display for IaaSiteId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "IAA:{}", self.0)
    }
}
