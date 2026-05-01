// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: MISCELLANEOUS
//   File:    js/2.0_records/dashboard/edit_misc.js
//   Version: 1.0.0
//   Purpose: Miscellaneous fields (metadata_json, iaa, pledius, manuscript,
//            url) for the single-record editor. Extracted from edit_record.js
//            per plan.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditMisc(containerId)
// Function: Renders and manages the Miscellaneous form section.
// Output: Injects form fields into container; exposes load/collect APIs

window.renderEditMisc = function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<section id="misc" class="record-section-spacing">\n' +
    '<p>MISCELLANEOUS</p>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">metadata_json</label>\n' +
    '<textarea id="record-metadata-json" class="blog-editor-field-input misc-textarea" placeholder="{ ... JSON blob ... }"></textarea>\n' +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">iaa</label>\n' +
    '<input type="text" id="record-iaa" class="blog-editor-field-input" placeholder="Institute for Archaeology & Antiquity">\n' +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">pledius</label>\n' +
    '<input type="text" id="record-pledius" class="blog-editor-field-input" placeholder="Pleiades ID">\n' +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">manuscript</label>\n' +
    '<input type="text" id="record-manuscript" class="blog-editor-field-input" placeholder="Manuscript reference">\n' +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">url</label>\n' +
    '<textarea id="record-url" class="blog-editor-field-input misc-textarea" placeholder="[ ... JSON blob of URLs ... ]"></textarea>\n' +
    "</div>\n" +
    "</section>";
};

window.loadEditMisc = function (data) {
  var elMeta = document.getElementById("record-metadata-json");
  var elIaa = document.getElementById("record-iaa");
  var elPledius = document.getElementById("record-pledius");
  var elManuscript = document.getElementById("record-manuscript");
  var elUrl = document.getElementById("record-url");

  if (elMeta) elMeta.value = (data && data.metadata_json) || "";
  if (elIaa) elIaa.value = (data && data.iaa) || "";
  if (elPledius) elPledius.value = (data && data.pledius) || "";
  if (elManuscript) elManuscript.value = (data && data.manuscript) || "";
  if (elUrl) elUrl.value = (data && data.url) || "";
};

window.collectEditMisc = function () {
  var elMeta = document.getElementById("record-metadata-json");
  var elIaa = document.getElementById("record-iaa");
  var elPledius = document.getElementById("record-pledius");
  var elManuscript = document.getElementById("record-manuscript");
  var elUrl = document.getElementById("record-url");

  return {
    metadata_json: elMeta ? elMeta.value : "",
    iaa: elIaa ? elIaa.value : "",
    pledius: elPledius ? elPledius.value : "",
    manuscript: elManuscript ? elManuscript.value : "",
    url: elUrl ? elUrl.value : "",
  };
};
