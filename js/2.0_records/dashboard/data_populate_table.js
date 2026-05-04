// Trigger:  Called by the orchestrator after HTML injection and by toggle/
//           scroll modules to fetch and render record batches.
// Main:    fetchRecordsBatch(sortKey, offset) — fetches a batch of records
//           from GET /api/admin/records with sort/filter params, renders them
//           into table rows in #records-all-tbody, and stores them for search.
//           Rows are clickable → navigates to Single Record editor.
// Output:  Populated <tbody> with high-density record rows. Exposes
//           _loadedRows[] for search filtering.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — RECORDS DATA POPULATE LOGIC
   File:    js/2.0_records/dashboard/data_populate_table.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Fetches record batches from the admin API and hydrates the main
            records table with sortable, clickable rows. Each row navigates
            to the Single Record editor on click. Stores loaded records in
            memory for client-side search filtering.
============================================================================= */

/* -----------------------------------------------------------------------------
   STATE — loaded records and pagination tracking
----------------------------------------------------------------------------- */
let _loadedRows = [];
let _currentOffset = 0;
const BATCH_SIZE = 50;
let _hasMore = true;
let _isFetching = false;

/* -----------------------------------------------------------------------------
   PUBLIC: fetchRecordsBatch
   Fetches a batch of records from the API with the given sort key and offset.
   If offset is 0, clears the table first (full reload for new sort).
----------------------------------------------------------------------------- */
async function fetchRecordsBatch(sortKey, offset) {
    if (_isFetching) return;
    _isFetching = true;

    // Show loading indicator for subsequent batches
    if (offset > 0) {
        _showLoading(true);
    }

    try {
        const response = await fetch(
            "/api/admin/records?sort=" +
                encodeURIComponent(sortKey) +
                "&offset=" +
                (offset || 0) +
                "&limit=" +
                BATCH_SIZE,
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                "API returned " + response.status + " " + response.statusText
            );
        }

        const data = await response.json();
        const records = data.records || [];

        if (offset === 0) {
            // Full reload — clear existing rows
            _loadedRows = [];
            _currentOffset = 0;
            _clearTableBody();
        }

        _loadedRows = _loadedRows.concat(records);
        _currentOffset = offset + records.length;
        _hasMore = records.length === BATCH_SIZE;

        _renderRows(records);

        // Update search counts if search is active
        if (typeof window.onNewRowsLoaded === "function") {
            window.onNewRowsLoaded(records);
        }
    } catch (err) {
        console.error("[data_populate_table] Fetch failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Unable to load records. Please refresh and try again."
            );
        }
        if (typeof window.updateRecordsAllStatusBar === "function") {
            window.updateRecordsAllStatusBar(
                "Error: Unable to load records. Please refresh and try again.",
                "is-error"
            );
        }
    } finally {
        _isFetching = false;
        _showLoading(false);

        // Show empty state if no records loaded
        if (_loadedRows.length === 0) {
            _showEmpty(true);
        } else {
            _showEmpty(false);
        }
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC: getLoadedRows
   Returns the array of currently loaded row data objects, for search filtering.
----------------------------------------------------------------------------- */
function getLoadedRows() {
    return _loadedRows;
}

/* -----------------------------------------------------------------------------
   PUBLIC: hasMoreRecords
   Returns whether there are more records to load from the API.
----------------------------------------------------------------------------- */
function hasMoreRecords() {
    return _hasMore;
}

/* -----------------------------------------------------------------------------
   PUBLIC: isCurrentlyFetching
   Returns whether a fetch is currently in progress.
----------------------------------------------------------------------------- */
function isCurrentlyFetching() {
    return _isFetching;
}

/* -----------------------------------------------------------------------------
   PUBLIC: getCurrentOffset
   Returns the current pagination offset.
----------------------------------------------------------------------------- */
function getCurrentOffset() {
    return _currentOffset;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderRows — inject record rows into the table body
----------------------------------------------------------------------------- */
function _renderRows(records) {
    const tbody = document.getElementById("records-all-tbody");
    if (!tbody) return;

    records.forEach(function (record) {
        const tr = document.createElement("tr");
        tr.setAttribute("data-record-id", record.id || "");
        tr.setAttribute("data-title", (record.title || "").toLowerCase());
        tr.setAttribute(
            "data-primary-verse",
            (record.primary_verse || "").toLowerCase()
        );
        tr.setAttribute(
            "data-snippet",
            (record.snippet || "").toLowerCase()
        );
        tr.setAttribute("tabindex", "0");
        tr.setAttribute("role", "link");
        tr.setAttribute(
            "aria-label",
            "Open record: " + (record.title || "Untitled")
        );

        // Click handler → navigate to Single Record editor
        tr.addEventListener("click", function () {
            if (record.id) {
                if (typeof window.setRecordId === "function") {
                    window.setRecordId(record.id);
                }
                if (typeof window.loadModule === "function") {
                    window.loadModule("records-single");
                }
            }
        });

        // Keyboard support (Enter/Space)
        tr.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                tr.click();
            }
        });

        // Determine status class
        let statusClass = "records-all__status--draft";
        let statusLabel = "Draft";
        if (record.status === "published") {
            statusClass = "records-all__status--published";
            statusLabel = "Published";
        }

        // Extract snippet (first 120 chars)
        const snippet = (record.snippet || record.description || "")
            .substring(0, 120);

        tr.innerHTML =
            '<td class="records-all__col-title">' +
            _escapeHtml(record.title || "Untitled") +
            "</td>" +
            '<td class="records-all__col-verse">' +
            _escapeHtml(_formatVerse(record.primary_verse)) +
            "</td>" +
            '<td class="records-all__col-snippet">' +
            _escapeHtml(snippet) +
            "</td>" +
            '<td class="records-all__col-status">' +
            '<span class="records-all__status ' +
            statusClass +
            '">' +
            _escapeHtml(statusLabel) +
            "</span>" +
            "</td>";

        tbody.appendChild(tr);
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearTableBody — remove all rows from the table
----------------------------------------------------------------------------- */
function _clearTableBody() {
    const tbody = document.getElementById("records-all-tbody");
    if (tbody) {
        tbody.innerHTML = "";
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _showLoading — toggle the loading indicator
----------------------------------------------------------------------------- */
function _showLoading(show) {
    const loader = document.getElementById("records-all-loading");
    if (loader) {
        loader.hidden = !show;
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _showEmpty — toggle the empty state message
----------------------------------------------------------------------------- */
function _showEmpty(show) {
    const emptyEl = document.getElementById("records-all-empty");
    if (emptyEl) {
        emptyEl.hidden = !show;
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _formatVerse — pretty-print a primary_verse JSON string
----------------------------------------------------------------------------- */
function _formatVerse(verseStr) {
    if (!verseStr) return "";
    try {
        const v = JSON.parse(verseStr);
        if (v.book && v.chapter) {
            let result = v.book + " " + v.chapter;
            if (v.verse_start) {
                result += ":" + v.verse_start;
                if (v.verse_end && v.verse_end !== v.verse_start) {
                    result += "-" + v.verse_end;
                }
            }
            return result;
        }
        return verseStr;
    } catch (_) {
        return verseStr;
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _escapeHtml — basic HTML escaping for safe DOM injection
----------------------------------------------------------------------------- */
function _escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.fetchRecordsBatch = fetchRecordsBatch;
window.getLoadedRows = getLoadedRows;
window.hasMoreRecords = hasMoreRecords;
window.isCurrentlyFetching = isCurrentlyFetching;
window.getCurrentOffset = getCurrentOffset;
