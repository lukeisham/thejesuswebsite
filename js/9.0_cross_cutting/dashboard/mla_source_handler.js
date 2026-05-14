// trigger: User opens single record editor → MLA bibliography section renders in dashboard_records_single.html
// main: window.renderEditBibliography(containerId) — creates three editable tables (Books, Articles, Websites) with add/remove rows
// output: window.collectEditBibliography() returns a clean JSON array of citation objects keyed by type (book/article/website)

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography, plan_dashboard_challenge_response

(function () {
  "use strict";

  /* ------------------------------------------------------------------
       Internal state
       ------------------------------------------------------------------ */
  let _container = null;
  let _entries = [];

  /* ------------------------------------------------------------------
       Field definitions — columns for each citation type table
       ------------------------------------------------------------------ */
  const TYPE_FIELDS = {
    book: [
      { key: "author", label: "Author", width: "2fr" },
      { key: "title", label: "Title", width: "2fr" },
      { key: "publisher", label: "Publisher", width: "1fr" },
      { key: "year", label: "Year", width: "0.7fr" },
      { key: "pages", label: "Pages", width: "1fr" },
    ],
    article: [
      { key: "author", label: "Author", width: "2fr" },
      { key: "title", label: "Title", width: "2fr" },
      { key: "journal", label: "Journal", width: "1fr" },
      { key: "volume", label: "Volume", width: "0.7fr" },
      { key: "year", label: "Year", width: "0.7fr" },
      { key: "pages", label: "Pages", width: "1fr" },
    ],
    website: [
      { key: "author", label: "Author", width: "1.5fr" },
      { key: "title", label: "Title", width: "2fr" },
      { key: "url", label: "URL", width: "2.5fr" },
      { key: "accessed_date", label: "Accessed Date", width: "1fr" },
    ],
  };

  /* ------------------------------------------------------------------
       Table section metadata — display order and headings
       ------------------------------------------------------------------ */
  const TABLE_SECTIONS = [
    { type: "book", heading: "Books" },
    { type: "article", heading: "Articles" },
    { type: "website", heading: "Websites" },
  ];

  /* ------------------------------------------------------------------
       Helpers
       ------------------------------------------------------------------ */

  /**
   * Create a blank entry object populated with every field for the given type.
   * @param {'book'|'article'|'website'} type
   * @returns {Object}
   */
  function createEmptyEntry(type) {
    type = type || "book";
    const entry = { type: type };
    const fields = TYPE_FIELDS[type];
    if (fields) {
      fields.forEach(function (f) {
        entry[f.key] = "";
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
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ------------------------------------------------------------------
       Rendering
       ------------------------------------------------------------------ */

  /**
   * Build the HTML for a single table section (Books / Articles / Websites).
   * @param {string} type — 'book' | 'article' | 'website'
   * @param {string} heading — human-readable section heading
   * @param {Array} entriesOfType — subset of _entries matching this type
   * @returns {string} HTML string for the table block
   */
  function renderTableSection(type, heading, entriesOfType) {
    const fields = TYPE_FIELDS[type];
    const colCount = fields.length + 1; // +1 for Remove column

    let html = '<div class="bibliography-editor__section">';
    html +=
      '<h3 class="bibliography-editor__subheading">' +
      escapeHtml(heading) +
      "</h3>";
    html +=
      '<table class="bibliography-editor__table" data-table-type="' +
      escapeHtml(type) +
      '">';

    // --- thead ---
    html += '<thead class="bibliography-editor__thead"><tr>';
    fields.forEach(function (f) {
      html +=
        '<th class="bibliography-editor__th" style="width:' +
        f.width +
        '">' +
        escapeHtml(f.label) +
        "</th>";
    });
    html +=
      '<th class="bibliography-editor__th bibliography-editor__th--remove"></th>';
    html += "</tr></thead>";

    // --- tbody ---
    html += '<tbody class="bibliography-editor__tbody">';

    entriesOfType.forEach(function (entry) {
      const globalIndex = _entries.indexOf(entry);
      html +=
        '<tr class="bibliography-editor__row" data-entry-index="' +
        globalIndex +
        '">';
      fields.forEach(function (f) {
        const value = entry[f.key] || "";
        html += '<td class="bibliography-editor__td">';
        html +=
          '<input class="form-field__input bibliography-editor__input" name="bibliography-' +
          escapeHtml(type) +
          "-" +
          escapeHtml(f.key) +
          "-" +
          globalIndex +
          '" data-entry="' +
          globalIndex +
          '" data-field="' +
          escapeHtml(f.key) +
          '" type="text" value="' +
          escapeHtml(value) +
          '">';
        html += "</td>";
      });
      html +=
        '<td class="bibliography-editor__td bibliography-editor__td--remove">';
      html +=
        '<button class="bibliography-editor__remove-btn" data-entry="' +
        globalIndex +
        '" data-action="remove" data-type="' +
        escapeHtml(type) +
        '" type="button" aria-label="Remove ' +
        escapeHtml(heading.toLowerCase()) +
        ' entry">×</button>';
      html += "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";

    // --- add-row ---
    html += '<div class="bibliography-editor__add-row">';
    html +=
      '<button class="btn--secondary bibliography-editor__add-btn" data-action="add" data-type="' +
      escapeHtml(type) +
      '" type="button">+ Add ' +
      escapeHtml(heading.slice(0, -1)) +
      "</button>";
    html += "</div>";

    html += "</div>";
    return html;
  }

  /**
   * Full re-render of the bibliography editor inside the container.
   * Renders three separate table sections: Books, Articles, Websites.
   */
  function renderEditor() {
    if (!_container) return;

    let html = '<div class="bibliography-editor">';

    TABLE_SECTIONS.forEach(function (section) {
      const entriesOfType = _entries.filter(function (e) {
        return e.type === section.type;
      });
      html += renderTableSection(section.type, section.heading, entriesOfType);
    });

    html += "</div>";

    _container.innerHTML = html;

    wireEvents();
  }

  /* ------------------------------------------------------------------
       Event wiring (delegated per-render)
       ------------------------------------------------------------------ */

  function wireEvents() {
    if (!_container) return;

    /* ---- field input → live sync into internal state ---- */
    const fieldInputs = _container.querySelectorAll("[data-field]");
    fieldInputs.forEach(function (input) {
      input.addEventListener("input", function () {
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
      btn.addEventListener("click", function () {
        const index = parseInt(this.dataset.entry, 10);
        _entries.splice(index, 1);
        renderEditor();
      });
    });

    /* ---- add button (per table section) ---- */
    const addBtns = _container.querySelectorAll('[data-action="add"]');
    addBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const type = this.dataset.type;
        _entries.push(createEmptyEntry(type));
        renderEditor();
      });
    });
  }

  /* ------------------------------------------------------------------
       Public API — exposed on window
       ------------------------------------------------------------------ */

  /**
   * Render the bibliography editor into the given container element ID.
   * If no entries exist yet, one blank entry per type (book/article/website) is seeded.
   *
   * @param {string} containerId — DOM id of the wrapper element
   */
  window.renderEditBibliography = function (containerId) {
    _container = document.getElementById(containerId);

    if (!_container) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Failed to save bibliography changes for '" +
            (window._recordTitle || "unknown") +
            "'.",
        );
      }
      return;
    }

    if (_entries.length === 0) {
      TABLE_SECTIONS.forEach(function (section) {
        _entries.push(createEmptyEntry(section.type));
      });
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
        const type = item.type || "book";
        if (!TYPE_FIELDS[type]) return; // skip unknown types
        const entry = createEmptyEntry(type);

        Object.keys(item).forEach(function (key) {
          if (key !== "type" && entry.hasOwnProperty(key)) {
            entry[key] = item[key] || "";
          }
        });

        entry.type = type;
        _entries.push(entry);
      });
    }

    if (_entries.length === 0) {
      TABLE_SECTIONS.forEach(function (section) {
        _entries.push(createEmptyEntry(section.type));
      });
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
      const fieldInputs = _container.querySelectorAll("[data-field]");
      fieldInputs.forEach(function (input) {
        const index = parseInt(input.dataset.entry, 10);
        const field = input.dataset.field;
        if (_entries[index]) {
          _entries[index][field] = input.value;
        }
      });
    }

    // 2. Filter out entries where every field is blank
    const result = _entries
      .filter(function (entry) {
        const fields = TYPE_FIELDS[entry.type] || [];
        return fields.some(function (f) {
          return entry[f.key] && entry[f.key].trim() !== "";
        });
      })
      .map(function (entry) {
        const cleaned = { type: entry.type };
        const fields = TYPE_FIELDS[entry.type] || [];
        fields.forEach(function (f) {
          cleaned[f.key] = (entry[f.key] || "").trim();
        });
        return cleaned;
      });

    return result;
  };
})();
