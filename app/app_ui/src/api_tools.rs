use axum::{extract::Query, http::StatusCode, response::IntoResponse};
use serde::Deserialize;
use std::fs;
use std::path::Path;

#[derive(Deserialize)]
pub struct MarkdownQuery {
    page: String,
}

/// Converts a requested frontend HTML file into clean Markdown.
/// Useful for LLM agents.
pub async fn handle_markdown(Query(query): Query<MarkdownQuery>) -> impl IntoResponse {
    let page = query.page.trim();

    // 1. Security: Prevent directory traversal and ensure it's an HTML file
    if page.contains("..") || page.starts_with('/') || !page.ends_with(".html") {
        return (
            StatusCode::BAD_REQUEST,
            "Invalid page requested. Must be a safe .html filename.",
        )
            .into_response();
    }

    // 2. Construct the path to the frontend directory
    let file_path = Path::new("frontend").join(page);

    // 3. Read the file
    let html_content = match fs::read_to_string(&file_path) {
        Ok(content) => content,
        Err(_) => {
            return (StatusCode::NOT_FOUND, format!("Page '{}' not found.", page)).into_response();
        }
    };

    // 4. Parse HTML and extract main content
    let document = scraper::Html::parse_document(&html_content);

    // Fallbacks: Try <main>, then <article>, then fallback to <body>
    let main_selector = scraper::Selector::parse("main").unwrap();
    let article_selector = scraper::Selector::parse("article").unwrap();
    let body_selector = scraper::Selector::parse("body").unwrap();

    let content_html = if let Some(main_el) = document.select(&main_selector).next() {
        main_el.html()
    } else if let Some(article_el) = document.select(&article_selector).next() {
        article_el.html()
    } else if let Some(body_el) = document.select(&body_selector).next() {
        body_el.html()
    } else {
        // Absolute fallback, use the whole thing
        html_content
    };

    // 5. Convert to Markdown
    let converter = htmd::HtmlToMarkdown::builder()
        .skip_tags(vec!["nav", "script", "style", "footer"])
        .build();

    match converter.convert(&content_html) {
        Ok(markdown) => {
            (StatusCode::OK, [("content-type", "text/markdown; charset=utf-8")], markdown)
                .into_response()
        }
        Err(e) => {
            tracing::error!("Failed to convert HTML to Markdown for {}: {}", page, e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to convert page to Markdown.")
                .into_response()
        }
    }
}

use axum::Json;
use serde::Serialize;
use std::time::UNIX_EPOCH;

#[derive(Serialize)]
pub struct ContentItem {
    pub title: String,
    pub url: String,
    pub summary: String,
    pub date: String,
    pub tags: Vec<String>,
}

/// Scans the frontend directory and returns a structured JSON list of all public content.
pub async fn handle_content_json() -> impl IntoResponse {
    let mut items = Vec::new();
    let frontend_dir = Path::new("frontend");

    // Scan root and one level deep (e.g. for /maps/)
    let mut dirs_to_scan = vec![frontend_dir.to_path_buf()];

    let title_selector = scraper::Selector::parse("title").unwrap();
    let desc_selector = scraper::Selector::parse("meta[name=\"description\"]").unwrap();
    let keywords_selector = scraper::Selector::parse("meta[name=\"keywords\"]").unwrap();

    while let Some(dir) = dirs_to_scan.pop() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if path.is_dir() {
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    // Avoid scanning private, assets, etc.
                    if name != "private"
                        && name != "js"
                        && name != "css"
                        && name != "responses"
                        && !name.starts_with('.')
                    {
                        dirs_to_scan.push(path.clone());
                    }
                    continue;
                }

                if path.extension().unwrap_or_default() == "html" {
                    let filename = path.file_name().unwrap_or_default().to_string_lossy();
                    // Skip fragments and operational pages
                    if filename.starts_with('_')
                        || filename == "index.html"
                        || filename == "login.html"
                        || filename == "dashboard.html"
                    {
                        continue;
                    }

                    if let Ok(html) = fs::read_to_string(&path) {
                        let document = scraper::Html::parse_document(&html);

                        let title = document
                            .select(&title_selector)
                            .next()
                            .map(|el| {
                                el.inner_html()
                                    .replace(" | The Jesus Website", "")
                                    .trim()
                                    .to_string()
                            })
                            .unwrap_or_else(|| filename.to_string());

                        let summary = document
                            .select(&desc_selector)
                            .next()
                            .and_then(|el| el.value().attr("content"))
                            .map(|s| s.trim().to_string())
                            .unwrap_or_default();

                        let tags_str = document
                            .select(&keywords_selector)
                            .next()
                            .and_then(|el| el.value().attr("content"))
                            .unwrap_or("");

                        let mut tags: Vec<String> = tags_str
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();

                        // Automatically infer 'list' tag
                        if filename.starts_with("list_") {
                            tags.push("list".to_string());
                        }

                        let mut url = path
                            .strip_prefix("frontend")
                            .unwrap_or(&path)
                            .to_string_lossy()
                            .to_string();
                        if !url.starts_with('/') {
                            url = format!("/{}", url);
                        }

                        // Extract modified date or fallback to default
                        let date = if let Ok(meta) = entry.metadata() {
                            if let Ok(modified) = meta.modified() {
                                let duration =
                                    modified.duration_since(UNIX_EPOCH).unwrap_or_default();
                                chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                                    .map(|dt| dt.to_rfc3339())
                                    .unwrap_or_default()
                            } else {
                                String::new()
                            }
                        } else {
                            String::new()
                        };

                        items.push(ContentItem {
                            title,
                            url,
                            summary,
                            date,
                            tags,
                        });
                    }
                }
            }
        }
    }

    // Sort items by title alphabetically for consistency
    items.sort_by(|a, b| a.title.cmp(&b.title));

    (StatusCode::OK, Json(items)).into_response()
}
