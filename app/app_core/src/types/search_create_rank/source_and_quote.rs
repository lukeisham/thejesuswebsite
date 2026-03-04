use crate::types::system::source::Source;
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

/// A validated pair containing a verbatim quote and its structured origin.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceAndQuote {
    pub quote: VerifiedQuote,
    pub source: Source, // Defined elsewhere
}

/// A string guaranteed to be a non-empty, sanitized quote.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VerifiedQuote(String);

impl VerifiedQuote {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SourceAndQuote {
    /// Async constructor to bridge AI output with structured data.
    pub async fn try_new(raw_quote: String, source: Source) -> Result<Self, AttributionError> {
        let quote = VerifiedQuote::try_new(raw_quote)?;

        Ok(Self { quote, source })
    }
}

impl VerifiedQuote {
    pub fn try_new(input: String) -> Result<Self, AttributionError> {
        Ok(QuoteGatekeeper::new(input)?.into_inner())
    }
}

impl fmt::Display for VerifiedQuote {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Enforce the "" formatting rule at the presentation layer
        write!(f, "\"{}\"", self.0)
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

/// A validated `VerifiedQuote`. Possession of this type guarantees the quote
/// has passed length and character-safety checks.
pub struct QuoteGatekeeper(VerifiedQuote);

impl QuoteGatekeeper {
    const MAX_QUOTE_LENGTH: usize = 2000;

    /// Validates the quote string and wraps it in a type-safe `VerifiedQuote`.
    pub fn new(input: String) -> Result<Self, AttributionError> {
        if input.len() > Self::MAX_QUOTE_LENGTH {
            return Err(AttributionError::QuoteTooLong(input.len()));
        }

        let forbidden = ['\0', '\r', '{', '}', '$', '<', '>'];
        if input.contains(|c| forbidden.contains(&c)) {
            return Err(AttributionError::InsecureCharacters);
        }

        // Normalize: strip surrounding quotes & whitespace
        let sanitized = input
            .trim()
            .trim_matches('"')
            .trim_matches('\'')
            .trim()
            .to_string();

        if sanitized.is_empty() {
            return Err(AttributionError::EmptyQuote);
        }

        Ok(Self(VerifiedQuote(sanitized)))
    }

    /// Provides read-only access to the validated quote.
    pub fn value(&self) -> &VerifiedQuote {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated quote.
    pub fn into_inner(self) -> VerifiedQuote {
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

#[derive(Debug, Clone, PartialEq)]
pub enum AttributionError {
    EmptyQuote,
    QuoteTooLong(usize),
    InsecureCharacters,
}

impl std::error::Error for AttributionError {}

impl fmt::Display for AttributionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyQuote => write!(f, "Attribution Error: The quote was empty."),
            Self::QuoteTooLong(len) => {
                write!(f, "Attribution Error: Quote exceeds limit ({} chars).", len)
            }
            Self::InsecureCharacters => {
                write!(f, "Security Alert: Quote contains forbidden characters.")
            }
        }
    }
}
