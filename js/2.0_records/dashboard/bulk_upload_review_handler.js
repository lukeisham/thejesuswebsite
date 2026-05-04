// Trigger:  Called by bulk_csv_upload_handler.js (via loadBulkReviewRows) after
//           successful CSV parsing, and by the orchestrator (via renderBulkReview)
//           when the "Bulk" toggle is activated.
// Main:    Exposes window.* API contract: loadBulkReviewRows, renderBulkReview,
//           commitBulkReview, discardBulkReview. Maintains an ephemeral in-memory
//           store of parsed CSV rows. Renders a review table with checkboxes,
//           validation status, and Save as Draft / Discard All actions. Commit
//           sends checked valid rows to POST /api/admin/bulk-upload/commit.
// Output:  Ephemeral review table rendered in #bulk-review-panel. Committed
//           records become permanent `draft` records. Discard clears the store.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — BULK UPLOAD REVIEW HANDLER (Phase 2: Review & Commit)
   File:    js/2.0_records/dashboard/bulk_upload_review_handler.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Manages the ephemeral review store and review table for the
            Phase 2 bulk upload workflow. Provides the public API for loading
            parsed rows, rendering the review UI, committing checked valid
            rows to the database, and discarding all ephemeral data without
            committing. This is the gatekeeper that prevents accidental writes.
============================================================================= */

/* -----------------------------------------------------------------------------
   EPHEMERAL STORE — in-memory array of parsed CSV rows
   Each entry: { rowIndex, fields: {...}, valid: bool, checked: bool, errors: [] }
   Data is NOT persisted until admin clicks "Save as Draft".
----------------------------------------------------------------------------- */
let _ephemeralRows = [];

/* -----------------------------------------------------------------------------
   PUBLIC: window.loadBulkReviewRows(rows)
   Called by bulk_csv_upload_handler.js after successful CSV parse.
   Loads rows into the ephemeral store. If a previous review is pending,
   warns and replaces. Auto-selects the "Bulk" toggle to show review panel.
----------------------------------------------------------------------------- */
function loadBulkReviewRows(rows) {
    // If there are already rows in the store, warn before replacing
    if (_ephemeralRows.length > 0) {
        const confirmed = confirm(
            "A previous bulk upload review is still pending. " +
                "Uploading a new CSV will discard " +
                _ephemeralRows.length +
                " unreviewed records. Continue?"
        );
        if (!confirmed) return;
    }

    _ephemeralRows = rows.map(function (row) {
        return {
            rowIndex: row.rowIndex,
            fields: Object.assign({}, row.fields),
            valid: row.valid,
            checked: row.checked !== false, // Default checked for valid rows
            errors: row.errors ? row.errors.slice() : [],
        };
    });

    // Auto-select the "Bulk" toggle to show the review panel
    const bulkToggle = document.getElementById("toggle-bulk");
    if (bulkToggle) {
        bulkToggle.click();
    }

    // Render the review panel
    renderBulkReview();
}

/* -----------------------------------------------------------------------------
   PUBLIC: window.renderBulkReview()
   Renders the bulk review table into #bulk-review-tbody. Each row shows:
   checkbox (pre-checked for valid, unchecked for invalid), row number,
   title, primary_verse, and validation status.
----------------------------------------------------------------------------- */
function renderBulkReview() {
    const tbody = document.getElementById("bulk-review-tbody");
    const countEl = document.getElementById("bulk-review-count");
    const saveBtn = document.getElementById("bulk-review-save-btn");
    const emptyState = document.getElementById("bulk-review-empty");
    const allInvalidState = document.getElementById("bulk-review-all-invalid");
    const tableWrapper = document.getElementById("bulk-review-table-wrapper");

    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = "";

    // Handle empty store
    if (_ephemeralRows.length === 0) {
        if (countEl) countEl.textContent = "0";
        if (emptyState) emptyState.hidden = false;
        if (allInvalidState) allInvalidState.hidden = true;
        if (tableWrapper) tableWrapper.hidden = true;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Save as Draft";
        }
        return;
    }

    // Show table, hide empty states
    if (emptyState) emptyState.hidden = true;
    if (tableWrapper) tableWrapper.hidden = false;

    // Check if all rows are invalid
    const validCount = _ephemeralRows.filter(function (r) {
        return r.valid;
    }).length;

    if (validCount === 0) {
        if (allInvalidState) allInvalidState.hidden = false;
        if (tableWrapper) tableWrapper.hidden = true;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Save as Draft";
        }
        if (countEl) countEl.textContent = _ephemeralRows.length;
        return;
    }

    if (allInvalidState) allInvalidState.hidden = true;

    // Update count
    if (countEl) countEl.textContent = _ephemeralRows.length;

    // Render each row
    _ephemeralRows.forEach(function (row, index) {
        const tr = document.createElement("tr");

        // Invalid rows are visually distinct
        if (!row.valid) {
            tr.classList.add("bulk-review__row--invalid");
        }

        // Checkbox column
        const tdCheck = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = row.checked && row.valid; // Only valid rows can be checked
        checkbox.disabled = !row.valid;
        checkbox.setAttribute(
            "aria-label",
            row.valid
                ? "Select row " + row.rowIndex + " for saving"
                : "Row " + row.rowIndex + " is invalid and cannot be saved"
        );

        checkbox.addEventListener("change", function () {
            row.checked = checkbox.checked;
            _updateSaveButton();
        });

        tdCheck.appendChild(checkbox);
        tr.appendChild(tdCheck);

        // Row number
        const tdRow = document.createElement("td");
        tdRow.textContent = row.rowIndex;
        tr.appendChild(tdRow);

        // Title
        const tdTitle = document.createElement("td");
        tdTitle.textContent = row.fields.title || "";
        tr.appendChild(tdTitle);

        // Primary Verse
        const tdVerse = document.createElement("td");
        tdVerse.textContent = row.fields.primary_verse || "";
        tr.appendChild(tdVerse);

        // Validation status
        const tdStatus = document.createElement("td");
        if (row.valid) {
            const spanValid = document.createElement("span");
            spanValid.classList.add("bulk-review__status-valid");
            spanValid.textContent = "\u2713 Valid";
            tdStatus.appendChild(spanValid);
        } else {
            const spanInvalid = document.createElement("span");
            spanInvalid.classList.add("bulk-review__status-invalid");
            spanInvalid.textContent =
                "\u2717 " + row.errors.join("; ");
            tdStatus.appendChild(spanInvalid);
        }
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
    });

    // Update the save button
    _updateSaveButton();

    // Wire select-all checkbox
    _wireSelectAll();
}

/* -----------------------------------------------------------------------------
   PUBLIC: window.commitBulkReview()
   Triggered by the "Save as Draft" button. Collects all checked valid rows,
   sends them to POST /api/admin/bulk-upload/commit as JSON. On success,
   clears ephemeral store, hides bulk panel, re-fetches main table.
----------------------------------------------------------------------------- */
async function commitBulkReview() {
    const checkedRows = _ephemeralRows.filter(function (row) {
        return row.valid && row.checked;
    });

    if (checkedRows.length === 0) return;

    const saveBtn = document.getElementById("bulk-review-save-btn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    // Build payload — send only field data for checked valid rows
    const payload = {
        records: checkedRows.map(function (row) {
            return row.fields;
        }),
    };

    try {
        const response = await fetch("/api/admin/bulk-upload/commit", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail ||
                    "Server returned " +
                        response.status +
                        " " +
                        response.statusText
            );
        }

        if (result.success) {
            const savedCount = result.created || checkedRows.length;

            // Clear ephemeral store
            _ephemeralRows = [];

            // Hide bulk panel and return to previous toggle
            if (typeof window.hideBulkReviewPanel === "function") {
                window.hideBulkReviewPanel();
            }

            // Deselect Bulk toggle and restore previous sort
            const prevSort =
                typeof window.getActiveSort === "function"
                    ? window.getActiveSort()
                    : "created_at";

            // Activate the previous sort toggle (not bulk)
            const prevToggle = document.querySelector(
                '.toggle-btn[data-sort="' + prevSort + '"]'
            );
            const bulkToggle = document.getElementById("toggle-bulk");
            if (bulkToggle) {
                bulkToggle.classList.remove("toggle-btn--active");
                bulkToggle.setAttribute("aria-pressed", "false");
            }
            if (prevToggle && prevToggle !== bulkToggle) {
                prevToggle.classList.add("toggle-btn--active");
                prevToggle.setAttribute("aria-pressed", "true");
                if (typeof window.setActiveSort === "function") {
                    window.setActiveSort(prevSort);
                }
            }

            // Re-fetch records to include newly committed draft records
            if (typeof window.fetchRecordsBatch === "function") {
                window.fetchRecordsBatch(prevSort, 0);
            }

            // Success message
            if (typeof window.surfaceError === "function") {
                window.surfaceError(
                    "Successfully saved " +
                        savedCount +
                        " records as draft."
                );
            }
            if (typeof window.updateRecordsAllStatusBar === "function") {
                window.updateRecordsAllStatusBar(
                    "Successfully saved " +
                        savedCount +
                        " records as draft.",
                    "is-success"
                );
            }
        } else {
            // Partial failure — some rows rejected server-side
            const total = checkedRows.length;
            const rejected = result.errors ? result.errors.length : 0;
            const saved = total - rejected;

            if (typeof window.surfaceError === "function") {
                window.surfaceError(
                    "Error: " +
                        saved +
                        " of " +
                        total +
                        " records saved. " +
                        rejected +
                        " were rejected by the server."
                );
            }
            if (typeof window.updateRecordsAllStatusBar === "function") {
                window.updateRecordsAllStatusBar(
                    "Error: " +
                        saved +
                        " of " +
                        total +
                        " records saved. " +
                        rejected +
                        " were rejected.",
                    "is-error"
                );
            }

            // Keep ephemeral data for admin to review errors
            _updateSaveButton();
        }
    } catch (err) {
        console.error("[bulk_upload_review] Commit failed:", err);

        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Failed to save " +
                    checkedRows.length +
                    " records as draft. Please try again."
            );
        }
        if (typeof window.updateRecordsAllStatusBar === "function") {
            window.updateRecordsAllStatusBar(
                "Error: Failed to save " +
                    checkedRows.length +
                    " records as draft. Please try again.",
                "is-error"
            );
        }

        // Re-enable save button so admin can retry
        _updateSaveButton();
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC: window.discardBulkReview()
   Triggered by "Discard All" button or navigating away from Bulk view
   without saving. Clears the ephemeral store and restores default view.
   No API call is made — records simply vanish.
----------------------------------------------------------------------------- */
function discardBulkReview() {
    const rowCount = _ephemeralRows.length;

    if (rowCount === 0) return;

    // Clear ephemeral store
    _ephemeralRows = [];

    // Clear the review table
    const tbody = document.getElementById("bulk-review-tbody");
    if (tbody) tbody.innerHTML = "";

    // Reset count
    const countEl = document.getElementById("bulk-review-count");
    if (countEl) countEl.textContent = "0";

    // Show empty state
    const emptyState = document.getElementById("bulk-review-empty");
    if (emptyState) emptyState.hidden = false;

    const tableWrapper = document.getElementById("bulk-review-table-wrapper");
    if (tableWrapper) tableWrapper.hidden = true;

    // Hide bulk panel and restore main table
    if (typeof window.hideBulkReviewPanel === "function") {
        window.hideBulkReviewPanel();
    }

    // Deselect Bulk toggle, restore previous sort
    const prevSort =
        typeof window.getActiveSort === "function"
            ? window.getActiveSort()
            : "created_at";
    const prevToggle = document.querySelector(
        '.toggle-btn[data-sort="' + prevSort + '"]'
    );
    const bulkToggle = document.getElementById("toggle-bulk");
    if (bulkToggle) {
        bulkToggle.classList.remove("toggle-btn--active");
        bulkToggle.setAttribute("aria-pressed", "false");
    }
    if (prevToggle && prevToggle !== bulkToggle) {
        prevToggle.classList.add("toggle-btn--active");
        prevToggle.setAttribute("aria-pressed", "true");
        if (typeof window.setActiveSort === "function") {
            window.setActiveSort(prevSort);
        }
    }

    // Informational message — not an error
    if (typeof window.surfaceError === "function") {
        window.surfaceError(
            "Bulk upload discarded. " +
                rowCount +
                " records were not saved."
        );
    }
    if (typeof window.updateRecordsAllStatusBar === "function") {
        window.updateRecordsAllStatusBar(
            "Bulk upload discarded. " +
                rowCount +
                " records were not saved.",
            ""
        );
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC: window.initBulkReview
   Called by the orchestrator. Wires the Save as Draft and Discard All
   buttons in the bulk review panel.
----------------------------------------------------------------------------- */
function initBulkReview() {
    const saveBtn = document.getElementById("bulk-review-save-btn");
    const discardBtn = document.getElementById("bulk-review-discard-btn");

    if (saveBtn) {
        saveBtn.addEventListener("click", function () {
            const checkedCount = _ephemeralRows.filter(function (row) {
                return row.valid && row.checked;
            }).length;

            if (checkedCount === 0) return;

            // Confirm before committing
            const confirmed = confirm(
                "Save " +
                    checkedCount +
                    " records as draft? These records will become permanent and appear in the main records table."
            );
            if (!confirmed) return;

            commitBulkReview();
        });
    }

    if (discardBtn) {
        discardBtn.addEventListener("click", function () {
            const rowCount = _ephemeralRows.length;
            if (rowCount === 0) return;

            const confirmed = confirm(
                "Discard all " +
                    rowCount +
                    " uploaded records? This cannot be undone."
            );
            if (!confirmed) return;

            discardBulkReview();
        });
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _updateSaveButton
   Updates the Save as Draft button text and disabled state based on
   current checked valid rows count.
----------------------------------------------------------------------------- */
function _updateSaveButton() {
    const saveBtn = document.getElementById("bulk-review-save-btn");
    if (!saveBtn) return;

    const checkedCount = _ephemeralRows.filter(function (row) {
        return row.valid && row.checked;
    }).length;

    if (checkedCount === 0) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Save as Draft";
    } else {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save " + checkedCount + " as Draft";
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireSelectAll
   Wires the "Select All" checkbox in the bulk review table header.
----------------------------------------------------------------------------- */
function _wireSelectAll() {
    const selectAllCheckbox = document.getElementById(
        "bulk-review-select-all"
    );
    if (!selectAllCheckbox) return;

    // Remove old listener by cloning
    const newCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newCheckbox, selectAllCheckbox);

    newCheckbox.addEventListener("change", function () {
        const isChecked = newCheckbox.checked;

        _ephemeralRows.forEach(function (row) {
            if (row.valid) {
                row.checked = isChecked;

                // Update the individual checkbox in the DOM
                const tbody = document.getElementById("bulk-review-tbody");
                if (tbody) {
                    const rows = tbody.querySelectorAll("tr");
                    rows.forEach(function (tr) {
                        const cb = tr.querySelector(
                            'input[type="checkbox"]'
                        );
                        if (cb && !cb.disabled) {
                            cb.checked = isChecked;
                        }
                    });
                }
            }
        });

        _updateSaveButton();
    });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — window.* API contract for bulk review workflow
----------------------------------------------------------------------------- */
window.loadBulkReviewRows = loadBulkReviewRows;
window.renderBulkReview = renderBulkReview;
window.commitBulkReview = commitBulkReview;
window.discardBulkReview = discardBulkReview;
window.initBulkReview = initBulkReview;
