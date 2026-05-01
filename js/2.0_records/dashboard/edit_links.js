// =============================================================================
//
//   THE JESUS WEBSITE — EDIT LINKS MODULE
//   File:    js/2.0_records/dashboard/edit_links.js
//   Version: 1.2.0
//   Purpose: UI fragment for assigning related entities (context_links) to a record.
//            Renders removable chip rows, [+ Add Link] button, and a hidden JSON field
//            that is collected by the edit_record.js Save handler.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js -> window.renderEditLinks(containerId, contextLinksData)
//   contextLinksData: optional JSON string from the records table context_links column
// Function: Renders a sub-panel for managing context_links as {slug, type} chips
// Output: Injects the links editor HTML into the specified container element

window.renderEditLinks = function (containerId, contextLinksData) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Parse incoming data (JSON string) or default to empty array
  var links = [];
  if (contextLinksData) {
    try {
      links = JSON.parse(contextLinksData);
    } catch (e) {
      links = [];
    }
  }
  if (!Array.isArray(links)) links = [];

  var html =
    '<section class="links-section">\n' +
    '  <div class="links-header">\n' +
    '    <h3 class="section-heading-serif">Relations &amp; Links</h3>\n' +
    '    <button class="quick-action-btn btn-add-link" id="btn-add-link" type="button">+ Add Link</button>\n' +
    "  </div>\n" +
    '  <div class="links-list" id="context-links-list"></div>\n' +
    '  <input type="hidden" id="context-links-hidden" value="' +
    escapeAttr(JSON.stringify(links)) +
    '">\n' +
    "</section>";

  container.innerHTML = html;

  // Initial render
  renderLinksList(links);

  // [+ Add Link] button
  document
    .getElementById("btn-add-link")
    .addEventListener("click", function () {
      var hiddenInput = document.getElementById("context-links-hidden");
      if (!hiddenInput) return;
      var current = [];
      try {
        current = JSON.parse(hiddenInput.value);
      } catch (e) {
        current = [];
      }
      if (!Array.isArray(current)) current = [];
      current.push({ slug: "", type: "Context" });
      hiddenInput.value = JSON.stringify(current);
      renderLinksList(current);
    });

  // ---- Sub-functions ----

  function renderLinksList(data) {
    var listEl = document.getElementById("context-links-list");
    var hiddenInput = document.getElementById("context-links-hidden");
    if (!listEl || !hiddenInput) return;

    if (!Array.isArray(data) || data.length === 0) {
      listEl.innerHTML =
        '<span class="links-placeholder">No links added yet</span>';
      hiddenInput.value = "[]";
      return;
    }

    var rowsHtml = "";
    for (var i = 0; i < data.length; i++) {
      var entry = data[i];
      rowsHtml +=
        '<div class="links-row" data-index="' +
        i +
        '">\n' +
        '    <span class="links-row-label">' +
        escapeHtml(entry.slug || "") +
        ' <span class="links-row-type">(' +
        escapeHtml(entry.type || "") +
        ")</span></span>\n" +
        '    <button type="button" class="btn-remove-link" data-index="' +
        i +
        '">Remove</button>\n' +
        "  </div>";
    }
    listEl.innerHTML = rowsHtml;

    // Bind remove handlers
    var removeBtns = listEl.querySelectorAll(".btn-remove-link");
    for (var j = 0; j < removeBtns.length; j++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-index"), 10);
          var current = [];
          try {
            current = JSON.parse(hiddenInput.value);
          } catch (e) {
            current = [];
          }
          if (!Array.isArray(current)) current = [];
          if (idx >= 0 && idx < current.length) {
            current.splice(idx, 1);
          }
          hiddenInput.value = JSON.stringify(current);
          renderLinksList(current);
        });
      })(removeBtns[j]);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
};
