/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE SKELETON                               //
//                             (Frontend View Models)                         //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/
use app_core::types::essay::Essay;
use serde::{Deserialize, Serialize};
use ts_rs::TS; // The "Type Safety" bridge

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                                2. THE BRAIN                                //
//                          (View Model Projections)                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// While `codegen.rs` is the action of generating files, `frontend.rs` is
/// the Definition of what the frontend is allowed to see.
/// It acts as a security gatekeeper by defining "View Models" or "Projections"—ensuring the Brain doesn't
/// accidentally leak sensitive internal fields
/// (like database IDs or raw AI prompts) to the user's browser.

/// The "Skeleton" of an Essay as seen by the React/Vue frontend.
/// Notice we don't include internal DB metadata here.
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/")]
pub struct EssayView {
    pub slug: String,
    pub title: String,
    pub snippet: String,
    pub author_vibe: String, // Calculated by the Brain
}

/// A "Security Gatekeeper" conversion.
/// No-Panic: This conversion is pure and infallible.
impl From<Essay> for EssayView {
    fn from(internal: Essay) -> Self {
        Self {
            slug: internal.metadata.id.to_string(),
            title: internal.title,
            snippet: internal.text.chars().take(200).collect(),
            author_vibe: "Analytical".to_string(), // Brain-derived logic
        }
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                          (Security & Type Safety)                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Defines the "Skeleton" of a Search Response for the UI.
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/")]
pub struct SearchResult {
    pub results: Vec<EssayView>,
    pub total_count: usize,
    pub latency_ms: u64,
}
