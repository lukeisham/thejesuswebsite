// Trigger:  Called by wikipedia_list_display.js → window.populateWikipediaSidebar()
//           when a Wikipedia row is selected.
//           Also called by dashboard_wikipedia.js → window.initWikipediaSidebar()
//           on module initialisation to set up empty sidebar state.
// Main:    populateWikipediaSidebar(record) — populates all sidebar sections
//           with the selected record's data. Handles weight editing, search
//           term chips with add/remove, metadata editing with auto-gen buttons,
//           and per-record recalculate trigger. All saves set status to draft.
// Output:  Fully interactive record detail sidebar. Errors routed through
//          window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initWikipediaSidebar
   Initialises the sidebar in its empty/default state. Wires up the Save
   Weight button, Add Term button, auto-gen buttons, and recalculate button.
   Called once when the Wikipedia module is loaded.
----------------------------------------------------------------------------- */
function initWikipediaSidebar() {
  // Clear sidebar fields
  _clearSidebar();

  // Wire save weight button
  const saveWeightBtn = document.getElementById("btn-wikipedia-save-weight");
  if (saveWeightBtn) {
    saveWeightBtn.addEventListener("click", _handleSaveWeight);
  }

  // Wire add term button
  const addTermBtn = document.getElementById("btn-wikipedia-add-term");
  if (addTermBtn) {
    addTermBtn.addEventListener("click", _handleAddTerm);
  }

  // Wire Enter key for add term input
  const addTermInput = document.getElementById("wikipedia-search-term-input");
  if (addTermInput) {
    addTermInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        _handleAddTerm();
      }
    });
  }

  // Wire auto-gen buttons
  const autoSnippetBtn = document.getElementById("btn-wikipedia-auto-snippet");
  if (autoSnippetBtn) {
    autoSnippetBtn.addEventListener("click", _handleAutoGenSnippet);
  }

  const autoSlugBtn = document.getElementById("btn-wikipedia-auto-slug");
  if (autoSlugBtn) {
    autoSlugBtn.addEventListener("click", _handleAutoGenSlug);
  }

  const autoMetaBtn = document.getElementById("btn-wikipedia-auto-meta");
  if (autoMetaBtn) {
    autoMetaBtn.addEventListener("click", _handleAutoGenMeta);
  }

  // Wire recalculate button
  const recalcBtn = document.getElementById("btn-wikipedia-recalculate-record");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", _handleRecalculateRecord);
  }

  // Wire metadata field save-on-blur
  const snippetInput = document.getElementById("wikipedia-snippet-input");
  if (snippetInput) {
    snippetInput.addEventListener("blur", _handleSaveMetadata);
  }

  const slugInput = document.getElementById("wikipedia-slug-input");
  if (slugInput) {
    slugInput.addEventListener("blur", _handleSaveMetadata);
  }

  const metaInput = document.getElementById("wikipedia-meta-input");
  if (metaInput) {
    metaInput.addEventListener("blur", _handleSaveMetadata);
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: populateWikipediaSidebar
   Populates all sidebar sections with the selected record's data.

   Parameters:
     record (object) — the record data object
----------------------------------------------------------------------------- */
function populateWikipediaSidebar(record) {
  if (!record) return;

  const state = window._wikipediaModuleState;

  // Section 1: Record Info
  const titleEl = document.getElementById("wikipedia-record-title");
  const slugEl = document.getElementById("wikipedia-record-slug");
  if (titleEl) titleEl.textContent = record.title || "—";
  if (slugEl) slugEl.textContent = record.slug || "—";

  // Section 2: Weight
  const weightInput = document.getElementById("wikipedia-weight-input");
  if (weightInput) {
    weightInput.value = state.activeRecordWeight;
  }

  // Section 3: Search Terms
  _renderSearchTerms();

  // Section 4: Metadata
  const snippetInput = document.getElementById("wikipedia-snippet-input");
  const slugInput = document.getElementById("wikipedia-slug-input");
  const metaInput = document.getElementById("wikipedia-meta-input");

  if (snippetInput) snippetInput.value = state.activeRecordSnippet;
  if (slugInput) slugInput.value = state.activeRecordSlug;
  if (metaInput) metaInput.value = state.activeRecordMeta;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
   Resets all sidebar fields to their default empty state.
----------------------------------------------------------------------------- */
function _clearSidebar() {
  const titleEl = document.getElementById("wikipedia-record-title");
  const slugEl = document.getElementById("wikipedia-record-slug");
  const weightInput = document.getElementById("wikipedia-weight-input");
  const snippetInput = document.getElementById("wikipedia-snippet-input");
  const slugInputEl = document.getElementById("wikipedia-slug-input");
  const metaInput = document.getElementById("wikipedia-meta-input");

  if (titleEl) titleEl.textContent = "—";
  if (slugEl) slugEl.textContent = "—";
  if (weightInput) weightInput.value = "1.00";
  if (snippetInput) snippetInput.value = "";
  if (slugInputEl) slugInputEl.value = "";
  if (metaInput) metaInput.value = "";

  // Clear search terms
  const termsList = document.getElementById("wikipedia-search-terms-list");
  if (termsList) termsList.innerHTML = "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchTerms
   Renders the current record's search terms as deletable chip elements.
----------------------------------------------------------------------------- */
function _renderSearchTerms() {
  const termsList = document.getElementById("wikipedia-search-terms-list");
  if (!termsList) return;

  termsList.innerHTML = "";

  const terms = window._wikipediaModuleState.activeRecordSearchTerms;
  if (!terms || terms.length === 0) return;

  terms.forEach(function (term, index) {
    if (!term || term.trim() === "") return;

    const chipEl = document.createElement("li");
    chipEl.className = "wikipedia-search-term-chip";

    const textEl = document.createElement("span");
    textEl.className = "wikipedia-search-term-chip__text";
    textEl.textContent = term.trim();
    textEl.setAttribute("title", term.trim());
    chipEl.appendChild(textEl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "wikipedia-search-term-chip__remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove term: " + term.trim());
    removeBtn.setAttribute("title", "Remove term");
    removeBtn.addEventListener("click", function () {
      _handleRemoveTerm(index);
    });
    chipEl.appendChild(removeBtn);

    termsList.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleSaveWeight
   Saves the weight multiplier for the selected record via PUT.
   Sets record status to draft.
----------------------------------------------------------------------------- */
async function _handleSaveWeight() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No record selected. Select a record to edit its weight.",
      );
    }
    return;
  }

  const weightInput = document.getElementById("wikipedia-weight-input");
  if (!weightInput) return;

  const newWeight = parseFloat(weightInput.value);
  if (isNaN(newWeight) || newWeight < 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Invalid weight value. Enter a positive number.");
    }
    return;
  }

  const weightData = JSON.stringify({ multiplier: newWeight });

  try {
    const response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_weight: weightData,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    state.activeRecordWeight = newWeight;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Weight saved for '" +
          state.activeRecordTitle +
          "'. Record set to draft.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Weight save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save Wikipedia weight for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleAddTerm
   Adds a new search term from the input field to the current record.
   Saves via PUT with status set to draft.
----------------------------------------------------------------------------- */
async function _handleAddTerm() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No record selected. Select a record to add search terms.",
      );
    }
    return;
  }

  const termInput = document.getElementById("wikipedia-search-term-input");
  if (!termInput) return;

  const newTerm = termInput.value.trim();
  if (!newTerm) return;

  // Add term if not already present
  if (!state.activeRecordSearchTerms.includes(newTerm)) {
    state.activeRecordSearchTerms.push(newTerm);
  }

  // Save as JSON array
  const termsJson = JSON.stringify(state.activeRecordSearchTerms);

  try {
    const response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_search_term: termsJson,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Clear input
    termInput.value = "";

    // Re-render chips
    _renderSearchTerms();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Search term added to '" +
          state.activeRecordTitle +
          "'. Record set to draft.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Add term failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search terms for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleRemoveTerm
   Removes a search term by index from the current record.
   Saves via PUT with status set to draft.

   Parameters:
     index (number) — index of the term to remove
----------------------------------------------------------------------------- */
async function _handleRemoveTerm(index) {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) return;

  // Remove term at index
  state.activeRecordSearchTerms.splice(index, 1);

  // Save as JSON array
  const termsJson = JSON.stringify(state.activeRecordSearchTerms);

  try {
    const response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_search_term: termsJson,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Re-render chips
    _renderSearchTerms();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Search term removed from '" +
          state.activeRecordTitle +
          "'. Record set to draft.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Remove term failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search terms for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleSaveMetadata
   Saves snippet, slug, and meta from the sidebar inputs via PUT.
   Sets record status to draft.
----------------------------------------------------------------------------- */
async function _handleSaveMetadata() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) return;

  const snippetInput = document.getElementById("wikipedia-snippet-input");
  const slugInput = document.getElementById("wikipedia-slug-input");
  const metaInput = document.getElementById("wikipedia-meta-input");

  const newSnippet = snippetInput
    ? snippetInput.value.trim()
    : state.activeRecordSnippet;
  const newSlug = slugInput ? slugInput.value.trim() : state.activeRecordSlug;
  const newMeta = metaInput ? metaInput.value.trim() : state.activeRecordMeta;

  // Don't save if nothing changed
  if (
    newSnippet === state.activeRecordSnippet &&
    newSlug === state.activeRecordSlug &&
    newMeta === state.activeRecordMeta
  ) {
    return;
  }

  try {
    const payload = { status: "draft" };
    if (newSnippet !== state.activeRecordSnippet) payload.snippet = newSnippet;
    if (newSlug !== state.activeRecordSlug) payload.slug = newSlug;
    if (newMeta !== state.activeRecordMeta) payload.metadata_json = newMeta;

    const response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update state
    state.activeRecordSnippet = newSnippet;
    state.activeRecordSlug = newSlug;
    state.activeRecordMeta = newMeta;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Metadata saved for '" +
          state.activeRecordTitle +
          "'. Record set to draft.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Metadata save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save metadata for '" + state.activeRecordTitle + "'.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleAutoGenSnippet
   Calls POST /api/admin/snippet/generate for the current record.
----------------------------------------------------------------------------- */
async function _handleAutoGenSnippet() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No record selected. Select a record first.");
    }
    return;
  }

  const btn = document.getElementById("btn-wikipedia-auto-snippet");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  try {
    const response = await fetch("/api/admin/snippet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.activeRecordSlug,
        content: state.activeRecordTitle,
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();
    const snippet = data.snippet || "";

    const snippetInput = document.getElementById("wikipedia-snippet-input");
    if (snippetInput) snippetInput.value = snippet;
    state.activeRecordSnippet = snippet;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Snippet auto-generated for '" + state.activeRecordTitle + "'.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Auto-gen snippet failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to auto-generate snippet for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Auto-gen Snippet";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleAutoGenSlug
   Generates a slug from the record title (local operation).
----------------------------------------------------------------------------- */
function _handleAutoGenSlug() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordTitle) return;

  const slug = state.activeRecordTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const slugInput = document.getElementById("wikipedia-slug-input");
  if (slugInput) slugInput.value = slug;
  state.activeRecordSlug = slug;

  if (typeof window.surfaceError === "function") {
    window.surfaceError("Slug auto-generated from title.");
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleAutoGenMeta
   Calls POST /api/admin/metadata/generate for the current record.
----------------------------------------------------------------------------- */
async function _handleAutoGenMeta() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No record selected. Select a record first.");
    }
    return;
  }

  const btn = document.getElementById("btn-wikipedia-auto-meta");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  try {
    const response = await fetch("/api/admin/metadata/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.activeRecordSlug,
        content: state.activeRecordTitle,
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();
    const metaJson = JSON.stringify(data);

    const metaInput = document.getElementById("wikipedia-meta-input");
    if (metaInput) metaInput.value = metaJson;
    state.activeRecordMeta = metaJson;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Metadata auto-generated for '" + state.activeRecordTitle + "'.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Auto-gen meta failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to auto-generate metadata for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Auto-gen Meta";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleRecalculateRecord
   Triggers pipeline_wikipedia.py for only the selected record.
   Calls POST /api/admin/agent/run with action=wikipedia_pipeline and the
   record slug.
----------------------------------------------------------------------------- */
async function _handleRecalculateRecord() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No record selected. Select a record to recalculate.",
      );
    }
    return;
  }

  const btn = document.getElementById("btn-wikipedia-recalculate-record");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Recalculating...";
  }

  try {
    const response = await fetch("/api/admin/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline: "wikipedia_pipeline",
        slug: state.activeRecordSlug,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(function () {
        return {};
      });
      throw new Error(
        errData.error || "API responded with status " + response.status,
      );
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Recalculate triggered for '" +
          state.activeRecordTitle +
          "'. Reloading...",
      );
    }

    // Reload list after a short delay
    setTimeout(async function () {
      if (typeof window.displayWikipediaList === "function") {
        await window.displayWikipediaList();
      }
    }, 3000);
  } catch (err) {
    console.error("[wikipedia_sidebar] Recalculate failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Recalculate failed for '" +
          state.activeRecordTitle +
          "'. Pipeline did not respond.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Recalculate This Record";
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_wikipedia.js and list_display.js
----------------------------------------------------------------------------- */
window.initWikipediaSidebar = initWikipediaSidebar;
window.populateWikipediaSidebar = populateWikipediaSidebar;
