use crate::models::{Essay, SearchWords};
use async_trait::async_trait;
use strsim::levenshtein;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (The Trait Definition)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[async_trait]
pub trait Search: Send + Sync + 'static {
    type Source;
    type Item;

    /// Basic search functionality for raw strings (URLs, titles, etc.)
    async fn search(&self, query: &str, count: usize) -> Result<Vec<String>, SearchError>;

    /// Async first: Returns the single best match based on triangulation logic
    async fn triangulate(
        &self,
        source: &Self::Source,
        anchors: [SearchWords; 3],
    ) -> Result<Vec<Self::Item>, SearchError>;
}

/// Ranking contract: transforms raw input into a ranked output.
/// Used by challenge processors and any downstream ranker implementors.
#[async_trait]
pub trait Rank: Send + Sync + 'static {
    type Input;
    type Output;

    async fn rank(&self, input: Vec<Self::Input>) -> Result<Vec<Self::Output>, anyhow::Error>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct LevenshteinTriangulator;

#[async_trait]
impl Search for LevenshteinTriangulator {
    type Source = Vec<Essay>;
    type Item = Essay;

    async fn search(&self, _query: &str, _count: usize) -> Result<Vec<String>, SearchError> {
        // LevenshteinTriangulator is optimized for triangulation.
        // For general search, we might return an empty list or implement a basic fallback.
        Ok(Vec::new())
    }

    async fn triangulate(
        &self,
        source: &Self::Source,
        anchors: [SearchWords; 3],
    ) -> Result<Vec<Self::Item>, SearchError> {
        // Gatekeeping: Verify input integrity before heavy computation
        self.validate_anchors(&anchors)?;

        // No-Panic: Use iterators to find the absolute minimum score
        let mut scored_items: Vec<(usize, Essay)> = source
            .iter()
            .map(|essay| {
                // Summing distances for all three anchors to find the 'centroid'
                let total_distance: usize = anchors
                    .iter()
                    .map(|anchor| levenshtein(&essay.title, &anchor.0))
                    .sum();
                (total_distance, essay.clone())
            })
            .collect::<Vec<(usize, Essay)>>();

        // Sort by total distance (lowest first)
        scored_items.sort_by_key(|(score, _)| *score);

        // Take up to top 10 results
        let results: Vec<Essay> = scored_items
            .into_iter()
            .take(10)
            .map(|(_, essay): (usize, Essay)| essay)
            .collect::<Vec<Essay>>();

        // Explicitly handle the "Nothing Found" state
        if results.is_empty() {
            Err(SearchError::NoResultsFound)
        } else {
            Ok(results)
        }
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Constraints)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl LevenshteinTriangulator {
    /// Security Gatekeeping: Prevent DoS via massive strings or empty queries
    fn validate_anchors(&self, anchors: &[SearchWords; 3]) -> Result<(), SearchError> {
        for anchor in anchors {
            let trimmed = anchor.0.trim();
            if trimmed.is_empty() {
                return Err(SearchError::InvalidQuery("Anchor words cannot be empty".into()));
            }
            if trimmed.len() > 500 {
                return Err(SearchError::SecurityViolation(
                    "Anchor word exceeds safety limit".into(),
                ));
            }
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
pub enum SearchError {
    #[error("Security Breach: {0}")]
    SecurityViolation(String),

    #[error("Invalid Query: {0}")]
    InvalidQuery(String),

    #[error("No results matched the triangulation criteria")]
    NoResultsFound,

    #[error("Processing Error: {0}")]
    CalculationError(String),
}
