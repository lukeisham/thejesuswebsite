use crate::types::Metadata;
use serde::{Deserialize, Serialize};

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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPostId(pub uuid::Uuid);

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPost {
    pub id: BlogPostId,
    pub title: String,
    #[serde(rename = "body")]
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture_url: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub labels: Vec<String>,
    pub metadata: Metadata,
    #[serde(rename = "published")]
    pub is_published: bool,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DraftBlogPost {
    pub title: String,
    #[serde(rename = "body")]
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture_url: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub labels: Vec<String>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE REASON                                //
//                                 (Logic)                                    //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Gatekeeper;

impl Gatekeeper {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn validate_draft(draft: DraftBlogPost) -> Result<BlogPostId, String> {
        if draft.title.is_empty() {
            return Err("Title cannot be empty".into());
        }
        if draft.content.len() < 10 {
            return Err("Content too short for a blog".into());
        }
        Ok(BlogPostId(uuid::Uuid::new_v4()))
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               5. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, thiserror::Error)]
pub enum BlogError {
    #[error("Post not found in the feed")]
    NotFound,

    #[error("Validation failed: {0}")]
    ValidationError(String),

    #[error("Security policy triggered: {0}")]
    SecurityViolation(String),

    #[error("Internal Database Error")]
    LockError,
}
