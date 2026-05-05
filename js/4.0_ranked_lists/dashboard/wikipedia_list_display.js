// Trigger:  Called by dashboard_wikipedia.js → window.displayWikipediaList()
//           on initial load and after Refresh/Publish/Recalculate operations.
// Main:    displayWikipediaList() — fetches records from the API, filters to
//           those with Wikipedia data, sorts by wikipedia_rank, renders the
//           ranked list with row selection that updates the sidebar.
// Output:  Ranked Wikipedia article list rendered in #wikipedia-ranked-list
//          with selection state tracked in _wikipediaModuleState. Errors
//          routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayWikipediaList
   Fetches all records, filters for those with Wikipedia data, sorts by rank,
   and renders them as a ranked ordered list. Each row shows rank, title,
   Wikipedia link, score, status, and a select button.

   Parameters: none (reads from global API)
----------------------------------------------------------------------------- */
async function displayWikipediaList() {
  const loadingEl = document.getElementById("wikipedia-list-loading");
  const listEl = document.getElementById("wikipedia-ranked-list");
  const emptyEl = document.getElementById("wikipedia-list-empty");
  const errorEl = document.getElementById("wikipedia-list-error");

  // Show loading state
  if (loadingEl) loadingEl.style.display = "flex";
  if (listEl) listEl.innerHTML = "";
  if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");
  if (errorEl) errorEl.setAttribute("aria-hidden", "true");

  try {
    // Fetch all records — the API returns the full records table
    const response = await fetch("/api/admin/records", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();
    const allRecords = data.records || data;

    // Filter: only records that have a wikipedia_rank set
    const wikipediaRecords = allRecords.filter(function (rec) {
      return (
        rec.wikipedia_rank !== null &&
        rec.wikipedia_rank !== undefined &&
        rec.wikipedia_rank !== ""
      );
    });

    // Sort by wikipedia_rank (ascending — lower rank = higher position)
    wikipediaRecords.sort(function (a, b) {
      const rankA = parseInt(a.wikipedia_rank, 10) || Number.MAX_SAFE_INTEGER;
      const rankB = parseInt(b.wikipedia_rank, 10) || Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });

    // Store in module state
    window._wikipediaModuleState.wikipediaRecords = wikipediaRecords;

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    if (wikipediaRecords.length === 0) {
      // Show empty state
      if (emptyEl) emptyEl.removeAttribute("aria-hidden");
      return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");

    // Render each record as a row
    if (listEl) {
      listEl.innerHTML = "";
      wikipediaRecords.forEach(function (record, index) {
        const rowEl = _buildWikipediaRow(record, index);
        listEl.appendChild(rowEl);
      });
    }
  } catch (err) {
    console.error("[wikipedia_list_display] Fetch failed:", err);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.removeAttribute("aria-hidden");
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to retrieve Wikipedia ranked list. Please refresh.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _buildWikipediaRow
   Constructs a single Wikipedia row DOM element. The row includes:
   - Rank number (from list position)
   - Record title
   - Wikipedia link (truncated)
   - Score (from wikipedia_rank)
   - Status badge (Draft / Published)
   - Select button

   Parameters:
     record (object) — record object from the API
     index (number)  — position in the sorted array
   Returns:
     HTMLLIElement — the list item row element
----------------------------------------------------------------------------- */
function _buildWikipediaRow(record, index) {
  const rowEl = document.createElement("li");
  rowEl.className = "wikipedia-row";
  rowEl.setAttribute("data-record-id", record.id || "");
  rowEl.setAttribute("data-record-slug", record.slug || "");

  const title = record.title || record.slug || "Untitled Record";
  const rank = parseInt(record.wikipedia_rank, 10) || 0;
  const status = record.status || "draft";

  // Parse Wikipedia link from JSON or use raw value
  let wikiLink = "";
  let wikiTitle = "";
  try {
    if (record.wikipedia_link) {
      const linkData =
        typeof record.wikipedia_link === "string"
          ? JSON.parse(record.wikipedia_link)
          : record.wikipedia_link;
      wikiLink = linkData.url || linkData || "";
      wikiTitle = linkData.title || "";
    }
  } catch (e) {
    wikiLink = record.wikipedia_link || "";
  }

  // Use wikipedia_title if available, otherwise fall back to record title
  const displayTitle = record.wikipedia_title || title;

  // Compute total score from weight × rank
  let weightMultiplier = 1.0;
  try {
    if (record.wikipedia_weight) {
      const weightData =
        typeof record.wikipedia_weight === "string"
          ? JSON.parse(record.wikipedia_weight)
          : record.wikipedia_weight;
      weightMultiplier = parseFloat(weightData.multiplier || weightData || 1.0);
    }
  } catch (e) {
    weightMultiplier = 1.0;
  }
  const totalScore = Math.round(rank * weightMultiplier);

  // --- Header ---
  const headerEl = document.createElement("div");
  headerEl.className = "wikipedia-row__header";

  // Rank number
  const rankEl = document.createElement("span");
  rankEl.className = "wikipedia-row__rank";
  rankEl.textContent = String(index + 1);
  headerEl.appendChild(rankEl);

  // Title
  const titleEl = document.createElement("span");
  titleEl.className = "wikipedia-row__title";
  titleEl.textContent = displayTitle;
  titleEl.setAttribute("title", displayTitle);
  headerEl.appendChild(titleEl);

  // Wikipedia link (if available)
  if (wikiLink) {
    const linkEl = document.createElement("span");
    linkEl.className = "wikipedia-row__link";
    linkEl.textContent = wikiLink;
    linkEl.setAttribute("title", wikiLink);
    headerEl.appendChild(linkEl);
  }

  // Score
  const scoreEl = document.createElement("span");
  scoreEl.className = "wikipedia-row__score";
  scoreEl.textContent = "Score: " + totalScore;
  headerEl.appendChild(scoreEl);

  // Status badge
  const statusEl = document.createElement("span");
  statusEl.className = "wikipedia-row__status";
  if (status === "published") {
    statusEl.classList.add("wikipedia-row__status--published");
    statusEl.textContent = "Published";
  } else {
    statusEl.classList.add("wikipedia-row__status--draft");
    statusEl.textContent = "Draft";
  }
  headerEl.appendChild(statusEl);

  // Select button
  const selectBtn = document.createElement("button");
  selectBtn.className = "wikipedia-row__select-btn";
  selectBtn.textContent = "select";
  selectBtn.setAttribute("type", "button");
  selectBtn.setAttribute("aria-label", "Select " + displayTitle);
  headerEl.appendChild(selectBtn);

  rowEl.appendChild(headerEl);

  // --- Click Handler: Select row and populate sidebar ---
  headerEl.addEventListener("click", function (e) {
    // Don't trigger if clicking the select button itself (stopPropagation in button handler)
    if (e.target === selectBtn) return;

    _selectWikipediaRow(rowEl, record);
  });

  // Select button also triggers selection
  selectBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    _selectWikipediaRow(rowEl, record);
  });

  return rowEl;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _selectWikipediaRow
   Deselects all rows, selects the given row, and updates module state
   and the sidebar with the selected record's data.

   Parameters:
     rowEl (HTMLElement)  — the row DOM element to select
     record (object)      — the record data object
----------------------------------------------------------------------------- */
function _selectWikipediaRow(rowEl, record) {
  // Deselect all rows
  const allRows = document.querySelectorAll(".wikipedia-row");
  allRows.forEach(function (r) {
    r.classList.remove("wikipedia-row--selected");
  });

  // Select this row
  rowEl.classList.add("wikipedia-row--selected");

  // Update module state
  window._wikipediaModuleState.activeRecordId = record.id || "";
  window._wikipediaModuleState.activeRecordTitle = record.title || "";
  window._wikipediaModuleState.activeRecordSlug = record.slug || "";

  // Parse weight
  let weightMultiplier = 1.0;
  try {
    if (record.wikipedia_weight) {
      const weightData =
        typeof record.wikipedia_weight === "string"
          ? JSON.parse(record.wikipedia_weight)
          : record.wikipedia_weight;
      weightMultiplier = parseFloat(weightData.multiplier || weightData || 1.0);
    }
  } catch (e) {
    weightMultiplier = 1.0;
  }
  window._wikipediaModuleState.activeRecordWeight = weightMultiplier;

  // Parse search terms
  let searchTerms = [];
  try {
    if (record.wikipedia_search_term) {
      const termsData =
        typeof record.wikipedia_search_term === "string"
          ? JSON.parse(record.wikipedia_search_term)
          : record.wikipedia_search_term;
      // Could be an array or a comma-separated string
      if (Array.isArray(termsData)) {
        searchTerms = termsData;
      } else if (typeof termsData === "string") {
        searchTerms = termsData
          .split(",")
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean);
      } else if (termsData && typeof termsData === "object") {
        searchTerms = Object.values(termsData).filter(Boolean);
      }
    }
  } catch (e) {
    // If it's a plain comma-separated string
    if (
      record.wikipedia_search_term &&
      typeof record.wikipedia_search_term === "string"
    ) {
      searchTerms = record.wikipedia_search_term
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(Boolean);
    }
  }
  window._wikipediaModuleState.activeRecordSearchTerms = searchTerms;

  // Snippet and meta
  window._wikipediaModuleState.activeRecordSnippet = record.snippet || "";
  window._wikipediaModuleState.activeRecordMeta = record.metadata_json || "";

  // Populate the sidebar with this record's data
  if (typeof window.populateWikipediaSidebar === "function") {
    window.populateWikipediaSidebar(record);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_wikipedia.js
----------------------------------------------------------------------------- */
window.displayWikipediaList = displayWikipediaList;
