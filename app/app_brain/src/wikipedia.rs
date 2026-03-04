use async_trait::async_trait;
use std::cmp::Ordering;
use std::collections::HashSet;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (The Trait Definitions)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[async_trait]
pub trait WikipediaSearcher {
    /// Searches for Wikipedia URLs related to a specific topic (e.g., Jesus)
    async fn fetch_urls(&self, query: &str) -> Result<Vec<WikipediaUrl>, WikipediaError>;
}

#[async_trait]
pub trait WikipediaRanker {
    /// Calculates the rank based on article content and the base number of results
    async fn calculate_rank(
        &self,
        url: &WikipediaUrl,
        base_score: usize,
    ) -> Result<WikipediaRanking, WikipediaError>;
}

#[async_trait]
pub trait WikipediaEnricher {
    /// Adds WikipediaMetaData to a Wikipedia article
    async fn add_metadata(&self, url: &WikipediaUrl) -> Result<WikipediaMetaData, WikipediaError>;
}

#[async_trait]
pub trait WikipediaStorer {
    /// Saves items to either WikipediaArticlesUnRanked or WikipediaArticlesRanked
    async fn save_unranked(&self, list: WikipediaArticlesUnRanked) -> Result<(), WikipediaError>;
    async fn save_ranked(&self, list: &WikipediaArticlesRanked) -> Result<(), WikipediaError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct WikipediaProcessor;

impl WikipediaProcessor {
    /// Orchestrates the Jesus-related article pipeline
    pub async fn process_jesus_articles(
        &self,
        searcher: &impl WikipediaSearcher,
        ranker: &impl WikipediaRanker,
        enricher: &impl WikipediaEnricher,
        storer: &impl WikipediaStorer,
        existing_ranked: &mut WikipediaArticlesRanked,
    ) -> Result<usize, WikipediaError> {
        // 1. Search for raw URLs
        let fresh_urls = searcher.fetch_urls("Jesus").await?;
        let base_score = fresh_urls.len();

        // 2. Identify New Items vs Existing Items
        let existing_urls: HashSet<String> = existing_ranked
            .items
            .iter()
            .map(|w| w.url.0.clone())
            .collect();

        let mut new_urls = Vec::new();
        let mut identical_count = 0;

        for url in fresh_urls {
            self.validate_url(&url)?;
            if existing_urls.contains(&url.0) {
                identical_count += 1;
            } else {
                new_urls.push(url);
            }
        }

        // 3. Logic: If no new items, re-rank living set
        if new_urls.is_empty() && identical_count > 0 {
            self.re_rank_existing(existing_ranked, ranker, base_score)
                .await?;
            return Ok(0);
        }

        // 4. Save New Items to Draft List
        let unranked = WikipediaArticlesUnRanked {
            urls: new_urls.clone(),
        };
        storer.save_unranked(unranked).await?;

        // 5. Process: Add Metadata and Rank to New Items
        for url in new_urls {
            self.validate_url(&url)?;
            let rank = ranker.calculate_rank(&url, base_score).await?;
            let meta = enricher.add_metadata(&url).await?;

            let processed_wiki = Wikipedia {
                url,
                ranking: rank,
                metadata: meta,
            };

            // 6. Save to final Ranked list
            existing_ranked.items.push(processed_wiki);
        }

        // 7. Final Sort (incorporates Bible Verse tie-breaker via Ord)
        existing_ranked
            .items
            .sort_by(|a, b| b.ranking.cmp(&a.ranking));

        storer.save_ranked(existing_ranked).await?;
        Ok(existing_ranked.items.len())
    }

    async fn re_rank_existing(
        &self,
        list: &mut WikipediaArticlesRanked,
        ranker: &impl WikipediaRanker,
        base_score: usize,
    ) -> Result<(), WikipediaError> {
        for item in &mut list.items {
            self.validate_url(&item.url)?;
            item.ranking = ranker.calculate_rank(&item.url, base_score).await?;
        }
        list.items.sort_by(|a, b| b.ranking.cmp(&a.ranking));
        Ok(())
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

impl WikipediaProcessor {
    /// Validates that the URL is a legitimate Wikipedia domain
    fn validate_url(&self, url: &WikipediaUrl) -> Result<(), WikipediaError> {
        if !url.0.contains("wikipedia.org") {
            return Err(WikipediaError::SecurityViolation(format!(
                "Non-Wikipedia URL detected: {}",
                url.0
            )));
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
pub enum WikipediaError {
    #[error("Security Breach: {0}")]
    SecurityViolation(String),

    #[error("Wikipedia API Failure: {0}")]
    NetworkError(String),

    #[error("Ranking Calculation Error")]
    RankingFailure,

    #[error("Draft Storage Failure")]
    StorageFailure,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               5. THE TYPES                                 //
//                          (Domain Specific Types)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct WikipediaUrl(pub String);

/// Specific unique ID types for Upvoting logic
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UniqueIdType {
    LgpnId,
    GregoryAlandId,
    PleiadesId,
    IaaSiteId,
}

#[derive(Debug, Eq, PartialEq)]
pub struct WikipediaRanking {
    pub score: i32,
    pub bible_verse_count: u32,
}

impl Ord for WikipediaRanking {
    fn cmp(&self, other: &Self) -> Ordering {
        match self.score.cmp(&other.score) {
            Ordering::Equal => self.bible_verse_count.cmp(&other.bible_verse_count),
            ord => ord,
        }
    }
}

impl PartialOrd for WikipediaRanking {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Debug)]
pub struct WikipediaMetaData {
    pub last_checked: std::time::SystemTime,
    pub snippet: String,
    pub detected_ids: Vec<UniqueIdType>,
    pub content_tags: Vec<ContentTag>,
}

#[derive(Debug, Clone, Copy)]
pub enum ContentTag {
    BibleVerse,
    QueerCluster,
    JesusSeminar,
}

pub struct Wikipedia {
    pub url: WikipediaUrl,
    pub ranking: WikipediaRanking,
    pub metadata: WikipediaMetaData,
}

pub struct WikipediaArticlesUnRanked {
    pub urls: Vec<WikipediaUrl>,
}

pub struct WikipediaArticlesRanked {
    pub items: Vec<Wikipedia>,
}
