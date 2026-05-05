// =============================================================================
//
//   THE JESUS WEBSITE — NEWS SNIPPET DISPLAY
//   File:    js/6.0_news_blog/frontend/news_snippet_display.js
//   Version: 1.1.0
//   Purpose: Fetches and renders latest news item snippets from the public API.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> injectNewsSnippets('latest-news-content')
// Function: Fetches published news items from the public API and renders
//           headline/summary cards into the specified container.
// Output: Renders news snippet list or empty state inside container.

function injectNewsSnippets(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Show loading state
  container.innerHTML = '<p class="text-sm text-muted">Loading news...</p>';

  fetch("/api/public/news")
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
          var date = item.updated_at || item.created_at || "";
          var title = item.title || "Untitled";
          var snippet = "";

          if (item.news_items && typeof item.news_items === "object") {
            snippet = item.news_items.summary || item.news_items.excerpt || "";
            // Fallback to body content
            if (!snippet) {
              var content =
                item.news_items.content || item.news_items.body || "";
              if (typeof content === "string") {
                snippet = content.replace(/\n{2,}/g, " ").substring(0, 150);
              }
            }
          }
          if (!snippet && item.snippet) {
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
          if (typeof snippet === "object") {
            snippet = snippet.text || "";
          }

          return (
            '<div class="news-snippet mb-4" style="border-bottom: 1px dotted var(--color-border); padding-bottom: var(--space-2);">' +
            '<p class="text-xs text-muted font-mono mb-1">' +
            escapeHtml(formatDate(date)) +
            "</p>" +
            '<h3 class="text-base font-semibold mb-1">' +
            escapeHtml(title) +
            "</h3>" +
            (snippet
              ? '<p class="text-sm">' +
                escapeHtml(String(snippet).substring(0, 150)) +
                "</p>"
              : "") +
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
