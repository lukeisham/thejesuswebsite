// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderParentSelector(containerId) — wires the parent_id ULID input with validation and title lookup.
// Output:  Validated ULID input; parent title display fetched via GET /api/admin/records/{parentId}.

'use strict';

/* =============================================================================
   PARENT SELECTOR
   File:    js/2.0_records/dashboard/parent_selector.js
   Version: 1.0.0
   Owner:   plan_dashboard_records_single (2.0 Records Module)
   Trigger: Consumer dashboard pages call window.renderParentSelector(containerId)
            to wire up the parent_id ULID input field with format validation and
            a live parent-title lookup.
   Main:    renderParentSelector(containerId) — attaches input validation to
            #record-parent-id and wires async title fetch to populate
            #parent-title-display.
   Output:  Interactive parent ID input with ULID validation and real-time
            parent record title display. setParentValue(data) / collectParentValue()
            for hydration and readback.
============================================================================= */

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */

// ULID regex: exactly 26 characters, uppercase alphanumeric (Crockford base32)
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/* -----------------------------------------------------------------------------
   INTERNAL STATE
----------------------------------------------------------------------------- */

let _parentDebounceTimer = null;
const _DEBOUNCE_MS = 400;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderParentSelector
   Wires up the parent_id input and parent title display elements.

   Parameters:
     containerId (string) — DOM element ID of the container wrapping the fields.
----------------------------------------------------------------------------- */
function renderParentSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        _parentError('parent selector container not found');
        return;
    }

    const parentIdInput    = document.getElementById('record-parent-id');
    const titleDisplay     = document.getElementById('parent-title-display');

    if (!parentIdInput) {
        _parentError('parent ID input not found');
        return;
    }

    /* -------------------------------------------------------------------------
       1. ATTACH INPUT LISTENER
       On each keystroke, debounce-then-validate the ULID format. If valid,
       fetch the parent record title from the API. If invalid or empty, clear
       the title display.
    ------------------------------------------------------------------------- */
    parentIdInput.addEventListener('input', function () {
        const rawValue = parentIdInput.value.trim();

        // Clear any pending debounce
        if (_parentDebounceTimer) {
            clearTimeout(_parentDebounceTimer);
            _parentDebounceTimer = null;
        }

        // If empty, clear the display immediately
        if (!rawValue) {
            if (titleDisplay) { titleDisplay.textContent = ''; }
            return;
        }

        // Debounce the validation + fetch
        _parentDebounceTimer = setTimeout(function () {
            _handleParentInput(rawValue, parentIdInput, titleDisplay);
        }, _DEBOUNCE_MS);
    });

    /* -------------------------------------------------------------------------
       2. HANDLE BLUR FOR CLEANUP
       On blur, trim the input value to remove accidental whitespace.
    ------------------------------------------------------------------------- */
    parentIdInput.addEventListener('blur', function () {
        parentIdInput.value = parentIdInput.value.trim();
    });
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setParentValue
   Sets the parent_id input value and triggers a title fetch if valid.

   Parameters:
     data (object) — { parent_id: string }
----------------------------------------------------------------------------- */
function setParentValue(data) {
    if (!data) { return; }

    const parentIdInput = document.getElementById('record-parent-id');
    if (!parentIdInput) { return; }

    parentIdInput.value = (data.parent_id !== undefined) ? data.parent_id : '';

    // Trigger a fresh lookup for the newly set value
    const titleDisplay = document.getElementById('parent-title-display');
    const rawValue = parentIdInput.value.trim();

    if (rawValue && ULID_REGEX.test(rawValue)) {
        _fetchParentTitle(rawValue, titleDisplay);
    } else if (titleDisplay) {
        titleDisplay.textContent = '';
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectParentValue
   Reads the current parent_id input value.

   Returns:
     { parent_id: string }
----------------------------------------------------------------------------- */
function collectParentValue() {
    const parentIdInput = document.getElementById('record-parent-id');

    return {
        parent_id: parentIdInput ? parentIdInput.value.trim() : ''
    };
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _handleParentInput
   Validates the ULID format and either fetches the parent title or clears
   the display with an error.

   Parameters:
     rawValue   (string)      — the trimmed input value
     inputEl    (HTMLElement) — the parent ID input element
     displayEl  (HTMLElement) — the title display span element (may be null)
----------------------------------------------------------------------------- */
function _handleParentInput(rawValue, inputEl, displayEl) {
    if (!ULID_REGEX.test(rawValue)) {
        if (displayEl) { displayEl.textContent = ''; }

        const title = (typeof window.getRecordTitle === 'function')
            ? window.getRecordTitle()
            : '';

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                `Error: Invalid Parent ID format for '${title}'. Must be a valid ULID.`
            );
        }
        return;
    }

    // Valid ULID — fetch the parent title
    _fetchParentTitle(rawValue, displayEl);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _fetchParentTitle
   Calls GET /api/admin/records/{parentId} and populates the title display
   with the returned record title.

   Parameters:
     parentId  (string)      — the validated ULID
     displayEl (HTMLElement) — the title display span element (may be null)
----------------------------------------------------------------------------- */
async function _fetchParentTitle(parentId, displayEl) {
    if (!ULID_REGEX.test(parentId)) {
        if (displayEl) { displayEl.textContent = '(invalid ID format)'; }
        return;
    }

    try {
        const response = await fetch(`/api/admin/records/${encodeURIComponent(parentId)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            if (displayEl) { displayEl.textContent = '(not found)'; }
            return;
        }

        const data = await response.json();

        if (displayEl) {
            displayEl.textContent = (data && data.title) ? data.title : '(untitled)';
        }
    } catch (err) {
        console.error('[parent_selector] Failed to fetch parent title:', err);
        if (displayEl) { displayEl.textContent = '(error)'; }
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _parentError
   Routes an error through window.surfaceError().

   Parameters:
     context (string) — short description of what failed
----------------------------------------------------------------------------- */
function _parentError(context) {
    if (typeof window.surfaceError !== 'function') {
        console.error(`[parent_selector] ${context}`);
        return;
    }

    window.surfaceError(context);
}

/* =============================================================================
   GLOBAL EXPOSURE — public API contract for orchestration
============================================================================= */
window.renderParentSelector = renderParentSelector;
window.setParentValue       = setParentValue;
window.collectParentValue   = collectParentValue;
