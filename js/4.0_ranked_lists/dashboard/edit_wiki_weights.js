// =============================================================================
//
//   THE JESUS WEBSITE — EDIT WIKI WEIGHTS MODULE
//   File:    js/4.0_ranked_lists/dashboard/edit_wiki_weights.js
//   Version: 2.1.0
//   Purpose: Table UI to adjust numerical ranking multipliers for Wikipedia lists.
//            Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §4.1
//
//   Changelog:
//     v2.1.0 — Providence grid refactor: split single container.innerHTML dump
//              into three _setColumn() calls targeting "actions", "list", and
//              "editor". Uses _clearColumnContent("editor") before re-rendering
//              the editor column on data load. Save-result indicator appends
//              into the editor column instead of the legacy container.
//     v2.0.0 — Initial version with container.innerHTML injection.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditWikiWeights(containerId)
// Function: Fetches Wikipedia-ranked records from API, renders editable weight table,
//           and saves changes via PUT
// Output: Populates the three Providence grid columns (canvas-col-actions,
//         canvas-col-list, canvas-col-editor) via _setColumn()

window.renderEditWikiWeights = async function (containerId) {
  // containerId is "canvas-col-editor" when routed via dashboard_app.js loadModule().
  // We keep it for renderTabBar compatibility but no longer dump innerHTML into it.

  // ----- Render shell (loading state) into Providence columns -----
  // COL 1: Action buttons
  _setColumn(
    "actions",
    "<!-- column_one: Action buttons -->" +
      '<button class="blog-editor-action-btn" id="wiki-save-btn">Save All Changes</button>' +
      '<button class="blog-editor-action-btn" id="wiki-add-override-btn">+ Add Override</button>' +
      '<button class="blog-editor-action-btn is-danger" id="wiki-delete-row-btn">Delete Row</button>',
  );

  // COL 2: WRITE field documentation
  _setColumn(
    "list",
    "<!-- column_two: WRITE field documentation -->" +
      '<p class="blog-editor-list-heading">WRITE Fields</p>' +
      '<div class="blog-editor-field">' +
      '<label class="blog-editor-field-label">wikipedia_link</label>' +
      "</div>" +
      '<div class="blog-editor-field">' +
      '<label class="blog-editor-field-label">wikipedia_title</label>' +
      "</div>" +
      '<div class="blog-editor-field">' +
      '<label class="blog-editor-field-label">wikipedia_rank</label>' +
      "</div>" +
      '<div class="blog-editor-field">' +
      '<label class="blog-editor-field-label">wikipedia_weight</label>' +
      "</div>",
  );

  // COL 3: Weights table (editor column)
  _setColumn(
    "editor",
    "<!-- column_three: Weights table -->" +
      '<div class="search-container">' +
      '<input type="text" class="admin-search-input" id="wiki-search-input" placeholder="Search by Record Slug…">' +
      "</div>" +
      '<div class="loading-placeholder" id="wiki-loading-indicator">Loading Wikipedia records…</div>' +
      '<div class="table-wrapper is-hidden" id="wiki-table-wrapper">' +
      '<table class="admin-records-table" id="wiki-records-table">' +
      "<thead>" +
      '<tr class="weight-table-header-row">' +
      "<th>Item Slug</th>" +
      "<th>Base Score (Pipeline)</th>" +
      "<th>Administrative Multiplier</th>" +
      "</tr>" +
      "</thead>" +
      '<tbody id="wiki-table-body"></tbody>' +
      "</table>" +
      "</div>",
  );

  // ----- Internal state -----
  var wikiRecords = []; // Array of { id, title, slug, score, weight }

  // ----- Helper: get a reference to the editor column DOM element -----
  function _getEditorEl() {
    return document.getElementById("canvas-col-editor");
  }

  // ----- Fetch data from API -----
  async function fetchWikiRecords() {
    try {
      // Step 1: Get all records (basic info)
      var listResponse = await fetch("/api/admin/records");
      if (!listResponse.ok) throw new Error("Failed to fetch record list");
      var allRecords = await listResponse.json();

      // Step 2: Fetch full details for each record in parallel
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

      // Step 3: Filter records with wikipedia_title and wikipedia_weight
      wikiRecords = [];
      details.forEach(function (d) {
        if (d && d.wikipedia_title && d.wikipedia_title.trim() !== "") {
          var weight = parseFloat(d.wikipedia_weight) || 1.0;
          var baseScore = parseInt(d.wikipedia_rank) || 0;
          wikiRecords.push({
            id: d.id,
            title: d.title || d.wikipedia_title,
            slug: d.slug || "",
            score: baseScore,
            weight: weight,
          });
        }
      });

      return wikiRecords;
    } catch (err) {
      throw err;
    }
  }

  // ----- Render table rows -----
  function renderTable(records) {
    var tbody = document.getElementById("wiki-table-body");
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-table-msg">No Wikipedia-ranked records found.</td></tr>';
      return;
    }

    var html = "";
    records.forEach(function (rec, index) {
      var scoreStr = rec.score.toLocaleString();
      html +=
        "<tr>" +
        "<td>" +
        escapeHtml(rec.slug || rec.title) +
        "</td>" +
        '<td class="score-value-cell">' +
        scoreStr +
        "</td>" +
        "<td>" +
        '<input type="number" step="0.1" value="' +
        rec.weight +
        '" class="weight-number-input" data-record-id="' +
        rec.id +
        '" data-index="' +
        index +
        '"> x' +
        "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;

    // Wire input change tracking
    tbody.querySelectorAll(".weight-number-input").forEach(function (input) {
      input.addEventListener("change", function () {
        var idx = parseInt(this.getAttribute("data-index"), 10);
        var val = parseFloat(this.value);
        if (!isNaN(val) && wikiRecords[idx]) {
          wikiRecords[idx].weight = val;
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
      .replace(/"/g, "&quot;");
  }

  // ----- Load and render -----
  try {
    var records = await fetchWikiRecords();
    document
      .getElementById("wiki-loading-indicator")
      .classList.add("is-hidden");
    document.getElementById("wiki-table-wrapper").classList.remove("is-hidden");

    // Render sub-tab bar into the editor column (prepends above editor content).
    // containerId ("canvas-col-editor") is the DOM id that renderTabBar targets.
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
        "lists-ranks",
      );
    }

    renderTable(records);
  } catch (err) {
    document.getElementById("wiki-loading-indicator").textContent =
      "Error loading records: " + err.message;
    document
      .getElementById("wiki-loading-indicator")
      .classList.remove("loading-placeholder");
    document
      .getElementById("wiki-loading-indicator")
      .classList.add("error-message");
    return;
  }

  // ----- Wire search (filter on slug/title) -----
  var searchInput = document.getElementById("wiki-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var filtered = wikiRecords.filter(function (rec) {
        var text = (rec.slug || rec.title || "").toLowerCase();
        return !q || text.indexOf(q) !== -1;
      });
      renderTable(filtered);
    });
  }

  // ----- Wire COL 1 action buttons -----
  // Add Override button (stub — opens a prompt for a record slug to add)
  var addOverrideBtn = document.getElementById("wiki-add-override-btn");
  if (addOverrideBtn) {
    addOverrideBtn.addEventListener("click", function () {
      var slug = prompt("Enter record slug to add as override:");
      if (slug && slug.trim()) {
        // Check if already in the list
        var exists = wikiRecords.some(function (r) {
          return r.slug === slug.trim();
        });
        if (exists) {
          alert('Record "' + slug.trim() + '" is already in the list.');
          return;
        }
        // Fetch record details to add
        fetch("/api/admin/records")
          .then(function (resp) {
            return resp.json();
          })
          .then(function (data) {
            var records = data.records || [];
            var found = null;
            for (var i = 0; i < records.length; i++) {
              if (records[i].slug === slug.trim()) {
                found = records[i];
                break;
              }
            }
            if (found) {
              // Fetch full detail for wikipedia fields
              fetch("/api/admin/records/" + found.id)
                .then(function (dr) {
                  return dr.json();
                })
                .then(function (detail) {
                  if (
                    detail &&
                    detail.wikipedia_title &&
                    detail.wikipedia_title.trim() !== ""
                  ) {
                    wikiRecords.push({
                      id: detail.id,
                      title: detail.title || detail.wikipedia_title,
                      slug: detail.slug || "",
                      score: parseInt(detail.wikipedia_rank) || 0,
                      weight: parseFloat(detail.wikipedia_weight) || 1.0,
                    });
                    renderTable(wikiRecords);
                  } else {
                    alert(
                      'Record "' +
                        slug.trim() +
                        '" has no wikipedia_title field.',
                    );
                  }
                })
                .catch(function () {
                  alert('Failed to fetch details for "' + slug.trim() + '".');
                });
            } else {
              alert('No record found with slug "' + slug.trim() + '".');
            }
          })
          .catch(function () {
            alert("Failed to fetch records list.");
          });
      }
    });
  }

  // Delete Row button (stub — prompts for slug to remove)
  var deleteRowBtn = document.getElementById("wiki-delete-row-btn");
  if (deleteRowBtn) {
    deleteRowBtn.addEventListener("click", function () {
      var slug = prompt("Enter record slug to remove from the list:");
      if (slug && slug.trim()) {
        var idx = -1;
        for (var i = 0; i < wikiRecords.length; i++) {
          if (wikiRecords[i].slug === slug.trim()) {
            idx = i;
            break;
          }
        }
        if (idx !== -1) {
          wikiRecords.splice(idx, 1);
          renderTable(wikiRecords);
        } else {
          alert('No record with slug "' + slug.trim() + '" found in the list.');
        }
      }
    });
  }

  // ----- Wire save button -----
  var saveBtn = document.getElementById("wiki-save-btn");
  if (saveBtn) {
    var newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener("click", async function () {
      var changedCount = 0;
      var errors = [];

      for (var i = 0; i < wikiRecords.length; i++) {
        var rec = wikiRecords[i];
        var originalWeight = rec.weight; // already updated by input change handler

        try {
          var resp = await fetch("/api/admin/records/" + rec.id, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wikipedia_weight: String(rec.weight),
            }),
          });

          if (resp.ok) {
            changedCount++;
          } else {
            var errData;
            try {
              errData = await resp.json();
            } catch (_) {
              errData = {};
            }
            errors.push(rec.slug + ": " + (errData.detail || resp.statusText));
          }
        } catch (err) {
          errors.push(rec.slug + ": " + err.message);
        }
      }

      // Show save result in the editor column
      var editorEl = _getEditorEl();
      if (!editorEl) return;

      // Remove any existing save-result indicator from the editor column
      var existing = editorEl.querySelector(".save-result-indicator");
      if (existing) existing.remove();

      var indicator = document.createElement("div");
      indicator.className = "save-result-indicator";

      if (errors.length === 0) {
        indicator.textContent =
          "All " + changedCount + " multipliers saved successfully.";
        indicator.classList.add("is-success");
      } else {
        indicator.textContent =
          "Saved " +
          changedCount +
          " of " +
          wikiRecords.length +
          ". Errors: " +
          errors.join("; ");
        indicator.classList.add("is-error");
      }

      editorEl.appendChild(indicator);
    });
  }
};
