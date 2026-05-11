// Trigger:  Called by dashboard_news_sources.js → window.displayNewsSourcesList()
//           on initial load and after Refresh/Publish operations.
//           Also called by function bar Refresh/Publish buttons.
// Main:    displayNewsSourcesList() — fetches all records from the API,
//           filters to news_article main entries (sub_type IS NULL), renders
//           the articles table with row selection that populates the sidebar
//           with source config and search terms from matching sub-type rows.
//           publishNewsArticles() — sets all listed main entry records to
//           published status.
// Output:  News articles table rendered in #news-articles-table-body with
//           selection state tracked in _newsSourcesModuleState. Errors
//           routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayNewsSourcesList
   Fetches all records, filters for news_article main entries
   (sub_type IS NULL), and renders them as rows in the articles table.

   Parameters: none (reads from global API)
----------------------------------------------------------------------------- */
async function displayNewsSourcesList() {
  const loadingEl = document.getElementById("news-list-loading");
  const tableBodyEl = document.getElementById("news-articles-table-body");
  const emptyEl = document.getElementById("news-list-empty");
  const errorEl = document.getElementById("news-list-error");

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

    // Filter: only news_article main entries (sub_type is null/empty/undefined)
    const newsArticlesRecords = allRecords.filter(function (rec) {
      return (
        rec.type === "news_article" &&
        (rec.sub_type === null ||
          rec.sub_type === "" ||
          rec.sub_type === undefined)
      );
    });

    // Also store all news_article records (all sub-types) for cross-reference
    const allNewsArticleRecords = allRecords.filter(function (rec) {
      return rec.type === "news_article";
    });

    // Store in module state
    if (window._newsSourcesModuleState) {
      window._newsSourcesModuleState.newsArticlesRecords = newsArticlesRecords;
      window._newsSourcesModuleState._allNewsArticleRecords =
        allNewsArticleRecords;
    }

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    if (newsArticlesRecords.length === 0) {
      // Show empty state
      if (emptyEl) emptyEl.removeAttribute("aria-hidden");
      return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");

    // Render each record as a row
    if (tableBodyEl) {
      tableBodyEl.innerHTML = "";
      newsArticlesRecords.forEach(function (record) {
        const rowEl = _buildNewsArticleRow(record);
        tableBodyEl.appendChild(rowEl);
      });
    }
  } catch (err) {
    console.error("[news_sources_handler] Fetch failed:", err);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.removeAttribute("aria-hidden");
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to retrieve news articles list. Please refresh.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: publishNewsArticles
   Sets all news article main entry records in the module state to 'published'
   status via PUT to /api/admin/records/{id}. After all are published,
   refreshes the list display.
----------------------------------------------------------------------------- */
async function publishNewsArticles() {
  const records =
    window._newsSourcesModuleState &&
    window._newsSourcesModuleState.newsArticlesRecords;

  if (!records || records.length === 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No news articles to publish.");
    }
    return;
  }

  // Publish each main entry record
  var publishCount = 0;
  for (var i = 0; i < records.length; i++) {
    try {
      var response = await fetch("/api/admin/records/" + records[i].id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (response.ok) publishCount++;
    } catch (err) {
      console.error(
        "[news_sources_handler] Publish failed for record " + records[i].id,
        err,
      );
    }
  }

  if (typeof window.surfaceError === "function") {
    window.surfaceError(
      publishCount + " of " + records.length + " articles published.",
    );
  }

  // Refresh the list
  if (typeof window.displayNewsSourcesList === "function") {
    await window.displayNewsSourcesList();
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _buildNewsArticleRow
   Constructs a single news article table row DOM element.

   Parameters:
     record (object) — record object from the API (main entry, sub_type IS NULL)
   Returns:
     HTMLTableRowElement — the table row element
----------------------------------------------------------------------------- */
function _buildNewsArticleRow(record) {
  var rowEl = document.createElement("tr");
  rowEl.className = "news-articles-row";
  rowEl.setAttribute("data-record-id", record.id || "");

  var title = record.news_item_title || "Untitled Article";
  var link = record.news_item_link || "";
  var lastCrawled = record.last_crawled || "";
  var status = record.status || "draft";

  // --- Article Title cell ---
  var titleCell = document.createElement("td");
  titleCell.className =
    "news-articles-row__cell news-articles-row__cell--title";
  titleCell.textContent = title;
  titleCell.setAttribute("title", title);
  rowEl.appendChild(titleCell);

  // --- Link cell (truncated) ---
  var linkCell = document.createElement("td");
  linkCell.className = "news-articles-row__cell news-articles-row__cell--link";
  var displayLink = link;
  if (link && link.length > 60) {
    displayLink = link.substring(0, 57) + "...";
  }
  linkCell.textContent = displayLink || "\u2014";
  if (link) linkCell.setAttribute("title", link);
  rowEl.appendChild(linkCell);

  // --- Last Crawled cell ---
  var crawledCell = document.createElement("td");
  crawledCell.className =
    "news-articles-row__cell news-articles-row__cell--crawled";
  var displayCrawled = "\u2014";
  if (lastCrawled) {
    try {
      var d = new Date(lastCrawled);
      if (!isNaN(d.getTime())) {
        displayCrawled = d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        displayCrawled = lastCrawled;
      }
    } catch (e) {
      displayCrawled = lastCrawled;
    }
  }
  crawledCell.textContent = displayCrawled;
  if (lastCrawled) crawledCell.setAttribute("title", lastCrawled);
  rowEl.appendChild(crawledCell);

  // --- Status cell ---
  var statusCell = document.createElement("td");
  statusCell.className = "news-articles-row__cell";
  var statusBadge = document.createElement("span");
  statusBadge.className = "news-articles-row__status";
  if (status === "published") {
    statusBadge.classList.add("news-articles-row__status--published");
    statusBadge.textContent = "Published";
  } else {
    statusBadge.classList.add("news-articles-row__status--draft");
    statusBadge.textContent = "Draft";
  }
  statusCell.appendChild(statusBadge);
  rowEl.appendChild(statusCell);

  // --- Select button cell ---
  var selectCell = document.createElement("td");
  selectCell.className = "news-articles-row__cell";
  var selectBtn = document.createElement("button");
  selectBtn.className = "news-articles-row__select-btn";
  selectBtn.textContent = "select";
  selectBtn.setAttribute("type", "button");
  selectBtn.setAttribute("aria-label", "Select " + title);
  selectCell.appendChild(selectBtn);
  rowEl.appendChild(selectCell);

  // --- Click Handler: Select row and populate sidebar ---
  rowEl.addEventListener("click", function (e) {
    if (e.target === selectBtn) return;
    _selectNewsArticleRow(rowEl, record);
  });

  selectBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    _selectNewsArticleRow(rowEl, record);
  });

  return rowEl;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _selectNewsArticleRow
   Deselects all rows, selects the given row, finds matching source and
   search term sub-type rows (same id), and populates the sidebar.

   Parameters:
     rowEl (HTMLElement)  — the row DOM element to select
     record (object)      — the main entry record data object
----------------------------------------------------------------------------- */
function _selectNewsArticleRow(rowEl, record) {
  // Deselect all rows
  var allRows = document.querySelectorAll(".news-articles-row");
  allRows.forEach(function (r) {
    r.classList.remove("news-articles-row--selected");
  });

  // Select this row
  rowEl.classList.add("news-articles-row--selected");

  var state = window._newsSourcesModuleState;
  var allRecords = state._allNewsArticleRecords || [];

  // Set the grouping key (shared id)
  state.activeGroupId = record.id || "";

  // Store main entry fields
  state.activeArticleTitle = record.news_item_title || "";
  state.activeArticleLink = record.news_item_link || "";
  state.activeLastCrawled = record.last_crawled || "";

  // --- Find matching source row (sub_type = "news_source", same id) ---
  var sourceRow = null;
  for (var i = 0; i < allRecords.length; i++) {
    if (
      allRecords[i].type === "news_article" &&
      allRecords[i].sub_type === "news_source" &&
      allRecords[i].id === record.id
    ) {
      sourceRow = allRecords[i];
      break;
    }
  }

  if (sourceRow) {
    state.activeSourceUrl = sourceRow.source_url || "";
    // Parse keywords from the source row's keywords field
    var keywords = [];
    var kwField = sourceRow.keywords;
    if (kwField) {
      try {
        if (typeof kwField === "string") {
          var parsed = JSON.parse(kwField);
          keywords = Array.isArray(parsed) ? parsed : [];
        } else if (Array.isArray(kwField)) {
          keywords = kwField;
        }
      } catch (e) {
        // Try comma-separated
        keywords = kwField
          .split(",")
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean);
      }
    }
    state.activeKeywords = keywords;
  } else {
    state.activeSourceUrl = "";
    state.activeKeywords = [];
  }

  // --- Find matching search term rows (sub_type = "news_search_term", same id) ---
  var searchTerms = [];
  for (var j = 0; j < allRecords.length; j++) {
    if (
      allRecords[j].type === "news_article" &&
      allRecords[j].sub_type === "news_search_term" &&
      allRecords[j].id === record.id
    ) {
      var term = allRecords[j].news_search_term || "";
      if (term) searchTerms.push(term);
    }
  }
  state.activeSearchTerms = searchTerms;

  // Populate the sidebar with the collected data
  if (typeof window.populateNewsSidebar === "function") {
    window.populateNewsSidebar(record);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_news_sources.js
----------------------------------------------------------------------------- */
window.displayNewsSourcesList = displayNewsSourcesList;
window.publishNewsSources = publishNewsArticles;
