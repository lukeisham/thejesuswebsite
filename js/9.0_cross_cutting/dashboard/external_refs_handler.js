// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderExternalRefs(containerId) — builds the two-column unique identifiers table.
// Output:  Wired table inputs; setExternalRefValues(data) / collectExternalRefs() for read/write.

"use strict";

/* =============================================================================
   EXTERNAL REFS HANDLER
   File:    js/9.0_cross_cutting/dashboard/external_refs_handler.js
   Version: 1.1.0
   Owner:   plan_relocate_shared_widgets_to_cross_cutting (9.0 Cross-Cutting)
   Trigger: Consumer dashboard pages call window.renderExternalRefs(containerId)
            to render the unique identifiers editable table.
   Main:    renderExternalRefs(containerId) — builds a two-column table
            (Identifier Type | Value) with three pre-populated rows: IAA,
            Pledius, and Manuscript. Each Value cell is an inline-editable
            text input with trim-on-blur behavior.
   Output:  Three wired text inputs in a table; setExternalRefValues(data) for
            hydration and collectExternalRefs() for reading current values.
============================================================================= */

/* -----------------------------------------------------------------------------
   Row definitions — label, internal key, and input id for each identifier
----------------------------------------------------------------------------- */
const REF_ROWS = [
  { label: "IAA Reference", key: "iaa", inputId: "record-iaa" },
  { label: "Pledius Reference", key: "pledius", inputId: "record-pledius" },
  {
    label: "Manuscript Reference",
    key: "manuscript",
    inputId: "record-manuscript",
  },
];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderExternalRefs
   Renders the unique identifiers editable table into the given container.

   Parameters:
     containerId (string) — DOM element ID of the container wrapping the fields.
----------------------------------------------------------------------------- */
function renderExternalRefs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    _externalRefsError("external refs container not found");
    return;
  }

  container.innerHTML = _buildTableMarkup();
  container.className = "external-refs-editor";

  _wireInputs();
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setExternalRefValues
   Sets the values of all three external reference text inputs.

   Parameters:
     data (object) — { iaa: string, pledius: string, manuscript: string }
----------------------------------------------------------------------------- */
function setExternalRefValues(data) {
  if (!data) {
    return;
  }

  REF_ROWS.forEach(function (row) {
    if (data[row.key] !== undefined) {
      const input = document.getElementById(row.inputId);
      if (input) {
        input.value = data[row.key];
      }
    }
  });
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectExternalRefs
   Reads the current values of all three external reference text inputs.

   Returns:
     { iaa: string, pledius: string, manuscript: string }
----------------------------------------------------------------------------- */
function collectExternalRefs() {
  const result = {};

  REF_ROWS.forEach(function (row) {
    const input = document.getElementById(row.inputId);
    result[row.key] = input ? input.value.trim() : "";
  });

  return result;
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _buildTableMarkup
   Returns the static HTML string for the two-column identifiers table.
----------------------------------------------------------------------------- */
function _buildTableMarkup() {
  var html = "";

  html += '<table class="external-refs-editor__table">';

  // --- thead ---
  html += '<thead class="external-refs-editor__thead"><tr>';
  html += '<th class="external-refs-editor__th">Identifier Type</th>';
  html += '<th class="external-refs-editor__th">Value</th>';
  html += "</tr></thead>";

  // --- tbody ---
  html += '<tbody class="external-refs-editor__tbody">';

  REF_ROWS.forEach(function (row) {
    html += '<tr class="external-refs-editor__row">';
    html +=
      '<td class="external-refs-editor__td external-refs-editor__td--label">';
    html +=
      '<span class="external-refs-editor__label">' +
      _escapeHtml(row.label) +
      "</span>";
    html += "</td>";
    html += '<td class="external-refs-editor__td">';
    html +=
      '<input type="text" class="form-field__input external-refs-editor__value-input" id="' +
      row.inputId +
      '" aria-label="' +
      _escapeHtml(row.label) +
      '" />';
    html += "</td>";
    html += "</tr>";
  });

  html += "</tbody></table>";

  return html;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireInputs
   Attaches trim-on-blur listeners to all three value inputs.
----------------------------------------------------------------------------- */
function _wireInputs() {
  REF_ROWS.forEach(function (row) {
    const input = document.getElementById(row.inputId);
    if (input) {
      input.addEventListener("blur", function () {
        input.value = input.value.trim();
      });
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _escapeHtml
   Minimal HTML-escaping utility.
----------------------------------------------------------------------------- */
function _escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _externalRefsError
   Routes an error message through window.surfaceError(), interpolating the
   current record title from window._recordTitle.

   Parameters:
     context (string) — short description of what failed
----------------------------------------------------------------------------- */
function _externalRefsError(context) {
  if (typeof window.surfaceError !== "function") {
    console.error(`[external_refs_handler] ${context}`);
    return;
  }

  const title =
    typeof window._recordTitle !== "undefined" ? window._recordTitle : "";

  window.surfaceError(
    `Error: Failed to save external references for '${title}'.`,
  );
}

/* =============================================================================
   GLOBAL EXPOSURE — public API contract for orchestration
============================================================================= */
window.renderExternalRefs = renderExternalRefs;
window.setExternalRefValues = setExternalRefValues;
window.collectExternalRefs = collectExternalRefs;
