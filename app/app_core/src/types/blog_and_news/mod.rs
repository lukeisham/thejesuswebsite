pub mod blog;
pub mod news;

// Re-exporting core types for easier access
pub use blog::{BlogError, BlogPost, BlogPostId, DraftBlogPost, Gatekeeper as BlogGatekeeper};
pub use news::{
    NewsEngine, NewsError, NewsGatekeeper, NewsHoldingArea, NewsItem, NewsItem as NewsArticle,
    NewsItemId, Newsfeed, RawNewsItem,
};
