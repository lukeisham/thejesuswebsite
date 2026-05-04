// Trigger:  Called by dashboard_records_single.js to render the description
//           paragraph array editor and snippet editor on the single-record form.
// Main:    renderDescriptionEditor(containerId, paragraphs) — builds a dynamic
//           textarea-per-paragraph UI with add/remove controls.
//           collectDescription(containerId) — gathers all paragraph textareas
//           into a JSON array of paragraph strings.
// Output:  Populated .paragraph-editor container with interactive, removable
//           paragraph rows. collectDescription returns the collected JSON array.

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography, plan_dashboard_challenge_response

'use strict';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderDescriptionEditor
   Renders a dynamic paragraph array editor into the given container element.
   Each paragraph is displayed as a separate textarea row with a remove (×)
   button. An "Add Paragraph" button appends a new empty textarea.

   Parameters:
     containerId (string)          — DOM element ID to inject the editor into
     paragraphs  (array | string)  — Initial paragraph data. If an array, each
                                     element is rendered as a textarea row. If
                                     a JSON string, it is parsed first. If
                                     neither, the editor starts empty.
----------------------------------------------------------------------------- */
function renderDescriptionEditor(containerId, paragraphs) {
    const container = document.getElementById(containerId);
    if (!container) {
        if (typeof window.surfaceError === 'function') {
            const title = (typeof window._recordTitle !== 'undefined') ? window._recordTitle : containerId;
            window.surfaceError(`Error: Unable to parse description data for '${title}'.`);
        }
        return;
    }

    /* -------------------------------------------------------------------------
       PARSE: Resolve paragraphs into a clean array
    ------------------------------------------------------------------------- */
    let paragraphArray = [];

    if (paragraphs !== undefined && paragraphs !== null) {
        if (typeof paragraphs === 'string') {
            try {
                const parsed = JSON.parse(paragraphs);
                paragraphArray = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                if (typeof window.surfaceError === 'function') {
                    const title = (typeof window._recordTitle !== 'undefined') ? window._recordTitle : containerId;
                    window.surfaceError(`Error: Unable to parse description data for '${title}'.`);
                }
                paragraphArray = [];
            }
        } else if (Array.isArray(paragraphs)) {
            paragraphArray = paragraphs.slice();
        }
    }

    /* -------------------------------------------------------------------------
       BUILD: Editor skeleton
    ------------------------------------------------------------------------- */
    container.innerHTML = `
        <div class="paragraph-editor" data-paragraph-editor>
            <div class="paragraph-editor__rows" data-paragraph-rows></div>
            <div class="paragraph-editor__add">
                <button type="button" class="btn btn--secondary paragraph-editor__add-btn" data-paragraph-add>
                    + Add Paragraph
                </button>
            </div>
        </div>
    `;

    /* -------------------------------------------------------------------------
       RENDER: Pre-populate existing paragraphs
    ------------------------------------------------------------------------- */
    const rowsContainer = container.querySelector('[data-paragraph-rows]');

    paragraphArray.forEach(function (text) {
        _addParagraphRow(rowsContainer, text);
    });

    /* -------------------------------------------------------------------------
       EVENT BINDING: Add Paragraph button
    ------------------------------------------------------------------------- */
    const addBtn = container.querySelector('[data-paragraph-add]');
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            _addParagraphRow(rowsContainer, '');
        });
    }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: collectDescription
   Collects all paragraph textareas within the given container and returns a
   JSON array of paragraph strings. Empty paragraphs (whitespace-only or blank)
   are excluded from the result.

   Parameters:
     containerId (string) — DOM element ID containing the paragraph editor

   Returns:
     Array of non-empty paragraph strings
----------------------------------------------------------------------------- */
function collectDescription(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        if (typeof window.surfaceError === 'function') {
            const title = (typeof window._recordTitle !== 'undefined') ? window._recordTitle : containerId;
            window.surfaceError(`Error: Unable to parse description data for '${title}'.`);
        }
        return [];
    }

    const textareas = container.querySelectorAll('.paragraph-editor__textarea');
    const results = [];

    textareas.forEach(function (textarea) {
        const value = textarea.value.trim();
        if (value !== '') {
            results.push(value);
        }
    });

    return results;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _addParagraphRow
   Creates a new paragraph row inside the rows container. Each row consists of
   a textarea and a remove (×) button.

   Parameters:
     rowsContainer (HTMLElement) — the container element for all paragraph rows
     text          (string)      — initial text content for the textarea
----------------------------------------------------------------------------- */
function _addParagraphRow(rowsContainer, text) {
    if (!rowsContainer) { return; }

    const row = document.createElement('div');
    row.className = 'paragraph-editor__row';

    const textarea = document.createElement('textarea');
    textarea.className = 'paragraph-editor__textarea';
    textarea.rows = 3;
    textarea.value = (typeof text === 'string') ? text : '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'paragraph-editor__remove';
    removeBtn.setAttribute('aria-label', 'Remove paragraph');
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function () {
        row.remove();
    });

    row.appendChild(textarea);
    row.appendChild(removeBtn);
    rowsContainer.appendChild(row);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — shared-tool API contract
----------------------------------------------------------------------------- */
window.renderDescriptionEditor = renderDescriptionEditor;
window.collectDescription = collectDescription;
