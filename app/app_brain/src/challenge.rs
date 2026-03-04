use crate::addmetadata::AddMetadata;
use crate::models::{
    AcademicChallenge, PopularChallenge, RawAcademicChallenge, RawPopularChallenge,
};
use crate::search::Rank;
use crate::search::Search;

use async_trait::async_trait;
use url::Url;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                   (Imports & Generation Contracts)                         //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[async_trait]
pub trait ChallengeGenerator {
    type Output;

    /// Entry point for the "Tool"
    async fn generate(&self, count: usize) -> Result<Vec<Self::Output>, ToolError>;
}

#[async_trait]
pub trait ChallengeProcessor {
    type Input;
    type Output;

    /// The master function to transform raw data into a ranked, tagged product
    async fn process_pipeline(&self, raw: Vec<Self::Input>)
        -> Result<Vec<Self::Output>, ToolError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct PopularChallengeTool<S: Search>(pub S);
pub struct AcademicChallengeTool<S: Search>(pub S);

#[async_trait]
impl<S: Search + Send + Sync> ChallengeGenerator for PopularChallengeTool<S> {
    type Output = RawPopularChallenge;

    async fn generate(&self, count: usize) -> Result<Vec<Self::Output>, ToolError> {
        // 1. Gatekeeper Check
        self.verify_range(count)?;

        // 2. Call External Search (The Engine)
        let results = self
            .0
            .search("trending", count)
            .await
            .map_err(|e| ToolError::SearchFailure(e.to_string()))?;

        // 3. Map to Skeleton (No-Panic conversion)
        let mut processed = Vec::with_capacity(results.len());
        for item in results {
            let source = Url::parse(&item).map_err(|_| ToolError::MappingError)?;
            processed.push(RawPopularChallenge { source });
        }
        Ok(processed)
    }
}

#[async_trait]
impl<S: Search + Send + Sync> ChallengeGenerator for AcademicChallengeTool<S> {
    type Output = RawAcademicChallenge;

    async fn generate(&self, count: usize) -> Result<Vec<Self::Output>, ToolError> {
        self.verify_range(count)?;

        let results = self
            .0
            .search("academic", count)
            .await
            .map_err(|e| ToolError::SearchFailure(e.to_string()))?;

        let mut processed = Vec::with_capacity(results.len());
        for item in results {
            let source = Url::parse(&item).map_err(|_| ToolError::MappingError)?;
            processed.push(RawAcademicChallenge { source });
        }
        Ok(processed)
    }
}

pub struct PopularRanker<R: Rank, M: AddMetadata<PopularChallenge>>(pub R, pub M);
pub struct AcademicRanker<R: Rank, M: AddMetadata<AcademicChallenge>>(pub R, pub M);

#[async_trait]
impl<R, M> ChallengeProcessor for PopularRanker<R, M>
where
    R: Rank<Input = RawPopularChallenge, Output = PopularChallenge> + Send + Sync + 'static,
    M: AddMetadata<PopularChallenge> + Send + Sync + 'static,
{
    type Input = RawPopularChallenge;
    type Output = PopularChallenge;

    async fn process_pipeline(
        &self,
        raw: Vec<Self::Input>,
    ) -> Result<Vec<Self::Output>, ToolError> {
        // 1. Gatekeeper check on the batch
        self.verify_batch_integrity(&raw)?;

        // 2. Ranking Step (The Brain uses the external Rank trait)
        let ranked = self
            .0
            .rank(raw)
            .await
            .map_err(|e| ToolError::ProcessingFailure(format!("Ranking failed: {e}")))?;

        // 3. Metadata Step (Enriching each item in the ranked list)
        let mut final_list = Vec::with_capacity(ranked.len());
        for item in ranked {
            let enriched = self.1.attach(item).await.map_err(|e| {
                ToolError::ProcessingFailure(format!("Metadata attachment failed: {e}"))
            })?;
            final_list.push(enriched);
        }

        Ok(final_list)
    }
}

#[async_trait]
impl<R, M> ChallengeProcessor for AcademicRanker<R, M>
where
    R: Rank<Input = RawAcademicChallenge, Output = AcademicChallenge> + Send + Sync + 'static,
    M: AddMetadata<AcademicChallenge> + Send + Sync + 'static,
{
    type Input = RawAcademicChallenge;
    type Output = AcademicChallenge;

    async fn process_pipeline(
        &self,
        raw: Vec<Self::Input>,
    ) -> Result<Vec<Self::Output>, ToolError> {
        self.verify_batch_integrity(&raw)?;

        let ranked = self
            .0
            .rank(raw)
            .await
            .map_err(|e| ToolError::ProcessingFailure(format!("Ranking failed: {e}")))?;

        let mut final_list = Vec::with_capacity(ranked.len());
        for item in ranked {
            let enriched = self.1.attach(item).await.map_err(|e| {
                ToolError::ProcessingFailure(format!("Metadata attachment failed: {e}"))
            })?;
            final_list.push(enriched);
        }

        Ok(final_list)
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

trait SecurityPolicy {
    fn verify_range(&self, count: usize) -> Result<(), ToolError>;
}

impl<T> SecurityPolicy for T {
    fn verify_range(&self, count: usize) -> Result<(), ToolError> {
        // Rule: 1 to 100 items only. No more, no less.
        if !(1..=100).contains(&count) {
            return Err(ToolError::SecurityViolation(format!(
                "Invalid item count requested: {count}. Must be 1-100."
            )));
        }
        Ok(())
    }
}

trait IntegrityCheck {
    fn verify_batch_integrity<T>(&self, list: &Vec<T>) -> Result<(), ToolError>;
}

impl<T> IntegrityCheck for T {
    fn verify_batch_integrity<Item>(&self, list: &Vec<Item>) -> Result<(), ToolError> {
        // Reject empty batches or overflow attempts
        if list.is_empty() {
            return Err(ToolError::SecurityViolation("Empty batch processing attempted".into()));
        }
        if list.len() > 100 {
            return Err(ToolError::SecurityViolation(
                "Batch size exceeds safety limit (100)".into(),
            ));
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
pub enum ToolError {
    #[error("Gatekeeper Refusal: {0}")]
    SecurityViolation(String),

    #[error("Search Engine Error: {0}")]
    SearchFailure(String),

    #[error("Processing Failure: {0}")]
    ProcessingFailure(String),

    #[error("Downstream Dependency Error: {0}")]
    DependencyError(String),

    #[error("Data Transformation Failure")]
    MappingError,
}
