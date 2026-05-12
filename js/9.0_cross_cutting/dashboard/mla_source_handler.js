// trigger: User opens single record editor → MLA bibliography section renders in dashboard_records_single.html
// main: window.renderEditBibliography(containerId) — creates type-toggled bibliography editor with add/remove entries
// output: window.collectEditBibliography() returns a clean JSON array of citation objects keyed by type (book/article/website)

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography, plan_dashboard_challenge_response

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Internal state
       ------------------------------------------------------------------ */
    let _container = null;
    let _entries = [];

    /* ------------------------------------------------------------------
       Field definitions — which fields appear for each citation type
       ------------------------------------------------------------------ */
    const TYPE_FIELDS = {
        book: [
            { key: 'author',    label: 'Author',    fullWidth: true  },
            { key: 'title',     label: 'Title',     fullWidth: true  },
            { key: 'publisher', label: 'Publisher', fullWidth: false },
            { key: 'year',      label: 'Year',      fullWidth: false },
            { key: 'pages',     label: 'Pages',     fullWidth: true  }
        ],
        article: [
            { key: 'author',  label: 'Author',  fullWidth: true  },
            { key: 'title',   label: 'Title',   fullWidth: true  },
            { key: 'journal', label: 'Journal', fullWidth: false },
            { key: 'volume',  label: 'Volume',  fullWidth: false },
            { key: 'year',    label: 'Year',    fullWidth: false },
            { key: 'pages',   label: 'Pages',   fullWidth: false }
        ],
        website: [
            { key: 'author',        label: 'Author',        fullWidth: true },
            { key: 'title',         label: 'Title',         fullWidth: true },
            { key: 'url',           label: 'URL',           fullWidth: true },
            { key: 'accessed_date', label: 'Accessed Date', fullWidth: true }
        ]
    };

    /* ------------------------------------------------------------------
       Helpers
       ------------------------------------------------------------------ */

    /**
     * Create a blank entry object populated with every field for the given type.
     * @param {'book'|'article'|'website'} type
     * @returns {Object}
     */
    function createEmptyEntry(type) {
        type = type || 'book';
        const entry = { type: type };
        const fields = TYPE_FIELDS[type];
        if (fields) {
            fields.forEach(function (f) {
                entry[f.key] = '';
            });
        }
        return entry;
    }

    /**
     * Minimal HTML-escaping via the browser DOM (safe, no framework needed).
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* ------------------------------------------------------------------
       Rendering
       ------------------------------------------------------------------ */

    /**
     * Render the field row for a single entry based on its current type.
     * @param {Object} entry
     * @param {number} index
     * @returns {string} HTML string
     */
    function renderEntryFields(entry, index) {
        const fields = TYPE_FIELDS[entry.type] || [];
        let html = '<div class="bibliography-editor__fields">';

        fields.forEach(function (f) {
            const fieldClass = f.fullWidth ? 'bibliography-editor__field-full' : '';
            const value = entry[f.key] || '';
            html += '<div class="' + fieldClass + '">';
            html += '<label class="form-field__label">' + escapeHtml(f.label) + '</label>';
            html += '<input class="form-field__input" data-entry="' + index + '" data-field="' + escapeHtml(f.key) + '" type="text" value="' + escapeHtml(value) + '">';
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    /**
     * Full re-render of the bibliography editor inside the container.
     */
    function renderEditor() {
        if (!_container) return;

        let html = '<div class="bibliography-editor">';

        _entries.forEach(function (entry, i) {
            html += '<div class="bibliography-editor__entry" data-entry-index="' + i + '">';

            /* ---- type selector ---- */
            html += '<select class="bibliography-editor__type-select" data-entry="' + i + '" data-action="change-type">';
            html += '<option value="book"'    + (entry.type === 'book'    ? ' selected' : '') + '>Book</option>';
            html += '<option value="article"' + (entry.type === 'article' ? ' selected' : '') + '>Article</option>';
            html += '<option value="website"' + (entry.type === 'website' ? ' selected' : '') + '>Website</option>';
            html += '</select>';

            /* ---- type-toggled fields ---- */
            html += renderEntryFields(entry, i);

            /* ---- remove button ---- */
            html += '<button class="bibliography-editor__remove" data-entry="' + i + '" data-action="remove" type="button">Remove</button>';
            html += '</div>';
        });

        /* ---- add citation button ---- */
        html += '<button class="btn--secondary" id="bibliography-add-btn" type="button">+ Add Citation</button>';
        html += '</div>';

        _container.innerHTML = html;

        wireEvents();
    }

    /* ------------------------------------------------------------------
       Event wiring (delegated per-render)
       ------------------------------------------------------------------ */

    function wireEvents() {
        if (!_container) return;

        /* ---- type-select change → rebuild entry with new type ---- */
        const typeSelects = _container.querySelectorAll('[data-action="change-type"]');
        typeSelects.forEach(function (select) {
            select.addEventListener('change', function () {
                const index = parseInt(this.dataset.entry, 10);
                const newType = this.value;
                // Preserve common fields (author, title) across type switches
                const oldEntry = _entries[index] || createEmptyEntry('book');
                const newEntry = createEmptyEntry(newType);
                newEntry.author = oldEntry.author || '';
                newEntry.title  = oldEntry.title  || '';
                _entries[index] = newEntry;
                renderEditor();
            });
        });

        /* ---- field input → live sync into internal state ---- */
        const fieldInputs = _container.querySelectorAll('[data-field]');
        fieldInputs.forEach(function (input) {
            input.addEventListener('input', function () {
                const index = parseInt(this.dataset.entry, 10);
                const field = this.dataset.field;
                if (_entries[index]) {
                    _entries[index][field] = this.value;
                }
            });
        });

        /* ---- remove button ---- */
        const removeBtns = _container.querySelectorAll('[data-action="remove"]');
        removeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const index = parseInt(this.dataset.entry, 10);
                _entries.splice(index, 1);
                renderEditor();
            });
        });

        /* ---- add citation button ---- */
        const addBtn = _container.querySelector('#bibliography-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                _entries.push(createEmptyEntry('book'));
                renderEditor();
            });
        }
    }

    /* ------------------------------------------------------------------
       Public API — exposed on window
       ------------------------------------------------------------------ */

    /**
     * Render the bibliography editor into the given container element ID.
     * If no entries exist yet, a single blank "Book" entry is seeded.
     *
     * @param {string} containerId — DOM id of the wrapper element
     */
    window.renderEditBibliography = function (containerId) {
        _container = document.getElementById(containerId);

        if (!_container) {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError('Error: Failed to save bibliography changes for \'' + (window._recordTitle || 'unknown') + '\'.');
            }
            return;
        }

        if (_entries.length === 0) {
            _entries.push(createEmptyEntry('book'));
        }

        renderEditor();
    };

    /**
     * Hydrate the editor with an array of bibliography objects.
     * Clears any existing entries before loading.
     *
     * @param {Array<Object>} data — array of citation objects, each with a `type` field
     */
    window.loadEditBibliography = function (data) {
        _entries = [];

        if (Array.isArray(data)) {
            data.forEach(function (item) {
                const type = item.type || 'book';
                if (!TYPE_FIELDS[type]) return;          // skip unknown types
                const entry = createEmptyEntry(type);

                Object.keys(item).forEach(function (key) {
                    if (key !== 'type' && entry.hasOwnProperty(key)) {
                        entry[key] = item[key] || '';
                    }
                });

                entry.type = type;
                _entries.push(entry);
            });
        }

        if (_entries.length === 0) {
            _entries.push(createEmptyEntry('book'));
        }

        if (_container) {
            renderEditor();
        }
    };

    /**
     * Collect all citation entries from the editor, sync any in-flight field
     * edits, strip completely empty entries, and return a clean JSON array.
     *
     * @returns {Array<Object>} Clean array of citation objects
     */
    window.collectEditBibliography = function () {
        // 1. Sync any unsaved DOM field values back into internal state
        if (_container) {
            const fieldInputs = _container.querySelectorAll('[data-field]');
            fieldInputs.forEach(function (input) {
                const index = parseInt(input.dataset.entry, 10);
                const field = input.dataset.field;
                if (_entries[index]) {
                    _entries[index][field] = input.value;
                }
            });
        }

        // 2. Filter out entries where every field is blank
        const result = _entries.filter(function (entry) {
            const fields = TYPE_FIELDS[entry.type] || [];
            return fields.some(function (f) {
                return entry[f.key] && entry[f.key].trim() !== '';
            });
        }).map(function (entry) {
            const cleaned = { type: entry.type };
            const fields = TYPE_FIELDS[entry.type] || [];
            fields.forEach(function (f) {
                cleaned[f.key] = (entry[f.key] || '').trim();
            });
            return cleaned;
        });

        return result;
    };

})();
