use crate::server::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BLOG                                  //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Retrieves the list of blog posts from ChromaDB.
pub async fn handle_get_posts(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    use app_core::types::blog_and_news::blog::BlogPost;

    match state.storage.chroma.query_blog_posts("").await {
        Ok(docs) => {
            let posts: Vec<BlogPost> = docs
                .into_iter()
                .filter_map(|json_str| serde_json::from_str::<BlogPost>(json_str.as_str()).ok())
                .collect();
            (StatusCode::OK, Json(posts)).into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Storage error: {}", e)).into_response()
        }
    }
}

/// Creates a new blog post using the BlogCreateRequest DTO.
/// Bridges the naming discrepancies and enforces Skeleton integrity.
pub async fn handle_create_post(
    State(state): State<Arc<AppState>>,
    Json(post_req): Json<app_core::types::BlogCreateRequest>,
) -> impl IntoResponse {
    use app_core::types::blog_and_news::blog::{BlogPost, BlogPostId, DraftBlogPost};
    use app_core::types::system::{EntryToggle, Metadata};
    use ulid::Ulid;

    let draft: DraftBlogPost = post_req.into();
    let post = BlogPost {
        id: BlogPostId(uuid::Uuid::new_v4()),
        title: draft.title,
        content: draft.content,
        picture_url: draft.picture_url,
        labels: draft.labels,
        metadata: Metadata {
            id: Ulid::new(),
            keywords: Vec::new(),
            toggle: EntryToggle::Record,
        },
        is_published: false, // Security rule: always start unpublished via this endpoint
    };

    match state.storage.chroma.store_blog_post(&post).await {
        Ok(_) => (StatusCode::CREATED, "Blog post created").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to store post: {}", e))
            .into_response(),
    }
}
