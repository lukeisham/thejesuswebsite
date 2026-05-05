// =============================================================================
//
//   THE JESUS WEBSITE — CHALLENGE RESPONSE DISPLAY
//   File:    js/5.0_essays_responses/frontend/response_display.js
//   Version: 1.1.0
//   Purpose: Fetches and renders a single published challenge response by
//            slug from the public API.
//   Source:  guide_appearance.md §5.2, module_sitemap.md
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderResponse('response-container')
// Function: Reads ?id= from the URL query string (used as the response slug),
//           fetches the matching published response from the public API,
//           and injects the content into the container.
// Output: Renders full response or error/empty state inside container.

function renderResponse(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Determine target from URL parameter
  var urlParams = new URLSearchParams(window.location.search);
  var slug = urlParams.get("id");

  if (!slug) {
    container.innerHTML =
      '<div class="empty-state text-center py-12">' +
      '<p class="text-lg text-muted font-serif">No response specified.</p>' +
      '<p class="text-sm text-secondary mt-2"><a href="/debate" class="text-accent hover:underline">Browse debate topics →</a></p>' +
      "</div>";
    return;
  }

  // Show loading state
  container.innerHTML = '<p class="text-sm text-muted">Loading response...</p>';

  // Update sidebar challenge target
  var targetEl = document.getElementById("challenge-target");
  if (targetEl) {
    targetEl.textContent = "Loading...";
  }

  // Update page title
  var titleEl = document.querySelector("title");
  if (titleEl) {
    titleEl.textContent = "Loading... | The Jesus Website";
  }

  fetch("/api/public/responses/" + encodeURIComponent(slug))
    .then(function (response) {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Response not found");
        }
        throw new Error(
          "Failed to fetch response (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var resp = data.response;
      if (!resp) {
        throw new Error("Response not found");
      }

      // Update page metadata
      if (titleEl) {
        titleEl.textContent = resp.title + " | The Jesus Website";
      }

      // Update sidebar with parent challenge info
      if (targetEl) {
        targetEl.textContent = resp.challenge_id
          ? "Challenge ID: " + resp.challenge_id
          : "Standalone response";
      }

      // Extract body content from description
      var bodyContent = "";
      if (resp.description) {
        try {
          var desc =
            typeof resp.description === "string"
              ? JSON.parse(resp.description)
              : resp.description;
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
          bodyContent = resp.description;
        }
      }

      var date = resp.updated_at || resp.created_at || "";

      // Build the response HTML
      var html =
        '<header class="essay-header mb-8 pb-6" style="border-bottom: 1px solid var(--color-border);">' +
        '<h1 class="text-3xl font-bold font-serif mb-2">' +
        escapeHtml(resp.title) +
        "</h1>" +
        (date
          ? '<div class="text-sm font-mono text-muted">' +
            escapeHtml(formatDate(date)) +
            "</div>"
          : "") +
        "</header>";

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

      // Mock TOC generation from headings in the content
      var toc = document.getElementById("essay-toc");
      if (toc) {
        toc.innerHTML =
          '<li><a href="#" class="text-sm text-secondary hover:text-primary">Back to top</a></li>';
      }
    })
    .catch(function (err) {
      console.error("Response display error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">' +
        (err.message === "Response not found"
          ? "Response not found."
          : "Unable to load response.") +
        "</p>" +
        '<p class="text-sm text-secondary mt-2"><a href="/debate" class="text-accent hover:underline">Browse debate topics →</a></p>' +
        "</div>";

      if (targetEl) {
        targetEl.textContent = "Unable to load response.";
      }
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

document.addEventListener("DOMContentLoaded", function () {
  renderResponse("response-container");
});
