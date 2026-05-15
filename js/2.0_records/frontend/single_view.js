// =============================================================================
//
//   THE JESUS WEBSITE — SINGLE VIEW RENDERER
//   File:    js/2.0_records/frontend/single_view.js
//   Version: 1.2.0
//   Purpose: Resolves the record slug from the URL (query param ?slug= or
//            clean path /record/{slug}), queries the global TheJesusDB for
//            that record, and injects the data into the HTML DOM of record.html.
//   Source:  guide_function.md, module_sitemap.md §2.0
//
//   DEPENDENCIES:
//     - setup_db.js (window.TheJesusDB must be ready)
//     - header.js (for injectPageMetadata)
//     - record.html (contains the specific ID targets)
//
// =============================================================================

function renderSingleRecord() {
  // 1. Resolve slug from URL — prefer query param, fallback to clean path
  const urlParams = new URLSearchParams(window.location.search);
  let slug = sanitizeSlug(urlParams.get("slug"));

  if (!slug) {
    // Fallback: parse slug from clean URL path /record/{slug}
    const pathMatch = window.location.pathname.match(
      /\/record\/([a-z0-9_-]+)/i,
    );
    if (pathMatch) {
      slug = sanitizeSlug(pathMatch[1]);
    }
  }

  const titleEl = document.getElementById("record-title");
  const verseEl = document.getElementById("record-primary-verse");
  const descEl = document.getElementById("record-description");
  const metaSection = document.getElementById("record-section-metadata");
  const metaGrid = document.getElementById("record-metadata-grid");

  if (!slug) {
    titleEl.textContent = "Error: No record specified";
    var errP = document.createElement("p");
    errP.textContent = "A valid record identifier (slug) is required in the URL.";
    descEl.appendChild(errP);
    return;
  }

  // 2. Fetch record from database
  const record = window.TheJesusDB.getRecord(slug);

  if (!record) {
    titleEl.textContent = "Record Not Found";
    var notFoundP = document.createElement("p");
    notFoundP.textContent = "We could not find a record matching this identifier.";
    descEl.appendChild(notFoundP);
    return;
  }

  // 3. Populate basic fields
  titleEl.textContent = record.title;

  // Primary Verse parsing
  if (record.primary_verse) {
    try {
      const verseArr = JSON.parse(record.primary_verse);
      if (verseArr && verseArr.length > 0) {
        const v = verseArr[0];
        verseEl.textContent = `${v.book} ${v.chapter}:${v.verse}`;
      }
    } catch (e) {
      console.error("Failed to parse primary verse", e);
    }
  }

  // Secondary Verse rendering — create container after primary verse
  if (record.secondary_verse) {
    try {
      var secVerses = JSON.parse(record.secondary_verse);
      if (secVerses && secVerses.length > 0) {
        var secEl = document.createElement("p");
        secEl.className = "record-secondary-verse";
        secEl.id = "record-secondary-verse";
        secEl.textContent = secVerses
          .map(function (sv) {
            return sv.book + " " + sv.chapter + ":" + sv.verse;
          })
          .join("; ");
        verseEl.insertAdjacentElement("afterend", secEl);
      }
    } catch (e) {
      console.error("Failed to parse secondary verse", e);
    }
  }

  // Description parsing (JSON array of paragraph strings)
  if (record.description) {
    try {
      const paragraphs = JSON.parse(record.description);
      descEl.textContent = "";
      paragraphs.forEach(function (p) {
        var pEl = document.createElement("p");
        pEl.textContent = p;
        descEl.appendChild(pEl);
      });
    } catch (e) {
      descEl.textContent = "";
      var fallbackP = document.createElement("p");
      fallbackP.textContent = record.description;
      descEl.appendChild(fallbackP);
    }
  }

  // 4. Update Header metadata
  if (typeof injectPageMetadata === "function") {
    let snippetText = "";
    try {
      const snips = JSON.parse(record.snippet);
      if (snips && snips.length > 0) snippetText = snips[0];
    } catch (e) {
      snippetText = record.snippet || record.title;
    }

    injectPageMetadata({
      title: record.title,
      description: snippetText,
      canonical: window.location.href, // Current URL
      ogType: "article",
    });
  }

  // 5. Populate Metadata Grid
  // Collect fields like era, map_label, gospel_category
  const metadataItems = [];

  if (record.era) {
    metadataItems.push({ label: "Era", value: record.era });
  }
  if (record.gospel_category) {
    metadataItems.push({ label: "Category", value: record.gospel_category });
  }
  if (record.map_label) {
    metadataItems.push({ label: "Map Category", value: record.map_label });
  }
  if (record.timeline) {
    metadataItems.push({ label: "Timeline", value: record.timeline });
  }
  if (record.geo_id) {
    metadataItems.push({ label: "Geo ID", value: record.geo_id });
  }
  if (record.page_views) {
    metadataItems.push({ label: "Page Views", value: record.page_views });
  }

  if (metadataItems.length > 0) {
    metaGrid.textContent = "";
    metadataItems.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "metadata-item";
      var labelSpan = document.createElement("span");
      labelSpan.className = "metadata-label";
      labelSpan.textContent = item.label;
      var valueSpan = document.createElement("span");
      valueSpan.className = "metadata-value";
      valueSpan.textContent = item.value;
      div.appendChild(labelSpan);
      div.appendChild(valueSpan);
      metaGrid.appendChild(div);
    });
    metaSection.classList.add("is-visible-block");
    metaSection.classList.remove("is-hidden");
  }

  // --- parent_id — navigable link to parent record ------------------------
  if (record.parent_id) {
    var parentRows = window.TheJesusDB.runQuery(
      "SELECT slug, title FROM records WHERE id = ? LIMIT 1;",
      [record.parent_id],
    );
    if (parentRows.length > 0) {
      var parent = parentRows[0];
      var parentEl = document.createElement("a");
      parentEl.href = "/record/" + parent.slug;
      parentEl.className = "record-parent-link";
      parentEl.textContent = "Parent: " + parent.title;
      metaSection.insertAdjacentElement("afterend", parentEl);
    }
  }

  // --- context_links — render as linked list into #record-context-list -----
  var contextListEl = document.getElementById("record-context-list");
  var contextSectionEl = document.getElementById("record-section-context");
  if (record.context_links && contextListEl && contextSectionEl) {
    try {
      var contextLinks = JSON.parse(record.context_links);
      if (contextLinks && contextLinks.length > 0) {
        contextListEl.textContent = "";
        contextLinks.forEach(function (link) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          var href = String(link.url || "");
          if (href.startsWith("/") || href.startsWith("https://")) {
            a.href = href;
          } else {
            a.removeAttribute("href");
          }
          a.textContent = link.label || link.url || "";
          li.appendChild(a);
          contextListEl.appendChild(li);
        });
        contextSectionEl.classList.add("is-visible-block");
        contextSectionEl.classList.remove("is-hidden");
      }
    } catch (e) {
      console.error("Failed to parse context_links", e);
    }
  }

  // --- unique identifiers — render as a formal <ul> list section ---
  var refsListEl = document.getElementById("record-references-list");
  var refsSectionEl = document.getElementById("record-section-references");
  if (refsListEl && refsSectionEl) {
    var hasRefs = false;

    function _appendRefItem(label, value) {
      var li = document.createElement("li");
      var labelSpan = document.createElement("span");
      labelSpan.className = "ref-label";
      labelSpan.textContent = label + ":";
      var valueSpan = document.createElement("span");
      valueSpan.className = "ref-value";
      valueSpan.textContent = " " + value;
      li.appendChild(labelSpan);
      li.appendChild(valueSpan);
      refsListEl.appendChild(li);
      hasRefs = true;
    }

    refsListEl.textContent = "";

    if (record.iaa) _appendRefItem("IAA Reference", record.iaa);
    if (record.pledius) _appendRefItem("Pledius", record.pledius);
    if (record.manuscript) _appendRefItem("Manuscript", record.manuscript);

    try {
      if (record.metadata_json) {
        var meta = JSON.parse(record.metadata_json);
        if (Array.isArray(meta.identifiers)) {
          meta.identifiers.forEach(function (ident) {
            if (ident.type && ident.value) {
              _appendRefItem(ident.type, ident.value);
            }
          });
        }
      }
    } catch (e) {
      /* ignore parse errors */
    }

    if (hasRefs) {
      refsSectionEl.classList.add("is-visible-block");
      refsSectionEl.classList.remove("is-hidden");
    }
  }

  // --- Inject SEO keywords into <meta name="keywords"> ---
  try {
    if (record.metadata_json) {
      var meta = JSON.parse(record.metadata_json);
      var keywords = meta.keywords || meta.seo_keywords || "";
      if (typeof keywords === "string" && keywords.trim()) {
        // Also accept comma-separated strings or arrays from the metadata widget
        var kwStr = keywords;
        var existingTag = document.querySelector('meta[name="keywords"]');
        if (!existingTag) {
          existingTag = document.createElement("meta");
          existingTag.setAttribute("name", "keywords");
          document.head.appendChild(existingTag);
        }
        existingTag.setAttribute("content", kwStr);
      } else if (Array.isArray(keywords) && keywords.length > 0) {
        var kwStr = keywords.join(", ");
        var existingTag = document.querySelector('meta[name="keywords"]');
        if (!existingTag) {
          existingTag = document.createElement("meta");
          existingTag.setAttribute("name", "keywords");
          document.head.appendChild(existingTag);
        }
        existingTag.setAttribute("content", kwStr);
      }
    }
  } catch (e) {
    /* ignore parse errors */
  }

  // 6. Trigger custom event for other displays (pictures, bibliography, context) to run
  // This allows loosely coupled JS files to add their own elements to the record view.
  var renderCompleteEvent = new CustomEvent("recordMainRendered", {
    detail: { record: record },
  });
  document.dispatchEvent(renderCompleteEvent);
}

// Wait for database to be ready before rendering
window.addEventListener("thejesusdb:ready", function () {
  renderSingleRecord();
});

// If DB initialized before this script loaded (failsafe)
if (window.TheJesusDB && window.TheJesusDB.ready) {
  renderSingleRecord();
}
