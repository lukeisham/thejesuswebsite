// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD MODULE (ORCHESTRATOR)
//   File:    js/2.0_records/dashboard/edit_record.js
//   Version: 2.1.0
//   Purpose: Orchestrator for the single-record editor. Renders the 3-column
//            Providence layout, bootstraps child sub-modules, and wires the
//            Save/Discard/Delete/View Live action buttons.
//            Verse builders and paragraph editors remain inline (Phase 2).
//            Refactored to Providence 3-column grid per guide_dashboard_appearance.md §2.2.
//   Changelog:
//            v2.1.0 — Phase 1 modularisation: extracted edit_core.js,
//                     edit_taxonomy.js, edit_bibliography.js, edit_misc.js.
//                     Orchestrator now delegates render/load/collect to
//                     sub-modules via window.* APIs.
//            v2.0.0 — Moved form fields from col 2 to col 3 per ASCII diagram §2.2.
//                     Moved picture upload from col 1 to col 3 per diagram.
//                     Col 2 is now a section-index sidebar (headings + field-name hints).
//                     Fixed bibliography save bug (line ~857) — removed ancestor scoping.
//            v1.9.0 — Previous version.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditRecord(containerId, recordId, useProvidenceColumns)
// Function: Renders a full-field admin form for creating or editing a single archive record row.
//           When useProvidenceColumns is true, uses _setColumn to populate the three
//           Providence grid columns (canvas-col-actions, canvas-col-list, canvas-col-editor).
//           When false (legacy), injects the full form HTML directly into the container.
//           Delegates Core, Taxonomy, Bibliography, and Misc rendering/loading/collection
//           to sub-modules injected before this script in dashboard.html.
// Output: Providence columns populated, or raw inner HTML injected into container

window.renderEditRecord = function (
  containerId,
  recordId = null,
  useProvidenceColumns = false,
) {
  var container = document.getElementById(containerId);
  if (!container && !useProvidenceColumns) return;

  var headingText = recordId
    ? "EDIT RECORD: " + recordId
    : "CREATE NEW RECORD";

  // ---- Bible books (all 66 canonical) ----
  var bibleBooks = [
    // Old Testament
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    // New Testament
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
  ];

  var bookOptionsHtml = "";
  for (var i = 0; i < bibleBooks.length; i++) {
    bookOptionsHtml +=
      '<option value="' +
      bibleBooks[i] +
      '">' +
      bibleBooks[i] +
      "</option>\n                            ";
  }

  // ---- Helper to generate a verse-builder sub-panel HTML ----
  function verseBuilderHtml(prefix, label, hiddenId) {
    return (
      '                <div class="verse-builder" id="' +
      prefix +
      '-verse-builder">\n' +
      '                    <h4 class="verse-builder-heading">' +
      label +
      "</h4>\n" +
      '                    <div class="verse-input-row">\n' +
      '                        <select id="' +
      prefix +
      '-book-select" class="field-input verse-book-select">\n' +
      '                            <option value="">\u2014 Book \u2014</option>\n' +
      "                            " +
      bookOptionsHtml +
      "                        </select>\n" +
      '                        <input type="number" id="' +
      prefix +
      '-chapter-input" class="field-input verse-chapter-input" placeholder="Ch." min="1">\n' +
      '                        <input type="number" id="' +
      prefix +
      '-verse-input" class="field-input verse-verse-input" placeholder="V." min="1">\n' +
      '                        <button class="quick-action-btn btn-add-verse" id="' +
      prefix +
      '-add-btn" type="button">+ Add Verse</button>\n' +
      "                    </div>\n" +
      '                    <div class="verse-chip-container" id="' +
      prefix +
      '-chip-container"></div>\n' +
      '                    <input type="hidden" id="' +
      hiddenId +
      '" value="[]">\n' +
      "                </div>\n"
    );
  }

  // ---- Helper to generate a paragraph-editor sub-panel HTML ----
  function paragraphEditorHtml(fieldName, label, hiddenId) {
    return (
      '                <div class="paragraph-editor" id="' +
      fieldName +
      '-editor">\n' +
      '                    <h4 class="paragraph-editor-heading">' +
      label +
      "</h4>\n" +
      '                    <div class="paragraph-list" id="' +
      fieldName +
      '-paragraph-list"></div>\n' +
      '                    <button class="quick-action-btn btn-add-paragraph" id="' +
      fieldName +
      '-add-btn" type="button">+ Add Paragraph</button>\n' +
      '                    <input type="hidden" id="' +
      hiddenId +
      '" value="[]">\n' +
      "                </div>\n"
    );
  }

  var primaryVerseHtml = verseBuilderHtml(
    "pv",
    "Primary Verse",
    "record-primary-verse",
  );
  var secondaryVerseHtml = verseBuilderHtml(
    "sv",
    "Secondary Verse",
    "record-secondary-verse",
  );

  var descriptionHtml = paragraphEditorHtml(
    "description",
    "Description",
    "record-description",
  );
  var snippetHtml = paragraphEditorHtml("snippet", "Snippet", "record-snippet");

  // ============================================================================
  // COLUMN 1 — actionsHtml (160px)
  // Buttons + status only. No picture upload here — moved to column 3.
  // ============================================================================
  var actionsHtml =
    '<h3 class="section-heading-serif record-actions-heading">Actions</h3>' +
    '<button class="blog-editor-action-btn" id="btn-save-record">Save Changes</button>' +
    '<button class="blog-editor-action-btn btn-discard-record" id="btn-discard-record">Discard</button>' +
    (recordId
      ? '<button class="blog-editor-action-btn is-danger" id="btn-delete-record">Delete</button>'
      : "") +
    (recordId
      ? '<button class="blog-editor-action-btn" id="btn-view-live-record">View Live</button>'
      : "") +
    '<div id="save-status" class="status-feedback is-hidden"></div>';

  // ============================================================================
  // COLUMN 2 — listHtml (1fr)
  // Lightweight section-index sidebar. Headings + field-name hints only.
  // NO form inputs — all actual fields live in column 3.
  // ============================================================================
  var listHtml =
    '<section id="core-identifiers-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">CORE IDENTIFIERS</p>' +
    '<p class="text-sm text-muted">id &middot; title &middot; slug &middot; created_at &middot; updated_at</p>' +
    "</section>" +
    '<section id="picture-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">PICTURE</p>' +
    '<p class="text-sm text-muted">edit_picture.js</p>' +
    '<p class="text-sm text-muted">picture_name &middot; picture_bytes &middot; picture_thumbnail</p>' +
    "</section>" +
    '<section id="taxonomy-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">TAXONOMY &amp; DIAGRAMS</p>' +
    '<p class="text-sm text-muted">era &middot; timeline &middot; map_label &middot; gospel_category &middot; geo_id &middot; parent_id</p>' +
    "</section>" +
    '<section id="verses-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">VERSES</p>' +
    '<p class="text-sm text-muted">primary_verse &middot; secondary_verse</p>' +
    "</section>" +
    '<section id="text-content-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">TEXT CONTENT</p>' +
    '<p class="text-sm text-muted">description &middot; snippet</p>' +
    "</section>" +
    '<section id="bibliography-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">BIBLIOGRAPHY</p>' +
    '<p class="text-sm text-muted">bibliography (JSON blob)</p>' +
    '<p class="text-sm text-muted">6 MLA sub-keys</p>' +
    "</section>" +
    '<section id="links-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">LINKS</p>' +
    '<p class="text-sm text-muted">edit_links.js</p>' +
    '<p class="text-sm text-muted">context_links</p>' +
    "</section>" +
    '<section id="miscellaneous-sidebar" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">MISCELLANEOUS</p>' +
    '<p class="text-sm text-muted">metadata_json &middot; iaa &middot; pledius &middot; manuscript &middot; url</p>' +
    "</section>";

  // ============================================================================
  // COLUMN 3 — editorHtml (2fr)
  // Refactored v2.1.0: Core, Taxonomy, Bibliography, Misc are now injection
  // slots populated by their respective sub-modules (edit_core.js, etc.).
  // Verses and Text Content sections remain inline (Phase 2).
  // Picture and Links remain separate child modules.
  // ============================================================================
  var editorHtml =
    // 1. Core Identifiers → child module slot
    '<div id="core-identifiers-container" class="child-module-slot record-child-slot"></div>' +
    // 2. Picture (separate child module)
    '<section id="picture-section" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">PICTURE</p>' +
    '<div id="picture-upload-container" class="child-module-slot record-child-slot"></div>' +
    "</section>" +
    // 3. Taxonomy → child module slot
    '<div id="taxonomy-diagrams-container" class="child-module-slot record-child-slot"></div>' +
    // 4. Verses (STAYS INLINE for Phase 2)
    '<section id="verses-section" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">VERSES</p>' +
    primaryVerseHtml +
    secondaryVerseHtml +
    "</section>" +
    // 5. Text Content (STAYS INLINE for Phase 2)
    '<section id="text-content" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">TEXT CONTENT</p>' +
    descriptionHtml +
    snippetHtml +
    "</section>" +
    // 6. Bibliography → child module slot
    '<div id="bibliography-container" class="child-module-slot record-child-slot"></div>' +
    // 7. Links (separate child module)
    '<section id="relations-links" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">LINKS</p>' +
    '<div id="relations-links-container" class="child-module-slot record-child-slot"></div>' +
    "</section>" +
    // 8. Miscellaneous → child module slot
    '<div id="misc-container" class="child-module-slot record-child-slot"></div>' +
    // 9. Sources (separate child module)
    '<section id="sources-section" class="record-section-spacing">' +
    '<p class="blog-editor-list-heading">SOURCES</p>' +
    '<div id="sources-container" class="child-module-slot record-child-slot"></div>' +
    "</section>";

  // ---- Inject content ----
  if (useProvidenceColumns && typeof _setColumn === "function") {
    _setColumn("actions", actionsHtml);
    _setColumn("list", listHtml);
    _setColumn("editor", editorHtml);

    // Render top-level section tab bar (Records active)
    if (typeof window.renderTabBar === "function") {
      window.renderTabBar(
        containerId,
        [
          { name: "records", label: "Records", module: "records-edit" },
          {
            name: "lists-ranks",
            label: "Lists & Ranks",
            module: "lists-resources",
          },
          { name: "text-content", label: "Text Content", module: "text-blog" },
          {
            name: "configuration",
            label: "Configuration",
            module: "config-diagrams",
          },
        ],
        "records",
      );
    }
  } else {
    container.innerHTML =
      '<div class="admin-card" id="edit-record-card">' +
      actionsHtml +
      listHtml +
      editorHtml +
      "</div>";

    // Render top-level section tab bar (Records active)
    if (typeof window.renderTabBar === "function") {
      window.renderTabBar(
        "edit-record-card",
        [
          { name: "records", label: "Records", module: "records-edit" },
          {
            name: "lists-ranks",
            label: "Lists & Ranks",
            module: "lists-resources",
          },
          { name: "text-content", label: "Text Content", module: "text-blog" },
          {
            name: "configuration",
            label: "Configuration",
            module: "config-diagrams",
          },
        ],
        "records",
      );
    }
  }

  // ============================================================================
  // BOOT CHILD SUB-MODULES (v2.1.0)
  // Inject Core, Taxonomy, Bibliography, Misc into their designated slots
  // ============================================================================
  if (typeof window.renderEditCore === "function") {
    window.renderEditCore("core-identifiers-container");
  }
  if (typeof window.renderEditTaxonomy === "function") {
    window.renderEditTaxonomy("taxonomy-diagrams-container");
  }
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("bibliography-container");
  }
  if (typeof window.renderEditMisc === "function") {
    window.renderEditMisc("misc-container");
  }

  // ============================================================================
  // VERSE BUILDER LOGIC (inline — Phase 2)
  // ============================================================================
  function setupVerseBuilder(prefix, hiddenId) {
    var addBtn = document.getElementById(prefix + "-add-btn");
    var hiddenInput = document.getElementById(hiddenId);
    var chipContainer = document.getElementById(prefix + "-chip-container");

    if (!addBtn || !hiddenInput || !chipContainer) return;

    function getChipData() {
      try {
        return JSON.parse(hiddenInput.value);
      } catch (e) {
        return [];
      }
    }

    function setChipData(data) {
      hiddenInput.value = JSON.stringify(data);
      renderChips(data);
    }

    function renderChips(data) {
      if (!Array.isArray(data)) data = [];
      if (data.length === 0) {
        chipContainer.innerHTML =
          '<span class="verse-chip-placeholder">No verses added</span>';
        return;
      }
      var chipsHtml = "";
      for (var i = 0; i < data.length; i++) {
        var v = data[i];
        chipsHtml +=
          '<span class="verse-chip" data-index="' +
          i +
          '">' +
          v.book +
          " " +
          v.chapter +
          ":" +
          v.verse +
          '<button type="button" class="verse-chip-remove" data-index="' +
          i +
          '">&times;</button>' +
          "</span>";
      }
      chipContainer.innerHTML = chipsHtml;

      // Attach remove handlers
      var removeBtns = chipContainer.querySelectorAll(".verse-chip-remove");
      for (var j = 0; j < removeBtns.length; j++) {
        (function (btn) {
          btn.addEventListener("click", function () {
            var idx = parseInt(btn.getAttribute("data-index"), 10);
            var currentData = getChipData();
            currentData.splice(idx, 1);
            setChipData(currentData);
          });
        })(removeBtns[j]);
      }
    }

    // Initial render
    renderChips(getChipData());

    addBtn.addEventListener("click", function () {
      var bookSelect = document.getElementById(prefix + "-book-select");
      var chapterInput = document.getElementById(prefix + "-chapter-input");
      var verseInput = document.getElementById(prefix + "-verse-input");

      var book = bookSelect ? bookSelect.value : "";
      var chapter = chapterInput ? parseInt(chapterInput.value, 10) : NaN;
      var verse = verseInput ? parseInt(verseInput.value, 10) : NaN;

      if (!book || isNaN(chapter) || isNaN(verse) || chapter < 1 || verse < 1) {
        alert(
          "Please select a book and enter valid chapter and verse numbers.",
        );
        return;
      }

      var currentData = getChipData();
      currentData.push({ book: book, chapter: chapter, verse: verse });
      setChipData(currentData);

      // Clear inputs
      if (bookSelect) bookSelect.value = "";
      if (chapterInput) chapterInput.value = "";
      if (verseInput) verseInput.value = "";
      if (chapterInput) chapterInput.focus();
    });

    // Return public API for external data loading
    return { setData: setChipData, getData: getChipData };
  }

  // ============================================================================
  // PARAGRAPH EDITOR LOGIC (inline — Phase 2)
  // ============================================================================
  function setupParagraphEditor(fieldName, hiddenId) {
    var addBtn = document.getElementById(fieldName + "-add-btn");
    var hiddenInput = document.getElementById(hiddenId);
    var paragraphList = document.getElementById(fieldName + "-paragraph-list");

    if (!addBtn || !hiddenInput || !paragraphList) return;

    function getParagraphData() {
      try {
        return JSON.parse(hiddenInput.value);
      } catch (e) {
        return [];
      }
    }

    function setParagraphData(data) {
      hiddenInput.value = JSON.stringify(data);
      renderParagraphs(data);
    }

    function renderParagraphs(data) {
      if (!Array.isArray(data)) data = [];
      if (data.length === 0) {
        paragraphList.innerHTML =
          '<span class="paragraph-placeholder">No paragraphs yet</span>';
        return;
      }
      var rowsHtml = "";
      for (var i = 0; i < data.length; i++) {
        var textValue = typeof data[i] === "string" ? data[i] : "";
        rowsHtml +=
          '<div class="paragraph-row" data-index="' +
          i +
          '">\n' +
          '                        <textarea class="paragraph-textarea" data-index="' +
          i +
          '" placeholder="Paragraph ' +
          (i + 1) +
          '">' +
          escapeHtml(textValue) +
          "</textarea>\n" +
          '                        <button type="button" class="btn-remove-paragraph" data-index="' +
          i +
          '" title="Remove paragraph">&times;</button>\n' +
          "                      </div>";
      }
      paragraphList.innerHTML = rowsHtml;

      // Bind input events to auto-save on edit
      var textareas = paragraphList.querySelectorAll(".paragraph-textarea");
      for (var j = 0; j < textareas.length; j++) {
        (function (ta) {
          ta.addEventListener("input", function () {
            var idx = parseInt(ta.getAttribute("data-index"), 10);
            var currentData = getParagraphData();
            if (idx >= 0 && idx < currentData.length) {
              currentData[idx] = ta.value;
              hiddenInput.value = JSON.stringify(currentData);
            }
          });
        })(textareas[j]);
      }

      // Bind remove handlers
      var removeBtns = paragraphList.querySelectorAll(".btn-remove-paragraph");
      for (var k = 0; k < removeBtns.length; k++) {
        (function (btn) {
          btn.addEventListener("click", function () {
            var idx = parseInt(btn.getAttribute("data-index"), 10);
            var currentData = getParagraphData();
            currentData.splice(idx, 1);
            setParagraphData(currentData);
          });
        })(removeBtns[k]);
      }
    }

    // Simple HTML-escape helper for textarea content
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // Initial render
    renderParagraphs(getParagraphData());

    addBtn.addEventListener("click", function () {
      var currentData = getParagraphData();
      currentData.push("");
      setParagraphData(currentData);
      // Focus the newly added textarea
      var textareas = paragraphList.querySelectorAll(".paragraph-textarea");
      if (textareas.length > 0) {
        textareas[textareas.length - 1].focus();
      }
    });

    // Return public API for external data loading
    return { setData: setParagraphData, getData: getParagraphData };
  }

  // Mount both verse builders (capturing public APIs for data loading)
  var pvBuilder = setupVerseBuilder("pv", "record-primary-verse");
  var svBuilder = setupVerseBuilder("sv", "record-secondary-verse");

  // Mount both paragraph editors (capturing public APIs for data loading)
  var descEditor = setupParagraphEditor("description", "record-description");
  var snipEditor = setupParagraphEditor("snippet", "record-snippet");

  // ============================================================================
  // DATA LOADING (refactored v2.1.0)
  // Sub-module fields are loaded via window.loadEdit* APIs instead of inline
  // setInput/setSelect calls. Verse and text-content loading stays inline.
  // ============================================================================
  if (recordId) {
    fetch("/api/admin/records/" + encodeURIComponent(recordId))
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load record");
        return res.json();
      })
      .then(function (data) {
        // ---- Core Identifiers (delegated to sub-module) ----
        if (typeof window.loadEditCore === "function") {
          window.loadEditCore(data);
        }

        // ---- Taxonomy & Diagrams (delegated to sub-module) ----
        if (typeof window.loadEditTaxonomy === "function") {
          window.loadEditTaxonomy(data);
        }

        // ---- Verses (JSON arrays) — STAYS INLINE ----
        var pv = [];
        try {
          pv = JSON.parse(data.primary_verse || "[]");
        } catch (e) {
          pv = [];
        }
        pvBuilder.setData(pv);

        var sv = [];
        try {
          sv = JSON.parse(data.secondary_verse || "[]");
        } catch (e) {
          sv = [];
        }
        svBuilder.setData(sv);

        // ---- Text Content (JSON paragraph arrays) — STAYS INLINE ----
        var desc = [];
        try {
          desc = JSON.parse(data.description || "[]");
        } catch (e) {
          desc = [];
        }
        descEditor.setData(desc);

        var snip = [];
        try {
          snip = JSON.parse(data.snippet || "[]");
        } catch (e) {
          snip = [];
        }
        snipEditor.setData(snip);

        // ---- Bibliography (delegated to sub-module) ----
        if (typeof window.loadEditBibliography === "function") {
          window.loadEditBibliography(data);
        }

        // ---- Miscellaneous (delegated to sub-module) ----
        if (typeof window.loadEditMisc === "function") {
          window.loadEditMisc(data);
        }

        // ---- Re-render Relations & Links with loaded context_links ----
        if (typeof window.renderEditLinks === "function") {
          window.renderEditLinks(
            "relations-links-container",
            data.context_links || null,
          );
        }
      })
      .catch(function (err) {
        console.error("Error loading record data:", err);
        alert("Failed to load record data. Please try again.");
      });
  }

  // ============================================================================
  // ACTION BAR BUTTON WIRING
  // ============================================================================
  var statusEl = document.getElementById("save-status");

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "status-feedback";
    if (type === "success") {
      statusEl.classList.add("status-success");
    } else if (type === "error") {
      statusEl.classList.add("status-error");
    } else if (type === "loading") {
      statusEl.classList.add("status-loading");
    }
    statusEl.classList.remove("is-hidden");
    statusEl.classList.add("is-visible");
  }

  // ULID generator (Crockford Base32, 26-char)
  function generateUlid() {
    var encoding = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    var time = Date.now();
    var ulid = "";
    // Time component: first 10 chars (48-bit epoch ms)
    for (var ti = 9; ti >= 0; ti--) {
      var mod = time % 32;
      ulid = encoding.charAt(mod) + ulid;
      time = Math.floor(time / 32);
    }
    // Random component: last 16 chars (80 bits)
    for (var ri = 0; ri < 16; ri++) {
      ulid += encoding.charAt(Math.floor(Math.random() * 32));
    }
    return ulid;
  }

  // Discard — hard-reset the form
  document
    .getElementById("btn-discard-record")
    .addEventListener("click", function () {
      window.renderEditRecord(containerId, recordId, useProvidenceColumns);
    });

  // Save Changes — collect, validate, POST/PUT (refactored v2.1.0)
  document
    .getElementById("btn-save-record")
    .addEventListener("click", function () {
      var saveData = {};

      // ---- Core Identifiers (delegated to sub-module) ----
      if (typeof window.collectEditCore === "function") {
        var coreData = window.collectEditCore();
        saveData.title = coreData.title;
        saveData.slug = coreData.slug;
      }

      // ---- Taxonomy (delegated to sub-module) ----
      if (typeof window.collectEditTaxonomy === "function") {
        var taxData = window.collectEditTaxonomy();
        saveData.era = taxData.era;
        saveData.timeline = taxData.timeline;
        saveData.map_label = taxData.map_label;
        saveData.gospel_category = taxData.gospel_category;
        saveData.geo_id = taxData.geo_id;
        saveData.parent_id = taxData.parent_id;
      }

      // ---- Verses (already JSON in hidden inputs) — STAYS INLINE ----
      var pvEl = document.getElementById("record-primary-verse");
      saveData.primary_verse = pvEl ? pvEl.value : "[]";

      var svEl = document.getElementById("record-secondary-verse");
      saveData.secondary_verse = svEl ? svEl.value : "[]";

      // ---- Text Content (already JSON in hidden inputs) — STAYS INLINE ----
      var descEl = document.getElementById("record-description");
      saveData.description = descEl ? descEl.value : "[]";

      var snipEl = document.getElementById("record-snippet");
      saveData.snippet = snipEl ? snipEl.value : "[]";

      // ---- Bibliography (delegated to sub-module) ----
      if (typeof window.collectEditBibliography === "function") {
        var bibData = window.collectEditBibliography();
        saveData.bibliography = bibData.bibliography;
      }

      // ---- Miscellaneous (delegated to sub-module) ----
      if (typeof window.collectEditMisc === "function") {
        var miscData = window.collectEditMisc();
        saveData.metadata_json = miscData.metadata_json;
        saveData.iaa = miscData.iaa;
        saveData.pledius = miscData.pledius;
        saveData.manuscript = miscData.manuscript;
        saveData.url = miscData.url;
      }

      // ---- Relations & Links (context_links hidden field from edit_links.js) ----
      var contextLinksEl = document.getElementById("context-links-hidden");
      saveData.context_links = contextLinksEl ? contextLinksEl.value : "[]";

      // ---- Validate JSON blobs (metadata_json, url, context_links) ----
      var jsonFields = ["metadata_json", "url"];
      for (var ji = 0; ji < jsonFields.length; ji++) {
        var val = saveData[jsonFields[ji]];
        if (val && val.trim() !== "") {
          try {
            JSON.parse(val);
          } catch (e) {
            showStatus(
              "Invalid JSON in " +
                jsonFields[ji] +
                ". Please fix and try again.",
              "error",
            );
            return;
          }
        }
      }

      // Set timestamps and ID
      if (!recordId) {
        saveData.id = generateUlid();
        saveData.created_at = new Date().toISOString();
        saveData.updated_at = saveData.created_at;
      } else {
        saveData.updated_at = new Date().toISOString();
      }

      var method = recordId ? "PUT" : "POST";
      var url = recordId
        ? "/api/admin/records/" + encodeURIComponent(recordId)
        : "/api/admin/records";

      showStatus("Saving...", "loading");

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Save failed with status " + res.status);
          return res.json();
        })
        .then(function () {
          showStatus("Record saved successfully.", "success");
        })
        .catch(function (err) {
          console.error("Save error:", err);
          showStatus("Failed to save record. " + err.message, "error");
        });
    });

  // Delete (only if recordId)
  if (recordId) {
    document
      .getElementById("btn-delete-record")
      .addEventListener("click", function () {
        if (
          !confirm(
            "Are you sure you want to delete this record? This action cannot be undone.",
          )
        )
          return;

        showStatus("Deleting...", "loading");

        fetch("/api/admin/records/" + encodeURIComponent(recordId), {
          method: "DELETE",
        })
          .then(function (res) {
            if (!res.ok)
              throw new Error("Delete failed with status " + res.status);
            // Return to §2.1 records list
            var editLink = document.querySelector(
              '[data-module="records-edit"]',
            );
            if (editLink) {
              editLink.click();
            } else {
              window.location.reload();
            }
          })
          .catch(function (err) {
            console.error("Delete error:", err);
            showStatus("Failed to delete record. " + err.message, "error");
          });
      });
  }

  // View Live (only if recordId)
  if (recordId) {
    document
      .getElementById("btn-view-live-record")
      .addEventListener("click", function () {
        var slugEl = document.getElementById("record-slug");
        var slug = slugEl ? slugEl.value.trim() : "";
        if (!slug) {
          showStatus("Cannot open live view: slug is empty.", "error");
          return;
        }
        var publicUrl = window.location.origin + "/" + slug;
        window.open(publicUrl, "_blank");
      });
  }

  // ---- Child module boot: Links (separate module) ----
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("relations-links-container");
  }

  // ---- Child module boot: Picture (separate module) ----
  if (typeof window.renderEditPicture === "function" && recordId) {
    window.renderEditPicture("picture-upload-container", recordId);
  }
};
