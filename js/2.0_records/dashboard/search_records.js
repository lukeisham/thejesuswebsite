// Trigger:  Called by the orchestrator to wire the keyboard-driven search bar.
//           Activated by Cmd+K/Ctrl+K shortcut or typing into the search input.
// Main:    initRecordsSearch() — sets up the search input with 150ms debounced
//           fuzzy filtering across title, primary_verse, and snippet fields.
//           Hides non-matching rows via CSS display:none. Shows match count.
// Output:  Real-time client-side filtering of the current table rows. Status
//           bar updates with "Showing {n} of {total} records". Coordinates
//           with endless scroll to filter newly-loaded batches.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — RECORDS SEARCH
   File:    js/2.0_records/dashboard/search_records.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Provides real-time client-side fuzzy search across the currently
            loaded records in the All Records table. Keyboard-driven via
            Cmd+K/Ctrl+K shortcut. Filters rows by title, primary_verse,
            and snippet fields. Debounced at 150ms to avoid excessive DOM
            manipulation. Coordinates with endless scroll to filter new rows.
============================================================================= */

/* -----------------------------------------------------------------------------
   STATE
----------------------------------------------------------------------------- */
let _searchTerm = "";
let _debounceTimer = null;
const DEBOUNCE_MS = 150;

/* -----------------------------------------------------------------------------
   PUBLIC: initRecordsSearch
   Wires the search input, keyboard shortcut, and clear button.
----------------------------------------------------------------------------- */
function initRecordsSearch() {
    const searchInput = document.getElementById("records-all-search-input");
    const clearBtn = document.getElementById("records-all-search-clear");
    const statusEl = document.getElementById("records-all-search-status");

    if (!searchInput) return;

    // Input event — debounced filtering
    searchInput.addEventListener("input", function () {
        const term = searchInput.value.trim();

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.hidden = term.length === 0;
        }

        // Debounce the search
        if (_debounceTimer) {
            clearTimeout(_debounceTimer);
        }

        _debounceTimer = setTimeout(function () {
            _searchTerm = term.toLowerCase();
            _applySearchFilter(_searchTerm, statusEl);
        }, DEBOUNCE_MS);
    });

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            searchInput.value = "";
            clearBtn.hidden = true;
            _searchTerm = "";
            _applySearchFilter("", statusEl);
            searchInput.focus();
        });
    }

    // Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows/Linux)
    document.addEventListener("keydown", function (e) {
        // Check for Cmd+K or Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Escape clears search
        if (
            e.key === "Escape" &&
            document.activeElement === searchInput &&
            searchInput.value.length > 0
        ) {
            searchInput.value = "";
            clearBtn.hidden = true;
            _searchTerm = "";
            _applySearchFilter("", statusEl);
            searchInput.blur();
        }
    });
}

/* -----------------------------------------------------------------------------
   PUBLIC: onNewRowsLoaded
   Called by data_populate_table.js after new rows are appended to the table.
   If a search is active, newly-loaded rows must also be filtered.
----------------------------------------------------------------------------- */
function onNewRowsLoaded(newRecords) {
    if (!_searchTerm) return;

    const tbody = document.getElementById("records-all-tbody");
    if (!tbody) return;

    // Filter the newly-added rows against the active search term
    const allRows = tbody.querySelectorAll("tr");
    allRows.forEach(function (row) {
        const rowId = row.getAttribute("data-record-id") || "";
        // Only process rows from the new batch
        const isNew = newRecords.some(function (r) {
            return r.id === rowId;
        });
        if (!isNew) return;

        const title = row.getAttribute("data-title") || "";
        const verse = row.getAttribute("data-primary-verse") || "";
        const snippet = row.getAttribute("data-snippet") || "";

        if (_fuzzyMatch(_searchTerm, title + " " + verse + " " + snippet)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });

    // Update the status count
    _updateSearchCount();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _applySearchFilter
   Iterates all rows in #records-all-tbody, showing or hiding based on whether
   they match the search term. Updates the status bar count.
----------------------------------------------------------------------------- */
function _applySearchFilter(term, statusEl) {
    const tbody = document.getElementById("records-all-tbody");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;
    const totalCount = rows.length;

    rows.forEach(function (row) {
        const title = row.getAttribute("data-title") || "";
        const verse = row.getAttribute("data-primary-verse") || "";
        const snippet = row.getAttribute("data-snippet") || "";

        if (term.length === 0) {
            // No search term — show all rows
            row.style.display = "";
            visibleCount++;
        } else if (
            _fuzzyMatch(term, title + " " + verse + " " + snippet)
        ) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    // Update status bar
    if (statusEl) {
        if (term.length === 0) {
            statusEl.textContent = "";
        } else if (visibleCount === 0) {
            statusEl.textContent =
                'No records match "' +
                term +
                '". Try a different search.';
        } else {
            statusEl.textContent =
                "Showing " +
                visibleCount +
                " of " +
                totalCount +
                " records";
        }
    }

    // Surface zero-results as an informational message
    if (term.length > 0 && visibleCount === 0) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                'No records match "' +
                    term +
                    '". Try a different search.'
            );
        }
        if (typeof window.updateRecordsAllStatusBar === "function") {
            window.updateRecordsAllStatusBar(
                'No records match "' +
                    term +
                    '". Try a different search.',
                ""
            );
        }
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _updateSearchCount
   Updates the search status bar with the current match count.
----------------------------------------------------------------------------- */
function _updateSearchCount() {
    if (!_searchTerm) return;

    const tbody = document.getElementById("records-all-tbody");
    const statusEl = document.getElementById("records-all-search-status");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;
    rows.forEach(function (row) {
        if (row.style.display !== "none") visibleCount++;
    });

    if (statusEl) {
        if (visibleCount === 0) {
            statusEl.textContent =
                'No records match "' +
                _searchTerm +
                '". Try a different search.';
        } else {
            statusEl.textContent =
                "Showing " + visibleCount + " of " + rows.length + " records";
        }
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _fuzzyMatch
   Returns true if all characters of 'term' appear in 'text' in order
   but not necessarily consecutively. Case-insensitive.
   e.g. _fuzzyMatch("jesus born", "Jesus is born in Bethlehem") → true
----------------------------------------------------------------------------- */
function _fuzzyMatch(term, text) {
    if (!term || !text) return false;

    let termIdx = 0;
    const termLen = term.length;
    const textLen = text.length;

    for (let i = 0; i < textLen && termIdx < termLen; i++) {
        if (text[i] === term[termIdx]) {
            termIdx++;
        }
    }

    return termIdx === termLen;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initRecordsSearch = initRecordsSearch;
window.onNewRowsLoaded = onNewRowsLoaded;
