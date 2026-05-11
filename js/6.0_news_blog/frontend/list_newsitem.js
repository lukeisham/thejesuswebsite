// =============================================================================
//
//   THE JESUS WEBSITE — NEWS FEED DISPLAY
//   File:    js/6.0_news_blog/frontend/list_newsitem.js
//   Version: 1.2.0
//   Purpose: Fetches and renders news items from the public API with
//            rolling pagination ("Load More" button).
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

var _newsFeedState = {
  offset: 0,
  limit: 10,
  hasMore: true,
  loading: false,
};

function renderNewsFeed() {
  var listEl = document.getElementById("news-feed-content");
  if (!listEl) return;

  listEl.innerHTML = '<p class="text-sm text-muted">Loading news feed...</p>';

  _newsFeedState.offset = 0;
  _newsFeedState.hasMore = true;

  _fetchAndAppendNews(listEl, true);
}

function _fetchAndAppendNews(listEl, isFresh) {
  if (_newsFeedState.loading) return;
  if (!_newsFeedState.hasMore && !isFresh) return;

  _newsFeedState.loading = true;

  var url =
    "/api/public/news?type=news_article&status=published&limit=" +
    _newsFeedState.limit +
    "&offset=" +
    _newsFeedState.offset;

  fetch(url)
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
      _newsFeedState.hasMore = data.has_more || false;

      if (isFresh) {
        listEl.innerHTML = "";
      }

      if (newsItems.length === 0 && isFresh) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No news items yet.</p>' +
          '<p class="text-sm text-secondary mt-2">' +
          "Check back soon for updates.</p>" +
          "</div>";
        _newsFeedState.loading = false;
        return;
      }

      var html = newsItems
        .map(function (item) {
          var snippet = _extractNewsSnippet(item);
          return _buildNewsHtml(item, snippet);
        })
        .join("");

      var oldBtn = listEl.querySelector(".news-feed__load-more");
      if (oldBtn) oldBtn.remove();

      if (isFresh) {
        listEl.innerHTML = html;
      } else {
        listEl.insertAdjacentHTML("beforeend", html);
      }

      _newsFeedState.offset += newsItems.length;

      if (_newsFeedState.hasMore) {
        var loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "news-feed__load-more";
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.addEventListener("click", function () {
          _fetchAndAppendNews(listEl, false);
        });
        listEl.appendChild(loadMoreBtn);
      }

      _newsFeedState.loading = false;
    })
    .catch(function (err) {
      console.error("News feed error:", err);
      if (isFresh) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">' +
          "Unable to load news feed.</p>" +
          '<p class="text-sm text-secondary mt-2">' +
          "Please try again later.</p>" +
          "</div>";
      }
      _newsFeedState.loading = false;
    });
}

function _extractNewsSnippet(item) {
  var snippet = "";

  // Try the snippet column (JSON Array of paragraph strings per schema)
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

  // Fallback: legacy news_items blob
  if (!snippet && item.news_items && typeof item.news_items === "object") {
    snippet = item.news_items.summary || item.news_items.excerpt || "";
    if (!snippet) {
      var content = item.news_items.content || item.news_items.body || "";
      if (typeof content === "string") {
        snippet = content.replace(/\n{2,}/g, " ").substring(0, 300);
      }
    }
  }

  if (typeof snippet === "object") {
    snippet = snippet.text || "";
  }

  return snippet;
}

function _buildNewsHtml(item, snippet) {
  // Use schema column names: news_item_title for title, last_crawled for date
  var displayTitle = item.news_item_title || item.title || "Untitled";
  var displayLink = item.news_item_link || "";
  var date = item.last_crawled || item.updated_at || item.created_at || "";

  var titleHtml = displayLink
    ? '<a href="' +
      escapeHtml(displayLink) +
      '" target="_blank" rel="noopener" class="news-item__link">' +
      escapeHtml(displayTitle) +
      ' <span class="news-item__external-icon">↗</span></a>'
    : escapeHtml(displayTitle);

  return (
    '<article class="news-item" style="' +
    "padding-bottom: var(--space-6); " +
    "border-bottom: 1px solid var(--color-border); " +
    "margin-bottom: var(--space-6);" +
    '">' +
    '<h2 class="news-item__title">' +
    titleHtml +
    "</h2>" +
    '<div class="news-item__date">' +
    escapeHtml(formatDate(date)) +
    "</div>" +
    (snippet
      ? '<div class="news-item__snippet" style="line-height: var(--line-height-relaxed);">' +
        "<p>" +
        escapeHtml(String(snippet).substring(0, 300)) +
        "</p>" +
        "</div>"
      : "") +
    "</article>"
  );
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
