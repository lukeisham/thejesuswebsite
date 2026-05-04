// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderEditLinks(containerId, contextLinksData) — builds the context-links chip editor UI.
// Output:  Interactive {slug, type} chip manager; collectEditLinks() returns the current link array.

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography

/* -----------------------------------------------------------------------------
   INTERNAL STATE — links array tracked in memory for collectEditLinks()
----------------------------------------------------------------------------- */
let _currentLinks = [];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderEditLinks
   Renders the full context links editor into the element identified by
   `containerId`. Accepts an optional `contextLinksData` array to pre-populate
   existing { slug, type } entries as chips.

   Parameters:
     containerId      (string) — DOM element ID to inject the editor into
     contextLinksData (array)  — optional array of { slug, type } objects
----------------------------------------------------------------------------- */
function renderEditLinks(containerId, contextLinksData) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[context_link_handler] Container "#${containerId}" not found.`);
        return;
    }

    // Seed internal state from incoming data
    _currentLinks = Array.isArray(contextLinksData) ? contextLinksData.slice() : [];

    // Build the editor HTML
    container.innerHTML = _buildEditorMarkup();
    container.className = "context-links-editor";

    // Render any pre-existing links as chips
    _currentLinks.forEach(function (link) {
        _addChip(link.slug, link.type);
    });

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
   Returns the static HTML string for the editor skeleton.
----------------------------------------------------------------------------- */
function _buildEditorMarkup() {
    return `
        <div class="context-links-editor__inputs">
            <input
                type="text"
                class="form-field__input js-slug-input"
                placeholder="Enter a slug (e.g. jesus-baptism)"
                aria-label="Context link slug"
            />
            <select class="form-field__select js-type-select" aria-label="Context link type">
                <option value="record">record</option>
                <option value="essay">essay</option>
                <option value="blog">blog</option>
            </select>
            <button type="button" class="btn--secondary js-add-link">Add Link</button>
        </div>
        <span class="form-field__hint">Each link connects this record to another resource by its slug.</span>
        <div class="context-links-editor__chips js-chips-container"></div>
    `;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAddLink
   Reads the slug input and type select values, validates them, and if valid
   adds the link to _currentLinks and renders a chip. Clears the slug input
   on success.
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
    const validTypes = ["record", "essay", "blog"];
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

    // Render the chip
    _addChip(slug, type);

    // Clear input and refocus for rapid entry
    slugInput.value = "";
    slugInput.focus();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _addChip
   Creates a chip element inside the chips container displaying "{slug} → {type}"
   with a × remove button. The chip carries data attributes for slug and type
   so _handleRemoveChip can identify what to delete from _currentLinks.

   Parameters:
     slug (string) — the resource slug
     type (string) — one of "record", "essay", "blog"
----------------------------------------------------------------------------- */
function _addChip(slug, type) {
    const chipsContainer = document.querySelector(".js-chips-container");
    if (!chipsContainer) {
        console.warn("[context_link_handler] Chips container not found.");
        return;
    }

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.setAttribute("data-slug", slug);
    chip.setAttribute("data-type", type);
    chip.innerHTML = `${_escapeHtml(slug)} &rarr; ${_escapeHtml(type)}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "chip__remove";
    removeBtn.setAttribute("aria-label", `Remove link to ${slug}`);
    removeBtn.innerHTML = "&times;";
    removeBtn.addEventListener("click", function () {
        _handleRemoveChip(chip, slug, type);
    });

    chip.appendChild(removeBtn);
    chipsContainer.appendChild(chip);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleRemoveChip
   Removes a chip from the DOM and its corresponding entry from _currentLinks.

   Parameters:
     chipEl (HTMLElement) — the chip DOM element to remove
     slug   (string)      — the slug of the link being removed
     type   (string)      — the type of the link being removed
----------------------------------------------------------------------------- */
function _handleRemoveChip(chipEl, slug, type) {
    // Remove from DOM
    if (chipEl && chipEl.parentNode) {
        chipEl.parentNode.removeChild(chipEl);
    }

    // Remove from internal state
    _currentLinks = _currentLinks.filter(function (link) {
        return !(link.slug === slug && link.type === type);
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _escapeHtml
   Minimal HTML-escaping utility for safe text insertion into chip content.

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
window.CONTEXT_LINK_SAVE_ERROR = "Error: Failed to save context links for '{title}'.";

/* =============================================================================
   GLOBAL EXPOSURE — public API contract consumed by downstream plans
============================================================================= */
window.renderEditLinks = renderEditLinks;
window.collectEditLinks = collectEditLinks;
