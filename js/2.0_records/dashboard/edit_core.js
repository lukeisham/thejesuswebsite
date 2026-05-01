// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: CORE IDENTIFIERS
//   File:    js/2.0_records/dashboard/edit_core.js
//   Version: 1.0.0
//   Purpose: Core identifier fields (id, title, slug, timestamps) for the
//            single-record editor. Extracted from edit_record.js per plan.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditCore(containerId)
// Function: Renders and manages the Core Identifiers form section.
// Output: Injects form fields into container; exposes load/collect APIs

window.renderEditCore = function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<section id="core-identifiers">\n' +
    '<p class="blog-editor-list-heading">CORE IDENTIFIERS</p>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">id</label>\n' +
    '<input type="text" id="record-id" class="blog-editor-field-input" value="[auto-generated ULID]" readonly>\n' +
    '</div>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">title</label>\n' +
    '<input type="text" id="record-title" class="blog-editor-field-input" placeholder="Record Title">\n' +
    '</div>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">slug</label>\n' +
    '<input type="text" id="record-slug" class="blog-editor-field-input" placeholder="url-friendly-slug">\n' +
    '</div>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">created_at</label>\n' +
    '<input type="text" id="record-created-at" class="blog-editor-field-input" value="[auto]" readonly>\n' +
    '</div>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">updated_at</label>\n' +
    '<input type="text" id="record-updated-at" class="blog-editor-field-input" value="[auto]" readonly>\n' +
    '</div>\n' +
    '</section>';
};

window.loadEditCore = function (data) {
  var elId = document.getElementById("record-id");
  var elTitle = document.getElementById("record-title");
  var elSlug = document.getElementById("record-slug");
  var elCreated = document.getElementById("record-created-at");
  var elUpdated = document.getElementById("record-updated-at");

  if (elId) elId.value = (data && data.id) || "[auto-generated ULID]";
  if (elTitle) elTitle.value = (data && data.title) || "";
  if (elSlug) elSlug.value = (data && data.slug) || "";
  if (elCreated) elCreated.value = (data && data.created_at) || "[auto]";
  if (elUpdated) elUpdated.value = (data && data.updated_at) || "[auto]";
};

window.collectEditCore = function () {
  return {
    title: document.getElementById("record-title")?.value || "",
    slug: document.getElementById("record-slug")?.value || "",
  };
};
