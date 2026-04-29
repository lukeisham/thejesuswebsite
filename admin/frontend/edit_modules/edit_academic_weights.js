// =============================================================================
//
//   THE JESUS WEBSITE — EDIT ACADEMIC WEIGHTS MODULE
//   File:    admin/frontend/edit_modules/edit_academic_weights.js
//   Version: 2.0.0
//   Purpose: UI mapping for configuring academic historical debate rankings.
//            Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §4.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditAcademicWeights(containerId)
// Function: Fetches academic-challenge records from API, renders editable weight table,
//           and saves changes via PUT
// Output: Injects a weight-configuration table with search and save controls

window.renderEditAcademicWeights = async function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ----- Render shell (loading state) -----
  container.innerHTML =
    '<div class="admin-card" id="edit-academic-weights-card">' +
    '<div class="providence-editor-grid">' +
    "<!-- COL 1: Action buttons -->" +
    '<div class="providence-editor-col-actions">' +
    '<button class="blog-editor-action-btn" id="academic-save-btn">Save All Changes</button>' +
    "</div>" +
    "<!-- COL 2: Field documentation -->" +
    '<div class="providence-editor-col-list">' +
    '<p class="blog-editor-list-heading">WRITE Fields</p>' +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">academic_challenge_link</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">academic_challenge_title</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">academic_challenge_rank</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">academic_challenge_weight</label>' +
    "</div>" +
    "</div>" +
    "<!-- COL 3: Weights table -->" +
    '<div class="providence-editor-col-editor">' +
    '<div class="search-container">' +
    '<input type="text" class="admin-search-input" id="academic-search-input" placeholder="Search by Record Slug…">' +
    "</div>" +
    '<div class="loading-placeholder" id="academic-loading-indicator">Loading Academic Debate records…</div>' +
    '<div class="table-wrapper is-hidden" id="academic-table-wrapper">' +
    '<table class="admin-records-table" id="academic-records-table">' +
    "<thead>" +
    '<tr class="weight-table-header-row">' +
    "<th>Challenge Slug</th>" +
    "<th>Base Score (Pipeline)</th>" +
    "<th>Administrative Multiplier</th>" +
    "</tr>" +
    "</thead>" +
    '<tbody id="academic-table-body"></tbody>' +
    "</table>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>";

  // ----- Internal state -----
  var academicRecords = [];

  // ----- Fetch data from API -----
  async function fetchAcademicRecords() {
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

      academicRecords = [];
      details.forEach(function (d) {
        if (
          d &&
          d.academic_challenge_title &&
          d.academic_challenge_title.trim() !== ""
        ) {
          var weight = parseFloat(d.academic_challenge_weight) || 1.0;
          var baseScore = parseInt(d.academic_challenge_rank) || 0;
          academicRecords.push({
            id: d.id,
            title: d.title || d.academic_challenge_title,
            slug: d.slug || "",
            score: baseScore,
            weight: weight,
          });
        }
      });

      return academicRecords;
    } catch (err) {
      throw err;
    }
  }

  // ----- Render table rows -----
  function renderTable(records) {
    var tbody = document.getElementById("academic-table-body");
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-table-msg">No Academic Debate records found.</td></tr>';
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
        if (!isNaN(val) && academicRecords[idx]) {
          academicRecords[idx].weight = val;
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
    var records = await fetchAcademicRecords();
    document
      .getElementById("academic-loading-indicator")
      .classList.add("is-hidden");
    document
      .getElementById("academic-table-wrapper")
      .classList.remove("is-hidden");
    // Render top-level section tab bar (Lists & Ranks active)
    if (typeof window.renderTabBar === "function") {
      window.renderTabBar(
        "edit-academic-weights-card",
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
    document.getElementById("academic-loading-indicator").textContent =
      "Error loading records: " + err.message;
    document
      .getElementById("academic-loading-indicator")
      .classList.remove("loading-placeholder");
    document
      .getElementById("academic-loading-indicator")
      .classList.add("error-message");
    return;
  }

  // ----- Wire search (filter on slug/title) -----
  var searchInput = document.getElementById("academic-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var filtered = academicRecords.filter(function (rec) {
        var text = (rec.slug || rec.title || "").toLowerCase();
        return !q || text.indexOf(q) !== -1;
      });
      renderTable(filtered);
    });
  }

  // ----- Wire save button -----
  var saveBtn = document.getElementById("academic-save-btn");
  if (saveBtn) {
    var newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener("click", async function () {
      var changedCount = 0;
      var errors = [];

      for (var i = 0; i < academicRecords.length; i++) {
        var rec = academicRecords[i];
        try {
          var resp = await fetch("/api/admin/records/" + rec.id, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              academic_challenge_weight: String(rec.weight),
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

      // Show save result
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
          academicRecords.length +
          ". Errors: " +
          errors.join("; ");
        indicator.classList.add("is-error");
      }

      var card = document.getElementById("edit-academic-weights-card");
      var existing = card.querySelector(".save-result-indicator");
      if (existing) existing.remove();
      indicator.classList.add("save-result-indicator");
      card.appendChild(indicator);
    });
  }
};
