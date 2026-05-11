// =============================================================================
//
//   THE JESUS WEBSITE — BLOG FEED DISPLAY
//   File:    js/6.0_news_blog/frontend/list_blogpost.js
//   Version: 1.3.0
//   Purpose: Fetches and renders blog posts for the blog feed from the
//            public API with rolling pagination ("Load More" button).
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderBlogFeed()
// Function: Queries the public API for published blog posts and renders them
//           as a chronological feed with a "Load More" button for pagination.
// Output: Injects <article> elements + Load More button into #blog-feed-content

var _blogFeedState = {
  offset: 0,
  limit: 10,
  hasMore: true,
  loading: false,
};

function renderBlogFeed() {
  var listEl = document.getElementById("blog-feed-content");
  if (!listEl) return;

  // Show loading state
  listEl.innerHTML = '<p class="text-sm text-muted">Loading blog posts...</p>';

  // Reset pagination state
  _blogFeedState.offset = 0;
  _blogFeedState.hasMore = true;

  _fetchAndAppendPosts(listEl, true);
}

function _fetchAndAppendPosts(listEl, isFresh) {
  if (_blogFeedState.loading) return;
  if (!_blogFeedState.hasMore && !isFresh) return;

  _blogFeedState.loading = true;

  var url =
    "/api/public/blogposts?type=blog_post&status=published&limit=" +
    _blogFeedState.limit +
    "&offset=" +
    _blogFeedState.offset;

  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch blog posts (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var posts = data.posts || [];
      _blogFeedState.hasMore = data.has_more || false;

      if (isFresh) {
        listEl.innerHTML = "";
      }

      if (posts.length === 0 && isFresh) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No blog posts yet.</p>' +
          '<p class="text-sm text-secondary mt-2">' +
          "Check back soon for new content.</p>" +
          "</div>";
        _blogFeedState.loading = false;
        return;
      }

      var html = posts
        .map(function (item) {
          var snippet = _extractSnippet(item);
          return _buildPostHtml(item, snippet);
        })
        .join("");

      // Remove existing Load More button before appending new posts
      var oldBtn = listEl.querySelector(".blog-feed__load-more");
      if (oldBtn) oldBtn.remove();

      if (isFresh) {
        listEl.innerHTML = html;
      } else {
        listEl.insertAdjacentHTML("beforeend", html);
      }

      _blogFeedState.offset += posts.length;

      // Append Load More button if more posts exist
      if (_blogFeedState.hasMore) {
        var loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "blog-feed__load-more";
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.addEventListener("click", function () {
          _fetchAndAppendPosts(listEl, false);
        });
        listEl.appendChild(loadMoreBtn);
      }

      _blogFeedState.loading = false;
    })
    .catch(function (err) {
      console.error("Blog feed error:", err);
      if (isFresh) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">' +
          "Unable to load blog posts.</p>" +
          '<p class="text-sm text-secondary mt-2">' +
          "Please try again later.</p>" +
          "</div>";
      }
      _blogFeedState.loading = false;
    });
}

function _extractSnippet(item) {
  var snippet = "";

  // Try blogposts.summary or blogposts.excerpt
  if (item.blogposts && typeof item.blogposts === "object") {
    snippet = item.blogposts.summary || item.blogposts.excerpt || "";

    // Fallback: extract first 300 chars from blogposts.content or body
    if (!snippet) {
      var content = item.blogposts.content || item.blogposts.body || "";
      if (typeof content === "string") {
        snippet = content.replace(/\n{2,}/g, " ").substring(0, 300);
      }
    }
  }

  // Fallback to snippet column
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

  return snippet;
}

function _buildPostHtml(item, snippet) {
  var date = item.updated_at || item.created_at || "";
  var title = item.title || "Untitled";
  var slug = item.slug || "";

  return (
    '<article class="blog-item" style="' +
    "padding-bottom: var(--space-6); " +
    "border-bottom: 1px solid var(--color-border); " +
    'margin-bottom: var(--space-6);">' +
    '<h2 class="blog-item__title">' +
    (slug
      ? '<a href="/blog/' +
        encodeURIComponent(slug) +
        '" class="blog-item__link">' +
        escapeHtml(title) +
        "</a>"
      : escapeHtml(title)) +
    "</h2>" +
    '<div class="blog-item__date">' +
    escapeHtml(formatDate(date)) +
    "</div>" +
    (snippet
      ? '<div class="blog-item__snippet" style="line-height: var(--line-height-relaxed);">' +
        "<p>" +
        escapeHtml(String(snippet).substring(0, 300)) +
        "</p>" +
        "</div>"
      : "") +
    (slug
      ? '<div style="margin-top: var(--space-3);"><a href="/blog/' +
        encodeURIComponent(slug) +
        '" class="blog-item__read-more">Read more →</a></div>'
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

document.addEventListener("DOMContentLoaded", renderBlogFeed);
