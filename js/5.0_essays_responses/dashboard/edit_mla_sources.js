// =============================================================================
//
//   THE JESUS WEBSITE — EDIT MLA SOURCES
//   File:    js/5.0_essays_responses/dashboard/edit_mla_sources.js
//   Version: 2.2.0
//   Purpose: UI mapping for editing MLA bibliography source data.
//            Fetches real records from API — no mock rows.
//            Refactored to Providence 3-column grid per §18.1.
//            Wireframe: §5.1 bibliography grid (6 MLA sub-keys per record).
//
//   Changelog:
//     v2.2.0 — Providence grid refactor: split single container.innerHTML dump
//              into three _setColumn() / _clearColumnContent() calls targeting
//              "actions", "list", and "editor". showSaveResult() appends into
//              _getColumns().editor. renderTabBar() continues passing
//              containerId as-is.
//     v2.1.0 — Initial version with container.innerHTML injection.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditMlaSources(containerId)
// Function: Fetches all records from API, filters those with non-null
//           bibliography, and renders an expandable grid of 6 MLA textareas.
//           Saves changes via PUT /api/admin/records/{id} with full
//           bibliography JSON payload.
// Output: Populates the three Providence grid columns (canvas-col-actions,
//         canvas-col-list, canvas-col-editor) via _setColumn()

window.renderEditMlaSources = async function (containerId) {
  // containerId is "canvas-col-editor" when routed via dashboard_app.js loadModule().
  // We keep it for renderTabBar compatibility but no longer dump innerHTML into it.

  // --- The 6 MLA sub-keys per the §5.1 wireframe ---
  var MLA_KEYS = [
    { key: "mla_book", label: "mla_book" },
    { key: "mla_book_inline", label: "mla_book_inline" },
    { key: "mla_article", label: "mla_article" },
    { key: "mla_article_inline", label: "mla_article_inline" },
    { key: "mla_website", label: "mla_website" },
    { key: "mla_website_inline", label: "mla_website_inline" },
  ];

  // ----- Render shell (loading state) across Providence three-column grid -----
  // COL 1 (actions): Save All button
  _setColumn(
    "actions",
    '<button class="blog-editor-action-btn" id="mla-save-all-btn">Save All</button>',
  );

  // COL 2 (list): Filter Records heading + search input
  _setColumn(
    "list",
    '<p class="blog-editor-list-heading">Filter Records</p>' +
      '<div class="search-container">' +
      '<input type="text" class="admin-search-input" id="mla-search-input" placeholder="Filter by Record Title or Slug…">' +
      "</div>",
  );

  // COL 3 (editor): Loading indicator + mla records container
  _setColumn(
    "editor",
    '<div class="loading-placeholder" id="mla-loading-indicator">Loading MLA bibliography records…</div>' +
      '<div id="mla-records-container"></div>',
  );

  // ----- Internal state -----
  var mlaRecords = []; // Array of { id, title, slug, bibliography: { mla_book, ... }, changed: bool }
  var changesByRecord = {}; // { recordId: { mla_book: "new value", ... } }

  // ---------------------------------------------------------------------------
  //   FETCH
  // ---------------------------------------------------------------------------

  async function fetchMlaRecords() {
    try {
      var listResponse = await fetch("/api/admin/records");
      if (!listResponse.ok) throw new Error("Failed to fetch record list");
      var allRecords = await listResponse.json();

      var detailPromises = allRecords.map(async function (rec) {
        try {
          var detailResp = await fetch("/api/admin/records/" + rec.id);
          if (!detailResp.ok) return null;
          return await detailResp.json();
        } catch (_e) {
          return null;
        }
      });

      var details = await Promise.all(detailPromises);

      var results = [];
      details.forEach(function (d) {
        if (!d) return;
        var bibRaw = d.bibliography;
        if (!bibRaw || String(bibRaw).trim() === "") return;

        var bibObj;
        try {
          bibObj = JSON.parse(bibRaw);
        } catch (_e) {
          // If bibliography is not valid JSON, treat as empty
          return;
        }

        if (!bibObj || typeof bibObj !== "object") return;

        results.push({
          id: d.id,
          title: d.title || "",
          slug: d.slug || "",
          bibliography: bibObj,
        });
      });

      return results;
    } catch (err) {
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  //   RENDER
  // ---------------------------------------------------------------------------

  function renderAll(records) {
    // Build the HTML for the editor column, then clear and re-inject
    var containerEl = _getColumns().editor;
    if (!containerEl) return;

    // Clear the editor column before rebuilding
    _clearColumnContent("editor");

    var html = "";

    if (records.length === 0) {
      html +=
        '<div class="empty-table-msg">No records with MLA bibliography found.</div>';
      _setColumn("editor", html);
      return;
    }

    records.forEach(function (rec, index) {
      var bib = rec.bibliography || {};
      var displayTitle = rec.title || rec.slug || "Record #" + rec.id;
      var recordId = rec.id;

      html +=
        '<div class="mla-record-card" data-record-id="' +
        recordId +
        '" data-mla-index="' +
        index +
        '">';

      // --- Collapsible header ---
      html +=
        '<div class="mla-record-header is-expanded" data-toggle-id="mla-toggle-' +
        recordId +
        '">' +
        '<h3 class="mla-record-title">' +
        escapeHtml(displayTitle) +
        "</h3>" +
        '<span class="mla-toggle-icon">[ &minus; ]</span>' +
        "</div>";

      // --- Collapsible body ---
      html +=
        '<div class="mla-record-body" id="mla-body-' +
        recordId +
        '">' +
        '<div class="bibliography-section">' +
        '<div class="bibliography-grid">';

      MLA_KEYS.forEach(function (item) {
        var fieldKey = item.key;
        var val = bib[fieldKey] || "";
        var textareaId = "mla-textarea-" + recordId + "-" + fieldKey;

        html += '<div class="bibliography-cell">';
        html +=
          '<label class="field-label" for="' +
          textareaId +
          '">' +
          fieldKey +
          "</label>";
        html +=
          '<textarea class="bibliography-textarea" id="' +
          textareaId +
          '" data-record-id="' +
          recordId +
          '" data-mla-key="' +
          fieldKey +
          '" data-mla-index="' +
          index +
          '">' +
          escapeHtml(val) +
          "</textarea>";
        html += "</div>";
      });

      html += "</div>"; // .bibliography-grid
      html += "</div>"; // .bibliography-section
      html += "</div>"; // .mla-record-body
      html += "</div>"; // .mla-record-card
    });

    _setColumn("editor", html);

    // --- Wire collapsible toggles ---
    // Query the editor column for the freshly injected DOM
    containerEl
      .querySelectorAll(".mla-record-header")
      .forEach(function (header) {
        header.addEventListener("click", function () {
          var card = this.closest(".mla-record-card");
          if (!card) return;
          var body = card.querySelector(".mla-record-body");
          var icon = card.querySelector(".mla-toggle-icon");
          if (!body || !icon) return;

          var isCollapsed = body.classList.contains("is-collapsed");
          if (isCollapsed) {
            body.classList.remove("is-collapsed");
            header.classList.add("is-expanded");
            icon.textContent = "[ \u2212 ]";
          } else {
            body.classList.add("is-collapsed");
            header.classList.remove("is-expanded");
            icon.textContent = "[ + ]";
          }
        });
      });

    // --- Wire textarea change tracking ---
    containerEl
      .querySelectorAll(".bibliography-textarea")
      .forEach(function (textarea) {
        textarea.addEventListener("input", function () {
          var recordId = this.getAttribute("data-record-id");
          var mlaKey = this.getAttribute("data-mla-key");
          var mlaIndex = parseInt(this.getAttribute("data-mla-index"), 10);

          // Track change in changesByRecord
          if (!changesByRecord[recordId]) {
            changesByRecord[recordId] = {};
          }
          changesByRecord[recordId][mlaKey] = this.value;

          // Also update in-memory bibliography object
          if (
            mlaIndex >= 0 &&
            mlaIndex < mlaRecords.length &&
            mlaRecords[mlaIndex].bibliography
          ) {
            mlaRecords[mlaIndex].bibliography[mlaKey] = this.value;
            mlaRecords[mlaIndex].changed = true;
          }
        });
      });
  }

  // ----- Simple HTML escape -----
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------------------------------------------------------------------------
  //   LOAD
  // ---------------------------------------------------------------------------

  try {
    mlaRecords = await fetchMlaRecords();
    document.getElementById("mla-loading-indicator").classList.add("is-hidden");

    // Render top-level section tab bar (Text Content active)
    // containerId is "canvas-col-editor" — renderTabBar prepends into the editor column
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
        "text-content",
      );
    }

    renderAll(mlaRecords);
  } catch (err) {
    document.getElementById("mla-loading-indicator").textContent =
      "Error loading MLA records: " + err.message;
    document
      .getElementById("mla-loading-indicator")
      .classList.remove("loading-placeholder");
    document
      .getElementById("mla-loading-indicator")
      .classList.add("error-message");
    return;
  }

  // ---------------------------------------------------------------------------
  //   SEARCH FILTER
  // ---------------------------------------------------------------------------

  var searchInput = document.getElementById("mla-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var filtered = mlaRecords.filter(function (rec) {
        var text = ((rec.title || "") + " " + (rec.slug || "")).toLowerCase();
        return !q || text.indexOf(q) !== -1;
      });
      renderAll(filtered);
    });
  }

  // ---------------------------------------------------------------------------
  //   SAVE ALL
  // ---------------------------------------------------------------------------

  var saveBtn = document.getElementById("mla-save-all-btn");
  if (saveBtn) {
    // Clone to remove existing listeners
    var newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener("click", async function () {
      var changedCount = 0;
      var errors = [];

      // Collect records that have changes
      var changedRecordIds = Object.keys(changesByRecord);
      if (changedRecordIds.length === 0) {
        showSaveResult("No changes to save.", "is-success");
        return;
      }

      for (var i = 0; i < changedRecordIds.length; i++) {
        var recordId = changedRecordIds[i];
        var changedFields = changesByRecord[recordId];

        // Build the full bibliography object: merge original with changes
        var recordData = mlaRecords.find(function (r) {
          return String(r.id) === String(recordId);
        });

        if (!recordData) {
          errors.push("Record #" + recordId + ": not found in local state");
          continue;
        }

        // Merge original bibliography with changed fields
        var mergedBib = {};
        MLA_KEYS.forEach(function (item) {
          var key = item.key;
          if (changedFields && changedFields.hasOwnProperty(key)) {
            mergedBib[key] = changedFields[key];
          } else if (recordData.bibliography) {
            mergedBib[key] = recordData.bibliography[key] || "";
          } else {
            mergedBib[key] = "";
          }
        });

        var payload = {
          bibliography: JSON.stringify(mergedBib),
        };

        try {
          var resp = await fetch("/api/admin/records/" + recordId, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (resp.ok) {
            changedCount++;
            // Clear change tracking for this record
            delete changesByRecord[recordId];
            // Mark un-changed
            if (recordData) recordData.changed = false;
          } else {
            var errData;
            try {
              errData = await resp.json();
            } catch (_) {
              errData = {};
            }
            var slug = recordData
              ? recordData.slug || recordData.title
              : "#" + recordId;
            errors.push(slug + ": " + (errData.detail || resp.statusText));
          }
        } catch (err) {
          var slug2 = recordData
            ? recordData.slug || recordData.title
            : "#" + recordId;
          errors.push(slug2 + ": " + err.message);
        }
      }

      var totalAttempted = changedRecordIds.length;
      if (errors.length === 0) {
        showSaveResult(
          "All " + changedCount + " MLA bibliographies saved successfully.",
          "is-success",
        );
      } else {
        showSaveResult(
          "Saved " +
            changedCount +
            " of " +
            totalAttempted +
            ". Errors: " +
            errors.join("; "),
          "is-error",
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  //   SAVE RESULT INDICATOR
  // ---------------------------------------------------------------------------

  function showSaveResult(message, className) {
    var editorEl = _getColumns().editor;
    if (!editorEl) return;

    var indicator = document.createElement("div");
    indicator.className = "save-result-indicator " + className;
    indicator.textContent = message;

    var existing = editorEl.querySelector(".save-result-indicator");
    if (existing) existing.remove();

    editorEl.appendChild(indicator);
  }
};
