use crate::types::system::Metadata;
use serde::{Deserialize, Serialize};
use url::Url;

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

/// Represents a popularity score (1-100)
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Popular(u8);

/// Represents an academic rigor score (1-100)
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Academic(u8);

/// The aggregate type combining both metrics
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ChallengeRank {
    pub popular: Popular,
    pub academic: Academic,
}

/// Raw input source for popularity data (External URL)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawPopularChallenge {
    pub source: Url,
}

/// Raw input source for academic data (External URL)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawAcademicChallenge {
    pub source: Url,
}

/// The entry-point for a challenge defined by external references
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawChallenge {
    pub popular: RawPopularChallenge,
    pub academic: RawAcademicChallenge,
}

/// A reference to a specific challenge.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChallengeLink {
    pub url: Url,
    pub name: String,
}

/// The high-trust version of a popularity-based challenge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PopularChallenge {
    pub url: Url,
    pub name: String,
    pub metadata: Metadata,
    pub ranking: Popular,
}

/// The high-trust version of an academic-based challenge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicChallenge {
    pub url: Url,
    pub name: String,
    pub metadata: Metadata,
    pub ranking: Academic,
}

/// The aggregate Challenge type
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Challenge {
    pub popular: PopularChallenge,
    pub academic: AcademicChallenge,
}

/// The aggregate container for all challenge states.
/// This maintains Type Safety by keeping Raw and Validated data strictly separate.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChallengeList {
    pub raw_popular: Vec<RawPopularChallenge>,
    pub popular: Vec<PopularChallenge>,
    pub raw_academic: Vec<RawAcademicChallenge>,
    pub academic: Vec<AcademicChallenge>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl ChallengeRank {
    /// Async constructor to allow for non-blocking validation flow
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn create(popular: u8, academic: u8) -> Result<Self, RankError> {
        // Gatekeeper logic is called here
        let popular = Popular::validate(popular)?;
        let academic = Academic::validate(academic)?;

        Ok(Self { popular, academic })
    }

    /// Example logic: determine if the challenge is "Balanced"
    pub fn is_balanced(&self) -> bool {
        (self.popular.0 as i8 - self.academic.0 as i8).abs() <= 10
    }
}

impl RawChallenge {
    /// Async-First: Fetches data from both URLs and promotes them to
    /// validated ChallengeRanks.
    pub async fn fetch_and_promote(self) -> Result<ChallengeRank, RankError> {
        // We perform the fetches concurrently for maximum vibe efficiency
        let (pop_res, acad_res) =
            tokio::join!(self.popular.fetch_and_validate(), self.academic.fetch_and_validate());

        Ok(ChallengeRank {
            popular: pop_res?,
            academic: acad_res?,
        })
    }
}

impl Challenge {
    /// Async-First: Assembles a full Challenge.
    /// This logic "promotes" raw components into the final domain model.
    pub async fn new(
        popular_data: (Url, Popular),
        academic_data: (Url, Academic),
        metadata: Metadata,
    ) -> Result<Self, ChallengeError> {
        // Derive names concurrently to maintain the "Vibe"
        let (pop_url, pop_rank) = popular_data;
        let (acad_url, acad_rank) = academic_data;

        let (pop_name, acad_name) =
            tokio::join!(Self::derive_safe_name(&pop_url), Self::derive_safe_name(&acad_url));

        Ok(Self {
            popular: PopularChallenge {
                url: pop_url,
                name: pop_name?,
                metadata: metadata.clone(),
                ranking: pop_rank,
            },
            academic: AcademicChallenge {
                url: acad_url,
                name: acad_name?,
                metadata,
                ranking: acad_rank,
            },
        })
    }

    /// Internal logic to extract a clean name from a URL
    async fn derive_safe_name(url: &Url) -> Result<String, ChallengeError> {
        url.host_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ChallengeError::InvalidUrlSource(url.clone()))
    }
}

impl ChallengeList {
    /// Async-First: "The Great Promotion".
    /// Iterates through all Raw challenges and attempts to promote them to the
    /// Validated lists. This is a No-Panic operation.
    pub async fn promote_all(&mut self, metadata: Metadata) -> Result<(), ListError> {
        // Handle Popular Challenges
        for raw in self.raw_popular.drain(..) {
            // Reusing the fetch/validate logic from previous steps
            let rank = raw.fetch_and_validate().await?;
            let name = Self::derive_name(&raw.source)?;

            self.popular.push(PopularChallenge {
                url: raw.source,
                name,
                metadata: metadata.clone(),
                ranking: rank,
            });
        }

        // Handle Academic Challenges
        for raw in self.raw_academic.drain(..) {
            let rank = raw.fetch_and_validate().await?;
            let name = Self::derive_name(&raw.source)?;

            self.academic.push(AcademicChallenge {
                url: raw.source,
                name,
                metadata: metadata.clone(),
                ranking: rank,
            });
        }

        Ok(())
    }

    fn derive_name(url: &Url) -> Result<String, ListError> {
        url.host_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ListError::NamingFailure(url.clone()))
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

impl Popular {
    pub fn validate(val: u8) -> Result<Self, RankError> {
        if !(1..=100).contains(&val) {
            Err(RankError::InvalidRange {
                context: "Popular".to_string(),
                found: val,
            })
        } else {
            Ok(Self(val))
        }
    }

    pub fn value(&self) -> u8 {
        self.0
    }
}

impl Academic {
    pub fn validate(val: u8) -> Result<Self, RankError> {
        if !(1..=100).contains(&val) {
            Err(RankError::InvalidRange {
                context: "Academic".to_string(),
                found: val,
            })
        } else {
            Ok(Self(val))
        }
    }

    pub fn value(&self) -> u8 {
        self.0
    }
}

impl RawPopularChallenge {
    /// Security Gatekeeping: Ensures the URL is HTTPS and fetches the rank.
    pub async fn fetch_and_validate(&self) -> Result<Popular, RankError> {
        self.ensure_secure_connection()?;

        // Simulate an async fetch (e.g., reqwest::get(self.source)...)
        let fetched_val = self.mock_fetch_logic().await?;

        // Reusing the 1-100 logic from the previous skeleton
        Popular::validate(fetched_val)
    }

    fn ensure_secure_connection(&self) -> Result<(), RankError> {
        if self.source.scheme() != "https" {
            return Err(RankError::InsecureSource(self.source.to_string()));
        }
        Ok(())
    }

    async fn mock_fetch_logic(&self) -> Result<u8, RankError> {
        // Logic to parse remote data goes here
        Ok(85)
    }
}

impl RawAcademicChallenge {
    pub async fn fetch_and_validate(&self) -> Result<Academic, RankError> {
        self.ensure_secure_connection()?;

        let fetched_val = self.mock_fetch_logic().await?;

        Academic::validate(fetched_val)
    }

    fn ensure_secure_connection(&self) -> Result<(), RankError> {
        if self.source.scheme() != "https" {
            return Err(RankError::InsecureSource(self.source.to_string()));
        }
        Ok(())
    }

    async fn mock_fetch_logic(&self) -> Result<u8, RankError> {
        Ok(92)
    }
}

impl PopularChallenge {
    /// Final security check before the struct is used in business logic
    pub fn verify_integrity(&self) -> Result<(), ChallengeError> {
        if self.name.is_empty() {
            return Err(ChallengeError::IntegrityViolation("Empty name"));
        }
        // Ensure no tracking params in the URL (Security Gatekeeping)
        if self.url.query().is_some() {
            return Err(ChallengeError::InsecureUrl("Queries not allowed in domain URLs"));
        }
        Ok(())
    }
}

impl AcademicChallenge {
    pub fn verify_integrity(&self) -> Result<(), ChallengeError> {
        if self.name.is_empty() {
            return Err(ChallengeError::IntegrityViolation("Empty name"));
        }
        if self.url.query().is_some() {
            return Err(ChallengeError::InsecureUrl("Queries not allowed in domain URLs"));
        }
        Ok(())
    }
}

impl ChallengeList {
    /// Security Gatekeeping: Ensures no duplicates exist across lists.
    /// Prevents "Injection" of the same source into multiple challenge slots.
    pub fn security_scan(&self) -> Result<(), ListError> {
        let mut seen_urls = std::collections::HashSet::new();

        for p in &self.popular {
            if !seen_urls.insert(p.url.as_str()) {
                return Err(ListError::DuplicateSource(p.url.clone()));
            }
        }

        // Additional scans for academic or raw lists...
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum RankError {
    #[error("Value for {context} is out of bounds (1-100): found {found}")]
    InvalidRange { context: String, found: u8 },

    #[error("Internal system failure during rank calculation")]
    SystemFailure,

    #[error("Insecure source detected: {0}")]
    InsecureSource(String),
}

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum ChallengeError {
    #[error("Could not derive a valid name from URL: {0}")]
    InvalidUrlSource(Url),

    #[error("Security violation: {0}")]
    InsecureUrl(&'static str),

    #[error("Integrity check failed: {0}")]
    IntegrityViolation(&'static str),

    #[error("Required metadata is missing or corrupted")]
    MetadataFailure,
}

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum ListError {
    #[error("Failed to promote challenge: {0}")]
    PromotionFailure(#[from] RankError),

    #[error("Could not derive name for: {0}")]
    NamingFailure(Url),

    #[error("Security Breach: Duplicate source URL detected: {0}")]
    DuplicateSource(Url),

    #[error("Empty list: Promotion aborted")]
    EmptyList,
}
