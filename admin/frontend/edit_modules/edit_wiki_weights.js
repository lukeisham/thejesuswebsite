// =============================================================================
//
//   THE JESUS WEBSITE — EDIT WIKI WEIGHTS MODULE
//   File:    admin/frontend/edit_modules/edit_wiki_weights.js
//   Version: 2.0.0
//   Purpose: Table UI to adjust numerical ranking multipliers for Wikipedia lists.
//            Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §4.1
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditWikiWeights(containerId)
// Function: Fetches Wikipedia-ranked records from API, renders editable weight table,
//           and saves changes via PUT
// Output: Injects a weight-management table with search and save controls

window.renderEditWikiWeights = async function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ----- Render shell (loading state) -----
  container.innerHTML =
    '<div class="admin-card" id="edit-wiki-weights-card">' +
    '<div class="action-bar-header">' +
    "<h2>RANKED LIST: Wikipedia Weights</h2>" +
    '<button class="quick-action-btn" id="wiki-save-btn">Save All Multipliers</button>' +
    "</div>" +
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
    "</div>" +
    '<div class="action-bar-footer is-hidden" id="wiki-footer-bar">' +
    '<button class="btn-outline-primary" id="wiki-add-override-btn">+ Add Custom Override Reference</button>' +
    "</div>" +
    "</div>";

  // ----- Internal state -----
  var wikiRecords = []; // Array of { id, title, slug, score, weight }

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
    document.getElementById("wiki-footer-bar").classList.remove("is-hidden");
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
          wikiRecords.length +
          ". Errors: " +
          errors.join("; ");
        indicator.classList.add("is-error");
      }

      var card = document.getElementById("edit-wiki-weights-card");
      var existing = card.querySelector(".save-result-indicator");
      if (existing) existing.remove();
      indicator.classList.add("save-result-indicator");
      card.appendChild(indicator);
    });
  }
};
