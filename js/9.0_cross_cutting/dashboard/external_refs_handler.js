// Trigger: Called by dashboard orchestrators (records single, essay, blog, etc.)
// Main:    renderExternalRefs(containerId) — builds a dynamic unique identifiers table.
// Output:  Interactive table with add/delete rows; setExternalRefValues(data) / collectExternalRefs() for read/write.

(function () {
"use strict";

/* =============================================================================
   EXTERNAL REFS HANDLER
   File:    js/9.0_cross_cutting/dashboard/external_refs_handler.js
   Version: 2.0.0
   Owner:   plan_relocate_shared_widgets_to_cross_cutting (9.0 Cross-Cutting)
   Trigger: Consumer dashboard pages call window.renderExternalRefs(containerId)
            to render the unique identifiers editable table.
   Main:    renderExternalRefs(containerId) — builds a three-column table
            (Identifier Type | Value | Remove) with three default rows (IAA,
            Pledius, Manuscript) and an add-row form. Each row displays an
            editable type input, an editable value input, and a remove button.
   Output:  Dynamic table; setExternalRefValues(data) hydrates rows;
            collectExternalRefs() returns { iaa, pledius, manuscript, entries }.
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL STATE — entries array tracked in memory
   Each entry: { type: string, value: string }
----------------------------------------------------------------------------- */
let _entries = [];

/* -----------------------------------------------------------------------------
   DEFAULT ROWS — seeded when no entries exist or on reset
----------------------------------------------------------------------------- */
const DEFAULT_ROWS = [
  { type: "IAA Reference", value: "" },
  { type: "Pledius Reference", value: "" },
  { type: "Manuscript Reference", value: "" },
];

/* -----------------------------------------------------------------------------
   CANONICAL KEYS — maps the three legacy flat columns to their row type labels
----------------------------------------------------------------------------- */
const CANONICAL_KEY_TO_LABEL = {
  iaa: "IAA Reference",
  pledius: "Pledius Reference",
  manuscript: "Manuscript Reference",
};

const CANONICAL_LABEL_TO_KEY = {
  "IAA Reference": "iaa",
  "Pledius Reference": "pledius",
  "Manuscript Reference": "manuscript",
};

/* =============================================================================
   PUBLIC API
============================================================================= */

/**
 * Render the unique identifiers table into the given container.
 * Seeds three default rows (IAA, Pledius, Manuscript) if no entries exist.
 *
 * @param {string} containerId — DOM id of the wrapper element
 */
function renderExternalRefs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    _externalRefsError("external refs container not found");
    return;
  }

  if (_entries.length === 0) {
    DEFAULT_ROWS.forEach(function (row) {
      _entries.push({ type: row.type, value: row.value });
    });
  }

  container.innerHTML = _buildMarkup();
  container.className = "external-refs-editor";

  _wireEvents(container);
}

/**
 * Hydrate the editor with data.
 * Accepts legacy flat keys (iaa, pledius, manuscript) and/or an entries array.
 *
 * @param {Object} data — { iaa?, pledius?, manuscript?, entries?: [{type, value}] }
 */
function setExternalRefValues(data) {
  if (!data) return;

  // Reset entries
  _entries = [];

  // If entries array is provided, use it directly
  if (Array.isArray(data.entries) && data.entries.length > 0) {
    data.entries.forEach(function (item) {
      _entries.push({
        type: item.type || "",
        value: item.value || "",
      });
    });
  } else {
    // Legacy hydration: seed defaults and overlay provided values
    DEFAULT_ROWS.forEach(function (row) {
      _entries.push({ type: row.type, value: "" });
    });

    // Overlay legacy flat keys onto the default rows
    Object.keys(CANONICAL_KEY_TO_LABEL).forEach(function (key) {
      if (data[key] !== undefined) {
        const label = CANONICAL_KEY_TO_LABEL[key];
        const entry = _entries.find(function (e) { return e.type === label; });
        if (entry) {
          entry.value = data[key] || "";
        }
      }
    });
  }

  // Re-render if the container is already visible
  const table = document.querySelector(".external-refs-editor__table");
  if (table) {
    _refreshTableBody();
  }
}

/**
 * Collect all identifier entries from the editor.
 * Syncs any in-flight DOM edits back to internal state before collecting.
 *
 * @returns {{ iaa: string, pledius: string, manuscript: string, entries: Array<{type, value}> }}
 */
function collectExternalRefs() {
  // Sync DOM values back into _entries
  _syncDomToState();

  const result = { iaa: "", pledius: "", manuscript: "", entries: [] };

  _entries.forEach(function (entry) {
    const trimmedType = (entry.type || "").trim();
    const trimmedValue = (entry.value || "").trim();

    // Always add to entries array
    result.entries.push({ type: trimmedType, value: trimmedValue });

    // Map canonical types to legacy flat keys
    const key = CANONICAL_LABEL_TO_KEY[trimmedType];
    if (key) {
      result[key] = trimmedValue;
    }
  });

  return result;
}

/* =============================================================================
   INTERNAL: BUILD MARKUP
============================================================================= */

function _buildMarkup() {
  let html = "";

  // --- Table ---
  html += '<table class="external-refs-editor__table">';

  // thead
  html += '<thead class="external-refs-editor__thead"><tr>';
  html += '<th class="external-refs-editor__th">Identifier Type</th>';
  html += '<th class="external-refs-editor__th">Value</th>';
  html += '<th class="external-refs-editor__th external-refs-editor__th--remove"></th>';
  html += '</tr></thead>';

  // tbody
  html += '<tbody class="external-refs-editor__tbody">';
  html += _buildTbodyRows();
  html += '</tbody></table>';

  // --- Add row ---
  html += '<div class="external-refs-editor__add-row">';
  html += '<input type="text" class="form-field__input external-refs-editor__add-type" placeholder="Identifier type (e.g. ISBN)" aria-label="New identifier type" />';
  html += '<input type="text" class="form-field__input external-refs-editor__add-value" placeholder="Value" aria-label="New identifier value" />';
  html += '<button class="btn--secondary external-refs-editor__add-btn" type="button">+ Add</button>';
  html += '</div>';

  return html;
}

function _buildTbodyRows() {
  if (_entries.length === 0) {
    return (
      '<tr class="external-refs-editor__row external-refs-editor__row--empty">' +
      '<td class="external-refs-editor__td" colspan="3">' +
      '<span class="external-refs-editor__empty-text">No unique identifiers added yet.</span>' +
      '</td></tr>'
    );
  }

  let html = "";
  _entries.forEach(function (entry, i) {
    html += '<tr class="external-refs-editor__row" data-entry-index="' + i + '">';

    // Type cell (editable)
    html += '<td class="external-refs-editor__td">';
    html += '<input type="text" class="form-field__input external-refs-editor__type-input" data-entry="' + i + '" data-field="type" value="' + _escapeHtml(entry.type || "") + '" aria-label="Identifier type" />';
    html += '</td>';

    // Value cell (editable)
    html += '<td class="external-refs-editor__td">';
    html += '<input type="text" class="form-field__input external-refs-editor__value-input" data-entry="' + i + '" data-field="value" value="' + _escapeHtml(entry.value || "") + '" aria-label="Identifier value" />';
    html += '</td>';

    // Remove cell
    html += '<td class="external-refs-editor__td external-refs-editor__td--remove">';
    html += '<button class="external-refs-editor__remove-btn" data-entry="' + i + '" data-action="remove" type="button" aria-label="Remove identifier">&times;</button>';
    html += '</td>';

    html += '</tr>';
  });

  return html;
}

/* =============================================================================
   INTERNAL: EVENT WIRING
============================================================================= */

function _wireEvents(container) {
  if (!container) return;

  // --- Type & value input changes → live sync into _entries ---
  const fieldInputs = container.querySelectorAll("[data-field]");
  fieldInputs.forEach(function (input) {
    input.addEventListener("input", function () {
      const index = parseInt(this.dataset.entry, 10);
      const field = this.dataset.field;
      if (_entries[index]) {
        _entries[index][field] = this.value;
      }
    });
  });

  // --- Remove button ---
  const removeBtns = container.querySelectorAll('[data-action="remove"]');
  removeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const index = parseInt(this.dataset.entry, 10);
      _entries.splice(index, 1);
      _refreshTableBody();
    });
  });

  // --- Add button ---
  const addBtn = container.querySelector(".external-refs-editor__add-btn");
  const addType = container.querySelector(".external-refs-editor__add-type");
  const addValue = container.querySelector(".external-refs-editor__add-value");

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      _handleAddRow(addType, addValue);
    });
  }

  // Allow Enter on value input to trigger add
  if (addValue) {
    addValue.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        _handleAddRow(addType, addValue);
      }
    });
  }
}

function _handleAddRow(typeInput, valueInput) {
  if (!typeInput || !valueInput) return;

  const type = typeInput.value.trim();
  const value = valueInput.value.trim();

  if (!type || !value) {
    // Focus the first empty field
    if (!type) {
      typeInput.focus();
    } else {
      valueInput.focus();
    }
    return;
  }

  _entries.push({ type: type, value: value });
  _refreshTableBody();

  // Clear inputs for rapid entry
  typeInput.value = "";
  valueInput.value = "";
  typeInput.focus();
}

/* =============================================================================
   INTERNAL: REFRESH TABLE BODY
============================================================================= */

function _refreshTableBody() {
  const tbody = document.querySelector(".external-refs-editor__tbody");
  if (!tbody) return;

  tbody.innerHTML = _buildTbodyRows();

  // Re-wire events on the container
  const editor = tbody.closest(".external-refs-editor");
  if (editor) {
    _wireEvents(editor);
  }
}

/* =============================================================================
   INTERNAL: SYNC DOM TO STATE
============================================================================= */

function _syncDomToState() {
  const editor = document.querySelector(".external-refs-editor");
  if (!editor) return;

  const fieldInputs = editor.querySelectorAll("[data-field]");
  fieldInputs.forEach(function (input) {
    const index = parseInt(input.dataset.entry, 10);
    const field = input.dataset.field;
    if (_entries[index]) {
      _entries[index][field] = input.value;
    }
  });
}

/* =============================================================================
   INTERNAL: UTILITIES
============================================================================= */

function _escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function _externalRefsError(context) {
  if (typeof window.surfaceError !== "function") {
    console.error("[external_refs_handler] " + context);
    return;
  }
  const title =
    typeof window.getRecordTitle === "function" ? window.getRecordTitle() : "";
  window.surfaceError(
    "Error: Failed to save external references for '" + title + "'."
  );
}

/* =============================================================================
   GLOBAL EXPOSURE
============================================================================= */
window.renderExternalRefs = renderExternalRefs;
window.setExternalRefValues = setExternalRefValues;
window.collectExternalRefs = collectExternalRefs;

})();
