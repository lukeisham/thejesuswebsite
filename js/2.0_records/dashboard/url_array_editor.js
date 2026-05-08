// Trigger:  Called by the orchestrator to render a label/URL pair array
//           editor on the single-record edit form for dynamic URL fields.
// Main:    renderUrlArrayEditor(containerId) — builds a label + URL row UI.
//           setUrlArrayData(data) — hydrates the editor from a JSON array.
//           collectUrlArray() — gathers non-empty rows into a JSON array.
// Output:  Populated .url-array-editor container with interactive label/URL
//           rows. collectUrlArray returns [{label, url}, ...].

/* This is the authoritative copy — consumed by (no consumers yet — available for future plans) */

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderUrlArrayEditor
   Injects the full URL array editor UI into the given container. Each entry
   row holds a Label text input and a URL text input, plus a remove (×) button.
   An "Add URL" button (btn--secondary) appends a new empty row.

   Parameters:
     containerId (string) — DOM element ID to inject the editor into
----------------------------------------------------------------------------- */
function renderUrlArrayEditor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    if (typeof window.surfaceError === "function") {
      const title =
        typeof window._recordTitle !== "undefined"
          ? window._recordTitle
          : containerId;
      window.surfaceError(`Error: Failed to save URL data for '${title}'.`);
    }
    return;
  }

  /* -------------------------------------------------------------------------
       BUILD: Editor skeleton with an empty rows area and Add URL button
    ------------------------------------------------------------------------- */
  container.innerHTML = `
        <div class="url-array-editor" data-url-array-editor>
            <div class="url-array-editor__rows" data-url-array-rows></div>
            <div class="url-array-editor__add">
                <button type="button" class="btn--secondary" data-url-array-add>
                    + Add URL
                </button>
            </div>
        </div>
    `;

  /* -------------------------------------------------------------------------
       EVENT BINDING: Add URL button appends a new empty row
    ------------------------------------------------------------------------- */
  const rowsContainer = container.querySelector("[data-url-array-rows]");
  const addBtn = container.querySelector("[data-url-array-add]");

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      _addUrlRow(rowsContainer, "", "");
    });
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: setUrlArrayData
   Accepts a JSON array of {label, url} objects and hydrates the editor by
   clearing any existing rows and populating new ones from the provided data.

   Parameters:
     data (Array | string) — Array of {label, url} objects, or a JSON string
                             representation of such an array. If neither is
                             provided or parsing fails, the editor is cleared.
----------------------------------------------------------------------------- */
function setUrlArrayData(data) {
  const rowsContainer = document.querySelector("[data-url-array-rows]");
  if (!rowsContainer) {
    return;
  }

  /* -------------------------------------------------------------------------
       CLEAR: Remove all existing rows before hydration
    ------------------------------------------------------------------------- */
  rowsContainer.innerHTML = "";

  /* -------------------------------------------------------------------------
       PARSE: Resolve data into a clean array of {label, url} objects
    ------------------------------------------------------------------------- */
  let urlArray = [];

  if (data !== undefined && data !== null) {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        urlArray = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("[url_array_editor] Failed to parse URL data JSON:", e);
        urlArray = [];
      }
    } else if (Array.isArray(data)) {
      urlArray = data.slice();
    }
  }

  /* -------------------------------------------------------------------------
       HYDRATE: Render a row for each {label, url} object
    ------------------------------------------------------------------------- */
  urlArray.forEach(function (entry) {
    if (entry && typeof entry === "object") {
      _addUrlRow(rowsContainer, entry.label || "", entry.url || "");
    }
  });
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: collectUrlArray
   Collects all non-empty label/URL rows from the editor and returns a JSON
   array of {label, url} objects. Empty entries (where both label and url are
   blank or whitespace-only) are filtered out.

   Returns:
     Array of {label, url} objects for all non-empty rows
----------------------------------------------------------------------------- */
function collectUrlArray() {
  const rowsContainer = document.querySelector("[data-url-array-rows]");
  if (!rowsContainer) {
    return [];
  }

  const rows = rowsContainer.querySelectorAll(".url-array-editor__row");
  const results = [];

  rows.forEach(function (row) {
    const labelInput = row.querySelector("[data-url-array-label]");
    const urlInput = row.querySelector("[data-url-array-url]");

    const label = labelInput ? labelInput.value.trim() : "";
    const url = urlInput ? urlInput.value.trim() : "";

    // Skip rows where both fields are empty
    if (label === "" && url === "") {
      return;
    }

    results.push({
      label: label,
      url: url,
    });
  });

  return results;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _addUrlRow
   Creates a new label/URL entry row inside the rows container. Each row
   consists of a Label text input, a URL text input, and a remove (×) button.

   Parameters:
     rowsContainer (HTMLElement) — the container element for all URL rows
     label         (string)      — initial value for the Label input
     url           (string)      — initial value for the URL input
----------------------------------------------------------------------------- */
function _addUrlRow(rowsContainer, label, url) {
  if (!rowsContainer) {
    return;
  }

  const row = document.createElement("div");
  row.className = "url-array-editor__row";

  /* -------------------------------------------------------------------------
       Label input
    ------------------------------------------------------------------------- */
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "form-field__input";
  labelInput.setAttribute("data-url-array-label", "");
  labelInput.placeholder = "Label";
  labelInput.setAttribute("aria-label", "URL label");
  labelInput.value = typeof label === "string" ? label : "";

  /* -------------------------------------------------------------------------
       URL input
    ------------------------------------------------------------------------- */
  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.className = "form-field__input";
  urlInput.setAttribute("data-url-array-url", "");
  urlInput.placeholder = "https://…";
  urlInput.setAttribute("aria-label", "URL");
  urlInput.value = typeof url === "string" ? url : "";

  /* -------------------------------------------------------------------------
       Remove button
    ------------------------------------------------------------------------- */
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "url-array-editor__remove";
  removeBtn.setAttribute("aria-label", "Remove URL entry");
  removeBtn.innerHTML = "&times;";
  removeBtn.addEventListener("click", function () {
    row.remove();
  });

  row.appendChild(labelInput);
  row.appendChild(urlInput);
  row.appendChild(removeBtn);
  rowsContainer.appendChild(row);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — shared-tool API contract
----------------------------------------------------------------------------- */
window.renderUrlArrayEditor = renderUrlArrayEditor;
window.setUrlArrayData = setUrlArrayData;
window.collectUrlArray = collectUrlArray;
