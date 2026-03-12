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

/// The chronological eras required for the timeline system.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TimelineEra {
    PreIncarnation,
    BirthEarlyLife,
    BaptismPreparation,
    GalileanMinistry,
    JudeanMinistry,
    PassionCrucifixion,
    ResurrectionAscension,
    Theme,
}

/// The core structure for a timeline event.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub id: Uuid,
    pub event_name: String,
    pub era: Option<TimelineEra>, // Option allows the Gatekeeper to catch empty selections
    pub description: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl TimelineEntry {
    /// Async constructor for a new timeline event.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn new(event_name: String, era: Option<TimelineEra>) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_name,
            era,
            description: String::new(),
        }
    }

    /// Processes the entry by verifying it passes the Gatekeeper's checks.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn commit(&self) -> Result<TimelineEra, TimelineError> {
        self.validate_era_selection()
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

pub trait TimelineSecurity {
    fn validate_era_selection(&self) -> Result<TimelineEra, TimelineError>;
}

impl TimelineSecurity for TimelineEntry {
    /// STRICT RULE: Returns an error if one of the specific eras is not selected.
    fn validate_era_selection(&self) -> Result<TimelineEra, TimelineError> {
        match self.era {
            Some(era) => Ok(era),
            None => Err(TimelineError::MissingEraSelection(
                "A timeline era must be selected: pre-incarnation, birth-early-life, \
                baptism-preparation, galilean-ministry, judean-ministry, \
                passion-crucifixion, resurrection-ascension, or theme."
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
pub enum TimelineError {
    /// Triggered when the timeline type is missing.
    MissingEraSelection(String),
    ChronologyViolation(String),
    IntegrityError,
}

impl fmt::Display for TimelineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingEraSelection(msg) => write!(f, "🕒 TIMELINE ERROR: {}", msg),
            Self::ChronologyViolation(msg) => write!(f, "Chronology Error: {}", msg),
            Self::IntegrityError => write!(f, "Gatekeeper: Timeline data integrity compromised."),
        }
    }
}

impl std::error::Error for TimelineError {}
