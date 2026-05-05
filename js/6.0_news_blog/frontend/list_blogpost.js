// =============================================================================
//
//   THE JESUS WEBSITE — BLOG FEED DISPLAY
//   File:    js/6.0_news_blog/frontend/list_blogpost.js
//   Version: 1.2.0
//   Purpose: Fetches and renders full blog posts for the blog feed from the
//            public API. Falls back to a clean empty state.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderBlogFeed()
// Function: Queries the public API for published blog posts and renders them
//           as a chronological feed. Reads optional ?slug= query param to
//           highlight a specific post.
// Output: Injects a list of <article> elements into #blog-feed-content

function renderBlogFeed() {
  var listEl = document.getElementById("blog-feed-content");
  if (!listEl) return;

  // Show loading state
  listEl.innerHTML = '<p class="text-sm text-muted">Loading blog posts...</p>';

  // Fetch blog posts from the public API
  fetch("/api/public/blogposts")
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

      if (posts.length === 0) {
        listEl.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No blog posts yet.</p>' +
          '<p class="text-sm text-secondary mt-2">Check back soon for new content.</p>' +
          "</div>";
        return;
      }

      var html = posts
        .map(function (item) {
          var date = item.updated_at || item.created_at || "";
          var title = item.title || "Untitled";
          var slug = item.slug || "";
          var snippet = "";

          // Extract snippet from the blogposts JSON blob or fallback to snippet column
          if (item.blogposts && typeof item.blogposts === "object") {
            snippet = item.blogposts.summary || item.blogposts.excerpt || "";
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
            (slug
              ? '<a href="/blog/post?slug=' +
                encodeURIComponent(slug) +
                '" class="text-primary hover:text-accent">' +
                escapeHtml(title) +
                "</a>"
              : escapeHtml(title)) +
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
            (slug
              ? '<div class="mt-3"><a href="/blog/post?slug=' +
                encodeURIComponent(slug) +
                '" class="text-sm text-accent hover:underline">Read more →</a></div>'
              : "") +
            "</article>"
          );
        })
        .join("");

      listEl.innerHTML = html;
    })
    .catch(function (err) {
      console.error("Blog feed error:", err);
      listEl.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load blog posts.</p>' +
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

document.addEventListener("DOMContentLoaded", renderBlogFeed);
