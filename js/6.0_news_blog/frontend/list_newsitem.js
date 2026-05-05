// =============================================================================
//
//   THE JESUS WEBSITE — NEWS FEED DISPLAY
//   File:    js/6.0_news_blog/frontend/list_newsitem.js
//   Version: 1.1.0
//   Purpose: Fetches and renders news items from the public API.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderNewsFeed()
// Function: Fetches published news items from the public API and renders
//           them as a chronological feed.
// Output: Injects a list of <article> elements into #news-feed-content

function renderNewsFeed() {
  var listEl = document.getElementById("news-feed-content");
  if (!listEl) return;

  // Show loading state
  listEl.innerHTML = '<p class="text-sm text-muted">Loading news feed...</p>';

  // Fetch news items from the public API
  fetch("/api/public/news")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch news items (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var newsItems = data.news || [];

      if (newsItems.length === 0) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No news items yet.</p>' +
          '<p class="text-sm text-secondary mt-2">Check back soon for updates.</p>' +
          "</div>";
        return;
      }

      var html = newsItems
        .map(function (item) {
          var date = item.updated_at || item.created_at || "";
          var title = item.title || "Untitled";
          var snippet = "";

          // Extract snippet from the news_items JSON blob
          if (item.news_items && typeof item.news_items === "object") {
            snippet = item.news_items.summary || item.news_items.excerpt || "";
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
            '<article class="essay-container mb-8" style="padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">' +
            '<h2 class="text-2xl font-bold mb-2 font-serif text-primary">' +
            escapeHtml(title) +
            "</h2>" +
            '<div class="text-sm font-mono text-muted mb-4">' +
            escapeHtml(formatDate(date)) +
            "</div>" +
            (snippet
              ? '<div class="text-base text-body" style="line-height: var(--line-height-relaxed);">' +
                "<p>" +
                escapeHtml(String(snippet).substring(0, 300)) +
                "</p>" +
                "</div>"
              : "") +
            "</article>"
          );
        })
        .join("");

      listEl.innerHTML = html;
    })
    .catch(function (err) {
      console.error("News feed error:", err);
      listEl.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load news feed.</p>' +
        '<p class="text-sm text-secondary mt-2">Please try again later.</p>' +
        "</div>";
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
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return isoString;
  }
}

document.addEventListener("DOMContentLoaded", renderNewsFeed);
