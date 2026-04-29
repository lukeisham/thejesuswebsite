// =============================================================================
//
//   THE JESUS WEBSITE — EDIT NEWS SOURCES
//   File:    admin/frontend/edit_modules/edit_news_sources.js
//   Version: 2.0.0
//   Purpose: Table UI to manage Label-URL news source pairs across records.
//            Loads real data from API — no mock rows.
//            Follows the same fetch pattern as edit_wiki_weights.js.
//   Source:  guide_dashboard_appearance.md §6.1
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditNewsSources(containerId)
// Function: Fetches records with news_sources from API, renders an editable
//           table of Label-URL pairs, and saves changes via PUT.
// Output: Injects a source-management table with search, add, remove, and save controls.

window.renderEditNewsSources = async function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // ----- Render shell (loading state) -----
  container.innerHTML =
    '<div class="admin-card" id="edit-news-sources-card">' +
    '<div class="action-bar-header">' +
    "<h2>MANAGE: News Sources</h2>" +
    '<div class="action-bar-buttons">' +
    '<button class="quick-action-btn" id="news-sources-save-btn">Save All Sources</button>' +
    "</div>" +
    "</div>" +
    '<div class="search-container">' +
    '<input type="text" class="admin-search-input" id="news-sources-search-input" placeholder="Search sources by label, URL, or record slug…">' +
    "</div>" +
    '<div class="loading-placeholder" id="news-sources-loading-indicator">Loading news sources…</div>' +
    '<div class="table-wrapper is-hidden" id="news-sources-table-wrapper">' +
    '<table class="admin-records-table" id="news-sources-table">' +
    "<thead>" +
    "<tr>" +
    "<th>Record</th>" +
    "<th>Label</th>" +
    "<th>URL</th>" +
    "<th>Actions</th>" +
    "</tr>" +
    "</thead>" +
    '<tbody id="news-sources-table-body"></tbody>' +
    "</table>" +
    "</div>" +
    '<div class="is-hidden" id="news-sources-add-form-section">' +
    '<h3 class="section-heading-serif">Add New Source</h3>' +
    '<div class="field-row">' +
    '<label class="field-label">Record</label>' +
    '<select class="field-input" id="news-sources-record-select"></select>' +
    "</div>" +
    '<div class="field-row">' +
    '<label class="field-label">Label</label>' +
    '<input type="text" class="field-input" id="news-sources-label-input" placeholder="e.g. Reuters">' +
    "</div>" +
    '<div class="field-row">' +
    '<label class="field-label">URL</label>' +
    '<input type="text" class="field-input" id="news-sources-url-input" placeholder="e.g. https://reuters.com">' +
    "</div>" +
    '<div class="field-row">' +
    "<div></div>" +
    '<button class="quick-action-btn" id="news-sources-add-btn">+ Add Source</button>' +
    "</div>" +
    "</div>" +
    "</div>";

  // ----- Internal state -----
  var recordsData = []; // Array of { id, slug, sources: [{label, url}], originalSources: [{label, url}] }
  var modifiedRecordIds = {}; // Set of record IDs that have been modified

  // ----- Parse news_sources into a consistent array format -----
  function parseNewsSources(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        var parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        return [{ label: value, url: "" }];
      } catch (_e) {
        return [{ label: value, url: "" }];
      }
    }
    return [];
  }

  // ----- Fetch records that have news_sources -----
  async function fetchNewsSourceRecords() {
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

      recordsData = [];
      details.forEach(function (d) {
        if (!d) return;
        var sources = parseNewsSources(d.news_sources);
        if (sources.length === 0) return;
        recordsData.push({
          id: d.id,
          slug: d.slug || d.title || "untitled",
          sources: JSON.parse(JSON.stringify(sources)),
          originalSources: JSON.parse(JSON.stringify(sources)),
        });
      });

      return recordsData;
    } catch (err) {
      throw err;
    }
  }

  // ----- Render table rows from filtered records -----
  function renderTable(records) {
    var tbody = document.getElementById("news-sources-table-body");
    if (!tbody) return;

    // Rebuild record select dropdown for the Add form
    var select = document.getElementById("news-sources-record-select");
    if (select) {
      var selectHtml = "";
      recordsData.forEach(function (rec) {
        selectHtml +=
          '<option value="' +
          rec.id +
          '">' +
          escapeHtml(rec.slug) +
          "</option>";
      });
      select.innerHTML = selectHtml;
    }

    // Flatten sources into table rows
    var flatRows = [];
    records.forEach(function (rec) {
      rec.sources.forEach(function (src, idx) {
        flatRows.push({
          recordId: rec.id,
          recordSlug: rec.slug,
          sourceIndex: idx,
          label: src.label,
          url: src.url,
        });
      });
    });

    if (flatRows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-table-msg">No news sources found.</td></tr>';
      return;
    }

    var html = "";
    flatRows.forEach(function (row) {
      html +=
        "<tr>" +
        "<td>" +
        escapeHtml(row.recordSlug) +
        "</td>" +
        "<td>" +
        escapeHtml(row.label) +
        "</td>" +
        "<td>" +
        escapeHtml(row.url) +
        "</td>" +
        "<td>" +
        '<button class="btn-remove-link" data-record-id="' +
        row.recordId +
        '" data-source-index="' +
        row.sourceIndex +
        '">Remove</button>' +
        "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;

    // Wire remove buttons
    tbody.querySelectorAll(".btn-remove-link").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var recordId = this.getAttribute("data-record-id");
        var sourceIndex = parseInt(this.getAttribute("data-source-index"), 10);
        removeSource(recordId, sourceIndex);
      });
    });
  }

  // ----- Remove a source from a record -----
  function removeSource(recordId, sourceIndex) {
    var rec = null;
    for (var i = 0; i < recordsData.length; i++) {
      if (recordsData[i].id === recordId) {
        rec = recordsData[i];
        break;
      }
    }
    if (!rec) return;

    rec.sources.splice(sourceIndex, 1);
    modifiedRecordIds[recordId] = true;
    applySearchFilter();
  }

  // ----- Add a source to a record -----
  function addSource(recordId, label, url) {
    var rec = null;
    for (var i = 0; i < recordsData.length; i++) {
      if (recordsData[i].id === recordId) {
        rec = recordsData[i];
        break;
      }
    }
    if (!rec) return;

    rec.sources.push({ label: label, url: url || "" });
    modifiedRecordIds[recordId] = true;
    applySearchFilter();
  }

  // ----- Apply search filter and re-render -----
  function applySearchFilter() {
    var input = document.getElementById("news-sources-search-input");
    var q = (input ? input.value : "").trim().toLowerCase();

    var filtered = recordsData
      .map(function (rec) {
        var matchingSources = rec.sources.filter(function (src) {
          if (!q) return true;
          var text = (rec.slug + " " + src.label + " " + src.url).toLowerCase();
          return text.indexOf(q) !== -1;
        });
        return {
          id: rec.id,
          slug: rec.slug,
          sources: matchingSources,
          originalSources: rec.originalSources,
        };
      })
      .filter(function (rec) {
        return rec.sources.length > 0;
      });

    renderTable(filtered);
  }

  // ----- Simple HTML escape -----
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ----- Load and render -----
  try {
    var records = await fetchNewsSourceRecords();
    document
      .getElementById("news-sources-loading-indicator")
      .classList.add("is-hidden");
    document
      .getElementById("news-sources-table-wrapper")
      .classList.remove("is-hidden");
    document
      .getElementById("news-sources-add-form-section")
      .classList.remove("is-hidden");
    renderTable(records);
  } catch (err) {
    document.getElementById("news-sources-loading-indicator").textContent =
      "Error loading records: " + err.message;
    document
      .getElementById("news-sources-loading-indicator")
      .classList.remove("loading-placeholder");
    document
      .getElementById("news-sources-loading-indicator")
      .classList.add("error-message");
    return;
  }

  // ----- Wire search -----
  var searchInput = document.getElementById("news-sources-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      applySearchFilter();
    });
  }

  // ----- Wire Add Source button -----
  var addBtn = document.getElementById("news-sources-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      var select = document.getElementById("news-sources-record-select");
      var labelInput = document.getElementById("news-sources-label-input");
      var urlInput = document.getElementById("news-sources-url-input");
      var recordId = select ? select.value : null;
      var label = (labelInput ? labelInput.value : "").trim();
      var url = (urlInput ? urlInput.value : "").trim();
      if (!recordId || !label) {
        if (labelInput) labelInput.focus();
        return;
      }
      addSource(recordId, label, url);
      labelInput.value = "";
      urlInput.value = "";
      labelInput.focus();
    });
  }

  // ----- Wire Save All Sources button -----
  var saveBtn = document.getElementById("news-sources-save-btn");
  if (saveBtn) {
    var newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener("click", async function () {
      var changedCount = 0;
      var errors = [];

      var modifiedRecords = recordsData.filter(function (rec) {
        return modifiedRecordIds[rec.id];
      });

      for (var i = 0; i < modifiedRecords.length; i++) {
        var rec = modifiedRecords[i];
        try {
          var resp = await fetch("/api/admin/records/" + rec.id, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              news_sources: rec.sources,
            }),
          });

          if (resp.ok) {
            changedCount++;
            rec.originalSources = JSON.parse(JSON.stringify(rec.sources));
            delete modifiedRecordIds[rec.id];
          } else {
            var errData;
            try {
              errData = await resp.json();
            } catch (_e) {
              errData = {};
            }
            errors.push(rec.slug + ": " + (errData.detail || resp.statusText));
          }
        } catch (err) {
          errors.push(rec.slug + ": " + err.message);
        }
      }

      // Show save result indicator
      var indicator = document.createElement("div");
      indicator.className = "save-result-indicator";

      if (errors.length === 0) {
        indicator.textContent =
          "All " + changedCount + " record(s) saved successfully.";
        indicator.classList.add("is-success");
      } else {
        indicator.textContent =
          "Saved " +
          changedCount +
          " of " +
          modifiedRecords.length +
          ". Errors: " +
          errors.join("; ");
        indicator.classList.add("is-error");
      }

      var card = document.getElementById("edit-news-sources-card");
      var existing = card.querySelector(".save-result-indicator");
      if (existing) existing.remove();
      card.appendChild(indicator);
    });
  }
};
