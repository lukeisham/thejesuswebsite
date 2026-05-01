// =============================================================================
//   THE JESUS WEBSITE — DASHBOARD MODULE ROUTER
//   File:    js/7.0_system/dashboard/dashboard_app.js
//   Version: 3.1.0
//   Purpose: Pure module router — maps module names to editor render functions
//            and populates the three permanent Providence grid columns inside
//            #admin-canvas. No shell rendering, no event wiring.
//
//   IMMUTABLE SHELL CONTRACT: The three Providence column divs
//   (#canvas-col-actions, #canvas-col-list, #canvas-col-editor) are permanent
//   structural elements — never destroyed or replaced. Only their inner content
//   children are cleared and repopulated via _setColumn(). No module may call
//   innerHTML = "" or innerHTML = "..." directly on a column ID.
// =============================================================================

// Trigger: Called by dashboard_init.js (on DOMContentLoaded) to load the default
//         module, or by render_tab_bar.js click handler when a tab is clicked
// Function: Clears child content from all three Providence columns, updates
//           is-active on #module-tab-bar, routes module name to the correct
//           editor render function, and populates #canvas-col-actions,
//           #canvas-col-list, and #canvas-col-editor.
// Output: #module-tab-bar active state updated, Providence columns populated

var _providenceColumns = null;

function _getColumns() {
  if (!_providenceColumns) {
    _providenceColumns = {
      actions: document.getElementById("canvas-col-actions"),
      list: document.getElementById("canvas-col-list"),
      editor: document.getElementById("canvas-col-editor"),
    };
  }
  return _providenceColumns;
}

// Clears only injected content children from a single Providence column.
// The column div itself is an immutable shell element — never destroyed.
function _clearColumnContent(colName) {
  var cols = _getColumns();
  var el = cols[colName];
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function _clearColumns() {
  _clearColumnContent("actions");
  _clearColumnContent("list");
  _clearColumnContent("editor");
  // Reset grid to default 1fr/2fr ratio (T9)
  _setGridColumns("1fr", "2fr");
}

function _setColumn(colName, html) {
  var cols = _getColumns();
  var el = cols[colName];
  if (!el) return;
  // Use insertAdjacentHTML to add content without destroying the column div
  el.insertAdjacentHTML("beforeend", html);
}

// T9: Set variable column widths via CSS custom properties on the grid.
// twoFr / threeFr replace the default 1fr / 2fr track sizes.
function _setGridColumns(twoFr, threeFr) {
  var canvas = document.getElementById("admin-canvas");
  if (!canvas) return;
  canvas.style.setProperty("--editor-col-two-fr", twoFr);
  canvas.style.setProperty("--editor-col-three-fr", threeFr);
}

async function loadModule(moduleName) {
  _clearColumns();

  // Update is-active state on the top-level module tab bar
  var moduleTabBar = document.getElementById("module-tab-bar");
  if (moduleTabBar) {
    var allButtons = moduleTabBar.querySelectorAll("[data-module]");
    allButtons.forEach(function (btn) {
      btn.classList.remove("is-active");
    });
    var activeBtn = moduleTabBar.querySelector(
      '[data-module="' + moduleName + '"]',
    );
    if (activeBtn) {
      activeBtn.classList.add("is-active");
    }
  }

  // ========================================================================
  //   ROUTE TABLE
  // ========================================================================

  if (moduleName === "records-all") {
    _loadRecordsAll();
    return;
  }

  if (moduleName === "records-edit") {
    _loadRecordsEdit();
    return;
  }

  if (
    moduleName === "records-new" &&
    typeof window.renderEditRecord === "function"
  ) {
    window.renderEditRecord("canvas-col-editor", null, true);
    return;
  }

  if (
    moduleName === "ranks-wikipedia" &&
    typeof window.renderEditWikiWeights === "function"
  ) {
    window.renderEditWikiWeights("canvas-col-editor");
    return;
  }

  if (moduleName === "ranks-challenges") {
    _loadRanksChallenges();
    return;
  }

  if (
    moduleName === "lists-ordinary" &&
    typeof window.renderEditLists === "function"
  ) {
    _loadListsOrdinary();
    return;
  }

  if (moduleName === "ranks-responses") {
    _loadRanksResponses();
    return;
  }

  if (
    moduleName === "records-bulk" &&
    typeof window.renderBulkUpload === "function"
  ) {
    window.renderBulkUpload("canvas-col-editor");
    return;
  }

  if (moduleName === "text-essays") {
    _loadTextEssays();
    return;
  }

  if (
    moduleName === "text-responses" &&
    typeof window.renderEditResponse === "function"
  ) {
    window.renderEditResponse("canvas-col-editor");
    return;
  }

  if (moduleName === "text-news") {
    _loadTextNews();
    return;
  }

  if (
    moduleName === "text-blog" &&
    typeof window.renderEditBlogpost === "function"
  ) {
    window.renderEditBlogpost("canvas-col-editor");
    return;
  }

  if (
    moduleName === "config-arbor" &&
    typeof window.renderEditDiagram === "function"
  ) {
    window.renderEditDiagram("canvas-col-editor");
    return;
  }

  if (
    moduleName === "system-admin" &&
    typeof window.renderEditMlaSources === "function"
  ) {
    window.renderEditMlaSources("canvas-col-editor");
    return;
  }

  // ========================================================================
  //   FALLBACK PLACEHOLDER
  // ========================================================================
  _setColumn(
    "actions",
    '<h3 class="text-muted" style="font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em;">Actions</h3>' +
      '<button class="quick-action-btn" disabled>Save Changes</button>' +
      '<button class="quick-action-btn" disabled>Discard</button>',
  );
  _setColumn(
    "list",
    '<h3 class="text-muted" style="font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em;">Module: ' +
      moduleName +
      "</h3>" +
      '<p class="text-sm text-muted">Fields pending implementation</p>' +
      '<dl class="system-meta">' +
      "<dt>Status:</dt><dd>Placeholder</dd>" +
      "<dt>Layout:</dt><dd>Providence Grid</dd>" +
      "</dl>",
  );
  _setColumn(
    "editor",
    '<p class="text-sm text-muted">Select a module from the tab bar to begin editing.</p>',
  );
}

// ============================================================================
//   INLINE MODULE BUILDERS
//   Each populates the three Providence columns directly via _setColumn().
//   Never sets innerHTML directly on a Providence column div.
// ============================================================================

// --- records-all ------------------------------------------------------------

function _loadRecordsAll() {
  _setColumn(
    "editor",
    '<div class="admin-card"><h2>Loading Records...</h2></div>',
  );

  fetch("/api/admin/records")
    .then(function (response) {
      if (!response.ok) throw new Error("Failed to fetch records");
      return response.json();
    })
    .then(function (data) {
      var records = data.records || [];

      if (!Array.isArray(records) || records.length === 0) {
        _clearColumnContent("editor");
        _setColumn(
          "editor",
          '<div class="admin-card"><h2>No Records Found</h2>' +
            "<p>There are no records in the database yet. " +
            '<a href="#" data-module="records-new">Create one</a>.</p></div>',
        );
        return;
      }

      var pageSize = 15;
      var currentPage = 1;
      var searchQuery = "";

      function renderRecordList() {
        var filtered = records;
        if (searchQuery.trim()) {
          var q = searchQuery.trim().toLowerCase();
          filtered = records.filter(function (r) {
            return (
              (r.title && r.title.toLowerCase().includes(q)) ||
              (r.primary_verse && r.primary_verse.toLowerCase().includes(q))
            );
          });
        }

        var totalPages = Math.ceil(filtered.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        if (currentPage < 1) currentPage = 1;

        var start = (currentPage - 1) * pageSize;
        var page = filtered.slice(start, start + pageSize);

        var rowsHtml = page
          .map(function (r) {
            var verseDisplay = r.primary_verse
              ? typeof r.primary_verse === "string"
                ? r.primary_verse
                : JSON.stringify(r.primary_verse)
              : "—";
            return (
              "<tr>" +
              "<td><strong>" +
              (r.title || "Untitled") +
              "</strong></td>" +
              '<td class="text-sm text-muted">' +
              verseDisplay +
              "</td>" +
              "<td>" +
              '<button class="quick-action-btn js-edit-record" data-record-id="' +
              r.id +
              '">Edit</button>' +
              '<button class="quick-action-btn btn-delete-record js-delete-record" data-record-id="' +
              r.id +
              '">Delete</button>' +
              "</td>" +
              "</tr>"
            );
          })
          .join("");

        var totalText = searchQuery.trim()
          ? "Showing " + filtered.length + " of " + records.length + " records"
          : records.length + " records total";

        _clearColumnContent("actions");
        _setColumn(
          "actions",
          '<button class="blog-editor-action-btn" data-module="records-new">+ New Record</button>' +
            '<button class="blog-editor-action-btn" data-module="records-bulk">Bulk Upload CSV</button>',
        );

        _clearColumnContent("list");
        _setColumn(
          "list",
          "<p>Records Overview</p>" +
            '<p class="text-sm text-muted">' +
            totalText +
            "</p>",
        );

        _clearColumnContent("editor");
        _setColumn(
          "editor",
          '<div class="search-container">' +
            '<input type="text" id="records-search-input" class="admin-search-input" ' +
            'placeholder="Search by title or primary verse..." value="' +
            searchQuery +
            '">' +
            "</div>" +
            '<div class="table-wrapper">' +
            '<table class="admin-records-table">' +
            "<thead><tr><th>Title</th><th>Primary Verse</th><th>Actions</th></tr></thead>" +
            "<tbody>" +
            rowsHtml +
            "</tbody>" +
            "</table>" +
            "</div>" +
            (totalPages > 1
              ? '<div class="pagination-controls">' +
                '<button class="quick-action-btn pagination-btn js-prev-page" ' +
                (currentPage <= 1 ? "disabled" : "") +
                ">Previous</button>" +
                '<span class="pagination-info">Page ' +
                currentPage +
                " of " +
                totalPages +
                "</span>" +
                '<button class="quick-action-btn pagination-btn js-next-page" ' +
                (currentPage >= totalPages ? "disabled" : "") +
                ">Next</button>" +
                "</div>"
              : ""),
        );

        // Wire column_one action buttons
        var actionsCol = _getColumns().actions;
        if (actionsCol) {
          actionsCol.querySelectorAll("[data-module]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var mod = this.getAttribute("data-module");
              if (mod && typeof window.loadModule === "function") {
                window.loadModule(mod);
              }
            });
          });
        }

        // Wire search input
        var searchInput = document.getElementById("records-search-input");
        if (searchInput) {
          searchInput.addEventListener("input", function () {
            searchQuery = this.value;
            currentPage = 1;
            renderRecordList();
          });
        }

        // Wire edit buttons
        var editorCol = _getColumns().editor;
        if (editorCol) {
          editorCol.querySelectorAll(".js-edit-record").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var recordId = this.getAttribute("data-record-id");
              if (typeof window.loadModule === "function") {
                // Store recordId for _loadRecordsEdit to pick up
                window._pendingEditRecordId = recordId;
                window.loadModule("records-edit");
              }
            });
          });
        }

        // Wire delete buttons
        if (editorCol) {
          editorCol
            .querySelectorAll(".js-delete-record")
            .forEach(function (btn) {
              btn.addEventListener("click", async function () {
                var recordId = this.getAttribute("data-record-id");
                if (!confirm("Are you sure you want to delete this record?"))
                  return;

                try {
                  var delResp = await fetch("/api/admin/records/" + recordId, {
                    method: "DELETE",
                  });
                  if (!delResp.ok) throw new Error("Delete failed");
                  var idx = records.findIndex(function (r) {
                    return r.id === recordId;
                  });
                  if (idx !== -1) records.splice(idx, 1);
                  renderRecordList();
                } catch (err) {
                  console.error("Delete error:", err);
                  alert("Failed to delete record. See console for details.");
                }
              });
            });
        }

        // Wire pagination
        if (editorCol) {
          var prevBtn = editorCol.querySelector(".js-prev-page");
          if (prevBtn) {
            prevBtn.addEventListener("click", function () {
              if (currentPage > 1) {
                currentPage--;
                renderRecordList();
              }
            });
          }

          var nextBtn = editorCol.querySelector(".js-next-page");
          if (nextBtn) {
            nextBtn.addEventListener("click", function () {
              if (currentPage < totalPages) {
                currentPage++;
                renderRecordList();
              }
            });
          }
        }
      }

      renderRecordList();
    })
    .catch(function (err) {
      console.error("Error loading records:", err);
      _clearColumnContent("editor");
      _setColumn(
        "editor",
        '<div class="admin-card"><h2>Error Loading Records</h2>' +
          "<p>Could not fetch records from the server. Please try again later.</p></div>",
      );
    });
}

// --- records-edit (single record editor) ---------------------------------

function _loadRecordsEdit() {
  if (typeof window.renderEditRecord === "function") {
    var recordId = window._pendingEditRecordId || null;
    window._pendingEditRecordId = null;
    window.renderEditRecord("canvas-col-editor", recordId, true);
  }
}

// --- ranks-challenges (2-tab inline) ---------------------------------------

function _loadRanksChallenges() {
  _setColumn(
    "editor",
    '<div class="admin-tab-bar" id="ranks-challenges-tab-bar">' +
      '<button class="admin-tab-btn is-active" data-tab="academic">Academic Challenges</button>' +
      '<button class="admin-tab-btn" data-tab="popular">Popular Challenges</button>' +
      "</div>" +
      '<div id="tab-content-ranks-challenges-academic"></div>' +
      '<div id="tab-content-ranks-challenges-popular" class="is-hidden"></div>',
  );

  if (typeof window.renderEditAcademicWeights === "function") {
    window.renderEditAcademicWeights("tab-content-ranks-challenges-academic");
  }

  document
    .getElementById("ranks-challenges-tab-bar")
    .addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");

      this.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
      });
      tabBtn.classList.add("is-active");

      var academicPane = document.getElementById(
        "tab-content-ranks-challenges-academic",
      );
      var popularPane = document.getElementById(
        "tab-content-ranks-challenges-popular",
      );

      academicPane.classList.add("is-hidden");
      popularPane.classList.add("is-hidden");

      if (tab === "academic") {
        academicPane.classList.remove("is-hidden");
        if (
          academicPane.innerHTML.trim() === "" &&
          typeof window.renderEditAcademicWeights === "function"
        ) {
          window.renderEditAcademicWeights(
            "tab-content-ranks-challenges-academic",
          );
        }
      } else if (tab === "popular") {
        popularPane.classList.remove("is-hidden");
        if (
          popularPane.innerHTML.trim() === "" &&
          typeof window.renderEditPopularWeights === "function"
        ) {
          window.renderEditPopularWeights(
            "tab-content-ranks-challenges-popular",
          );
        }
      }
    });
}

// --- lists-ordinary (dropdown + load) --------------------------------------

function _loadListsOrdinary() {
  var listNames = [
    "Events",
    "External witnesses",
    "Internal witnesses",
    "Manuscripts",
    "Miracles",
    "OT Verses",
    "Objects",
    "People",
    "Places",
    "Sermons and Sayings",
    "Sites",
    "Sources",
    "World Events",
  ];

  var listOptions = listNames
    .map(function (name) {
      return '<option value="' + name + '">' + name + "</option>";
    })
    .join("");

  _setColumn(
    "list",
    '<h2 style="font-family: var(--font-heading); font-size: var(--text-lg);">Edit Resource List</h2>' +
      '<label class="list-select-label" for="resource-list-select">Select a resource list:</label>',
  );

  _setColumn(
    "editor",
    '<div class="list-select-row">' +
      '<select id="resource-list-select" class="admin-search-input list-select-input">' +
      listOptions +
      "</select>" +
      '<button class="quick-action-btn" id="load-resource-list-btn">Load List</button>' +
      "</div>",
  );

  document
    .getElementById("load-resource-list-btn")
    .addEventListener("click", function () {
      var selected = document.getElementById("resource-list-select").value;
      window.renderEditLists("canvas-col-editor", selected);
    });

  document
    .getElementById("resource-list-select")
    .addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        document.getElementById("load-resource-list-btn").click();
      }
    });
}

// --- ranks-responses (2-tab inline) ----------------------------------------

function _loadRanksResponses() {
  _setColumn(
    "editor",
    '<div class="admin-tab-bar" id="ranks-responses-tab-bar">' +
      '<button class="admin-tab-btn is-active" data-tab="academic">Academic Challenges</button>' +
      '<button class="admin-tab-btn" data-tab="popular">Popular Challenges</button>' +
      "</div>" +
      '<div id="tab-content-ranks-responses-academic" class="admin-tab-content"></div>' +
      '<div id="tab-content-ranks-responses-popular" class="admin-tab-content is-hidden"></div>',
  );

  if (typeof window.renderEditInsertResponseAcademic === "function") {
    window.renderEditInsertResponseAcademic(
      "tab-content-ranks-responses-academic",
    );
  }

  document
    .getElementById("ranks-responses-tab-bar")
    .addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");

      this.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
      });
      tabBtn.classList.add("is-active");

      var academicPane = document.getElementById(
        "tab-content-ranks-responses-academic",
      );
      var popularPane = document.getElementById(
        "tab-content-ranks-responses-popular",
      );

      academicPane.classList.add("is-hidden");
      popularPane.classList.add("is-hidden");

      if (tab === "academic") {
        academicPane.classList.remove("is-hidden");
        if (
          academicPane.innerHTML.trim() === "" &&
          typeof window.renderEditInsertResponseAcademic === "function"
        ) {
          window.renderEditInsertResponseAcademic(
            "tab-content-ranks-responses-academic",
          );
        }
      } else if (tab === "popular") {
        popularPane.classList.remove("is-hidden");
        if (
          popularPane.innerHTML.trim() === "" &&
          typeof window.renderEditInsertResponsePopular === "function"
        ) {
          window.renderEditInsertResponsePopular(
            "tab-content-ranks-responses-popular",
          );
        }
      }
    });
}

// --- text-essays (2-tab inline) --------------------------------------------

function _loadTextEssays() {
  _setColumn(
    "editor",
    '<div class="admin-tab-bar" id="essays-tab-bar">' +
      '<button class="admin-tab-btn is-active" data-tab="essay">Context Essay</button>' +
      '<button class="admin-tab-btn" data-tab="historiography">Historiography</button>' +
      "</div>" +
      '<div id="tab-content-essay" class="admin-tab-content"></div>' +
      '<div id="tab-content-historiography" class="admin-tab-content is-hidden"></div>',
  );

  if (typeof window.renderEditEssay === "function") {
    window.renderEditEssay("tab-content-essay");
  }

  document
    .getElementById("essays-tab-bar")
    .addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");

      this.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
      });
      tabBtn.classList.add("is-active");

      var essayPane = document.getElementById("tab-content-essay");
      var histPane = document.getElementById("tab-content-historiography");

      if (tab === "essay") {
        essayPane.classList.remove("is-hidden");
        histPane.classList.add("is-hidden");
      } else {
        histPane.classList.remove("is-hidden");
        essayPane.classList.add("is-hidden");
        if (
          histPane.innerHTML.trim() === "" &&
          typeof window.renderEditHistoriography === "function"
        ) {
          window.renderEditHistoriography("tab-content-historiography");
        }
      }
    });
}

// Expose loadModule globally for dashboard_init.js, render_tab_bar.js, and other modules
window.loadModule = loadModule;

// --- text-news (2-tab inline) ----------------------------------------------

function _loadTextNews() {
  _setColumn(
    "editor",
    '<div class="admin-tab-bar" id="news-tab-bar">' +
      '<button class="admin-tab-btn is-active" data-tab="snippet">News Snippet</button>' +
      '<button class="admin-tab-btn" data-tab="sources">News Sources</button>' +
      "</div>" +
      '<div id="tab-content-news-snippet"></div>' +
      '<div id="tab-content-news-sources" class="is-hidden"></div>',
  );

  if (typeof window.renderEditNewsSnippet === "function") {
    window.renderEditNewsSnippet("tab-content-news-snippet");
  }

  document
    .getElementById("news-tab-bar")
    .addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");

      this.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
      });
      tabBtn.classList.add("is-active");

      var snippetPane = document.getElementById("tab-content-news-snippet");
      var sourcesPane = document.getElementById("tab-content-news-sources");

      snippetPane.classList.add("is-hidden");
      sourcesPane.classList.add("is-hidden");

      if (tab === "snippet") {
        snippetPane.classList.remove("is-hidden");
        if (
          snippetPane.innerHTML.trim() === "" &&
          typeof window.renderEditNewsSnippet === "function"
        ) {
          window.renderEditNewsSnippet("tab-content-news-snippet");
        }
      } else if (tab === "sources") {
        sourcesPane.classList.remove("is-hidden");
        if (
          sourcesPane.innerHTML.trim() === "" &&
          typeof window.renderEditNewsSources === "function"
        ) {
          window.renderEditNewsSources("tab-content-news-sources");
        }
      }
    });
}
