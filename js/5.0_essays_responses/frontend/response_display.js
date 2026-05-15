// Trigger: DOMContentLoaded -> renderResponse('response-container')
// Function: Fetches a single published response by slug from /api/public/responses/{slug},
//           renders body as markdown-to-HTML, dispatches recordMainRendered for bibliography,
//           renders context_links, and links challenge_id back to the parent challenge page
// Output:  Rendered response with markdown body, bibliography, context links, and challenge link

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
      '<p class="text-sm text-secondary mt-2"><a href="/debate" class="text-accent hover:underline">Browse debate topics \u2192</a></p>' +
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

      // Update sidebar with linked parent challenge info
      if (targetEl) {
        if (resp.challenge_id) {
          var challengeLabel = resp.challenge_title || resp.challenge_id;
          targetEl.innerHTML =
            '<a href="../debate/challenge.html?id=' +
            encodeURIComponent(resp.challenge_id) +
            '" class="text-accent hover:underline">Challenge: ' +
            escapeHtml(challengeLabel) +
            "</a>";
        } else {
          targetEl.textContent = "Standalone response";
        }
      }

      // --- BODY: render markdown body field ---
      var bodyContent = "";
      if (resp.body) {
        bodyContent = resp.body;
      } else if (resp.description) {
        // Fallback to description if body is not present (legacy support)
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

      // --- BUILD HTML ---
      var html =
        '<header class="essay-header mb-8 pb-6" style="border-bottom: 1px solid var(--color-border);">' +
        '<h1 class="text-3xl font-bold font-serif mb-2">' +
        escapeHtml(resp.title) +
        "</h1>" +
        (date
          ? '<div class="text-sm font-mono text-muted">' +
            escapeHtml(formatDateLong(date)) +
            "</div>"
          : "") +
        "</header>";

      // Render markdown body as HTML
      if (bodyContent) {
        html +=
          '<div class="essay-body font-serif text-lg leading-relaxed text-primary" style="max-width: 65ch;">';
        html += renderMarkdown(bodyContent);
        html += "</div>";
      }

      // --- CHALLENGE LINK ---
      if (resp.challenge_id) {
        var bottomLabel = resp.challenge_title || resp.challenge_id;
        html +=
          '<div class="mt-8 pt-4" style="border-top: 1px solid var(--color-border);">' +
          '<p class="text-sm text-secondary">In response to: ' +
          '<a href="../debate/challenge.html?id=' +
          encodeURIComponent(resp.challenge_id) +
          '" class="text-accent hover:underline">' +
          escapeHtml(bottomLabel) +
          " \u2192</a></p>" +
          "</div>";
      }

      // --- CONTEXT LINKS ---
      if (resp.context_links) {
        var contextLinks = [];
        try {
          contextLinks =
            typeof resp.context_links === "string"
              ? JSON.parse(resp.context_links)
              : resp.context_links;
        } catch (e) {
          contextLinks = [];
        }

        if (Array.isArray(contextLinks) && contextLinks.length > 0) {
          html +=
            '<div class="context-links-section mt-8 pt-4" style="border-top: 1px solid var(--color-border);">' +
            '<h2 class="text-lg font-semibold mb-3">Related Resources</h2>' +
            '<ul class="context-links-list">';
          for (var i = 0; i < contextLinks.length; i++) {
            var link = contextLinks[i];
            var linkSlug = link.slug || "";
            var linkType = link.type || "record";
            var linkLabel = linkSlug
              ? linkType + ": " + linkSlug
              : "Untitled link";
            html +=
              '<li class="mb-1">' +
              '<a href="/record.html?id=' +
              encodeURIComponent(linkSlug) +
              '" class="text-accent hover:underline text-sm">' +
              escapeHtml(linkLabel) +
              "</a></li>";
          }
          html += "</ul></div>";
        }
      }

      container.innerHTML = html;

      // --- DISPATCH recordMainRendered for bibliography rendering ---
      // sources_biblio_display.js listens for this event to render the bibliography section
      var eventPayload = {
        record: {
          bibliography: resp.bibliography || null,
          title: resp.title,
          id: resp.id,
          slug: resp.slug,
        },
      };
      var evt = new CustomEvent("recordMainRendered", {
        detail: eventPayload,
      });
      document.dispatchEvent(evt);

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
        '<p class="text-sm text-secondary mt-2"><a href="/debate" class="text-accent hover:underline">Browse debate topics \u2192</a></p>' +
        "</div>";

      if (targetEl) {
        targetEl.textContent = "Unable to load response.";
      }
    });
}

/* -----------------------------------------------------------------------------
   MARKDOWN-TO-HTML CONVERTER
   Lightweight converter supporting: headings, paragraphs, bold, italic,
   links, inline code, blockquotes, and unordered/ordered lists.
----------------------------------------------------------------------------- */
function renderMarkdown(md) {
  if (!md) return "";

  var lines = md.split("\n");
  var html = "";
  var inList = false;
  var listType = ""; // "ul" or "ol"
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    // Blank line: close any open list and output a blank (skip double blanks)
    if (line.trim() === "") {
      if (inList) {
        html += "</" + listType + ">";
        inList = false;
        listType = "";
      }
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().indexOf("> ") === 0 || line.trim() === ">") {
      if (inList) {
        html += "</" + listType + ">";
        inList = false;
        listType = "";
      }
      var quoteContent = line.trim().replace(/^>\s?/, "");
      html +=
        "<blockquote>" + parseInlineMarkdown(quoteContent) + "</blockquote>";
      i++;
      continue;
    }

    // Headings
    var headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) {
        html += "</" + listType + ">";
        inList = false;
        listType = "";
      }
      var level = headingMatch[1].length;
      var headingText = headingMatch[2];
      html +=
        "<h" +
        level +
        ">" +
        parseInlineMarkdown(headingText) +
        "</h" +
        level +
        ">";
      i++;
      continue;
    }

    // Unordered list item
    var ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) html += "</" + listType + ">";
        html += "<ul>";
        inList = true;
        listType = "ul";
      }
      html += "<li>" + parseInlineMarkdown(ulMatch[2]) + "</li>";
      i++;
      continue;
    }

    // Ordered list item
    var olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) html += "</" + listType + ">";
        html += "<ol>";
        inList = true;
        listType = "ol";
      }
      html += "<li>" + parseInlineMarkdown(olMatch[2]) + "</li>";
      i++;
      continue;
    }

    // Regular paragraph text
    if (inList) {
      html += "</" + listType + ">";
      inList = false;
      listType = "";
    }

    // Collect consecutive non-blank, non-special lines into a paragraph
    var paraLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      var cur = lines[i];
      // Don't merge headings or list items into paragraphs
      if (
        cur.match(/^(#{1,6})\s+/) ||
        cur.match(/^(\s*)[-*]\s+/) ||
        cur.match(/^(\s*)\d+\.\s+/) ||
        cur.trim().indexOf("> ") === 0
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }
    if (paraLines.length > 0) {
      var paraText = paraLines.join(" ");
      html += "<p>" + parseInlineMarkdown(paraText) + "</p>";
    } else {
      i++;
    }
  }

  // Close any remaining open list
  if (inList) {
    html += "</" + listType + ">";
  }

  return html;
}

/* -----------------------------------------------------------------------------
   INLINE MARKDOWN PARSER
   Handles: **bold**, *italic*, `inline code`, [links](url)
----------------------------------------------------------------------------- */
function parseInlineMarkdown(text) {
  if (!text) return "";

  // Escape HTML first
  var escaped = escapeHtml(text);

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_ (but not ** or __)
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Links: [text](url)
  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-accent hover:underline">$1</a>',
  );

  return escaped;
}

document.addEventListener("DOMContentLoaded", function () {
  renderResponse("response-container");
});
