// =============================================================================
//
//   THE JESUS WEBSITE — SINGLE BLOG POST DISPLAY
//   File:    js/6.0_news_blog/frontend/display_blogpost.js
//   Version: 1.0.0
//   Purpose: Fetches and renders a single published blog post by slug from
//            the public API.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderBlogPost()
// Function: Reads ?slug= from the URL query string, fetches the matching
//           blog post from the public API, and injects the content into
//           #blog-post-container.
// Output: Renders full blog post or error/empty state inside container.

function renderBlogPost() {
  var container = document.getElementById("blog-post-container");
  if (!container) return;

  // Read slug from query string
  var urlParams = new URLSearchParams(window.location.search);
  var slug = urlParams.get("slug");

  if (!slug) {
    container.innerHTML =
      '<div class="empty-state text-center py-12">' +
      '<p class="text-lg text-muted font-serif">No blog post specified.</p>' +
      '<p class="text-sm text-secondary mt-2"><a href="/blog" class="text-accent hover:underline">Browse all blog posts →</a></p>' +
      "</div>";
    return;
  }

  // Show loading state
  container.innerHTML = '<p class="text-sm text-muted">Loading blog post...</p>';

  // Update page title
  var titleEl = document.querySelector("title");
  if (titleEl) {
    titleEl.textContent = "Loading... | The Jesus Website";
  }

  fetch("/api/public/blogposts/" + encodeURIComponent(slug))
    .then(function (response) {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Blog post not found");
        }
        throw new Error("Failed to fetch blog post (HTTP " + response.status + ")");
      }
      return response.json();
    })
    .then(function (data) {
      var post = data.post;
      if (!post) {
        throw new Error("Blog post not found");
      }

      // Update page title and metadata
      if (titleEl) {
        titleEl.textContent = post.title + " | The Jesus Website";
      }

      // Extract blog post body content
      var bodyContent = "";
      if (post.blogposts && typeof post.blogposts === "object") {
        bodyContent = post.blogposts.content || post.blogposts.body || "";
      }

      // Extract description as fallback
      if (!bodyContent && post.description) {
        try {
          var desc = typeof post.description === "string"
            ? JSON.parse(post.description)
            : post.description;
          if (Array.isArray(desc)) {
            bodyContent = desc
              .map(function (p) {
                return typeof p === "object" ? p.text || "" : p;
              })
              .join("\n\n");
          } else if (typeof desc === "object" && desc.text) {
            bodyContent = desc.text;
          }
        } catch (e) {
          bodyContent = post.description;
        }
      }

      var date = post.updated_at || post.created_at || "";

      // Render the blog post
      var html =
        '<header class="essay-header mb-8 pb-6" style="border-bottom: 1px solid var(--color-border);">' +
        '<h1 class="text-3xl font-bold font-serif mb-2">' +
        escapeHtml(post.title) +
        "</h1>" +
        (date
          ? '<div class="text-sm font-mono text-muted">' +
            escapeHtml(formatDate(date)) +
            "</div>"
          : "") +
        "</header>";

      // Render body content as markdown-like paragraphs
      if (bodyContent) {
        html +=
          '<div class="essay-body font-serif text-lg leading-relaxed text-primary" style="max-width: 65ch;">';
        var paragraphs = bodyContent.split(/\n\n+/);
        paragraphs.forEach(function (para) {
          para = para.trim();
          if (!para) return;
          html += "<p class='mb-4'>" + escapeHtml(para) + "</p>";
        });
        html += "</div>";
      }

      container.innerHTML = html;
    })
    .catch(function (err) {
      console.error("Blog post display error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">' +
        (err.message === "Blog post not found"
          ? "Blog post not found."
          : "Unable to load blog post.") +
        '</p>' +
        '<p class="text-sm text-secondary mt-2"><a href="/blog" class="text-accent hover:underline">Browse all blog posts →</a></p>' +
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

document.addEventListener("DOMContentLoaded", renderBlogPost);
