// 🦴 Skeleton
use serde::{Deserialize, Serialize};
use ts_rs::TS;

// This is where you store the "Source of Truth" for your application's constants,
// configuration categories, and predefined taxonomies.

/// Categories the AI Brain is allowed to use for classification.
/// TS(export) ensures the Frontend "Mirror" stays in sync.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, TS)]
#[ts(export, export_to = "frontend/src/types/")]
pub enum ContentCategory {
    HistoricalRecord,
    PhilosophicalEssay,
    TheologicalAnalysis,
    WikipediaSynthesis,
}

pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const MAX_SEARCH_RESULTS: usize = 50;

// 🧠 Brain

/// Static mapping of Vibes to their numerical weights.
/// This is used by the Brain in `response_calculations`.
pub fn get_vibe_weight(category: ContentCategory) -> f32 {
    match category {
        ContentCategory::HistoricalRecord => 0.95,
        ContentCategory::PhilosophicalEssay => 0.85,
        ContentCategory::TheologicalAnalysis => 0.75,
        ContentCategory::WikipediaSynthesis => 0.60,
    }
}

// 🛡️ Gatekeeper

/// Security Gatekeeping: Helper to validate raw strings into Static Enums.
/// No-Panic: Returns an Option/Result instead of crashing.
pub fn parse_category(input: &str) -> Option<ContentCategory> {
    match input.to_lowercase().as_str() {
        "history" | "record" => Some(ContentCategory::HistoricalRecord),
        "essay" | "philosophy" => Some(ContentCategory::PhilosophicalEssay),
        "jesus" | "theology" => Some(ContentCategory::TheologicalAnalysis),
        "wiki" | "wikipedia" => Some(ContentCategory::WikipediaSynthesis),
        _ => None,
    }
}
