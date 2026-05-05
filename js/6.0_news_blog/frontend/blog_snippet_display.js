// =============================================================================
//
//   THE JESUS WEBSITE — BLOG SNIPPET DISPLAY
//   File:    js/6.0_news_blog/frontend/blog_snippet_display.js
//   Version: 1.2.0
//   Purpose: Renders a small list of latest blog post snippets fetched from
//            the public API.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> injectBlogSnippets('latest-blog-content')
// Function: Fetches the latest published blog posts from the public API and
//           renders headline/summary cards into the specified container.
// Output: Renders blog snippet list or empty state inside container.

function injectBlogSnippets(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Show loading state
  container.innerHTML =
    '<p class="text-sm text-muted">Loading blog posts...</p>';

  fetch("/api/public/blogposts")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch blog snippets (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var posts = data.posts || [];

      if (posts.length === 0) {
        container.innerHTML =
          '<p class="text-sm text-muted">Blog posts coming soon.</p>';
        return;
      }

      // Show only the latest 5 posts
      var latest = posts.slice(0, 5);

      container.innerHTML = latest
        .map(function (item) {
          var date = item.updated_at || item.created_at || "";
          var title = item.title || "Untitled";
          var slug = item.slug || "";
          var snippet = "";

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

          var link = slug
            ? "/blog/post?slug=" + encodeURIComponent(slug)
            : null;

          return (
            '<div class="news-snippet mb-4" style="border-bottom: 1px dotted var(--color-border); padding-bottom: var(--space-2);">' +
            '<p class="text-xs text-muted font-mono mb-1">' +
            escapeHtml(formatDate(date)) +
            "</p>" +
            '<h3 class="text-base font-semibold mb-1">' +
            (link
              ? '<a href="' +
                link +
                '" class="text-primary hover:text-accent">' +
                escapeHtml(title) +
                "</a>"
              : escapeHtml(title)) +
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
      console.error("Blog snippet error:", err);
      container.innerHTML =
        '<p class="text-sm text-muted">Blog posts coming soon.</p>';
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
  injectBlogSnippets("latest-blog-content");
});
