// =============================================================================
//
//   THE JESUS WEBSITE — EDIT MLA SOURCES
//   File:    js/5.0_essays_responses/dashboard/edit_mla_sources.js
//   Version: 2.1.0
//   Purpose: UI mapping for editing MLA bibliography source data.
//            Fetches real records from API — no mock rows.
//            Refactored to Providence 3-column grid per §18.1.
//            Wireframe: §5.1 bibliography grid (6 MLA sub-keys per record).
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditMlaSources(containerId)
// Function: Fetches all records from API, filters those with non-null
//           bibliography, and renders an expandable grid of 6 MLA textareas.
//           Saves changes via PUT /api/admin/records/{id} with full
//           bibliography JSON payload.
// Output: Injects collapsible bibliography grid editor into container

window.renderEditMlaSources = async function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // --- The 6 MLA sub-keys per the §5.1 wireframe ---
  var MLA_KEYS = [
    { key: "mla_book", label: "mla_book" },
    { key: "mla_book_inline", label: "mla_book_inline" },
    { key: "mla_article", label: "mla_article" },
    { key: "mla_article_inline", label: "mla_article_inline" },
    { key: "mla_website", label: "mla_website" },
    { key: "mla_website_inline", label: "mla_website_inline" },
  ];

  // ----- Render shell (loading state) -----
  container.innerHTML =
    '<div class="admin-card" id="edit-mla-sources-card">' +
    '<div class="providence-editor-grid">' +
    "<!-- column_one: Action buttons -->" +
    '<div class="providence-editor-col-actions">' +
    '<button class="blog-editor-action-btn" id="mla-save-all-btn">Save All</button>' +
    "</div>" +
    "<!-- column_two: Search / filter -->" +
    '<div class="providence-editor-col-list">' +
    '<p class="blog-editor-list-heading">Filter Records</p>' +
    '<div class="search-container">' +
    '<input type="text" class="admin-search-input" id="mla-search-input" placeholder="Filter by Record Title or Slug…">' +
    "</div>" +
    "</div>" +
    "<!-- column_three: MLA record cards -->" +
    '<div class="providence-editor-col-editor">' +
    '<div class="loading-placeholder" id="mla-loading-indicator">Loading MLA bibliography records…</div>' +
    '<div id="mla-records-container"></div>' +
    "</div>" +
    "</div>" +
    "</div>";

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
    var containerEl = document.getElementById("mla-records-container");
    if (!containerEl) return;

    if (records.length === 0) {
      containerEl.innerHTML =
        '<div class="empty-table-msg">No records with MLA bibliography found.</div>';
      return;
    }

    var html = "";
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

    containerEl.innerHTML = html;

    // --- Wire collapsible toggles ---
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
    if (typeof window.renderTabBar === "function") {
      window.renderTabBar(
        "edit-mla-sources-card",
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
    var card = document.getElementById("edit-mla-sources-card");
    if (!card) return;

    var indicator = document.createElement("div");
    indicator.className = "save-result-indicator " + className;
    indicator.textContent = message;

    var existing = card.querySelector(".save-result-indicator");
    if (existing) existing.remove();

    card.appendChild(indicator);
  }
};
