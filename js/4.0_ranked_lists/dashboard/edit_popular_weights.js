// =============================================================================
//
//   THE JESUS WEBSITE — EDIT POPULAR WEIGHTS MODULE
//   File:    js/4.0_ranked_lists/dashboard/edit_popular_weights.js
//   Version: 2.0.0
//   Purpose: UI mapping for configuring popular historical challenge rankings.
//            Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §4.3
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditPopularWeights(containerId)
// Function: Fetches popular-challenge records from API, renders editable weight table,
//           and saves changes via PUT
// Output: Injects a weight-configuration table with search and save controls

window.renderEditPopularWeights = async function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ----- Render shell (loading state) -----
  // Output col1 + col2 + col3 inner contents directly into the container
  // (no admin-card or providence-editor-grid wrappers; renderTabBar prepends the sub-tab bar)
  container.innerHTML =
    "<!-- column_one: Action buttons -->" +
    '<button class="blog-editor-action-btn" id="popular-save-btn">Save All Changes</button>' +
    "<!-- column_two: Field documentation -->" +
    '<p class="blog-editor-list-heading">WRITE Fields</p>' +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">popular_challenge_link</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">popular_challenge_title</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">popular_challenge_rank</label>' +
    "</div>" +
    '<div class="blog-editor-field">' +
    '<label class="blog-editor-field-label">popular_challenge_weight</label>' +
    "</div>" +
    "<!-- column_three: Weights table -->" +
    '<div class="search-container">' +
    '<input type="text" class="admin-search-input" id="popular-search-input" placeholder="Search by Record Slug…">' +
    "</div>" +
    '<div class="loading-placeholder" id="popular-loading-indicator">Loading Popular Challenge records…</div>' +
    '<div class="table-wrapper is-hidden" id="popular-table-wrapper">' +
    '<table class="admin-records-table" id="popular-records-table">' +
    "<thead>" +
    '<tr class="weight-table-header-row">' +
    "<th>Challenge Slug</th>" +
    "<th>Base Score (Pipeline)</th>" +
    "<th>Administrative Multiplier</th>" +
    "</tr>" +
    "</thead>" +
    '<tbody id="popular-table-body"></tbody>' +
    "</table>" +
    "</div>";

  // ----- Internal state -----
  var popularRecords = [];

  // ----- Fetch data from API -----
  async function fetchPopularRecords() {
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

      popularRecords = [];
      details.forEach(function (d) {
        if (
          d &&
          d.popular_challenge_title &&
          d.popular_challenge_title.trim() !== ""
        ) {
          var weight = parseFloat(d.popular_challenge_weight) || 1.0;
          var baseScore = parseInt(d.popular_challenge_rank) || 0;
          popularRecords.push({
            id: d.id,
            title: d.title || d.popular_challenge_title,
            slug: d.slug || "",
            score: baseScore,
            weight: weight,
          });
        }
      });

      return popularRecords;
    } catch (err) {
      throw err;
    }
  }

  // ----- Render table rows -----
  function renderTable(records) {
    var tbody = document.getElementById("popular-table-body");
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-table-msg">No Popular Challenge records found.</td></tr>';
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
        if (!isNaN(val) && popularRecords[idx]) {
          popularRecords[idx].weight = val;
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
    var records = await fetchPopularRecords();
    document
      .getElementById("popular-loading-indicator")
      .classList.add("is-hidden");
    document
      .getElementById("popular-table-wrapper")
      .classList.remove("is-hidden");
    // Render sub-tab bar as first element of the editor column
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
    document.getElementById("popular-loading-indicator").textContent =
      "Error loading records: " + err.message;
    document
      .getElementById("popular-loading-indicator")
      .classList.remove("loading-placeholder");
    document
      .getElementById("popular-loading-indicator")
      .classList.add("error-message");
    return;
  }

  // ----- Wire search (filter on slug/title) -----
  var searchInput = document.getElementById("popular-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var filtered = popularRecords.filter(function (rec) {
        var text = (rec.slug || rec.title || "").toLowerCase();
        return !q || text.indexOf(q) !== -1;
      });
      renderTable(filtered);
    });
  }

  // ----- Wire save button -----
  var saveBtn = document.getElementById("popular-save-btn");
  if (saveBtn) {
    var newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener("click", async function () {
      var changedCount = 0;
      var errors = [];

      for (var i = 0; i < popularRecords.length; i++) {
        var rec = popularRecords[i];
        try {
          var resp = await fetch("/api/admin/records/" + rec.id, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              popular_challenge_weight: String(rec.weight),
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
          popularRecords.length +
          ". Errors: " +
          errors.join("; ");
        indicator.classList.add("is-error");
      }

      var existing = container.querySelector(".save-result-indicator");
      if (existing) existing.remove();
      indicator.classList.add("save-result-indicator");
      container.appendChild(indicator);
    });
  }
};
