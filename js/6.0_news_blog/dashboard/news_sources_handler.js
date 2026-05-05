// Trigger:  Called by dashboard_news_sources.js → window.displayNewsSourcesList()
//           on initial load and after Refresh/Publish operations.
//           Also called by function bar Refresh/Publish buttons.
// Main:    displayNewsSourcesList() — fetches all records from the API,
//           filters to those with news_sources data, renders the sources
//           table with row selection that updates the sidebar.
//           publishNewsSources() — sets all listed news source records to
//           published status.
// Output:  News sources table rendered in #news-sources-table-body with
//          selection state tracked in _newsSourcesModuleState. Errors
//          routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayNewsSourcesList
   Fetches all records, filters for those with news_sources populated,
   and renders them as rows in the sources table.

   Parameters: none (reads from global API)
----------------------------------------------------------------------------- */
async function displayNewsSourcesList() {
  const loadingEl = document.getElementById("news-sources-list-loading");
  const tableBodyEl = document.getElementById("news-sources-table-body");
  const emptyEl = document.getElementById("news-sources-list-empty");
  const errorEl = document.getElementById("news-sources-list-error");

  // Show loading state
  if (loadingEl) loadingEl.style.display = "flex";
  if (tableBodyEl) tableBodyEl.innerHTML = "";
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

    // Filter: only records that have news_sources populated
    const newsSourcesRecords = allRecords.filter(function (rec) {
      return (
        rec.news_sources !== null &&
        rec.news_sources !== undefined &&
        rec.news_sources !== ""
      );
    });

    // Store in module state
    if (window._newsSourcesModuleState) {
      window._newsSourcesModuleState.newsSourcesRecords = newsSourcesRecords;
    }

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    if (newsSourcesRecords.length === 0) {
      // Show empty state
      if (emptyEl) emptyEl.removeAttribute("aria-hidden");
      return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");

    // Render each record as a row
    if (tableBodyEl) {
      tableBodyEl.innerHTML = "";
      newsSourcesRecords.forEach(function (record) {
        const rowEl = _buildNewsSourceRow(record);
        tableBodyEl.appendChild(rowEl);
      });
    }
  } catch (err) {
    console.error("[news_sources_handler] Fetch failed:", err);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.removeAttribute("aria-hidden");
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to retrieve news sources list. Please refresh.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: publishNewsSources
   Sets all news source records in the module state to 'published' status
   via PUT to /api/admin/records/{id}. After all are published, refreshes
   the list display.
----------------------------------------------------------------------------- */
async function publishNewsSources() {
  const records =
    window._newsSourcesModuleState &&
    window._newsSourcesModuleState.newsSourcesRecords;

  if (!records || records.length === 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No news sources to publish.");
    }
    return;
  }

  // Note: We do NOT change each record's status to 'published' here.
  // The record lifecycle status (draft/published) is independent of
  // whether it appears in a published news source list.
  // News source publication is managed by the dashboard display.

  if (typeof window.surfaceError === "function") {
    window.surfaceError("News sources published.");
  }

  // Refresh the list
  if (typeof window.displayNewsSourcesList === "function") {
    await window.displayNewsSourcesList();
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _buildNewsSourceRow
   Constructs a single news source table row DOM element.

   Parameters:
     record (object) — record object from the API
   Returns:
     HTMLTableRowElement — the table row element
----------------------------------------------------------------------------- */
function _buildNewsSourceRow(record) {
  var rowEl = document.createElement("tr");
  rowEl.className = "news-sources-row";
  rowEl.setAttribute("data-record-id", record.id || "");
  rowEl.setAttribute("data-record-slug", record.slug || "");

  var title = record.title || record.slug || "Untitled Source";
  var status = record.status || "draft";

  // Parse source URL from news_sources JSON
  var sourceUrl = "";
  var sourceLabel = title;
  try {
    if (record.news_sources) {
      var sourceData =
        typeof record.news_sources === "string"
          ? JSON.parse(record.news_sources)
          : record.news_sources;
      sourceUrl = sourceData.url || sourceData.source_url || "";
      sourceLabel = sourceData.name || sourceData.label || title;
    }
  } catch (e) {
    // If not valid JSON, treat the raw value as the URL
    sourceUrl = record.news_sources || "";
  }

  // Determine status display
  var isActive = status === "published";

  // --- Source Name cell ---
  var nameCell = document.createElement("td");
  nameCell.className = "news-sources-row__cell news-sources-row__cell--name";
  nameCell.textContent = sourceLabel;
  nameCell.setAttribute("title", sourceLabel);
  rowEl.appendChild(nameCell);

  // --- URL cell ---
  var urlCell = document.createElement("td");
  urlCell.className = "news-sources-row__cell news-sources-row__cell--url";
  urlCell.textContent = sourceUrl || "—";
  if (sourceUrl) urlCell.setAttribute("title", sourceUrl);
  rowEl.appendChild(urlCell);

  // --- Status cell ---
  var statusCell = document.createElement("td");
  statusCell.className = "news-sources-row__cell";
  var statusBadge = document.createElement("span");
  statusBadge.className = "news-sources-row__status";
  if (isActive) {
    statusBadge.classList.add("news-sources-row__status--active");
    statusBadge.textContent = "Active";
  } else {
    statusBadge.classList.add("news-sources-row__status--inactive");
    statusBadge.textContent = "Inactive";
  }
  statusCell.appendChild(statusBadge);
  rowEl.appendChild(statusCell);

  // --- Select button cell ---
  var selectCell = document.createElement("td");
  selectCell.className = "news-sources-row__cell";
  var selectBtn = document.createElement("button");
  selectBtn.className = "news-sources-row__select-btn";
  selectBtn.textContent = "select";
  selectBtn.setAttribute("type", "button");
  selectBtn.setAttribute("aria-label", "Select " + sourceLabel);
  selectCell.appendChild(selectBtn);
  rowEl.appendChild(selectCell);

  // --- Click Handler: Select row and populate sidebar ---
  rowEl.addEventListener("click", function (e) {
    // Don't trigger if clicking the select button itself
    if (e.target === selectBtn) return;

    _selectNewsSourceRow(rowEl, record);
  });

  // Select button also triggers selection
  selectBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    _selectNewsSourceRow(rowEl, record);
  });

  return rowEl;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _selectNewsSourceRow
   Deselects all rows, selects the given row, and updates module state
   and the sidebar with the selected record's data.

   Parameters:
     rowEl (HTMLElement)  — the row DOM element to select
     record (object)      — the record data object
----------------------------------------------------------------------------- */
function _selectNewsSourceRow(rowEl, record) {
  // Deselect all rows
  var allRows = document.querySelectorAll(".news-sources-row");
  allRows.forEach(function (r) {
    r.classList.remove("news-sources-row--selected");
  });

  // Select this row
  rowEl.classList.add("news-sources-row--selected");

  // Parse source URL from news_sources JSON
  var sourceUrl = "";
  try {
    if (record.news_sources) {
      var sourceData =
        typeof record.news_sources === "string"
          ? JSON.parse(record.news_sources)
          : record.news_sources;
      sourceUrl = sourceData.url || sourceData.source_url || "";
    }
  } catch (e) {
    sourceUrl = record.news_sources || "";
  }

  // Parse search keywords from news_search_term JSON
  var searchKeywords = [];
  try {
    if (record.news_search_term) {
      var termsData =
        typeof record.news_search_term === "string"
          ? JSON.parse(record.news_search_term)
          : record.news_search_term;
      if (Array.isArray(termsData)) {
        searchKeywords = termsData;
      } else if (typeof termsData === "string") {
        searchKeywords = termsData
          .split(",")
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean);
      } else if (termsData && typeof termsData === "object") {
        searchKeywords = Object.values(termsData).filter(Boolean);
      }
    }
  } catch (e) {
    // If it's a plain comma-separated string
    if (
      record.news_search_term &&
      typeof record.news_search_term === "string"
    ) {
      searchKeywords = record.news_search_term
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(Boolean);
    }
  }

  // Update module state
  if (window._newsSourcesModuleState) {
    window._newsSourcesModuleState.activeRecordId = record.id || "";
    window._newsSourcesModuleState.activeRecordTitle = record.title || "";
    window._newsSourcesModuleState.activeRecordSlug = record.slug || "";
    window._newsSourcesModuleState.activeSourceUrl = sourceUrl;
    window._newsSourcesModuleState.activeSearchKeywords = searchKeywords;
    window._newsSourcesModuleState.activeSnippet = record.snippet || "";
    window._newsSourcesModuleState.activeMeta = record.metadata_json || "";
    window._newsSourcesModuleState.activeCreatedAt = record.created_at || "";
    window._newsSourcesModuleState.activeUpdatedAt = record.updated_at || "";
  }

  // Populate the sidebar with this record's data
  if (typeof window.populateNewsSourcesSidebar === "function") {
    window.populateNewsSourcesSidebar(record);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_news_sources.js
----------------------------------------------------------------------------- */
window.displayNewsSourcesList = displayNewsSourcesList;
window.publishNewsSources = publishNewsSources;
