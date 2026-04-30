// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD MODULE
//   File:    js/2.0_records/dashboard/edit_record.js
//   Version: 1.9.0
//   Purpose: Form layout for editing a single row in the records table.
//            Includes JSON-array verse builders for primary_verse / secondary_verse,
//            paragraph-array editors for description / snippet,
//            MLA bibliography textareas, and miscellaneous fields.
//            Refactored to Providence 3-column grid per §18.1.
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
    '            <div class="providence-editor-grid">\n' +
    "                <!-- column_one: Action buttons + Picture upload -->\n" +
    '                <div class="providence-editor-col-actions">\n' +
    '                    <h3 class="section-heading-serif record-actions-heading">Actions</h3>\n' +
    '                    <button class="blog-editor-action-btn" id="btn-save-record">Save Changes</button>\n' +
    '                    <button class="blog-editor-action-btn btn-discard-record" id="btn-discard-record">Discard</button>\n' +
    (recordId
      ? '                    <button class="blog-editor-action-btn is-danger" id="btn-delete-record">Delete</button>\n'
      : "") +
    (recordId
      ? '                    <button class="blog-editor-action-btn" id="btn-view-live-record">View Live</button>\n'
      : "") +
    '                    <div id="save-status" class="status-feedback is-hidden"></div>\n' +
    '                    <div id="picture-upload-container" class="child-module-slot record-child-slot"></div>\n' +
    "                </div>\n" +
    "\n" +
    "                <!-- column_two: Core Identifiers + Taxonomy + Verses -->\n" +
    '                <div class="providence-editor-col-list">\n' +
    '                    <section id="core-identifiers">\n' +
    '                        <p class="blog-editor-list-heading">Core Identifiers</p>\n' +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">id</label>\n' +
    '                            <input type="text" id="record-id" class="blog-editor-field-input" value="[auto-generated ULID]" readonly>\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">title</label>\n' +
    '                            <input type="text" id="record-title" class="blog-editor-field-input" placeholder="Record Title">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">slug</label>\n' +
    '                            <input type="text" id="record-slug" class="blog-editor-field-input" placeholder="url-friendly-slug">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">created_at</label>\n' +
    '                            <input type="text" id="record-created-at" class="blog-editor-field-input" value="[auto]" readonly>\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">updated_at</label>\n' +
    '                            <input type="text" id="record-updated-at" class="blog-editor-field-input" value="[auto]" readonly>\n' +
    "                        </div>\n" +
    "                    </section>\n" +
    "\n" +
    '                    <section id="taxonomy-diagrams" class="record-section-spacing">\n' +
    '                        <p class="blog-editor-list-heading">Taxonomy & Diagrams</p>\n' +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">era</label>\n' +
    '                            <select id="record-era" class="blog-editor-field-input">\n' +
    '                                <option value="">\u2014 Select Era \u2014</option>\n' +
    "                                <option>PreIncarnation</option>\n" +
    "                                <option>OldTestament</option>\n" +
    "                                <option>EarlyLife</option>\n" +
    "                                <option>Life</option>\n" +
    "                                <option>GalileeMinistry</option>\n" +
    "                                <option>JudeanMinistry</option>\n" +
    "                                <option>PassionWeek</option>\n" +
    "                                <option>Post-Passion</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">timeline</label>\n' +
    '                            <select id="record-timeline" class="blog-editor-field-input">\n' +
    '                                <option value="">\u2014 Select Timeline \u2014</option>\n' +
    "                                <option>PreIncarnation</option>\n" +
    "                                <option>OldTestament</option>\n" +
    "                                <option>EarlyLifeUnborn</option>\n" +
    "                                <option>EarlyLifeBirth</option>\n" +
    "                                <option>EarlyLifeInfancy</option>\n" +
    "                                <option>EarlyLifeChildhood</option>\n" +
    "                                <option>LifeTradie</option>\n" +
    "                                <option>LifeBaptism</option>\n" +
    "                                <option>LifeTemptation</option>\n" +
    "                                <option>GalileeCallingTwelve</option>\n" +
    "                                <option>GalileeSermonMount</option>\n" +
    "                                <option>GalileeMiraclesSea</option>\n" +
    "                                <option>GalileeTransfiguration</option>\n" +
    "                                <option>JudeanOutsideJudea</option>\n" +
    "                                <option>JudeanMissionSeventy</option>\n" +
    "                                <option>JudeanTeachingTemple</option>\n" +
    "                                <option>JudeanRaisingLazarus</option>\n" +
    "                                <option>JudeanFinalJourney</option>\n" +
    "                                <option>PassionPalmSunday</option>\n" +
    "                                <option>PassionMondayCleansing</option>\n" +
    "                                <option>PassionTuesdayTeaching</option>\n" +
    "                                <option>PassionWednesdaySilent</option>\n" +
    "                                <option>PassionMaundyThursday</option>\n" +
    "                                <option>PassionMaundyLastSupper</option>\n" +
    "                                <option>PassionMaundyGethsemane</option>\n" +
    "                                <option>PassionMaundyBetrayal</option>\n" +
    "                                <option>PassionFridaySanhedrin</option>\n" +
    "                                <option>PassionFridayCivilTrials</option>\n" +
    "                                <option>PassionFridayCrucifixionBegins</option>\n" +
    "                                <option>PassionFridayDarkness</option>\n" +
    "                                <option>PassionFridayDeath</option>\n" +
    "                                <option>PassionFridayBurial</option>\n" +
    "                                <option>PassionSaturdayWatch</option>\n" +
    "                                <option>PassionSundayResurrection</option>\n" +
    "                                <option>PostResurrectionAppearances</option>\n" +
    "                                <option>Ascension</option>\n" +
    "                                <option>OurResponse</option>\n" +
    "                                <option>ReturnOfJesus</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">map_label</label>\n' +
    '                            <select id="record-map-label" class="blog-editor-field-input">\n' +
    '                                <option value="">\u2014 Select Map Label \u2014</option>\n' +
    "                                <option>Overview</option>\n" +
    "                                <option>Empire</option>\n" +
    "                                <option>Levant</option>\n" +
    "                                <option>Judea</option>\n" +
    "                                <option>Galilee</option>\n" +
    "                                <option>Jerusalem</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">gospel_category</label>\n' +
    '                            <select id="record-gospel-category" class="blog-editor-field-input">\n' +
    '                                <option value="">\u2014 Select Category \u2014</option>\n' +
    "                                <option>event</option>\n" +
    "                                <option>location</option>\n" +
    "                                <option>person</option>\n" +
    "                                <option>theme</option>\n" +
    "                                <option>object</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">geo_id</label>\n' +
    '                            <input type="number" id="record-geo-id" class="blog-editor-field-input" placeholder="Geographic node ID">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">parent_id</label>\n' +
    '                            <input type="text" id="record-parent-id" class="blog-editor-field-input" placeholder="Parent record ID (FK)">\n' +
    "                        </div>\n" +
    "                    </section>\n" +
    "\n" +
    '                    <section id="verses-section" class="record-section-spacing">\n' +
    '                        <p class="blog-editor-list-heading">Verses</p>\n' +
    "\n" +
    primaryVerseHtml +
    "\n" +
    secondaryVerseHtml +
    "                    </section>\n" +
    "                </div>\n" +
    "\n" +
    "<!-- column_three: Text Content + Bibliography + Misc + Links + Sources -->\n" +
    '                <div class="providence-editor-col-editor">\n' +
    '                    <section id="text-content">\n' +
    '                        <p class="blog-editor-list-heading">Text Content</p>\n' +
    "\n" +
    descriptionHtml +
    "\n" +
    snippetHtml +
    "                    </section>\n" +
    "\n" +
    '                    <section id="bibliography" class="record-section-spacing">\n' +
    '                        <p class="blog-editor-list-heading">Bibliography (MLA)</p>\n' +
    "\n" +
    '                        <div class="bibliography-grid">\n' +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-book">mla_book:</label>\n' +
    '                                <textarea id="record-mla-book" class="bibliography-textarea" placeholder="Full MLA book citation" data-mla-key="mla_book"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-book-inline">mla_book_inline:</label>\n' +
    '                                <textarea id="record-mla-book-inline" class="bibliography-textarea" placeholder="Short inline MLA book citation" data-mla-key="mla_book_inline"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-article">mla_article:</label>\n' +
    '                                <textarea id="record-mla-article" class="bibliography-textarea" placeholder="Full MLA article citation" data-mla-key="mla_article"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-article-inline">mla_article_inline:</label>\n' +
    '                                <textarea id="record-mla-article-inline" class="bibliography-textarea" placeholder="Short inline MLA article citation" data-mla-key="mla_article_inline"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-website">mla_website:</label>\n' +
    '                                <textarea id="record-mla-website" class="bibliography-textarea" placeholder="Full MLA website citation" data-mla-key="mla_website"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    '                            <div class="bibliography-cell">\n' +
    '                                <label class="field-label" for="record-mla-website-inline">mla_website_inline:</label>\n' +
    '                                <textarea id="record-mla-website-inline" class="bibliography-textarea" placeholder="Short inline MLA website citation" data-mla-key="mla_website_inline"></textarea>\n' +
    "                            </div>\n" +
    "\n" +
    "                        </div>\n" +
    "                    </section>\n" +
    "\n" +
    '                    <section id="misc" class="record-section-spacing">\n' +
    '                        <p class="blog-editor-list-heading">Miscellaneous</p>\n' +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">metadata_json</label>\n' +
    '                            <textarea id="record-metadata-json" class="blog-editor-field-input misc-textarea" placeholder="{ ... JSON blob ... }"></textarea>\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">iaa</label>\n' +
    '                            <input type="text" id="record-iaa" class="blog-editor-field-input" placeholder="Institute for Archaeology & Antiquity">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">pledius</label>\n' +
    '                            <input type="text" id="record-pledius" class="blog-editor-field-input" placeholder="Pleiades ID">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">manuscript</label>\n' +
    '                            <input type="text" id="record-manuscript" class="blog-editor-field-input" placeholder="Manuscript reference">\n' +
    "                        </div>\n" +
    "\n" +
    '                        <div class="blog-editor-field">\n' +
    '                            <label class="blog-editor-field-label">url</label>\n' +
    '                            <textarea id="record-url" class="blog-editor-field-input misc-textarea" placeholder="[ ... JSON blob of URLs ... ]"></textarea>\n' +
    "                        </div>\n" +
    "                    </section>\n" +
    "\n" +
    "            <!-- Child module injection points -->\n" +
    '                    <div id="relations-links-container" class="child-module-slot record-child-slot"></div>\n' +
    "\n" +
    '                    <div id="sources-container" class="child-module-slot record-child-slot"></div>\n' +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    ";

  container.innerHTML = html;

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

    // Return public API for external data loading
    return { setData: setChipData, getData: getChipData };
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

    // Return public API for external data loading
    return { setData: setParagraphData, getData: getParagraphData };
  }

  // Mount both verse builders (capturing public APIs for data loading)
  var pvBuilder = setupVerseBuilder("pv", "record-primary-verse");
  var svBuilder = setupVerseBuilder("sv", "record-secondary-verse");

  // Mount both paragraph editors (capturing public APIs for data loading)
  var descEditor = setupParagraphEditor("description", "record-description");
  var snipEditor = setupParagraphEditor("snippet", "record-snippet");

  // ---- Data Loading ----
  if (recordId) {
    fetch("/api/admin/records/" + encodeURIComponent(recordId))
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load record");
        return res.json();
      })
      .then(function (data) {
        // Helper to set a select element's value
        function setSelect(id, val) {
          var el = document.getElementById(id);
          if (el) el.value = val != null && val !== "" ? val : "";
        }

        // Helper to set a text input / textarea value
        function setInput(id, val) {
          var el = document.getElementById(id);
          if (el) el.value = val != null ? String(val) : "";
        }

        // ---- Core Identifiers ----
        setInput("record-id", data.id || "[auto-generated ULID]");
        setInput("record-title", data.title);
        setInput("record-slug", data.slug);
        setInput("record-created-at", data.created_at || "[auto]");
        setInput("record-updated-at", data.updated_at || "[auto]");

        // ---- Taxonomy & Diagrams ----
        setSelect("record-era", data.era);
        setSelect("record-timeline", data.timeline);
        setSelect("record-map-label", data.map_label);
        setSelect("record-gospel-category", data.gospel_category);
        setInput("record-geo-id", data.geo_id);
        setInput("record-parent-id", data.parent_id);

        // ---- Verses (JSON arrays) ----
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

        // ---- Text Content (JSON paragraph arrays) ----
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

        // ---- Bibliography (MLA JSON blob) ----
        var bib = {};
        try {
          bib = JSON.parse(data.bibliography || "{}");
        } catch (e) {
          bib = {};
        }
        setInput("record-mla-book", bib.mla_book);
        setInput("record-mla-book-inline", bib.mla_book_inline);
        setInput("record-mla-article", bib.mla_article);
        setInput("record-mla-article-inline", bib.mla_article_inline);
        setInput("record-mla-website", bib.mla_website);
        setInput("record-mla-website-inline", bib.mla_website_inline);

        // ---- Miscellaneous ----
        setInput("record-metadata-json", data.metadata_json);
        setInput("record-iaa", data.iaa);
        setInput("record-pledius", data.pledius);
        setInput("record-manuscript", data.manuscript);
        setInput("record-url", data.url);

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

  // ---- Action Bar Button Wiring ----
  // Helper: show inline status message
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
      window.renderEditRecord(containerId, recordId);
    });

  // Save Changes — collect, validate, POST/PUT
  document
    .getElementById("btn-save-record")
    .addEventListener("click", function () {
      var saveData = {};

      // Core Identifiers
      var titleEl = document.getElementById("record-title");
      saveData.title = titleEl ? titleEl.value : "";

      var slugEl = document.getElementById("record-slug");
      saveData.slug = slugEl ? slugEl.value : "";

      // Taxonomy
      var eraEl = document.getElementById("record-era");
      saveData.era = eraEl ? eraEl.value : "";

      var timelineEl = document.getElementById("record-timeline");
      saveData.timeline = timelineEl ? timelineEl.value : "";

      var mapLabelEl = document.getElementById("record-map-label");
      saveData.map_label = mapLabelEl ? mapLabelEl.value : "";

      var gospelCatEl = document.getElementById("record-gospel-category");
      saveData.gospel_category = gospelCatEl ? gospelCatEl.value : "";

      var geoEl = document.getElementById("record-geo-id");
      saveData.geo_id =
        geoEl && geoEl.value !== "" ? parseInt(geoEl.value, 10) : null;

      var parentEl = document.getElementById("record-parent-id");
      saveData.parent_id = parentEl ? parentEl.value : "";

      // Verses (already JSON in hidden inputs)
      var pvEl = document.getElementById("record-primary-verse");
      saveData.primary_verse = pvEl ? pvEl.value : "[]";

      var svEl = document.getElementById("record-secondary-verse");
      saveData.secondary_verse = svEl ? svEl.value : "[]";

      // Text Content (already JSON in hidden inputs)
      var descEl = document.getElementById("record-description");
      saveData.description = descEl ? descEl.value : "[]";

      var snipEl = document.getElementById("record-snippet");
      saveData.snippet = snipEl ? snipEl.value : "[]";

      // Bibliography — build JSON blob from data-mla-key textareas
      var bib = {};
      var bibTextareas = document.querySelectorAll(
        "#edit-record-card [data-mla-key]",
      );
      for (var bi = 0; bi < bibTextareas.length; bi++) {
        var ta = bibTextareas[bi];
        bib[ta.getAttribute("data-mla-key")] = ta.value;
      }
      saveData.bibliography = JSON.stringify(bib);

      // Miscellaneous
      var metaEl = document.getElementById("record-metadata-json");
      saveData.metadata_json = metaEl ? metaEl.value : "";

      var iaaEl = document.getElementById("record-iaa");
      saveData.iaa = iaaEl ? iaaEl.value : "";

      var plediusEl = document.getElementById("record-pledius");
      saveData.pledius = plediusEl ? plediusEl.value : "";

      var manuscriptEl = document.getElementById("record-manuscript");
      saveData.manuscript = manuscriptEl ? manuscriptEl.value : "";

      var urlEl = document.getElementById("record-url");
      saveData.url = urlEl ? urlEl.value : "";

      // Relations & Links (context_links hidden field from edit_links.js)
      var contextLinksEl = document.getElementById("context-links-hidden");
      saveData.context_links = contextLinksEl ? contextLinksEl.value : "[]";

      // Validate JSON blobs (metadata_json, url, context_links)
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

  // Load edit_links module if the script has been parsed
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("relations-links-container");
  }

  // Load edit_picture module if the script has been parsed
  if (typeof window.renderEditPicture === "function" && recordId) {
    window.renderEditPicture("picture-upload-container", recordId);
  }
};
