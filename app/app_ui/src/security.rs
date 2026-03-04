use app_brain::wikipedia::{
    Wikipedia, WikipediaArticlesRanked, WikipediaArticlesUnRanked, WikipediaEnricher,
    WikipediaError, WikipediaRanker, WikipediaSearcher, WikipediaStorer, WikipediaUrl,
};
use std::collections::HashSet;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct WikipediaProcessor;

impl WikipediaProcessor {
    pub async fn process_jesus_articles(
        &self,
        searcher: &impl WikipediaSearcher,
        ranker: &impl WikipediaRanker,
        enricher: &impl WikipediaEnricher,
        storer: &impl WikipediaStorer,
        existing_ranked: &mut WikipediaArticlesRanked,
    ) -> Result<usize, WikipediaError> {
        let fresh_urls = searcher.fetch_urls("Jesus").await?;
        let base_score = fresh_urls.len();

        let existing_urls: HashSet<String> = existing_ranked
            .items
            .iter()
            .map(|w| w.url.0.clone())
            .collect();

        let mut new_urls = Vec::new();
        let mut identical_count = 0;

        for url in fresh_urls {
            // Security Gatekeeping applied here
            self.validate_url(&url)?;

            if existing_urls.contains(&url.0) {
                identical_count += 1;
            } else {
                new_urls.push(url);
            }
        }

        if new_urls.is_empty() && identical_count > 0 {
            self.re_rank_existing(existing_ranked, ranker, base_score)
                .await?;
            return Ok(0);
        }

        let unranked = WikipediaArticlesUnRanked {
            urls: new_urls.clone(),
        };
        storer.save_unranked(unranked).await?;

        for url in new_urls {
            let rank = ranker.calculate_rank(&url, base_score).await?;
            let meta = enricher.add_metadata(&url).await?;

            let processed_wiki = Wikipedia {
                url,
                ranking: rank,
                metadata: meta,
            };

            existing_ranked.items.push(processed_wiki);
        }

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
            item.ranking = ranker.calculate_rank(&item.url, base_score).await?;
        }
        list.items.sort_by(|a, b| b.ranking.cmp(&a.ranking));
        Ok(())
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             2. THE GATEKEEPER                              //
//                        (Security & Constraints)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl WikipediaProcessor {
    /// Reference to the internal login gateway for unauthorized attempts
    pub const LOGIN_PAGE: &'static str = "https://vibe-code-auth.io/login";

    /// List of slugs that must be concealed in logs or UI
    const PRIVATE_SLUGS: &'static [&'static str] = &["admin", "draft", "internal-review"];

    pub fn validate_url(&self, url: &WikipediaUrl) -> Result<(), WikipediaError> {
        if !url.0.contains("wikipedia.org") {
            return Err(WikipediaError::SecurityViolation(format!(
                "Non-Wikipedia URL detected. Please authenticate at: {}",
                Self::LOGIN_PAGE
            )));
        }
        Ok(())
    }

    /// Conceals private slugs within a URL to prevent sensitive path exposure
    pub fn conceal_url_slugs(&self, url: &WikipediaUrl) -> String {
        let mut concealed = url.0.clone();
        for slug in Self::PRIVATE_SLUGS {
            let pattern = format!("/{}", slug);
            if concealed.contains(&pattern) {
                concealed = concealed.replace(&pattern, "/[CONCEALED]");
            }
        }
        concealed
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               3. THE TYPES                                 //
//        (Re-exported for downstream consumers in this crate)                //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

// Re-export the canonical types so other modules in app_ui can import from here.
pub use app_brain::wikipedia::{
    ContentTag, UniqueIdType, WikipediaMetaData as UiWikipediaMetaData,
    WikipediaRanking as UiWikipediaRanking, WikipediaUrl as UiWikipediaUrl,
};
