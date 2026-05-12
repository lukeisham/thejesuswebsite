// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderExternalRefs(containerId) — wires the three external reference text inputs.
// Output:  Wired text inputs; setExternalRefValues(data) / collectExternalRefs() for read/write.

'use strict';

/* =============================================================================
   EXTERNAL REFS HANDLER
   File:    js/9.0_cross_cutting/dashboard/external_refs_handler.js
   Version: 1.0.0
   Owner:   plan_relocate_shared_widgets_to_cross_cutting (9.0 Cross-Cutting)
   Trigger: Consumer dashboard pages call window.renderExternalRefs(containerId)
            to wire up the IAA, Pledius, and Manuscript external reference fields.
   Main:    renderExternalRefs(containerId) — wires #record-iaa, #record-pledius,
            and #record-manuscript text inputs, attaching trim-on-blur listeners.
   Output:  Three wired text inputs; setExternalRefValues(data) for hydration
            and collectExternalRefs() for reading current values.
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderExternalRefs
   Wires up the three external reference text input fields.

   Parameters:
     containerId (string) — DOM element ID of the container wrapping the fields.
----------------------------------------------------------------------------- */
function renderExternalRefs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        _externalRefsError('external refs container not found');
        return;
    }

    const iaaInput       = document.getElementById('record-iaa');
    const plediusInput   = document.getElementById('record-pledius');
    const manuscriptInput = document.getElementById('record-manuscript');

    /* -------------------------------------------------------------------------
       1. ATTACH TRIM-ON-BLUR LISTENERS
       Each input gets a blur handler that trims whitespace to keep values clean.
    ------------------------------------------------------------------------- */
    if (iaaInput) {
        iaaInput.addEventListener('blur', function () {
            iaaInput.value = iaaInput.value.trim();
        });
    }

    if (plediusInput) {
        plediusInput.addEventListener('blur', function () {
            plediusInput.value = plediusInput.value.trim();
        });
    }

    if (manuscriptInput) {
        manuscriptInput.addEventListener('blur', function () {
            manuscriptInput.value = manuscriptInput.value.trim();
        });
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setExternalRefValues
   Sets the values of all three external reference text inputs.

   Parameters:
     data (object) — { iaa: string, pledius: string, manuscript: string }
----------------------------------------------------------------------------- */
function setExternalRefValues(data) {
    if (!data) { return; }

    if (data.iaa !== undefined) {
        const iaaInput = document.getElementById('record-iaa');
        if (iaaInput) { iaaInput.value = data.iaa; }
    }

    if (data.pledius !== undefined) {
        const plediusInput = document.getElementById('record-pledius');
        if (plediusInput) { plediusInput.value = data.pledius; }
    }

    if (data.manuscript !== undefined) {
        const manuscriptInput = document.getElementById('record-manuscript');
        if (manuscriptInput) { manuscriptInput.value = data.manuscript; }
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectExternalRefs
   Reads the current values of all three external reference text inputs.

   Returns:
     { iaa: string, pledius: string, manuscript: string }
----------------------------------------------------------------------------- */
function collectExternalRefs() {
    const iaaInput       = document.getElementById('record-iaa');
    const plediusInput   = document.getElementById('record-pledius');
    const manuscriptInput = document.getElementById('record-manuscript');

    return {
        iaa:        iaaInput ? iaaInput.value.trim() : '',
        pledius:    plediusInput ? plediusInput.value.trim() : '',
        manuscript: manuscriptInput ? manuscriptInput.value.trim() : ''
    };
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _externalRefsError
   Routes an error message through window.surfaceError(), interpolating the
   current record title from window._recordTitle.

   Parameters:
     context (string) — short description of what failed
----------------------------------------------------------------------------- */
function _externalRefsError(context) {
    if (typeof window.surfaceError !== 'function') {
        console.error(`[external_refs_handler] ${context}`);
        return;
    }

    const title = (typeof window._recordTitle !== 'undefined')
        ? window._recordTitle
        : '';

    window.surfaceError(
        `Error: Failed to save external references for '${title}'.`
    );
}

/* =============================================================================
   GLOBAL EXPOSURE — public API contract for orchestration
============================================================================= */
window.renderExternalRefs   = renderExternalRefs;
window.setExternalRefValues = setExternalRefValues;
window.collectExternalRefs  = collectExternalRefs;
