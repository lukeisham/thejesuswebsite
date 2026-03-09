use crate::types::system::Metadata;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use url::Url;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A specialized, validated wrapper for Wikipedia rankings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct WikipediaRanking(u32);

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WikiWeight {
    pub id: String,
    pub name: String,
    pub match_target: String,
    pub match_value: String,
    pub weight_score: i32,
}

/// State 1: Lean Article. No ranking, no metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikipediaArticlesUnRanked {
    pub title: String,
    pub url: Url,
}

/// State 2: Fully Loaded Article. Both ranking and metadata are "Toggled On".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikipediaArticlesRanked {
    pub title: String,
    pub url: Url,
    pub ranking: WikipediaRanking,
    pub metadata: Arc<Metadata>,
}

/// The Jesus Article Type with Toggleable Ranking and Toggleable Metadata
/// (Legacy pattern using Options instead of distinct state types)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wikipedia {
    pub title: String,
    pub url: Url,
    pub ranking: Option<WikipediaRanking>, // Toggle: Some = On, None = Off
    pub metadata: Option<Arc<Metadata>>,   // Toggle: Some = On, None = Off
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl WikipediaArticlesUnRanked {
    /// Async constructor for the raw Jesus article data.
    pub async fn new(raw_title: String, url: Url) -> Self {
        Self {
            title: raw_title.trim().to_string(),
            url,
        }
    }

    /// Transition Logic: This "Toggles On" the Ranking and Metadata.
    /// It consumes 'self', ensuring we don't drop or duplicate the title/url.
    pub async fn hydrate(
        self,
        rank_value: u32,
        meta: Metadata,
    ) -> Result<WikipediaArticlesRanked, WikipediaError> {
        // Gatekeeping the rank value
        let validated_rank = WikipediaRanking::try_new(rank_value)?;

        // Return the upgraded state
        Ok(WikipediaArticlesRanked {
            title: self.title,
            url: self.url,
            ranking: validated_rank,
            metadata: Arc::new(meta),
        })
    }
}

impl Wikipedia {
    /// Async constructor.
    /// should_rank: Toggles ranking calculation.
    /// provided_meta: If Some(Metadata), toggles metadata "On".
    pub async fn new(
        raw_title: String,
        url: Url,
        provided_meta: Option<Metadata>,
        should_rank: bool,
    ) -> Result<Self, WikipediaError> {
        let clean_title = Self::process_title(raw_title).await;

        // Ranking Toggle Logic
        let ranking = if should_rank {
            let calculated_value = 1; // Placeholder for Trait logic defined elsewhere
            Some(WikipediaRanking::try_new(calculated_value)?)
        } else {
            None
        };

        // Metadata Toggle Logic
        // We wrap the metadata in Arc only if it exists
        let metadata = provided_meta.map(Arc::new);

        Ok(Self {
            title: clean_title,
            url,
            ranking,
            metadata,
        })
    }

    async fn process_title(raw: String) -> String {
        raw.trim().to_string()
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

impl WikipediaRanking {
    /// Validates the numeric integrity of the rank before it can exist.
    pub fn try_new(value: u32) -> Result<Self, WikipediaError> {
        if value == 0 {
            return Err(WikipediaError::InvalidRanking("Rank 0 is invalid".into()));
        }
        Ok(Self(value))
    }

    /// Safe accessor for when the ranking is toggled 'On'
    pub fn value(&self) -> u32 {
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

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum WikipediaError {
    #[error("Ranking Validation: {0}")]
    InvalidRanking(String),

    #[error("External Trait Failure: {0}")]
    CalculationError(String),
}
