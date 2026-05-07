// Trigger:  Consumer dashboard pages call window.renderMetadataWidget(containerId, options)
//           to inject the full slug/snippet/metadata widget DOM into a container.
// Main:    renderMetadataWidget(containerId, options) — injects widget DOM and
//           wires all four buttons (slug, snippet, metadata, generate all).
//           populateMetadataWidget(containerId, data) — fills fields from record.
//           collectMetadataWidget(containerId) — gathers current values for save.
// Output:  Interactive metadata widget with AI-powered auto-generation buttons
//           and a "Generate All" button that fires all three pipelines in parallel.

/* This is the authoritative copy — consumed by plan_dashboard_blog_posts,
   plan_dashboard_essay_historiography, plan_dashboard_challenge,
   plan_dashboard_news_sources, and plan_dashboard_records_single. */

'use strict';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderMetadataWidget
   Injects the full metadata widget DOM into the given container element,
   wires all buttons to their respective API endpoints, and exposes
   populate/collect helpers on the container.

   Parameters:
     containerId (string) — The ID of the container element that will receive
                            the widget DOM. Must be an empty <div>.
     options     (object) — {
         onAutoSaveDraft: (recordData) => Promise — Called after "Generate All"
                           completes successfully. Receives { slug, snippet,
                           metadata_json } so the consumer orchestrator can
                           auto-save the record as draft (unless published).

         // Optional overrides for record-specific context:
         getRecordTitle: () => string — Returns the current record title.
         getRecordId:    () => string — Returns the current record slug/ID.
     }

   Expected globals:
     window.surfaceError() — Shared error display.
----------------------------------------------------------------------------- */
function renderMetadataWidget(containerId, options) {
    if (!containerId) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Merge defaults with consumer-supplied options
    const opts = Object.assign({
        onAutoSaveDraft: null,
        getRecordTitle: function () {
            return (typeof window._recordTitle !== 'undefined')
                ? window._recordTitle
                : '';
        },
        getRecordId: function () {
            return (typeof window._recordSlug !== 'undefined' && window._recordSlug)
                ? window._recordSlug
                : '';
        }
    }, options || {});

    /* -------------------------------------------------------------------------
       1. BUILD WIDGET DOM
    ------------------------------------------------------------------------- */

    // --- Heading ---
    const heading = document.createElement('h4');
    heading.className = 'metadata-widget__heading';
    heading.textContent = 'Metadata';

    // --- Slug Field ---
    const slugField = document.createElement('div');
    slugField.className = 'metadata-widget__field';

    const slugLabel = document.createElement('label');
    slugLabel.className = 'metadata-widget__label';
    slugLabel.setAttribute('for', 'metadata-widget-slug');
    slugLabel.textContent = 'Slug';

    const slugInline = document.createElement('div');
    slugInline.className = 'metadata-widget__inline';

    const slugInput = document.createElement('input');
    slugInput.id = 'metadata-widget-slug';
    slugInput.className = 'metadata-widget__input';
    slugInput.type = 'text';
    slugInput.placeholder = 'auto-generated-or-manual-slug';
    slugInput.setAttribute('aria-label', 'Record slug');

    const slugBtn = document.createElement('button');
    slugBtn.id = 'metadata-widget-btn-slug';
    slugBtn.className = 'metadata-widget__btn';
    slugBtn.type = 'button';
    slugBtn.textContent = 'Auto-gen Slug';

    slugInline.appendChild(slugInput);
    slugInline.appendChild(slugBtn);
    slugField.appendChild(slugLabel);
    slugField.appendChild(slugInline);

    // --- Snippet Field ---
    const snippetField = document.createElement('div');
    snippetField.className = 'metadata-widget__field';

    const snippetLabel = document.createElement('label');
    snippetLabel.className = 'metadata-widget__label';
    snippetLabel.setAttribute('for', 'metadata-widget-snippet');
    snippetLabel.textContent = 'Snippet';

    const snippetInline = document.createElement('div');
    snippetInline.className = 'metadata-widget__inline';

    const snippetTextarea = document.createElement('textarea');
    snippetTextarea.id = 'metadata-widget-snippet';
    snippetTextarea.className = 'metadata-widget__textarea';
    snippetTextarea.rows = 3;
    snippetTextarea.placeholder = '2-3 sentence scholarly summary...';
    snippetTextarea.setAttribute('aria-label', 'Record snippet');

    const snippetBtn = document.createElement('button');
    snippetBtn.id = 'metadata-widget-btn-snippet';
    snippetBtn.className = 'metadata-widget__btn';
    snippetBtn.type = 'button';
    snippetBtn.textContent = 'Auto-gen Snippet';

    snippetInline.appendChild(snippetTextarea);
    snippetInline.appendChild(snippetBtn);
    snippetField.appendChild(snippetLabel);
    snippetField.appendChild(snippetInline);

    // --- Metadata JSON Field ---
    const metaField = document.createElement('div');
    metaField.className = 'metadata-widget__field';

    const metaLabel = document.createElement('label');
    metaLabel.className = 'metadata-widget__label';
    metaLabel.setAttribute('for', 'metadata-widget-json');
    metaLabel.textContent = 'Metadata JSON';

    const metaInline = document.createElement('div');
    metaInline.className = 'metadata-widget__inline';

    const metaTextarea = document.createElement('textarea');
    metaTextarea.id = 'metadata-widget-json';
    metaTextarea.className = 'metadata-widget__textarea metadata-widget__textarea--mono';
    metaTextarea.rows = 4;
    metaTextarea.placeholder = 'Raw JSON blob — auto-managed; editable for advanced use';
    metaTextarea.setAttribute('aria-label', 'Metadata JSON');

    const metaBtn = document.createElement('button');
    metaBtn.id = 'metadata-widget-btn-meta';
    metaBtn.className = 'metadata-widget__btn';
    metaBtn.type = 'button';
    metaBtn.textContent = 'Auto-gen Meta';

    metaInline.appendChild(metaTextarea);
    metaInline.appendChild(metaBtn);
    metaField.appendChild(metaLabel);
    metaField.appendChild(metaInline);

    // --- Read-only Timestamps ---
    const readonlyRow = document.createElement('div');
    readonlyRow.className = 'metadata-widget__readonly-row';

    // Created At
    const createdAtField = document.createElement('div');
    createdAtField.className = 'metadata-widget__field';

    const createdAtLabel = document.createElement('label');
    createdAtLabel.className = 'metadata-widget__label';
    createdAtLabel.setAttribute('for', 'metadata-widget-created-at');
    createdAtLabel.textContent = 'Created At';

    const createdAtInput = document.createElement('input');
    createdAtInput.id = 'metadata-widget-created-at';
    createdAtInput.className = 'metadata-widget__input metadata-widget__input--readonly';
    createdAtInput.type = 'text';
    createdAtInput.readOnly = true;
    createdAtInput.placeholder = 'ISO8601';

    const createdAtHint = document.createElement('span');
    createdAtHint.className = 'metadata-widget__hint';
    createdAtHint.textContent = 'read-only';

    createdAtField.appendChild(createdAtLabel);
    createdAtField.appendChild(createdAtInput);
    createdAtField.appendChild(createdAtHint);

    // Updated At
    const updatedAtField = document.createElement('div');
    updatedAtField.className = 'metadata-widget__field';

    const updatedAtLabel = document.createElement('label');
    updatedAtLabel.className = 'metadata-widget__label';
    updatedAtLabel.setAttribute('for', 'metadata-widget-updated-at');
    updatedAtLabel.textContent = 'Updated At';

    const updatedAtInput = document.createElement('input');
    updatedAtInput.id = 'metadata-widget-updated-at';
    updatedAtInput.className = 'metadata-widget__input metadata-widget__input--readonly';
    updatedAtInput.type = 'text';
    updatedAtInput.readOnly = true;
    updatedAtInput.placeholder = 'ISO8601';

    const updatedAtHint = document.createElement('span');
    updatedAtHint.className = 'metadata-widget__hint';
    updatedAtHint.textContent = 'auto-set on save';

    updatedAtField.appendChild(updatedAtLabel);
    updatedAtField.appendChild(updatedAtInput);
    updatedAtField.appendChild(updatedAtHint);

    readonlyRow.appendChild(createdAtField);
    readonlyRow.appendChild(updatedAtField);

    // --- Status Text ---
    const statusEl = document.createElement('p');
    statusEl.id = 'metadata-widget-status';
    statusEl.className = 'metadata-widget__status';
    statusEl.textContent = '';

    // --- Divider ---
    const divider = document.createElement('hr');
    divider.className = 'metadata-widget__divider';
    divider.setAttribute('aria-hidden', 'true');

    // --- Generate All Button ---
    const generateAllBtn = document.createElement('button');
    generateAllBtn.id = 'metadata-widget-btn-generate-all';
    generateAllBtn.className = 'metadata-widget__generate-all';
    generateAllBtn.type = 'button';
    generateAllBtn.textContent = 'Generate All';

    /* -------------------------------------------------------------------------
       2. ASSEMBLE AND INJECT
    ------------------------------------------------------------------------- */
    container.innerHTML = '';
    container.className = 'metadata-widget';
    container.appendChild(heading);
    container.appendChild(slugField);
    container.appendChild(snippetField);
    container.appendChild(metaField);
    container.appendChild(readonlyRow);
    container.appendChild(statusEl);
    container.appendChild(divider);
    container.appendChild(generateAllBtn);

    /* -------------------------------------------------------------------------
       3. WIRE BUTTONS
    ------------------------------------------------------------------------- */

    // --- Helper: Show status message ---
    function _setStatus(msg) {
        if (statusEl) {
            statusEl.textContent = msg;
        }
    }

    // --- Helper: Disable all buttons ---
    function _setButtonsDisabled(disabled) {
        [slugBtn, snippetBtn, metaBtn, generateAllBtn].forEach(function (btn) {
            if (btn) btn.disabled = disabled;
        });
    }

    // --- Helper: Get the current record title ---
    function _getTitle() {
        return opts.getRecordTitle();
    }

    // --- Helper: Get the current record ID ---
    function _getRecordId() {
        return opts.getRecordId();
    }

    // --- Slug Auto-Gen Button ---
    slugBtn.addEventListener('click', async function () {
        const title = _getTitle();
        if (!title || !title.trim()) {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: No title available for slug generation.'
                );
            }
            return;
        }

        slugBtn.disabled = true;
        slugBtn.textContent = 'Generating…';
        _setStatus('Generating slug…');

        try {
            const response = await fetch('/api/admin/slug/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: _getRecordId(),
                    content: title.trim()
                })
            });

            if (!response.ok) {
                throw new Error('API responded with status ' + response.status);
            }

            const data = await response.json();
            if (data && data.slug) {
                slugInput.value = data.slug;
                _setStatus('Slug generated.');
            }
        } catch (err) {
            console.error('[metadata_widget] Slug generation failed:', err);
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: Slug generation failed. Please try again or enter manually.'
                );
            }
            _setStatus('');
        } finally {
            slugBtn.disabled = false;
            slugBtn.textContent = 'Auto-gen Slug';
        }
    });

    // --- Snippet Auto-Gen Button ---
    snippetBtn.addEventListener('click', async function () {
        // Resolve description content — try multiple sources
        let content = '';

        // Primary: collectDescription if available
        if (typeof window.collectDescription === 'function') {
            try {
                const paragraphs = window.collectDescription();
                if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    content = paragraphs
                        .filter(function (p) { return typeof p === 'string' && p.trim(); })
                        .join('\n\n');
                }
            } catch (_) { /* fall through */ }
        }

        // Fallback: description-editor-container textareas
        if (!content) {
            const descContainer = document.getElementById('description-editor-container');
            if (descContainer) {
                const textareas = descContainer.querySelectorAll('textarea');
                const parts = [];
                textareas.forEach(function (ta) {
                    if (ta.value && ta.value.trim()) {
                        parts.push(ta.value.trim());
                    }
                });
                content = parts.join('\n\n');
            }
        }

        // Fallback: markdown textarea (for blog/essay editors)
        if (!content) {
            const mdTextarea = document.getElementById('markdown-textarea');
            if (mdTextarea && mdTextarea.value && mdTextarea.value.trim()) {
                content = mdTextarea.value.trim();
            }
        }

        // Fallback: title-only generation
        if (!content) {
            const title = _getTitle();
            if (title && title.trim()) {
                content = title.trim();
            }
        }

        if (!content) {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: No content available for snippet generation. Please enter description text first.'
                );
            }
            return;
        }

        snippetBtn.disabled = true;
        snippetBtn.textContent = 'Generating…';
        _setStatus('Generating snippet…');

        try {
            const response = await fetch('/api/admin/snippet/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: _getRecordId(),
                    content: content
                })
            });

            if (!response.ok) {
                throw new Error('API responded with status ' + response.status);
            }

            const data = await response.json();
            if (data && typeof data.snippet === 'string' && data.snippet.trim()) {
                snippetTextarea.value = data.snippet.trim();
                _setStatus('Snippet generated.');
            }
        } catch (err) {
            console.error('[metadata_widget] Snippet generation failed:', err);
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: Snippet generation failed. Please try again or enter manually.'
                );
            }
            _setStatus('');
        } finally {
            snippetBtn.disabled = false;
            snippetBtn.textContent = 'Auto-gen Snippet';
        }
    });

    // --- Metadata Auto-Gen Button ---
    metaBtn.addEventListener('click', async function () {
        // Resolve content — same strategy as snippet
        let content = '';

        if (typeof window.collectDescription === 'function') {
            try {
                const paragraphs = window.collectDescription();
                if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    content = paragraphs
                        .filter(function (p) { return typeof p === 'string' && p.trim(); })
                        .join('\n\n');
                }
            } catch (_) { /* fall through */ }
        }

        if (!content) {
            const descContainer = document.getElementById('description-editor-container');
            if (descContainer) {
                const textareas = descContainer.querySelectorAll('textarea');
                const parts = [];
                textareas.forEach(function (ta) {
                    if (ta.value && ta.value.trim()) {
                        parts.push(ta.value.trim());
                    }
                });
                content = parts.join('\n\n');
            }
        }

        if (!content) {
            const mdTextarea = document.getElementById('markdown-textarea');
            if (mdTextarea && mdTextarea.value && mdTextarea.value.trim()) {
                content = mdTextarea.value.trim();
            }
        }

        if (!content) {
            const title = _getTitle();
            if (title && title.trim()) {
                content = title.trim();
            }
        }

        if (!content) {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: No content available for metadata generation. Please enter description text first.'
                );
            }
            return;
        }

        metaBtn.disabled = true;
        metaBtn.textContent = 'Generating…';
        _setStatus('Generating metadata…');

        try {
            const response = await fetch('/api/admin/metadata/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: _getRecordId(),
                    content: content
                })
            });

            if (!response.ok) {
                throw new Error('API responded with status ' + response.status);
            }

            const data = await response.json();
            if (data) {
                // Format the returned metadata as pretty JSON
                const formatted = (typeof data === 'string')
                    ? data
                    : JSON.stringify(data, null, 2);
                metaTextarea.value = formatted;
                _setStatus('Metadata generated.');
            }
        } catch (err) {
            console.error('[metadata_widget] Metadata generation failed:', err);
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: Metadata generation failed. Please try again or enter manually.'
                );
            }
            _setStatus('');
        } finally {
            metaBtn.disabled = false;
            metaBtn.textContent = 'Auto-gen Meta';
        }
    });

    // --- Generate All Button ---
    generateAllBtn.addEventListener('click', async function () {
        _setButtonsDisabled(true);
        generateAllBtn.textContent = 'Generating All…';
        _setStatus('Generating slug, snippet, and metadata in parallel…');

        const title = _getTitle();
        let content = '';

        // Resolve content
        if (typeof window.collectDescription === 'function') {
            try {
                const paragraphs = window.collectDescription();
                if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    content = paragraphs
                        .filter(function (p) { return typeof p === 'string' && p.trim(); })
                        .join('\n\n');
                }
            } catch (_) { /* fall through */ }
        }
        if (!content) {
            const descContainer = document.getElementById('description-editor-container');
            if (descContainer) {
                const textareas = descContainer.querySelectorAll('textarea');
                const parts = [];
                textareas.forEach(function (ta) {
                    if (ta.value && ta.value.trim()) {
                        parts.push(ta.value.trim());
                    }
                });
                content = parts.join('\n\n');
            }
        }
        if (!content) {
            const mdTextarea = document.getElementById('markdown-textarea');
            if (mdTextarea && mdTextarea.value && mdTextarea.value.trim()) {
                content = mdTextarea.value.trim();
            }
        }
        if (!content && title) {
            content = title.trim();
        }

        const recordId = _getRecordId();

        // Build the three promises
        const promises = [];

        // Slug promise
        if (title && title.trim()) {
            promises.push(
                fetch('/api/admin/slug/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: recordId, content: title.trim() })
                }).then(function (r) {
                    if (!r.ok) throw new Error('Slug API returned ' + r.status);
                    return r.json();
                }).then(function (data) {
                    return { type: 'slug', value: data && data.slug ? data.slug : '' };
                }).catch(function (err) {
                    console.error('[metadata_widget] Parallel slug gen failed:', err);
                    return { type: 'slug', value: null, error: err };
                })
            );
        }

        // Snippet promise
        if (content) {
            promises.push(
                fetch('/api/admin/snippet/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: recordId, content: content })
                }).then(function (r) {
                    if (!r.ok) throw new Error('Snippet API returned ' + r.status);
                    return r.json();
                }).then(function (data) {
                    return { type: 'snippet', value: data && data.snippet ? data.snippet.trim() : '' };
                }).catch(function (err) {
                    console.error('[metadata_widget] Parallel snippet gen failed:', err);
                    return { type: 'snippet', value: null, error: err };
                })
            );
        }

        // Metadata promise
        if (content) {
            promises.push(
                fetch('/api/admin/metadata/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: recordId, content: content })
                }).then(function (r) {
                    if (!r.ok) throw new Error('Metadata API returned ' + r.status);
                    return r.json();
                }).then(function (data) {
                    let formatted = '';
                    if (data) {
                        formatted = (typeof data === 'string')
                            ? data
                            : JSON.stringify(data, null, 2);
                    }
                    return { type: 'metadata', value: formatted };
                }).catch(function (err) {
                    console.error('[metadata_widget] Parallel metadata gen failed:', err);
                    return { type: 'metadata', value: null, error: err };
                })
            );
        }

        // Wait for all to settle
        const results = await Promise.allSettled
            ? await Promise.allSettled(promises)
            : await Promise.all(promises.map(function (p) {
                return p.then(
                    function (v) { return { status: 'fulfilled', value: v }; },
                    function (e) { return { status: 'rejected', reason: e }; }
                );
            }));

        // Apply results to fields
        let slugFilled = false;
        let snippetFilled = false;
        let metaFilled = false;

        results.forEach(function (result) {
            const res = result.value || result;
            if (!res || !res.type) return;

            if (res.type === 'slug' && res.value) {
                slugInput.value = res.value;
                slugFilled = true;
            } else if (res.type === 'snippet' && res.value) {
                snippetTextarea.value = res.value;
                snippetFilled = true;
            } else if (res.type === 'metadata' && res.value) {
                metaTextarea.value = res.value;
                metaFilled = true;
            }
        });

        const filledCount = (slugFilled ? 1 : 0) + (snippetFilled ? 1 : 0) + (metaFilled ? 1 : 0);
        _setStatus('Generated ' + filledCount + ' of 3 fields.');

        // Auto-save as draft if callback provided and record is not published
        if (typeof opts.onAutoSaveDraft === 'function') {
            try {
                const recordData = {
                    slug: slugInput.value,
                    snippet: snippetTextarea.value,
                    metadata_json: metaTextarea.value
                };
                await opts.onAutoSaveDraft(recordData);
            } catch (err) {
                console.error('[metadata_widget] Auto-save draft failed:', err);
            }
        }

        _setButtonsDisabled(false);
        generateAllBtn.textContent = 'Generate All';
    });

    /* -------------------------------------------------------------------------
       4. EXPOSE POPULATE / COLLECT HELPERS ON THE CONTAINER
    ------------------------------------------------------------------------- */

    container._populateWidget = function (data) {
        if (!data) {
            // Clear to placeholder state
            slugInput.value = '';
            snippetTextarea.value = '';
            metaTextarea.value = '';
            createdAtInput.value = '';
            updatedAtInput.value = '';
            return;
        }

        slugInput.value = data.slug || '';
        snippetTextarea.value = data.snippet || '';

        // Format metadata_json for display
        if (data.metadata_json) {
            if (typeof data.metadata_json === 'string') {
                try {
                    metaTextarea.value = JSON.stringify(JSON.parse(data.metadata_json), null, 2);
                } catch (e) {
                    metaTextarea.value = data.metadata_json;
                }
            } else {
                try {
                    metaTextarea.value = JSON.stringify(data.metadata_json, null, 2);
                } catch (e) {
                    metaTextarea.value = String(data.metadata_json);
                }
            }
        } else {
            metaTextarea.value = '';
        }

        createdAtInput.value = data.created_at || '';
        updatedAtInput.value = data.updated_at || '';
    };

    container._collectWidget = function () {
        return {
            slug: slugInput.value,
            snippet: snippetTextarea.value,
            metadata_json: metaTextarea.value
        };
    };
}

/* -----------------------------------------------------------------------------
   PUBLIC: populateMetadataWidget
   Fills every field with an existing record's data, or clears to placeholder
   state when data is null/undefined. Safe to call before renderMetadataWidget
   (it will be a no-op if the container doesn't have the widget yet).
----------------------------------------------------------------------------- */
function populateMetadataWidget(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof container._populateWidget === 'function') {
        container._populateWidget(data);
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC: collectMetadataWidget
   Gathers all current field values into a plain object for the save orchestrator.
   Returns { slug, snippet, metadata_json }. Safe to call before
   renderMetadataWidget (returns empty object).
----------------------------------------------------------------------------- */
function collectMetadataWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return { slug: '', snippet: '', metadata_json: '' };

    if (typeof container._collectWidget === 'function') {
        return container._collectWidget();
    }

    return { slug: '', snippet: '', metadata_json: '' };
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
   All consumer dashboard modules call these three window.* functions.
----------------------------------------------------------------------------- */
window.renderMetadataWidget = renderMetadataWidget;
window.populateMetadataWidget = populateMetadataWidget;
window.collectMetadataWidget = collectMetadataWidget;
