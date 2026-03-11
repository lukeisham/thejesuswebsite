use crate::types::system::publication_year::{PublicationYear, PublicationYearError};
use crate::types::system::source_type::SourceType;
use serde::{Deserialize, Serialize};
use std::fmt;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Author {
    Name(String),
    Orcid(String), // Orcid is handled as a validated String/ID elsewhere
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SourceIdentity {
    NamedUrl(String),          // NamedUrl is handled as a validated String/ID elsewhere
    Isbn(String),              // ISBN is handled as a validated String/ID elsewhere
    AcademicArticleId(String), // Article ID is handled as a validated String/ID elsewhere
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceTitle {
    pub text: String,
    pub identity: Option<SourceIdentity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub id: Option<i64>, // Added for database persistence
    pub author: Author,
    pub title: SourceTitle,
    pub year: Option<PublicationYear>,
    pub source_type: Option<SourceType>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Source {
    /// Delegates construction and validation to `SourceGatekeeper`.
    pub async fn try_new(
        author: Author,
        title_text: String,
        identity: Option<SourceIdentity>,
        year: Option<PublicationYear>,
        source_type: Option<SourceType>,
    ) -> Result<Self, SourceError> {
        Ok(SourceGatekeeper::new(author, title_text, identity, year, source_type)?.into_inner())
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

/// A validated `Source`. Possession of this type guarantees both title and
/// author have passed all format and security checks.
pub struct SourceGatekeeper(Source);

impl SourceGatekeeper {
    /// Validates title and author, then wraps the resulting `Source`.
    pub fn new(
        author: Author,
        title_text: String,
        identity: Option<SourceIdentity>,
        year: Option<PublicationYear>,
        source_type: Option<SourceType>,
    ) -> Result<Self, SourceError> {
        let len = title_text.trim().len();

        if len == 0 {
            return Err(SourceError::EmptyTitle);
        }

        if len > 140 {
            return Err(SourceError::TitleTooLong);
        }

        match &author {
            Author::Name(n) if n.trim().is_empty() => return Err(SourceError::InvalidAuthor),
            Author::Orcid(id) if id.trim().is_empty() => return Err(SourceError::InvalidAuthor),
            _ => {}
        }

        Ok(Self(Source {
            id: None,
            author,
            title: SourceTitle {
                text: title_text.trim().to_string(),
                identity,
            },
            year,
            source_type,
        }))
    }

    /// Provides read-only access to the validated source.
    pub fn value(&self) -> &Source {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated source.
    pub fn into_inner(self) -> Source {
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

#[derive(Debug, Serialize)]
pub enum SourceError {
    EmptyTitle,
    TitleTooLong, // Exceeds "short string" vibe
    InvalidAuthor,
    InvalidYear(PublicationYearError),
    ValidationFailure(String),
}

impl std::error::Error for SourceError {}

impl fmt::Display for SourceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyTitle => write!(f, "Source title cannot be empty."),
            Self::TitleTooLong => write!(f, "Source title must be 140 characters or less."),
            Self::InvalidAuthor => write!(f, "Author identification is malformed."),
            Self::InvalidYear(e) => write!(f, "Invalid publication year: {}", e),
            Self::ValidationFailure(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

impl From<PublicationYearError> for SourceError {
    fn from(e: PublicationYearError) -> Self {
        Self::InvalidYear(e)
    }
}
