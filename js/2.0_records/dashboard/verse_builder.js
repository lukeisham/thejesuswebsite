// Trigger:  Called by dashboard_records_single.js to render primary and
//           secondary verse builder UIs on the single-record edit form.
// Main:    renderVerseBuilder(containerId, verses) — builds a Bible book/
//           chapter/verse chip UI. collectVerses(containerId) — gathers all
//           chip data into a JSON array of {book, chapter, verse} objects.
// Output:  Populated .verse-builder container with interactive, removable
//           chips. collectVerses returns the collected JSON array.

/* This is the authoritative copy — consumed by (no consumers yet — available for future plans) */

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS: All 66 books of the Protestant Bible canon, in order.
----------------------------------------------------------------------------- */
const BIBLE_BOOKS = [
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

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderVerseBuilder
   Injects the full verse-builder UI into the given container. Pre-populates
   chips when an initial `verses` value is provided.
   Accepts either a JSON string (from the API) or an already-parsed array.
----------------------------------------------------------------------------- */
function renderVerseBuilder(containerId, verses) {
  const container = document.getElementById(containerId);
  if (!container) {
    if (typeof window.surfaceError === "function") {
      const title =
        typeof window._recordTitle !== "undefined"
          ? window._recordTitle
          : containerId;
      window.surfaceError(
        `Error: Unable to parse verse references for '${title}'.`,
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
       HEADING: "Primary Verse" or "Secondary Verse" derived from containerId
    ------------------------------------------------------------------------- */
  const isPrimary = containerId.toLowerCase().includes("primary");
  const headingText = isPrimary ? "Primary Verse" : "Secondary Verse";

  /* -------------------------------------------------------------------------
       BUILD: Book dropdown options
    ------------------------------------------------------------------------- */
  const bookOptions = BIBLE_BOOKS.map(function (book) {
    return `<option value="${_escapeAttr(book)}">${_escapeHtml(book)}</option>`;
  }).join("");

  /* -------------------------------------------------------------------------
       ASSEMBLE: Full verse-builder HTML
    ------------------------------------------------------------------------- */
  container.innerHTML = `
        <div class="verse-builder">
            <h4 class="verse-builder__heading">${_escapeHtml(headingText)}</h4>
            <div class="verse-builder__inputs">
                <label for="${_escapeAttr(containerId)}-book" class="form-field__label" style="display:none;">Book</label>
                <select id="${_escapeAttr(containerId)}-book" class="verse-builder__select" data-verse-book aria-label="Bible book">
                    <option value="">— Book —</option>
                    ${bookOptions}
                </select>
                <label for="${_escapeAttr(containerId)}-chapter" class="form-field__label" style="display:none;">Chapter</label>
                <input
                    id="${_escapeAttr(containerId)}-chapter"
                    type="number"
                    class="verse-builder__input"
                    data-verse-chapter
                    placeholder="Ch."
                    min="1"
                    step="1"
                    aria-label="Chapter"
                />
                <label for="${_escapeAttr(containerId)}-verse" class="form-field__label" style="display:none;">Verse</label>
                <input
                    id="${_escapeAttr(containerId)}-verse"
                    type="number"
                    class="verse-builder__input"
                    data-verse-verse
                    placeholder="V."
                    min="1"
                    step="1"
                    aria-label="Verse"
                />
                <button type="button" class="btn--secondary" data-verse-add>
                    Add Verse Reference
                </button>
            </div>
            <div class="verse-builder__chips" data-verse-chips></div>
        </div>
    `;

  /* -------------------------------------------------------------------------
       EVENT BINDING: Add Verse Reference button
    ------------------------------------------------------------------------- */
  const bookSelect = container.querySelector("[data-verse-book]");
  const chapterInput = container.querySelector("[data-verse-chapter]");
  const verseInput = container.querySelector("[data-verse-verse]");
  const addButton = container.querySelector("[data-verse-add]");
  const chipsContainer = container.querySelector("[data-verse-chips]");

  addButton.addEventListener("click", function () {
    const book = bookSelect.value.trim();
    const chapterRaw = chapterInput.value.trim();
    const verseRaw = verseInput.value.trim();

    if (!book) {
      return;
    }
    if (chapterRaw === "" || isNaN(parseInt(chapterRaw, 10))) {
      return;
    }
    if (verseRaw === "" || isNaN(parseInt(verseRaw, 10))) {
      return;
    }

    const chapter = parseInt(chapterRaw, 10);
    const verse = parseInt(verseRaw, 10);

    if (chapter < 1 || verse < 1) {
      return;
    }

    _addChip(chipsContainer, book, chapter, verse);

    // Reset inputs for next entry
    bookSelect.value = "";
    chapterInput.value = "";
    verseInput.value = "";
    bookSelect.focus();
  });

  /* -------------------------------------------------------------------------
       PRE-POPULATE: If an initial verses value was provided, render chips.
       Accepts either a JSON string (from the API) or an already-parsed array.
    ------------------------------------------------------------------------- */
  var verseArray = verses;
  if (typeof verses === "string" && verses.trim().length > 0) {
    try {
      verseArray = JSON.parse(verses);
    } catch (e) {
      verseArray = null;
    }
  }

  if (verseArray && Array.isArray(verseArray) && verseArray.length > 0) {
    verseArray.forEach(function (v) {
      if (
        v &&
        typeof v.book === "string" &&
        typeof v.chapter === "number" &&
        typeof v.verse === "number"
      ) {
        _addChip(chipsContainer, v.book, v.chapter, v.verse);
      }
    });
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: collectVerses
   Scans all chips inside the given container and returns a JSON array of
   {book, chapter, verse} objects.
----------------------------------------------------------------------------- */
function collectVerses(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    if (typeof window.surfaceError === "function") {
      const title =
        typeof window._recordTitle !== "undefined"
          ? window._recordTitle
          : containerId;
      window.surfaceError(
        `Error: Unable to parse verse references for '${title}'.`,
      );
    }
    return [];
  }

  const chips = container.querySelectorAll("[data-verse-chips] .chip");
  const results = [];

  chips.forEach(function (chip) {
    const book = chip.getAttribute("data-verse-book");
    const chapterRaw = chip.getAttribute("data-verse-chapter");
    const verseRaw = chip.getAttribute("data-verse-verse");

    if (book && chapterRaw !== null && verseRaw !== null) {
      results.push({
        book: book,
        chapter: parseInt(chapterRaw, 10),
        verse: parseInt(verseRaw, 10),
      });
    }
  });

  return results;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Add a single chip to the chips container
----------------------------------------------------------------------------- */
function _addChip(chipsContainer, book, chapter, verse) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.setAttribute("data-verse-book", book);
  chip.setAttribute("data-verse-chapter", String(chapter));
  chip.setAttribute("data-verse-verse", String(verse));

  chip.innerHTML = `
        <span class="chip__label">${_escapeHtml(book)} ${chapter}:${verse}</span>
        <button type="button" class="chip__remove" aria-label="Remove ${_escapeAttr(book)} ${chapter}:${verse}">&times;</button>
    `;

  // Remove chip on × click
  const removeBtn = chip.querySelector(".chip__remove");
  removeBtn.addEventListener("click", function () {
    chip.remove();
  });

  chipsContainer.appendChild(chip);
}

/* -----------------------------------------------------------------------------
   INTERNAL: Safe HTML escaping for display text
----------------------------------------------------------------------------- */
function _escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Safe attribute-value escaping
----------------------------------------------------------------------------- */
function _escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — shared-tool API contract
----------------------------------------------------------------------------- */
window.renderVerseBuilder = renderVerseBuilder;
window.collectVerses = collectVerses;
