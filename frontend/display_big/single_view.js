// =============================================================================
//
//   THE JESUS WEBSITE — SINGLE VIEW RENDERER
//   File:    frontend/display_big/single_view.js
//   Version: 1.1.0
//   Purpose: Reads the 'slug' from the URL query string, queries the global
//            TheJesusDB for that record, and injects the data into the HTML
//            DOM of record.html.
//   Source:  guide_function.md, module_sitemap.md §2.0
//
//   DEPENDENCIES:
//     - setup_db.js (window.TheJesusDB must be ready)
//     - header.js (for injectPageMetadata)
//     - record.html (contains the specific ID targets)
//
// =============================================================================

function renderSingleRecord() {
  // 1. Get slug from URL
  const urlParams = new URLSearchParams(window.location.search);
  const slug = sanitizeSlug(urlParams.get("slug"));

  const titleEl = document.getElementById("record-title");
  const verseEl = document.getElementById("record-primary-verse");
  const descEl = document.getElementById("record-description");
  const metaSection = document.getElementById("record-section-metadata");
  const metaGrid = document.getElementById("record-metadata-grid");

  if (!slug) {
    titleEl.textContent = "Error: No record specified";
    descEl.innerHTML =
      "<p>A valid record identifier (slug) is required in the URL.</p>";
    return;
  }

  // 2. Fetch record from database
  const record = window.TheJesusDB.getRecord(slug);

  if (!record) {
    titleEl.textContent = "Record Not Found";
    descEl.innerHTML =
      "<p>We could not find a record matching this identifier.</p>";
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

  // Description parsing (JSON array of paragraph strings)
  if (record.description) {
    try {
      const paragraphs = JSON.parse(record.description);
      descEl.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join("");
    } catch (e) {
      // Fallback if not valid JSON
      descEl.innerHTML = `<p>${record.description}</p>`;
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
  if (record.page_views) {
    metadataItems.push({ label: "Page Views", value: record.page_views });
  }

  if (metadataItems.length > 0) {
    metaGrid.innerHTML = metadataItems
      .map(
        (item) => `
            <div class="metadata-item">
                <span class="metadata-label">${item.label}</span>
                <span class="metadata-value">${item.value}</span>
            </div>
        `,
      )
      .join("");
    metaSection.classList.add("is-visible-block");
    metaSection.classList.remove("is-hidden");
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
