// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD MODULE
//   File:    admin/frontend/edit_modules/edit_record.js
//   Version: 1.4.0
//   Purpose: Form layout for editing a single row in the records table.
//            Includes JSON-array verse builders for primary_verse / secondary_verse,
//            paragraph-array editors for description / snippet,
//            and MLA bibliography textareas.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditRecord(containerId, recordId)
// Function: Renders a full-field admin form for creating or editing a single archive record row
// Output: Injects the edit-record form HTML into the specified container element

window.renderEditRecord = function (containerId, recordId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const headingText = recordId
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

  var html =
    '        <div class="admin-card" id="edit-record-card">\n' +
    "\n" +
    "            <!-- Action Bar Header -->\n" +
    '            <div class="action-bar-header">\n' +
    '                <h2 id="edit-record-heading">' +
    headingText +
    "</h2>\n" +
    '                <div class="action-bar-buttons">\n' +
    '                    <button class="quick-action-btn btn-discard-record" id="btn-discard-record">Discard</button>\n' +
    '                    <button class="quick-action-btn btn-save-record" id="btn-save-record">Save Changes</button>\n' +
    (recordId
      ? '                    <button class="quick-action-btn btn-delete-record" id="btn-delete-record">Delete</button>\n'
      : "") +
    (recordId
      ? '                    <button class="quick-action-btn btn-view-live-record" id="btn-view-live-record">View Live</button>\n'
      : "") +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- Core Identifiers Section -->\n" +
    '            <section class="core-identifiers-section" id="core-identifiers">\n' +
    '                <h3 class="section-heading-serif">Core Identifiers</h3>\n' +
    "\n" +
    '                <div class="field-row">\n' +
    '                    <label class="field-label" for="record-id">id:</label>\n' +
    '                    <input type="text" id="record-id" class="field-input field-input-readonly" value="[auto-generated ULID]" readonly>\n' +
    "                </div>\n" +
    "\n" +
    '                <div class="field-row">\n' +
    '                    <label class="field-label" for="record-title">title:</label>\n' +
    '                    <input type="text" id="record-title" class="field-input" placeholder="Record Title">\n' +
    "                </div>\n" +
    "\n" +
    '                <div class="field-row">\n' +
    '                    <label class="field-label" for="record-slug">slug:</label>\n' +
    '                    <input type="text" id="record-slug" class="field-input" placeholder="url-friendly-slug">\n' +
    "                </div>\n" +
    "\n" +
    '                <div class="field-row-double">\n' +
    '                    <div class="field-row-inner">\n' +
    '                        <label class="field-label" for="record-created-at">created_at:</label>\n' +
    '                        <input type="text" id="record-created-at" class="field-input field-input-readonly field-input-auto" value="[auto]" readonly>\n' +
    "                    </div>\n" +
    '                    <div class="field-row-inner">\n' +
    '                        <label class="field-label" for="record-updated-at">updated_at:</label>\n' +
    '                        <input type="text" id="record-updated-at" class="field-input field-input-readonly field-input-auto" value="[auto]" readonly>\n' +
    "                    </div>\n" +
    "                </div>\n" +
    "            </section>\n" +
    "\n" +
    "            <!-- Taxonomy & Diagrams Section -->\n" +
    '            <section class="taxonomy-section" id="taxonomy-diagrams">\n' +
    '                <h3 class="section-heading-serif">Taxonomy & Diagrams</h3>\n' +
    "\n" +
    '                <div class="taxonomy-grid">\n' +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-era">era:</label>\n' +
    '                        <select id="record-era" class="field-input">\n' +
    '                            <option value="">\u2014 Select Era \u2014</option>\n' +
    "                            <option>PreIncarnation</option>\n" +
    "                            <option>OldTestament</option>\n" +
    "                            <option>EarlyLife</option>\n" +
    "                            <option>Life</option>\n" +
    "                            <option>GalileeMinistry</option>\n" +
    "                            <option>JudeanMinistry</option>\n" +
    "                            <option>PassionWeek</option>\n" +
    "                            <option>Post-Passion</option>\n" +
    "                        </select>\n" +
    "                    </div>\n" +
    "\n" +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-timeline">timeline:</label>\n' +
    '                        <select id="record-timeline" class="field-input">\n' +
    '                            <option value="">\u2014 Select Timeline \u2014</option>\n' +
    "                            <option>PreIncarnation</option>\n" +
    "                            <option>OldTestament</option>\n" +
    "                            <option>EarlyLifeUnborn</option>\n" +
    "                            <option>EarlyLifeBirth</option>\n" +
    "                            <option>EarlyLifeInfancy</option>\n" +
    "                            <option>EarlyLifeChildhood</option>\n" +
    "                            <option>LifeTradie</option>\n" +
    "                            <option>LifeBaptism</option>\n" +
    "                            <option>LifeTemptation</option>\n" +
    "                            <option>GalileeCallingTwelve</option>\n" +
    "                            <option>GalileeSermonMount</option>\n" +
    "                            <option>GalileeMiraclesSea</option>\n" +
    "                            <option>GalileeTransfiguration</option>\n" +
    "                            <option>JudeanOutsideJudea</option>\n" +
    "                            <option>JudeanMissionSeventy</option>\n" +
    "                            <option>JudeanTeachingTemple</option>\n" +
    "                            <option>JudeanRaisingLazarus</option>\n" +
    "                            <option>JudeanFinalJourney</option>\n" +
    "                            <option>PassionPalmSunday</option>\n" +
    "                            <option>PassionMondayCleansing</option>\n" +
    "                            <option>PassionTuesdayTeaching</option>\n" +
    "                            <option>PassionWednesdaySilent</option>\n" +
    "                            <option>PassionMaundyThursday</option>\n" +
    "                            <option>PassionMaundyLastSupper</option>\n" +
    "                            <option>PassionMaundyGethsemane</option>\n" +
    "                            <option>PassionMaundyBetrayal</option>\n" +
    "                            <option>PassionFridaySanhedrin</option>\n" +
    "                            <option>PassionFridayCivilTrials</option>\n" +
    "                            <option>PassionFridayCrucifixionBegins</option>\n" +
    "                            <option>PassionFridayDarkness</option>\n" +
    "                            <option>PassionFridayDeath</option>\n" +
    "                            <option>PassionFridayBurial</option>\n" +
    "                            <option>PassionSaturdayWatch</option>\n" +
    "                            <option>PassionSundayResurrection</option>\n" +
    "                            <option>PostResurrectionAppearances</option>\n" +
    "                            <option>Ascension</option>\n" +
    "                            <option>OurResponse</option>\n" +
    "                            <option>ReturnOfJesus</option>\n" +
    "                        </select>\n" +
    "                    </div>\n" +
    "\n" +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-map-label">map_label:</label>\n' +
    '                        <select id="record-map-label" class="field-input">\n' +
    '                            <option value="">\u2014 Select Map Label \u2014</option>\n' +
    "                            <option>Overview</option>\n" +
    "                            <option>Empire</option>\n" +
    "                            <option>Levant</option>\n" +
    "                            <option>Judea</option>\n" +
    "                            <option>Galilee</option>\n" +
    "                            <option>Jerusalem</option>\n" +
    "                        </select>\n" +
    "                    </div>\n" +
    "\n" +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-gospel-category">gospel_category:</label>\n' +
    '                        <select id="record-gospel-category" class="field-input">\n' +
    '                            <option value="">\u2014 Select Category \u2014</option>\n' +
    "                            <option>event</option>\n" +
    "                            <option>location</option>\n" +
    "                            <option>person</option>\n" +
    "                            <option>theme</option>\n" +
    "                            <option>object</option>\n" +
    "                        </select>\n" +
    "                    </div>\n" +
    "\n" +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-geo-id">geo_id:</label>\n' +
    '                        <input type="number" id="record-geo-id" class="field-input" placeholder="Geographic node ID">\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="field-row">\n' +
    '                        <label class="field-label" for="record-parent-id">parent_id:</label>\n' +
    '                        <input type="text" id="record-parent-id" class="field-input" placeholder="Parent record ID (FK)">\n' +
    "                    </div>\n" +
    "                </div>\n" +
    "            </section>\n" +
    "\n" +
    "            <!-- Verses Section -->\n" +
    '            <section class="verses-section" id="verses-section">\n' +
    '                <h3 class="section-heading-serif">Verses</h3>\n' +
    "\n" +
    primaryVerseHtml +
    "\n" +
    secondaryVerseHtml +
    "            </section>\n" +
    "\n" +
    "            <!-- Text Content Section -->\n" +
    '            <section class="text-content-section" id="text-content">\n' +
    '                <h3 class="section-heading-serif">Text Content</h3>\n' +
    "\n" +
    descriptionHtml +
    "\n" +
    snippetHtml +
    "            </section>\n" +
    "\n" +
    "            <!-- Bibliography Section -->\n" +
    '            <section class="bibliography-section" id="bibliography">\n' +
    '                <h3 class="section-heading-serif">Bibliography (MLA)</h3>\n' +
    "\n" +
    '                <div class="bibliography-grid">\n' +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-book">mla_book:</label>\n' +
    '                        <textarea id="record-mla-book" class="bibliography-textarea" placeholder="Full MLA book citation" data-mla-key="mla_book"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-book-inline">mla_book_inline:</label>\n' +
    '                        <textarea id="record-mla-book-inline" class="bibliography-textarea" placeholder="Short inline MLA book citation" data-mla-key="mla_book_inline"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-article">mla_article:</label>\n' +
    '                        <textarea id="record-mla-article" class="bibliography-textarea" placeholder="Full MLA article citation" data-mla-key="mla_article"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-article-inline">mla_article_inline:</label>\n' +
    '                        <textarea id="record-mla-article-inline" class="bibliography-textarea" placeholder="Short inline MLA article citation" data-mla-key="mla_article_inline"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-website">mla_website:</label>\n' +
    '                        <textarea id="record-mla-website" class="bibliography-textarea" placeholder="Full MLA website citation" data-mla-key="mla_website"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    '                    <div class="bibliography-cell">\n' +
    '                        <label class="field-label" for="record-mla-website-inline">mla_website_inline:</label>\n' +
    '                        <textarea id="record-mla-website-inline" class="bibliography-textarea" placeholder="Short inline MLA website citation" data-mla-key="mla_website_inline"></textarea>\n' +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </section>\n" +
    "\n" +
    "            <!-- Child module injection points -->\n" +
    '            <div id="picture-upload-container" class="child-module-slot"></div>\n' +
    "\n" +
    '            <div id="relations-links-container" class="child-module-slot"></div>\n' +
    "\n" +
    '            <div id="sources-container" class="child-module-slot"></div>\n' +
    "\n" +
    "        </div>\n" +
    "    ";

  container.innerHTML = html;

  // ---- Verse Builder Logic ----
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
  }

  // ---- Paragraph Editor Logic ----
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
  }

  // Mount both verse builders
  setupVerseBuilder("pv", "record-primary-verse");
  setupVerseBuilder("sv", "record-secondary-verse");

  // Mount both paragraph editors
  setupParagraphEditor("description", "record-description");
  setupParagraphEditor("snippet", "record-snippet");

  // Load edit_links module if the script has been parsed
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("relations-links-container");
  }

  // Load edit_picture module if the script has been parsed
  if (typeof window.renderEditPicture === "function" && recordId) {
    window.renderEditPicture("picture-upload-container", recordId);
  }
};
