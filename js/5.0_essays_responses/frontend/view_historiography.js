// Trigger: DOMContentLoaded -> renderHistoriography('historiography-container')
// Function: Fetches the singleton historiography record (slug="historiography")
//           from the public API, converts markdown to HTML, and renders with
//           BEM essay-* classes.
// Output:  Injects fully structured essay with TOC, bibliography containers,
//          picture container, context links, and metadata fields.

function renderHistoriography(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // --- Loading state ---
  container.innerHTML =
    '<article class="essay-container">' +
    '<p class="essay-loading">Loading historiography&hellip;</p>' +
    "</article>";

  // --- Singleton fetch: there is exactly one historiography record ---
  fetch(
    "/api/public/essays/historiography?type=historiographical_essay&status=published",
  )
    .then(function (response) {
      if (!response.ok) {
        if (response.status === 404)
          throw new Error("Historiography record not found");
        throw new Error(
          "Failed to fetch historiography (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var essay = data.essay || data;
      if (!essay || !essay.title)
        throw new Error("Historiography record not found");

      // Update document title
      var titleEl = document.querySelector("title");
      if (titleEl) {
        titleEl.textContent = essay.title + " | The Jesus Website";
      }

      // Render the full essay HTML
      container.innerHTML = buildHistoriographyHTML(essay);

      // Generate table of contents from headings in body
      generateHistoriographyTOC(essay);

      // Dispatch event so bibliography and picture display scripts can render
      var renderedEvent = new CustomEvent("recordMainRendered", {
        detail: { record: essay },
      });
      document.dispatchEvent(renderedEvent);
    })
    .catch(function (err) {
      container.innerHTML =
        '<article class="essay-container">' +
        '<div class="essay-empty">' +
        '<p class="essay-empty__text">' +
        escapeHtmlHist(err.message || "Unable to load historiography.") +
        "</p>" +
        "</div>" +
        "</article>";
    });
}

// ---------------------------------------------------------------------------
//  buildHistoriographyHTML
//  Constructs the complete BEM-structured essay HTML from the record data.
//  Uses only essay-* class names from essays.css — no utility classes.
//  This is intentionally parallel to buildEssayHTML in view_context_essays.js
//  and must remain functionally identical.
// ---------------------------------------------------------------------------

function buildHistoriographyHTML(essay) {
  var html = "";

  // --- Header ---
  html += '<header class="essay-header">';
  html +=
    '<h1 class="essay-title">' +
    escapeHtmlHist(essay.title || "Untitled") +
    "</h1>";

  if (essay.snippet) {
    var snippetText = getSnippetTextHist(essay.snippet);
    if (snippetText) {
      html +=
        '<p class="essay-subtitle">' + escapeHtmlHist(snippetText) + "</p>";
    }
  }

  // Metadata line: date only — unique identifiers moved to dedicated list section
  var metaParts = [];
  if (essay.updated_at || essay.created_at) {
    metaParts.push(formatDateHist(essay.updated_at || essay.created_at));
  }

  if (metaParts.length > 0) {
    html +=
      '<div class="essay-meta">' + metaParts.join(" &middot; ") + "</div>";
  }

  html += "</header>";

  // --- Unique Identifiers — render as a formal <ul> list section ---
  var refItems = [];
  if (essay.iaa)
    refItems.push(
      '<li><span class="ref-label">IAA Reference:</span> <span class="ref-value">' +
        escapeHtmlHist(essay.iaa) +
        "</span></li>",
    );
  if (essay.pledius)
    refItems.push(
      '<li><span class="ref-label">Pledius:</span> <span class="ref-value">' +
        escapeHtmlHist(essay.pledius) +
        "</span></li>",
    );
  if (essay.manuscript)
    refItems.push(
      '<li><span class="ref-label">Manuscript:</span> <span class="ref-value">' +
        escapeHtmlHist(essay.manuscript) +
        "</span></li>",
    );
  // Custom identifiers from metadata_json.identifiers
  try {
    if (essay.metadata_json) {
      var meta = JSON.parse(essay.metadata_json);
      if (Array.isArray(meta.identifiers)) {
        meta.identifiers.forEach(function (ident) {
          if (ident.type && ident.value) {
            refItems.push(
              '<li><span class="ref-label">' +
                ident.type +
                ':</span> <span class="ref-value">' +
                ident.value +
                "</span></li>"
            );
          }
        });
      }
    }
  } catch (e) { /* ignore parse errors */ }

  if (refItems.length > 0) {
    html += '<section class="essay-references">';
    html += '<h2 class="essay-body h2">Unique Identifiers</h2>';
    html += '<ul class="essay-references__list">' + refItems.join("") + "</ul>";
    html += "</section>";
  }

  // --- Abstract / Snippet highlight ---
  if (essay.snippet) {
    var abstractText = getSnippetTextHist(essay.snippet);
    if (abstractText) {
      html +=
        '<aside class="essay-abstract">' +
        "<strong>Abstract:</strong> " +
        escapeHtmlHist(abstractText) +
        "</aside>";
    }
  }

  // --- Picture container (injected by pictures_display.js) ---
  html +=
    '<figure class="essay-picture" id="record-picture-container"></figure>';

  // --- Body (markdown converted to HTML) ---
  var bodyMarkdown = essay.body || essay.context_essays || "";
  if (typeof bodyMarkdown === "object") {
    try {
      bodyMarkdown = JSON.stringify(bodyMarkdown);
    } catch (e) {
      bodyMarkdown = "";
    }
  }
  if (bodyMarkdown) {
    html += '<section class="essay-body">';
    html += convertMarkdownToHTMLHist(String(bodyMarkdown));
    html += "</section>";
  }

  // --- URL / External links ---
  if (essay.url) {
    var urls = essay.url;
    if (typeof urls === "string") {
      try {
        urls = JSON.parse(urls);
      } catch (e) {
        urls = null;
      }
    }
    if (urls && typeof urls === "object") {
      html += '<section class="essay-urls">';
      html += '<h2 class="essay-body h2">External Links</h2>';
      html += '<ul class="essay-urls__list">';
      Object.keys(urls).forEach(function (key) {
        var val = urls[key];
        html +=
          '<li class="essay-urls__item"><a href="' +
          escapeAttrHist(val) +
          '" class="essay-urls__link" rel="external nofollow">' +
          escapeHtmlHist(key) +
          "</a></li>";
      });
      html += "</ul></section>";
    }
  }

  // --- Context Links ---
  if (essay.context_links) {
    var links = essay.context_links;
    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch (e) {
        links = null;
      }
    }
    if (Array.isArray(links) && links.length > 0) {
      html += '<section class="essay-context-links">';
      html += '<h2 class="essay-body h2">Related Resources</h2>';
      html += '<ul class="essay-context-links__list">';
      links.forEach(function (link) {
        var label = link.slug || link.label || "";
        var type = link.type || "record";
        html +=
          '<li class="essay-context-links__item">' +
          '<a href="/' +
          type +
          "/" +
          encodeURIComponent(label) +
          '" class="essay-context-links__link">' +
          escapeHtmlHist(label) +
          ' <span class="essay-context-links__type">(' +
          escapeHtmlHist(type) +
          ")</span>" +
          "</a></li>";
      });
      html += "</ul></section>";
    }
  }

  // --- Bibliography container (injected by sources_biblio_display.js) ---
  html +=
    '<section class="essay-bibliography is-hidden" id="record-section-bibliography">';
  html += '<h2 class="bibliography-title">Bibliography</h2>';
  html +=
    '<div class="essay-bibliography__content" id="record-bibliography-content"></div>';
  html += "</section>";

  return html;
}

// ---------------------------------------------------------------------------
//  generateHistoriographyTOC
//  Builds a table of contents from h2/h3 headings in the rendered body and
//  injects it into the #essay-toc list element.
// ---------------------------------------------------------------------------

function generateHistoriographyTOC(essay) {
  var toc = document.getElementById("essay-toc");
  if (!toc) return;

  var headings = document.querySelectorAll(".essay-body h2, .essay-body h3");

  if (headings.length === 0) {
    toc.innerHTML =
      '<li><a href="#" class="essay-toc-list__link">Back to top</a></li>';
    return;
  }

  var items = [];
  headings.forEach(function (h, i) {
    var id = h.getAttribute("id");
    if (!id) {
      id = "hist-heading-" + i;
      h.setAttribute("id", id);
    }
    var levelClass =
      h.tagName === "H2"
        ? "essay-toc-list__item--h2"
        : "essay-toc-list__item--h3";
    items.push(
      '<li class="' +
        levelClass +
        '"><a href="#' +
        id +
        '" class="essay-toc-list__link">' +
        escapeHtmlHist(h.textContent || "") +
        "</a></li>",
    );
  });

  toc.innerHTML = items.join("");
}

// ---------------------------------------------------------------------------
//  getSnippetTextHist
//  Extracts plain text from a snippet that may be a JSON array of paragraph
//  objects, a plain string, or a single object with .text.
// ---------------------------------------------------------------------------

function getSnippetTextHist(snippet) {
  if (!snippet) return "";
  if (typeof snippet === "string") {
    try {
      var parsed = JSON.parse(snippet);
      return getSnippetTextHist(parsed);
    } catch (e) {
      return snippet;
    }
  }
  if (Array.isArray(snippet)) {
    return snippet
      .map(function (p) {
        return typeof p === "object" ? p.text || "" : String(p);
      })
      .join(" ")
      .trim();
  }
  if (typeof snippet === "object" && snippet.text) {
    return snippet.text;
  }
  return String(snippet);
}

// ---------------------------------------------------------------------------
//  convertMarkdownToHTMLHist
//  Lightweight regex-based markdown-to-HTML converter. Handles:
//  - Headings: # ## ### (mapped to h2/h3/h4 since h1 is page title)
//  - Paragraphs: double-newline separation
//  - Bold: **text**
//  - Italic: *text*
//  - Links: [text](url)
//  - Inline code: `text`
//  This is functionally identical to the converter in view_context_essays.js.
// ---------------------------------------------------------------------------

function convertMarkdownToHTMLHist(md) {
  if (!md) return "";

  var html = String(md);

  // 1. Escape existing HTML to prevent injection
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Split into blocks by double newlines
  var blocks = html.split(/\n\n+/);
  var output = [];

  blocks.forEach(function (block) {
    block = block.trim();
    if (!block) return;

    // Check for headings
    var headingMatch = block.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      var level = headingMatch[1].length;
      // Map # -> h2, ## -> h3, ### -> h4 (h1 is the page title)
      var tag = "h" + (level + 1);
      var headingText = headingMatch[2];
      var id = slugifyHist(headingText);
      output.push(
        "<" +
          tag +
          ' id="' +
          id +
          '">' +
          processInlineMarkdownHist(headingText) +
          "</" +
          tag +
          ">",
      );
      return;
    }

    // Regular paragraph
    output.push("<p>" + processInlineMarkdownHist(block) + "</p>");
  });

  return output.join("\n");
}

// ---------------------------------------------------------------------------
//  processInlineMarkdownHist
//  Applies inline formatting: bold, italic, links, inline code.
// ---------------------------------------------------------------------------

function processInlineMarkdownHist(text) {
  if (!text) return "";

  // Protect inline code first
  var codeBlocks = [];
  text = text.replace(/`([^`]+)`/g, function (match, code) {
    codeBlocks.push("<code>" + code + "</code>");
    return "\x00CODE" + (codeBlocks.length - 1) + "\x00";
  });

  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  text = text.replace(
    /(^|\s)\*([^*\n]+)\*(\s|$|\.|,|;|:|\?|!|\))/g,
    "$1<em>$2</em>$3",
  );

  // Links: [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="essay-body__link">$1</a>',
  );

  // Restore code blocks
  text = text.replace(/\x00CODE(\d+)\x00/g, function (match, idx) {
    return codeBlocks[parseInt(idx, 10)] || "";
  });

  return text;
}

// ---------------------------------------------------------------------------
//  slugifyHist
//  Converts a heading string into a URL-friendly ID.
// ---------------------------------------------------------------------------

function slugifyHist(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
//  formatDateHist
//  Formats an ISO date string into readable "Month Day, Year" format.
// ---------------------------------------------------------------------------

function formatDateHist(isoString) {
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

// ---------------------------------------------------------------------------
//  escapeHtmlHist / escapeAttrHist
//  Minimal HTML and attribute escaping utilities.
// ---------------------------------------------------------------------------

function escapeHtmlHist(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttrHist(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Bootstrap ---
document.addEventListener("DOMContentLoaded", function () {
  renderHistoriography("historiography-container");
});
