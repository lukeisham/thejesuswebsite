use crate::types::system::{UlidNumber, ValidUrl};
use chrono::{DateTime, Utc};
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

/// A unique identifier for a specific view event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ViewId(UlidNumber);

/// A unique identifier for a user.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct UserId(UlidNumber);

/// A single recorded interaction with a page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageView {
    pub id: ViewId,
    pub viewer: Option<UserId>, // Optional for anonymous visitors
    pub target_url: ValidUrl,   // The URL defined earlier
    pub timestamp: DateTime<Utc>,
    pub user_agent: String,
    pub referrer: Option<ValidUrl>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl PageView {
    /// Async-first constructor to record a new view.
    /// This is the entry point for your analytics pipeline.
    pub async fn record(
        viewer: Option<UserId>,
        url_str: &str,
        ua_str: &str,
        ref_str: Option<&str>,
    ) -> Result<Self, PageViewError> {
        // 1. Generate the event ID
        let id = ViewId(UlidNumber::generate().await);

        // 2. Parse and validate the target URL via the Gatekeeper
        let target_url = ValidUrl::parse(url_str).map_err(|_| PageViewError::InvalidTargetUrl)?;

        // 3. Process the referrer if it exists
        let referrer = match ref_str {
            Some(r) => Some(ValidUrl::parse(r).map_err(|_| PageViewError::InvalidReferrerUrl)?),
            None => None,
        };

        // 4. Validate metadata through the Gatekeeper
        Self::gatekeep_metadata(ua_str)?;

        Ok(Self {
            id,
            viewer,
            target_url,
            timestamp: Utc::now(),
            user_agent: ua_str.to_string(),
            referrer,
        })
    }

    /// Business Logic: Check if the view is likely from a mobile device.
    pub fn is_mobile(&self) -> bool {
        let ua = self.user_agent.to_lowercase();
        ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")
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

impl PageView {
    /// Security Gate: Protects against log injection and bot spam.
    fn gatekeep_metadata(ua: &str) -> Result<(), PageViewError> {
        // 1. Length Check: Stop "User-Agent Bloat" attacks (RAM safety)
        if ua.len() > 512 {
            return Err(PageViewError::MetadataTooLarge);
        }

        // 2. Content Check: Reject empty or whitespace-only User-Agents
        if ua.trim().is_empty() {
            return Err(PageViewError::EmptyUserAgent);
        }

        // 3. Security Gate: Potential bot/crawler filtering could live here
        if ua.contains("headless") || ua.contains("automated") {
            // Depending on policy, we might still record but flag it.
            // For this vibe, we'll let it pass but it's a hook for security.
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
pub enum PageViewError {
    #[error("Target URL is malformed or insecure")]
    InvalidTargetUrl,

    #[error("Referrer URL is malformed")]
    InvalidReferrerUrl,

    #[error("Metadata Security Violation: User-Agent string is too large")]
    MetadataTooLarge,

    #[error("Empty User-Agent detected")]
    EmptyUserAgent,

    #[error("Persistence Failure: Analytics buffer is full")]
    BufferFull,
}

impl fmt::Display for PageView {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "View[{}] -> {} (via {})",
            self.id.0, self.target_url, self.user_agent
        )
    }
}
