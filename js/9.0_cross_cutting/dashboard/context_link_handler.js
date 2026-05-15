// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderEditLinks(containerId, contextLinksData) — builds the context-links table editor UI.
// Output:  Interactive {slug, type} table manager; collectEditLinks() returns the current link array.

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography

(function () {
"use strict";

/* -----------------------------------------------------------------------------
   INTERNAL STATE — links array tracked in memory for collectEditLinks()
----------------------------------------------------------------------------- */
let _currentLinks = [];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderEditLinks
   Renders the full context links table editor into the element identified by
   `containerId`. Accepts an optional `contextLinksData` array to pre-populate
   existing { slug, type } entries as table rows.

   Parameters:
     containerId      (string) — DOM element ID to inject the editor into
     contextLinksData (array)  — optional array of { slug, type } objects
----------------------------------------------------------------------------- */
function renderEditLinks(containerId, contextLinksData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      `[context_link_handler] Container "#${containerId}" not found.`,
    );
    return;
  }

  // Seed internal state from incoming data
  _currentLinks = Array.isArray(contextLinksData)
    ? contextLinksData.slice()
    : [];

  // Build the editor HTML
  container.innerHTML = _buildEditorMarkup();
  container.className = "context-links-editor";

  // Wire up the Add Link button
  const addBtn = container.querySelector(".js-add-link");
  if (addBtn) {
    addBtn.addEventListener("click", _handleAddLink);
  }

  // Allow Enter key on the slug input to trigger add
  const slugInput = container.querySelector(".js-slug-input");
  if (slugInput) {
    slugInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        _handleAddLink();
      }
    });
  }

  // Wire existing remove buttons
  _wireRemoveButtons(container);
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectEditLinks
   Returns the current array of { slug, type } objects representing all links
   in the editor. Called by the orchestrator before saving the record.

   Returns:
     Array of { slug: string, type: "record" | "essay" | "blog" }
----------------------------------------------------------------------------- */
function collectEditLinks() {
  // Return a clean copy so callers cannot mutate internal state
  return _currentLinks.map(function (link) {
    return { slug: link.slug, type: link.type };
  });
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _buildEditorMarkup
   Returns the static HTML string for the table editor skeleton.
----------------------------------------------------------------------------- */
function _buildEditorMarkup() {
  var rowsHtml = "";

  if (_currentLinks.length > 0) {
    _currentLinks.forEach(function (link, i) {
      rowsHtml += '<tr class="context-links-editor__row">';
      rowsHtml +=
        '<td class="context-links-editor__td">' +
        _escapeHtml(link.slug) +
        "</td>";
      rowsHtml +=
        '<td class="context-links-editor__td">' +
        _escapeHtml(link.type) +
        "</td>";
      rowsHtml +=
        '<td class="context-links-editor__td context-links-editor__td--remove">';
      rowsHtml +=
        '<button class="context-links-editor__remove-btn" data-index="' +
        i +
        '" data-action="remove-link" type="button" aria-label="Remove link to ' +
        _escapeHtml(link.slug) +
        '">&times;</button>';
      rowsHtml += "</td>";
      rowsHtml += "</tr>";
    });
  } else {
    rowsHtml += '<tr class="context-links-editor__row--empty">';
    rowsHtml += '<td class="context-links-editor__td" colspan="3">';
    rowsHtml +=
      '<span class="context-links-editor__empty-text">No context links added yet.</span>';
    rowsHtml += "</td>";
    rowsHtml += "</tr>";
  }

  return (
    "" +
    '<table class="context-links-editor__table">' +
    '<thead class="context-links-editor__thead">' +
    "<tr>" +
    '<th class="context-links-editor__th">Slug</th>' +
    '<th class="context-links-editor__th">Type</th>' +
    '<th class="context-links-editor__th context-links-editor__th--remove"></th>' +
    "</tr>" +
    "</thead>" +
    '<tbody class="context-links-editor__tbody">' +
    rowsHtml +
    "</tbody>" +
    "</table>" +
    '<div class="context-links-editor__add-row">' +
    '<input type="text" class="form-field__input js-slug-input" name="context-link-slug" placeholder="Enter a slug (e.g. jesus-baptism)" aria-label="Context link slug" />' +
    '<select class="form-field__select js-type-select" name="context-link-type" aria-label="Context link type">' +
    '<option value="record">record</option>' +
    '<option value="essay">essay</option>' +
    '<option value="blog">blog</option>' +
    '<option value="response">response</option>' +
    "</select>" +
    '<button type="button" class="btn--secondary js-add-link">Add Link</button>' +
    "</div>" +
    '<span class="form-field__hint">Each link connects this record to another resource by its slug.</span>'
  );
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAddLink
   Reads the slug input and type select values, validates them, and if valid
   adds the link to _currentLinks and re-renders the table. Clears the slug
   input on success.
----------------------------------------------------------------------------- */
function _handleAddLink() {
  const slugInput = document.querySelector(".js-slug-input");
  const typeSelect = document.querySelector(".js-type-select");

  if (!slugInput || !typeSelect) {
    console.warn("[context_link_handler] Input elements not found in the DOM.");
    return;
  }

  const slug = slugInput.value.trim();
  const type = typeSelect.value;

  // Validate: slug must not be empty
  if (!slug) {
    slugInput.focus();
    return;
  }

  // Validate: type must be one of the allowed values
  const validTypes = ["record", "essay", "blog", "response"];
  if (!validTypes.includes(type)) {
    console.warn(`[context_link_handler] Invalid link type "${type}".`);
    return;
  }

  // Prevent duplicate slugs (same slug + same type)
  const isDuplicate = _currentLinks.some(function (link) {
    return link.slug === slug && link.type === type;
  });
  if (isDuplicate) {
    // Silently ignore — don't add the same link twice
    slugInput.value = "";
    slugInput.focus();
    return;
  }

  // Add to internal state
  _currentLinks.push({ slug: slug, type: type });

  // Re-render the table body
  _refreshTableBody();

  // Clear input and refocus for rapid entry
  slugInput.value = "";
  slugInput.focus();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleRemoveLink
   Removes a link from _currentLinks and re-renders the table body.

   Parameters:
     index (number) — index of the link in _currentLinks to remove
----------------------------------------------------------------------------- */
function _handleRemoveLink(index) {
  _currentLinks.splice(index, 1);
  _refreshTableBody();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _refreshTableBody
   Rebuilds the <tbody> content to reflect the current _currentLinks array.
----------------------------------------------------------------------------- */
function _refreshTableBody() {
  const tbody = document.querySelector(".context-links-editor__tbody");
  if (!tbody) return;

  if (_currentLinks.length > 0) {
    var html = "";
    _currentLinks.forEach(function (link, i) {
      html += '<tr class="context-links-editor__row">';
      html +=
        '<td class="context-links-editor__td">' +
        _escapeHtml(link.slug) +
        "</td>";
      html +=
        '<td class="context-links-editor__td">' +
        _escapeHtml(link.type) +
        "</td>";
      html +=
        '<td class="context-links-editor__td context-links-editor__td--remove">';
      html +=
        '<button class="context-links-editor__remove-btn" data-index="' +
        i +
        '" data-action="remove-link" type="button" aria-label="Remove link to ' +
        _escapeHtml(link.slug) +
        '">&times;</button>';
      html += "</td>";
      html += "</tr>";
    });
    tbody.innerHTML = html;
  } else {
    tbody.innerHTML =
      '<tr class="context-links-editor__row--empty">' +
      '<td class="context-links-editor__td" colspan="3">' +
      '<span class="context-links-editor__empty-text">No context links added yet.</span>' +
      "</td>" +
      "</tr>";
  }

  _wireRemoveButtons(tbody.closest(".context-links-editor"));
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireRemoveButtons
   Attaches click listeners to all remove buttons in the editor.

   Parameters:
     container (HTMLElement) — the editor container element
----------------------------------------------------------------------------- */
function _wireRemoveButtons(container) {
  if (!container) return;

  const removeBtns = container.querySelectorAll('[data-action="remove-link"]');
  removeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const index = parseInt(this.dataset.index, 10);
      _handleRemoveLink(index);
    });
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _escapeHtml
   Minimal HTML-escaping utility for safe text insertion.

   Parameters:
     text (string) — raw text to escape

   Returns:
     Escaped string safe for innerHTML assignment.
----------------------------------------------------------------------------- */
function _escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* =============================================================================
   ERROR SURFACE — error message available for the orchestrator to route
   through window.surfaceError() when a save operation fails.

   Usage from orchestrator:
     window.surfaceError(window.CONTEXT_LINK_SAVE_ERROR.replace("{title}", title));
============================================================================= */

/**
 * Error message surfaced when context link data fails to persist to the server.
 * The orchestrator interpolates the record title before calling surfaceError.
 * @type {string}
 */
window.CONTEXT_LINK_SAVE_ERROR =
  "Error: Failed to save context links for '{title}'.";

/* =============================================================================
   GLOBAL EXPOSURE — public API contract consumed by downstream plans
============================================================================= */
window.renderEditLinks = renderEditLinks;
window.collectEditLinks = collectEditLinks;

})();
