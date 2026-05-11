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

  // Resolve slug from URL — prefer query param, fallback to clean path /blog/{slug}
  var urlParams = new URLSearchParams(window.location.search);
  var slug = urlParams.get("slug");

  if (!slug) {
    var pathMatch = window.location.pathname.match(/\/blog\/([a-z0-9_-]+)/i);
    if (pathMatch) {
      slug = pathMatch[1];
    }
  }

  if (!slug) {
    container.innerHTML =
      '<div class="empty-state text-center py-12">' +
      '<p class="text-lg text-muted font-serif">No blog post specified.</p>' +
      '<p class="text-sm text-secondary mt-2"><a href="/blog" class="text-accent hover:underline">Browse all blog posts →</a></p>' +
      "</div>";
    return;
  }

  // Show loading state
  container.innerHTML =
    '<p class="text-sm text-muted">Loading blog post...</p>';

  // Update page title
  var titleEl = document.querySelector("title");
  if (titleEl) {
    titleEl.textContent = "Loading... | The Jesus Website";
  }

  fetch(
    "/api/public/blogposts/" +
      encodeURIComponent(slug) +
      "?type=blog_post&status=published",
  )
    .then(function (response) {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Blog post not found");
        }
        throw new Error(
          "Failed to fetch blog post (HTTP " + response.status + ")",
        );
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

      // Extract blog post body content from the body markdown field (schema column)
      var bodyContent = post.body || "";

      // Fallback: blogposts blob (legacy)
      if (
        !bodyContent &&
        post.blogposts &&
        typeof post.blogposts === "object"
      ) {
        bodyContent = post.blogposts.content || post.blogposts.body || "";
      }

      // Fallback: description field
      if (!bodyContent && post.description) {
        try {
          var desc =
            typeof post.description === "string"
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

      // Render the blog post with blog-* BEM classes
      var html =
        '<header class="blog-header" style="border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-6); margin-bottom: var(--space-8);">' +
        '<h1 class="blog-title">' +
        escapeHtml(post.title) +
        "</h1>" +
        (date
          ? '<div class="blog-date">' + escapeHtml(formatDate(date)) + "</div>"
          : "") +
        "</header>";

      // Render body content using simple markdown-to-HTML conversion
      if (bodyContent) {
        html += '<div class="blog-body" style="max-width: 65ch;">';
        html += convertMarkdownToHTML(bodyContent);
        html += "</div>";
      }

      // --- Metadata section: render missing schema fields ---
      html +=
        '<section class="blog-metadata" style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-border);">';
      html += '<h2 class="blog-metadata__heading">Article Details</h2>';
      html += '<dl class="blog-metadata__grid">';

      if (post.iaa) {
        html +=
          '<div class="blog-metadata__item"><dt>IAA Reference</dt><dd>' +
          escapeHtml(post.iaa) +
          "</dd></div>";
      }
      if (post.pledius) {
        html +=
          '<div class="blog-metadata__item"><dt>Pledius</dt><dd>' +
          escapeHtml(post.pledius) +
          "</dd></div>";
      }
      if (post.manuscript) {
        html +=
          '<div class="blog-metadata__item"><dt>Manuscript</dt><dd>' +
          escapeHtml(post.manuscript) +
          "</dd></div>";
      }
      if (post.url) {
        html +=
          '<div class="blog-metadata__item"><dt>URL</dt><dd>' +
          renderUrlField(post.url) +
          "</dd></div>";
      }
      if (post.page_views !== undefined && post.page_views !== null) {
        html +=
          '<div class="blog-metadata__item"><dt>Page Views</dt><dd>' +
          escapeHtml(String(post.page_views)) +
          "</dd></div>";
      }

      html += "</dl></section>";

      // --- Bibliography section ---
      html += '<section id="record-section-bibliography" class="is-hidden">';
      html += '<h2 class="blog-metadata__heading">Bibliography</h2>';
      html += '<div id="record-bibliography-content"></div>';
      html += "</section>";

      // --- Context Links section ---
      if (post.context_links) {
        html +=
          '<section class="blog-context-links" style="margin-top: var(--space-6);">';
        html += '<h2 class="blog-metadata__heading">Related Resources</h2>';
        html += renderContextLinks(post.context_links);
        html += "</section>";
      }

      // --- Picture container ---
      html +=
        '<div id="record-picture-container" class="is-hidden" style="margin-top: var(--space-6);"></div>';

      container.innerHTML = html;

      // Dispatch event for bibliography and picture renderers
      var renderCompleteEvent = new CustomEvent("recordMainRendered", {
        detail: { record: post },
      });
      document.dispatchEvent(renderCompleteEvent);
    })
    .catch(function (err) {
      console.error("Blog post display error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">' +
        (err.message === "Blog post not found"
          ? "Blog post not found."
          : "Unable to load blog post.") +
        "</p>" +
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

function convertMarkdownToHTML(md) {
  if (!md || typeof md !== "string") return "";

  var html = md;

  // Escape HTML first, then selectively unescape markdown-generated tags
  html = escapeHtml(html);

  // Headings (must process before paragraphs)
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );

  // Paragraphs (double newlines)
  var blocks = html.split(/\n\n+/);
  var result = "";
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i].trim();
    if (!block) continue;
    // Don't wrap headings or already-wrapped elements in <p>
    if (/^<(h[1-6]|ul|ol|blockquote|pre|div|section|article)/i.test(block)) {
      result += block;
    } else {
      result += "<p>" + block.replace(/\n/g, "<br>") + "</p>";
    }
  }

  return result;
}

function renderUrlField(urlField) {
  if (!urlField) return "";
  try {
    var urls = typeof urlField === "string" ? JSON.parse(urlField) : urlField;
    if (Array.isArray(urls)) {
      return urls
        .map(function (u) {
          if (typeof u === "object" && u.url) {
            return (
              '<a href="' +
              escapeHtml(u.url) +
              '" target="_blank" rel="noopener" class="blog-link">' +
              escapeHtml(u.label || u.url) +
              "</a>"
            );
          }
          if (typeof u === "string") {
            return (
              '<a href="' +
              escapeHtml(u) +
              '" target="_blank" rel="noopener" class="blog-link">' +
              escapeHtml(u) +
              "</a>"
            );
          }
          return "";
        })
        .filter(function (s) {
          return s !== "";
        })
        .join(", ");
    }
    if (typeof urls === "object" && urls.url) {
      return (
        '<a href="' +
        escapeHtml(urls.url) +
        '" target="_blank" rel="noopener" class="blog-link">' +
        escapeHtml(urls.label || urls.url) +
        "</a>"
      );
    }
    if (typeof urls === "string") {
      return (
        '<a href="' +
        escapeHtml(urls) +
        '" target="_blank" rel="noopener" class="blog-link">' +
        escapeHtml(urls) +
        "</a>"
      );
    }
  } catch (e) {
    if (typeof urlField === "string") {
      return (
        '<a href="' +
        escapeHtml(urlField) +
        '" target="_blank" rel="noopener" class="blog-link">' +
        escapeHtml(urlField) +
        "</a>"
      );
    }
  }
  return "";
}

function renderContextLinks(contextLinks) {
  if (!contextLinks) return "";
  try {
    var links =
      typeof contextLinks === "string"
        ? JSON.parse(contextLinks)
        : contextLinks;
    if (Array.isArray(links)) {
      return (
        '<ul class="blog-context-links__list">' +
        links
          .map(function (link) {
            if (typeof link === "object" && link.slug) {
              return (
                '<li><a href="/record/' +
                encodeURIComponent(link.slug) +
                '" class="blog-link">' +
                escapeHtml(link.title || link.slug) +
                "</a></li>"
              );
            }
            if (typeof link === "string") {
              return (
                '<li><a href="/record/' +
                encodeURIComponent(link) +
                '" class="blog-link">' +
                escapeHtml(link) +
                "</a></li>"
              );
            }
            return "";
          })
          .filter(function (s) {
            return s !== "";
          })
          .join("") +
        "</ul>"
      );
    }
  } catch (e) {
    return "";
  }
  return "";
}

document.addEventListener("DOMContentLoaded", renderBlogPost);
