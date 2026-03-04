use crate::types::Metadata;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

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
    pub content: String,
    pub picture_url: Option<String>,
    pub labels: Vec<String>,
    pub metadata: Metadata,
    pub is_published: bool,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DraftBlogPost {
    pub title: String,
    pub content: String,
    pub picture_url: Option<String>,
    pub labels: Vec<String>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BlogFeed {
    pub posts: Vec<BlogPost>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MostRecentBlog {
    pub post: Option<BlogPost>,
}

pub struct CrudEngine {
    // Wrapped in Arc + RwLock for Async-First thread safety
    db: Arc<RwLock<BlogFeed>>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl CrudEngine {
    pub fn new() -> Self {
        Self {
            db: Arc::new(RwLock::new(BlogFeed::default())),
        }
    }

    /// Converts a Draft into a live (but unpublished) BlogPost
    pub async fn create_post(
        &self,
        draft: DraftBlogPost,
        meta: Metadata,
    ) -> Result<BlogPostId, BlogError> {
        // Gatekeeping check
        Gatekeeper::validate_draft(&draft)?;

        let new_post = BlogPost {
            id: BlogPostId(uuid::Uuid::new_v4()),
            title: draft.title,
            content: draft.content,
            picture_url: draft.picture_url,
            labels: draft.labels,
            metadata: meta,
            is_published: false, // Strict rule: starts unpublished
        };

        let id = new_post.id.clone();
        let mut feed = self.db.write().await;
        feed.posts.push(new_post);

        Ok(id)
    }

    pub async fn get_most_recent(&self) -> MostRecentBlog {
        let feed = self.db.read().await;
        // Logic: Get the last item in the vec (most recently added)
        MostRecentBlog {
            post: feed.posts.last().cloned(),
        }
    }

    pub async fn publish_post(&self, id: BlogPostId) -> Result<(), BlogError> {
        let mut feed = self.db.write().await;
        let post = feed
            .posts
            .iter_mut()
            .find(|p| p.id.0 == id.0)
            .ok_or(BlogError::NotFound)?;

        post.is_published = true;
        Ok(())
    }

    pub async fn delete_post(&self, id: BlogPostId) -> Result<(), BlogError> {
        let mut feed = self.db.write().await;
        let original_len = feed.posts.len();
        feed.posts.retain(|p| p.id.0 != id.0);

        if feed.posts.len() == original_len {
            return Err(BlogError::NotFound);
        }
        Ok(())
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

pub struct Gatekeeper;

impl Gatekeeper {
    /// Strict validation to ensure no garbage enters the Skeleton
    pub fn validate_draft(draft: &DraftBlogPost) -> Result<(), BlogError> {
        if draft.title.trim().is_empty() {
            return Err(BlogError::ValidationError("Title cannot be empty".to_string()));
        }
        if draft.content.len() < 10 {
            return Err(BlogError::ValidationError("Content too short for a blog".to_string()));
        }
        // Security: Prevent massive label injection
        if draft.labels.len() > 20 {
            return Err(BlogError::SecurityViolation("Too many labels (Max 20)".to_string()));
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
