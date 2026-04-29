// =============================================================================
//
//   THE JESUS WEBSITE — EDIT LISTS MODULE
//   File:    admin/frontend/edit_modules/edit_lists.js
//   Version: 1.2.0
//   Purpose: UI for managing resource_lists — load, reorder, remove, bulk add,
//            and save ordered record-slug lists via the admin API.
//   Source:  guide_dashboard_appearance.md §2.0
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditLists(containerId, listName)
//   listName: name of the resource list to edit (e.g. "OT Verses", "Miracles")
// Function: Renders a drag-sortable list editor with Remove, Save, and Bulk Add
// Output: Injects the list editor HTML into the specified container

window.renderEditLists = function (containerId, listName) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // ---- State ----
  var currentItems = []; // Array of { record_slug, title, position } from API
  var allRecordSlugs = {}; // Map slug -> title (used for bulk-add validation)

  // ---- Render shell ----
  var html =
    '<div class="admin-card" id="edit-lists-card">\n' +
    '  <div class="providence-editor-grid">\n' +
    "    <!-- COL 1: Action buttons -->\n" +
    '    <div class="providence-editor-col-actions">\n' +
    '      <button class="blog-editor-action-btn btn-save-list" id="btn-save-list" type="button">Save List</button>\n' +
    '      <div id="lists-save-status" class="status-feedback is-hidden lists-save-status"></div>\n' +
    "    </div>\n" +
    "\n" +
    "    <!-- COL 2: List metadata (read-only) -->\n" +
    '    <div class="providence-editor-col-list">\n' +
    '      <p class="blog-editor-list-heading">List Info</p>\n' +
    '      <div class="blog-editor-field">\n' +
    '        <label class="blog-editor-field-label">Name</label>\n' +
    '        <p class="text-sm lists-meta-value">' +
    escapeHtml(listName) +
    "</p>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <!-- COL 3: Current items + bulk add tools -->\n" +
    '    <div class="providence-editor-col-editor">\n' +
    "      <!-- Search Records Explorer -->\n" +
    '      <div class="blog-editor-field">\n' +
    '        <label class="blog-editor-field-label">Search Records Explorer</label>\n' +
    '        <input type="text" id="lists-search-input" class="lists-search-input" placeholder="Search records to add\u2026">\n' +
    "      </div>\n" +
    "\n" +
    "      <!-- Bulk Add by Slugs -->\n" +
    '      <div class="blog-editor-field">\n' +
    '        <label class="blog-editor-field-label">Bulk Add by Slugs (CSV/Line)</label>\n' +
    '        <textarea id="lists-bulk-textarea" class="lists-bulk-textarea" placeholder="slug-1, slug-2, \u2026"></textarea>\n' +
    '        <button class="quick-action-btn btn-bulk-add" id="btn-bulk-add" type="button">Bulk Add Config</button>\n' +
    '        <div id="lists-bulk-summary" class="lists-bulk-summary"></div>\n' +
    "      </div>\n" +
    "\n" +
    "      <!-- Current List Items -->\n" +
    '      <div class="blog-editor-field">\n' +
    '        <label class="blog-editor-field-label">List Items</label>\n' +
    '        <div id="lists-items-container" class="lists-items-list"></div>\n' +
    '        <p class="lists-drag-hint">(Drag \u2630 handle to reorder items)</p>\n' +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>";

  container.innerHTML = html;

  // ----- Render top-level section tab bar (Lists & Ranks active) -----
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-lists-card",
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
      "lists-ranks",
    );
  }

  // ---- Helpers ----
  function showSaveStatus(msg, type) {
    var el = document.getElementById("lists-save-status");
    if (!el) return;
    el.textContent = msg;
    el.className = "status-feedback lists-save-status";
    if (type === "success") el.classList.add("status-success");
    else if (type === "error") el.classList.add("status-error");
    else if (type === "loading") el.classList.add("status-loading");
    el.classList.remove("is-hidden");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---- Render list items ----
  function renderItems() {
    var listEl = document.getElementById("lists-items-container");
    if (!listEl) return;

    if (!currentItems || currentItems.length === 0) {
      listEl.innerHTML =
        '<div class="lists-empty-msg">No items in this list yet. Add some from the right panel.</div>';
      return;
    }

    var rowsHtml = "";
    for (var i = 0; i < currentItems.length; i++) {
      var item = currentItems[i];
      var label = item.title
        ? "[" + escapeHtml(item.record_slug) + "] " + escapeHtml(item.title)
        : escapeHtml(item.record_slug);
      rowsHtml +=
        '<div class="lists-item-row" draggable="true" data-slug="' +
        escapeHtml(item.record_slug) +
        '" data-index="' +
        i +
        '">\n' +
        '    <span class="lists-item-handle">\u2630</span>\n' +
        '    <span class="lists-item-label">' +
        label +
        "</span>\n" +
        '    <button type="button" class="btn-remove-list-item" data-slug="' +
        escapeHtml(item.record_slug) +
        '" data-index="' +
        i +
        '">Remove</button>\n' +
        "  </div>";
    }
    listEl.innerHTML = rowsHtml;

    // Bind remove handlers
    var removeBtns = listEl.querySelectorAll(".btn-remove-list-item");
    for (var j = 0; j < removeBtns.length; j++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var slug = btn.getAttribute("data-slug");
          for (var k = 0; k < currentItems.length; k++) {
            if (currentItems[k].record_slug === slug) {
              currentItems.splice(k, 1);
              break;
            }
          }
          renderItems();
        });
      })(removeBtns[j]);
    }

    // ---- HTML5 Drag-and-Drop Reorder ----
    var rows = listEl.querySelectorAll(".lists-item-row");
    for (var dr = 0; dr < rows.length; dr++) {
      (function (row) {
        var slug = row.getAttribute("data-slug");

        row.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/plain", slug);
          e.dataTransfer.effectAllowed = "move";
          row.classList.add("lists-item-dragging");
        });

        row.addEventListener("dragend", function () {
          row.classList.remove("lists-item-dragging");
          var allRows = listEl.querySelectorAll(".lists-item-row");
          for (var cl = 0; cl < allRows.length; cl++) {
            allRows[cl].classList.remove("lists-item-drag-over");
          }
        });

        row.addEventListener("dragover", function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          row.classList.add("lists-item-drag-over");
        });

        row.addEventListener("dragleave", function () {
          row.classList.remove("lists-item-drag-over");
        });

        row.addEventListener("drop", function (e) {
          e.preventDefault();
          row.classList.remove("lists-item-drag-over");

          var draggedSlug = e.dataTransfer.getData("text/plain");
          if (!draggedSlug || draggedSlug === slug) return;

          var fromIdx = -1;
          var toIdx = -1;
          for (var di = 0; di < currentItems.length; di++) {
            if (currentItems[di].record_slug === draggedSlug) fromIdx = di;
            if (currentItems[di].record_slug === slug) toIdx = di;
          }

          if (fromIdx === -1 || toIdx === -1) return;

          var moved = currentItems.splice(fromIdx, 1)[0];
          currentItems.splice(toIdx, 0, moved);

          renderItems();
        });
      })(rows[dr]);
    }
  }

  // ---- Load data from API ----
  function loadListData() {
    var listEl = document.getElementById("lists-items-container");
    if (listEl) {
      listEl.innerHTML = '<div class="lists-empty-msg">Loading\u2026</div>';
    }

    // Fetch list items + all record slugs in parallel
    var listUrl = "/api/admin/lists/" + encodeURIComponent(listName);
    var recordsUrl = "/api/admin/records";

    Promise.all([
      fetch(listUrl).then(function (r) {
        if (!r.ok) throw new Error("Failed to load list");
        return r.json();
      }),
      fetch(recordsUrl).then(function (r) {
        if (!r.ok) throw new Error("Failed to load records");
        return r.json();
      }),
    ])
      .then(function (results) {
        var listData = results[0]; // JSON array from GET list endpoint
        var recordsData = results[1]; // { records: [...] }

        // Build slug → title map for validation
        allRecordSlugs = {};
        var records = recordsData.records || [];
        for (var ri = 0; ri < records.length; ri++) {
          var rec = records[ri];
          if (rec.slug) {
            allRecordSlugs[rec.slug] = rec.title || rec.slug;
          }
        }

        // Normalise list data: ensure array, add titles from records
        if (!Array.isArray(listData)) {
          listData = [];
        }
        currentItems = [];
        for (var li = 0; li < listData.length; li++) {
          var entry = listData[li];
          var slug = entry.record_slug || entry.slug || "";
          if (slug) {
            currentItems.push({
              record_slug: slug,
              title: entry.title || allRecordSlugs[slug] || slug,
              position: entry.position != null ? entry.position : li,
            });
          }
        }

        renderItems();
      })
      .catch(function (err) {
        console.error("Error loading list data:", err);
        if (listEl) {
          listEl.innerHTML =
            '<div class="lists-empty-msg">Failed to load list data. Please try again.</div>';
        }
      });
  }

  // ---- Save List ----
  document
    .getElementById("btn-save-list")
    .addEventListener("click", function () {
      var payload = [];
      for (var si = 0; si < currentItems.length; si++) {
        payload.push({
          record_slug: currentItems[si].record_slug,
          position: si,
        });
      }

      showSaveStatus("Saving\u2026", "loading");

      fetch("/api/admin/lists/" + encodeURIComponent(listName), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Save failed with status " + res.status);
          return res.json();
        })
        .then(function () {
          showSaveStatus("List saved successfully.", "success");
        })
        .catch(function (err) {
          console.error("Save list error:", err);
          showSaveStatus("Failed to save list. " + err.message, "error");
        });
    });

  // ---- Bulk Add ----
  document
    .getElementById("btn-bulk-add")
    .addEventListener("click", function () {
      var textarea = document.getElementById("lists-bulk-textarea");
      var summaryEl = document.getElementById("lists-bulk-summary");
      if (!textarea || !summaryEl) return;

      var raw = textarea.value.trim();
      if (!raw) {
        summaryEl.textContent = "Please enter at least one slug.";
        return;
      }

      // Parse: split by comma or newline, trim whitespace, filter empty
      var parts = raw.split(/[,\n\r]+/);
      var slugsToAdd = [];
      for (var pi = 0; pi < parts.length; pi++) {
        var s = parts[pi].trim();
        if (s) slugsToAdd.push(s);
      }

      if (slugsToAdd.length === 0) {
        summaryEl.textContent = "No valid slugs found in input.";
        return;
      }

      // Deduplicate against current items
      var existingSlugs = {};
      for (var ei = 0; ei < currentItems.length; ei++) {
        existingSlugs[currentItems[ei].record_slug] = true;
      }

      var added = 0;
      var skippedNotFound = 0;
      var skippedDuplicate = 0;
      var newItems = [];

      for (var ai = 0; ai < slugsToAdd.length; ai++) {
        var slug = slugsToAdd[ai];

        if (!allRecordSlugs.hasOwnProperty(slug)) {
          skippedNotFound++;
          continue;
        }

        if (existingSlugs.hasOwnProperty(slug)) {
          skippedDuplicate++;
          continue;
        }

        // Valid: add to new items
        newItems.push({
          record_slug: slug,
          title: allRecordSlugs[slug] || slug,
          position: currentItems.length + added,
        });
        existingSlugs[slug] = true;
        added++;
      }

      // Append new items to currentItems
      for (var ni = 0; ni < newItems.length; ni++) {
        currentItems.push(newItems[ni]);
      }

      renderItems();

      var summaryParts = [];
      if (added > 0) summaryParts.push("Added " + added);
      if (skippedDuplicate > 0)
        summaryParts.push(skippedDuplicate + " duplicate(s) skipped");
      if (skippedNotFound > 0)
        summaryParts.push(skippedNotFound + " slug(s) not found");
      summaryEl.textContent = summaryParts.join("; ") + ".";
    });

  // ---- Init ----
  loadListData();
};
