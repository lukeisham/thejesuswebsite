// =============================================================================
//
//   THE JESUS WEBSITE — BLOG FEED DISPLAY
//   File:    frontend/display_big/list_blogpost.js
//   Version: 1.1.0
//   Purpose: Fetches and renders full blog posts for the blog feed.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderBlogFeed()
// Function: Queries the database-backed API for blog posts and renders them
//           as a chronological feed. Shows a clean empty state when no posts exist.
// Output: Injects a list of <article> elements into #blog-feed-content

function renderBlogFeed() {
  const listEl = document.getElementById("blog-feed-content");
  if (!listEl) return;

  // Show loading state
  listEl.innerHTML = '<p class="text-sm text-muted">Loading blog posts...</p>';

  // Fetch blog posts from the public API
  fetch("/api/blog/posts")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch blog posts");
      }
      return response.json();
    })
    .then(function (data) {
      var posts = data.posts || data || [];

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
          var date = item.publish_date || item.date || "";
          var author = item.author || "";
          var title = item.title || "Untitled";
          var body = item.body || item.summary || "";

          return (
            '<article class="essay-container mb-8" style="padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">' +
            '<h2 class="text-2xl font-bold mb-2 font-serif text-primary">' +
            escapeHtml(title) +
            "</h2>" +
            '<div class="text-sm font-mono text-muted mb-4">' +
            (author ? "By " + escapeHtml(author) + " | " : "") +
            escapeHtml(date) +
            "</div>" +
            '<div class="text-base text-body" style="line-height: var(--line-height-relaxed);">' +
            "<p>" +
            escapeHtml(body) +
            "</p>" +
            "</div>" +
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

document.addEventListener("DOMContentLoaded", renderBlogFeed);
