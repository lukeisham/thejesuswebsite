pub mod blog;
pub mod news;

// Re-exporting core types for easier access
pub use blog::{BlogError, BlogPost, BlogPostId, DraftBlogPost, Gatekeeper as BlogGatekeeper};
pub use news::{
    fetch_article_image, NewsConfig, NewsEngine, NewsError, NewsGatekeeper, NewsHoldingArea,
    NewsItem, NewsItem as NewsArticle, NewsItemId, Newsfeed, NewsSource, RawNewsItem,
};
