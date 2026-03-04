use super::challenge::ChallengeLink;
use crate::types::system::{Metadata, Picture, Source};
use serde::{Deserialize, Serialize};
use url::Url;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

use crate::types::system::PublicationStatus;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub metadata: Metadata,
    pub internal_url: Url,
    pub title: String,
    pub text: String,
    pub picture: Option<Picture>,
    pub bibliography: Vec<Source>,
    pub linked_challenge: ChallengeLink,
    pub status: PublicationStatus, // The new toggle
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Response {
    /// Async-First Constructor.
    /// Note: The status is not passed in, enforcing the 'Unpublished' default.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn new(
        metadata: Metadata,
        url: Url,
        title: String,
        text: String,
        picture: Option<Picture>,
        bibliography: Vec<Source>,
        challenge: ChallengeLink,
    ) -> Result<Self, ResponseError> {
        Self::validate_internal_route(&url)?;

        Ok(Self {
            metadata,
            internal_url: url,
            title,
            text,
            picture,
            bibliography,
            linked_challenge: challenge,
            status: PublicationStatus::default(), // Always starts safe
        })
    }

    /// Business Logic: Explicitly promotes a response to Published.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn publish(&mut self) -> Result<(), ResponseError> {
        if self.text.len() < 10 {
            return Err(ResponseError::ContentTooShort);
        }
        self.status = PublicationStatus::Published;
        Ok(())
    }

    /// Business Logic: Retracts a response to Unpublished.
    pub fn retract(&mut self) {
        self.status = PublicationStatus::Unpublished;
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

impl Response {
    /// Security Gatekeeping: Prevents certain actions if the response is Published.
    /// E.g., You shouldn't be able to change the internal URL of a live response.
    pub fn guard_modifications(&self) -> Result<(), ResponseError> {
        match self.status {
            PublicationStatus::Published => Err(ResponseError::LockedForEditing),
            _ => Ok(()),
        }
    }

    fn validate_internal_route(url: &Url) -> Result<(), ResponseError> {
        match url.host_str() {
            Some(host) if host == "vibe.internal" => Ok(()),
            _ => Err(ResponseError::ExternalUrlForbidden(url.clone())),
        }
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
pub enum ResponseError {
    #[error("Security Breach: External URL {0} is forbidden")]
    ExternalUrlForbidden(Url),

    #[error("Response is Published and cannot be modified")]
    LockedForEditing,

    #[error("Cannot publish: Content is too short to be meaningful")]
    ContentTooShort,

    #[error("Internal URL is malformed")]
    MalformedInternalUrl,
}
