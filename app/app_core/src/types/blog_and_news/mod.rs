pub mod blog;
pub mod news;

// Re-exporting core types for easier access
pub use blog::{
    BlogError, BlogFeed, BlogPost, BlogPostId, CrudEngine as BlogCrudEngine, DraftBlogPost,
    Gatekeeper as BlogGatekeeper, MostRecentBlog,
};
pub use news::{
    NewsEngine, NewsError, NewsGatekeeper, NewsHoldingArea, NewsItem, NewsItem as NewsArticle,
    NewsItemId, Newsfeed, RawNewsItem,
};
