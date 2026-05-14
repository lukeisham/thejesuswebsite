// =============================================================================
//
//   THE JESUS WEBSITE — NEWS SNIPPET DISPLAY
//   File:    js/6.0_news_blog/frontend/news_snippet_display.js
//   Version: 1.2.0
//   Purpose: Fetches and renders latest news item snippets from the public API.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> injectNewsSnippets('latest-news-content')
// Function: Fetches published news items from the public API and renders
//           exactly 5 headline/summary cards with optional thumbnail into
//           the specified container.
// Output: Renders news snippet list or empty state inside container.

function injectNewsSnippets(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Show loading state
  container.innerHTML = '<p class="text-sm text-muted">Loading news...</p>';

  fetch("/api/public/news?type=news_article&status=published")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch news snippets (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var newsItems = data.news || [];

      if (newsItems.length === 0) {
        container.innerHTML =
          '<p class="text-sm text-muted">No news items yet.</p>';
        return;
      }

      // Show only the latest 5 items
      var latest = newsItems.slice(0, 5);

      container.innerHTML = latest
        .map(function (item) {
          // Use schema column names: news_item_title for title, last_crawled for date
          var displayTitle = item.news_item_title || item.title || "Untitled";
          var displayLink = item.news_item_link || "";
          var date =
            item.last_crawled || item.updated_at || item.created_at || "";
          var snippet = "";
          var thumbUrl = item.picture_thumbnail || null;

          // Try the snippet column first (JSON Array of paragraph strings per schema)
          if (item.snippet) {
            try {
              var parsed =
                typeof item.snippet === "string"
                  ? JSON.parse(item.snippet)
                  : item.snippet;
              snippet = Array.isArray(parsed) ? parsed[0] || "" : parsed;
            } catch (e) {
              snippet = item.snippet;
            }
          }

          var titleHtml = displayLink
            ? '<a href="' +
              escapeHtml(displayLink) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(displayTitle) +
              " ↗</a>"
            : escapeHtml(displayTitle);

          var thumbHtml = thumbUrl
            ? '<img class="news-blog-landing__thumbnail" src="' +
              thumbUrl +
              '" alt="' +
              escapeHtml(displayTitle) +
              '" loading="lazy" />'
            : "";

          return (
            '<div class="news-blog-landing__snippet">' +
            (thumbHtml
              ? '<div class="news-blog-landing__thumb-wrap">' +
                thumbHtml +
                "</div>"
              : "") +
            '<div class="news-blog-landing__snippet-body">' +
            '<p class="news-blog-landing__date">' +
            escapeHtml(formatDate(date)) +
            "</p>" +
            '<h3 class="news-blog-landing__title">' +
            titleHtml +
            "</h3>" +
            (snippet
              ? '<p class="news-blog-landing__text">' +
                escapeHtml(String(snippet).substring(0, 150)) +
                "</p>"
              : "") +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    })
    .catch(function (err) {
      console.error("News snippet error:", err);
      container.innerHTML =
        '<p class="text-sm text-muted">Unable to load news.</p>';
    });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    var d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return isoString;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  injectNewsSnippets("latest-news-content");
});
