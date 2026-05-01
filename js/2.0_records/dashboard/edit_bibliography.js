// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: BIBLIOGRAPHY
//   File:    js/2.0_records/dashboard/edit_bibliography.js
//   Version: 1.0.0
//   Purpose: MLA bibliography fields (6 textareas with mla_book, mla_article,
//            mla_website plus inline variants) for the single-record editor.
//            Extracted from edit_record.js per plan.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditBibliography(containerId)
// Function: Renders and manages the Bibliography (MLA) form section.
// Output: Injects bibliography textareas into container; exposes load/collect APIs

window.renderEditBibliography = function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<section id="bibliography" class="record-section-spacing">\n' +
    '<p>BIBLIOGRAPHY (MLA)</p>\n' +
    '<div class="bibliography-grid">\n' +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-book">mla_book:</label>\n' +
    '<textarea id="record-mla-book" class="bibliography-textarea" placeholder="Full MLA book citation" data-mla-key="mla_book"></textarea>\n' +
    "</div>\n" +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-book-inline">mla_book_inline:</label>\n' +
    '<textarea id="record-mla-book-inline" class="bibliography-textarea" placeholder="Short inline MLA book citation" data-mla-key="mla_book_inline"></textarea>\n' +
    "</div>\n" +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-article">mla_article:</label>\n' +
    '<textarea id="record-mla-article" class="bibliography-textarea" placeholder="Full MLA article citation" data-mla-key="mla_article"></textarea>\n' +
    "</div>\n" +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-article-inline">mla_article_inline:</label>\n' +
    '<textarea id="record-mla-article-inline" class="bibliography-textarea" placeholder="Short inline MLA article citation" data-mla-key="mla_article_inline"></textarea>\n' +
    "</div>\n" +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-website">mla_website:</label>\n' +
    '<textarea id="record-mla-website" class="bibliography-textarea" placeholder="Full MLA website citation" data-mla-key="mla_website"></textarea>\n' +
    "</div>\n" +
    '<div class="bibliography-cell">\n' +
    '<label class="field-label" for="record-mla-website-inline">mla_website_inline:</label>\n' +
    '<textarea id="record-mla-website-inline" class="bibliography-textarea" placeholder="Short inline MLA website citation" data-mla-key="mla_website_inline"></textarea>\n' +
    "</div>\n" +
    "</div>\n" +
    "</section>";
};

window.loadEditBibliography = function (data) {
  var bib = {};
  if (data && data.bibliography) {
    try {
      bib = JSON.parse(data.bibliography);
    } catch (e) {
      bib = {};
    }
  }

  var elBook = document.getElementById("record-mla-book");
  var elBookInline = document.getElementById("record-mla-book-inline");
  var elArticle = document.getElementById("record-mla-article");
  var elArticleInline = document.getElementById("record-mla-article-inline");
  var elWebsite = document.getElementById("record-mla-website");
  var elWebsiteInline = document.getElementById("record-mla-website-inline");

  if (elBook) elBook.value = bib.mla_book || "";
  if (elBookInline) elBookInline.value = bib.mla_book_inline || "";
  if (elArticle) elArticle.value = bib.mla_article || "";
  if (elArticleInline) elArticleInline.value = bib.mla_article_inline || "";
  if (elWebsite) elWebsite.value = bib.mla_website || "";
  if (elWebsiteInline) elWebsiteInline.value = bib.mla_website_inline || "";
};

window.collectEditBibliography = function () {
  var textareas = document.querySelectorAll("[data-mla-key]");
  var bibObject = {};

  for (var i = 0; i < textareas.length; i++) {
    var ta = textareas[i];
    var key = ta.getAttribute("data-mla-key");
    if (key) {
      bibObject[key] = ta.value;
    }
  }

  return {
    bibliography: JSON.stringify(bibObject),
  };
};
