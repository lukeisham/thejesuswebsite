// =============================================================================
//   THE JESUS WEBSITE — DASHBOARD MODULE ROUTER
//   File:    js/7.0_system/dashboard/dashboard_app.js
//   Version: 2.0.0
//   Purpose: Pure module router — maps module names to editor render functions
//            and populates #admin-canvas. No shell rendering, no event wiring.
// =============================================================================

// Trigger: Called by dashboard_init.js (on DOMContentLoaded) to load the default
//         module, or by render_tab_bar.js click handler when a tab is clicked
// Function: Updates is-active on #module-tab-bar, routes module name to the
//           correct editor render function, and populates #admin-canvas.
//           Clicking the active tab re-renders the module fresh.
// Output: #module-tab-bar active state updated, #admin-canvas populated with
//         the routed editor view

async function loadModule(moduleName) {
  const canvas = document.getElementById("admin-canvas");
  if (!canvas) return;

  // Update is-active state on the top-level module tab bar
  var moduleTabBar = document.getElementById("module-tab-bar");
  if (moduleTabBar) {
    var allButtons = moduleTabBar.querySelectorAll("[data-module]");
    allButtons.forEach(function (btn) {
      btn.classList.remove("is-active");
    });
    var activeBtn = moduleTabBar.querySelector('[data-module="' + moduleName + '"]');
    if (activeBtn) {
      activeBtn.classList.add("is-active");
    }
  }

  // ===== Route Checklist (Module 7.1 Dashboard Router) =====
  // records-new       → direct renderEditRecord(canvas, null)
  // records-edit      → inline list + pagination + search
  // ranks-wikipedia   → direct renderEditWikiWeights(canvas)        [NEW]
  // ranks-challenges  → 2-tab (Academic default / Popular lazy)     [NEW]
  // lists-resources   → dropdown + load → renderEditLists(canvas, name)
  // ranks-responses   → 2-tab (Academic default / Popular lazy)
  // records-bulk      → direct renderBulkUpload(canvas)
  // text-essays       → 2-tab (Context Essay default / Historiography lazy)
  // text-responses    → direct renderEditResponse(canvas)
  // text-news         → 2-tab (News Snippet default / News Sources lazy) [NEW]
  // text-blog         → direct renderEditBlogpost(canvas)           [FIXED]
  // text-mla          → direct renderEditMlaSources(canvas)         [NEW]
  // config-diagrams   → direct renderEditDiagram(canvas)
  // config-news       → direct renderEditNewsSources(canvas)        [typeof guard]
  // Fallback placeholder for unknown module names
  // NOTE: ranks-weights removed — split into ranks-wikipedia + ranks-challenges
  // ============================================================

  if (
    moduleName === "records-new" &&
    typeof window.renderEditRecord === "function"
  ) {
    window.renderEditRecord("admin-canvas", null);
    return;
  }


  if (moduleName === "records-edit") {
    canvas.innerHTML =
      '<div class="admin-card"><h2>Loading Records...</h2></div>';

    try {
      const response = await fetch("/api/admin/records");
      if (!response.ok) throw new Error("Failed to fetch records");
      const data = await response.json();
      const records = data.records || [];

      if (!Array.isArray(records) || records.length === 0) {
        canvas.innerHTML =
          '<div class="admin-card"><h2>No Records Found</h2><p>There are no records in the database yet. <a href="#" data-module="records-new">Create one</a>.</p></div>';
        return;
      }

      // Pagination state
      const pageSize = 15;
      let currentPage = 1;
      let searchQuery = "";

      function renderRecordList() {
        // Filter by search query
        let filtered = records;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          filtered = records.filter(
            (r) =>
              (r.title && r.title.toLowerCase().includes(q)) ||
              (r.primary_verse && r.primary_verse.toLowerCase().includes(q)),
          );
        }

        const totalPages = Math.ceil(filtered.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * pageSize;
        const page = filtered.slice(start, start + pageSize);

        let rowsHtml = page
          .map((r) => {
            const verseDisplay = r.primary_verse
              ? typeof r.primary_verse === "string"
                ? r.primary_verse
                : JSON.stringify(r.primary_verse)
              : "—";
            return `
                        <tr>
                            <td><strong>${r.title || "Untitled"}</strong></td>
                            <td class="text-sm text-muted">${verseDisplay}</td>
                            <td>
                                <button class="quick-action-btn js-edit-record" data-record-id="${r.id}">Edit</button>
                                <button class="quick-action-btn btn-delete-record js-delete-record" data-record-id="${r.id}">Delete</button>
                            </td>
                        </tr>
                    `;
          })
          .join("");

        const totalText = searchQuery.trim()
          ? `Showing ${filtered.length} of ${records.length} records`
          : `${records.length} records total`;

        canvas.innerHTML = `
                    <div class="admin-card" id="records-list-card">
                        <div class="providence-editor-grid">
                            <!-- column_one: Action buttons -->
                            <div class="providence-editor-col-actions">
                                <button class="blog-editor-action-btn" data-module="records-new">+ New Record</button>
                                <button class="blog-editor-action-btn" data-module="records-bulk">Bulk Upload CSV</button>
                            </div>

                            <!-- column_two: Reserved for future metadata use -->
                            <div class="providence-editor-col-list">
                                <p class="blog-editor-list-heading">Records Overview</p>
                                <p class="text-sm text-muted">${totalText}</p>
                            </div>

                            <!-- column_three: Search + paginated table -->
                            <div class="providence-editor-col-editor">
                                <div class="search-container">
                                    <input type="text" id="records-search-input" class="admin-search-input"
                                        placeholder="Search by title or primary verse..." value="${searchQuery}">
                                </div>

                                <div class="table-wrapper">
                                    <table class="admin-records-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Primary Verse</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rowsHtml}
                                        </tbody>
                                    </table>
                                </div>

                                ${
                                  totalPages > 1
                                    ? `
                                <div class="pagination-controls">
                                    <button class="quick-action-btn pagination-btn js-prev-page" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
                                    <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
                                    <button class="quick-action-btn pagination-btn js-next-page" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                `;

        // Wire column_one action buttons (New Record, Bulk Upload)
        canvas
          .querySelectorAll(".providence-editor-col-actions [data-module]")
          .forEach(function (btn) {
            btn.addEventListener("click", function () {
              var moduleName = this.getAttribute("data-module");
              if (moduleName && typeof window.loadModule === "function") {
                window.loadModule(moduleName);
              }
            });
          });

        // Wire search input
        const searchInput = document.getElementById("records-search-input");
        if (searchInput) {
          searchInput.addEventListener("input", function () {
            searchQuery = this.value;
            currentPage = 1;
            renderRecordList();
          });
        }

        // Wire edit buttons
        canvas.querySelectorAll(".js-edit-record").forEach((btn) => {
          btn.addEventListener("click", function () {
            const recordId = this.getAttribute("data-record-id");
            if (typeof window.renderEditRecord === "function") {
              window.renderEditRecord("admin-canvas", recordId);
            } else {
              console.error("renderEditRecord not available");
            }
          });
        });

        // Wire delete buttons
        canvas.querySelectorAll(".js-delete-record").forEach((btn) => {
          btn.addEventListener("click", async function () {
            const recordId = this.getAttribute("data-record-id");
            if (!confirm("Are you sure you want to delete this record?"))
              return;

            try {
              const delResp = await fetch(`/api/admin/records/${recordId}`, {
                method: "DELETE",
              });
              if (!delResp.ok) throw new Error("Delete failed");
              // Remove from local array and re-render
              const idx = records.findIndex((r) => r.id === recordId);
              if (idx !== -1) records.splice(idx, 1);
              renderRecordList();
            } catch (err) {
              console.error("Delete error:", err);
              alert("Failed to delete record. See console for details.");
            }
          });
        });

        // Wire pagination
        const prevBtn = canvas.querySelector(".js-prev-page");
        if (prevBtn) {
          prevBtn.addEventListener("click", function () {
            if (currentPage > 1) {
              currentPage--;
              renderRecordList();
            }
          });
        }

        const nextBtn = canvas.querySelector(".js-next-page");
        if (nextBtn) {
          nextBtn.addEventListener("click", function () {
            if (currentPage < totalPages) {
              currentPage++;
              renderRecordList();
            }
          });
        }
      }

      renderRecordList();
    } catch (err) {
      console.error("Error loading records:", err);
      canvas.innerHTML =
        '<div class="admin-card"><h2>Error Loading Records</h2><p>Could not fetch records from the server. Please try again later.</p></div>';
    }
    return;
  }

  if (
    moduleName === "ranks-wikipedia" &&
    typeof window.renderEditWikiWeights === "function"
  ) {
    window.renderEditWikiWeights("admin-canvas");
    return;
  }

  if (moduleName === "ranks-challenges") {
    canvas.innerHTML = `
      <div class="admin-card">
        <div class="admin-tab-bar" id="ranks-challenges-tab-bar">
          <button class="admin-tab-btn is-active" data-tab="academic">Academic Challenges</button>
          <button class="admin-tab-btn" data-tab="popular">Popular Challenges</button>
        </div>
        <div id="tab-content-ranks-challenges-academic"></div>
        <div id="tab-content-ranks-challenges-popular" class="is-hidden"></div>
      </div>
    `;

    // Load default tab (Academic Challenges)
    if (typeof window.renderEditAcademicWeights === "function") {
      window.renderEditAcademicWeights("tab-content-ranks-challenges-academic");
    }

    // Event delegation for tab switching
    document
      .getElementById("ranks-challenges-tab-bar")
      .addEventListener("click", function (e) {
        var tabBtn = e.target.closest("[data-tab]");
        if (!tabBtn) return;
        var tab = tabBtn.getAttribute("data-tab");

        // Toggle active state on tab buttons
        this.querySelectorAll("[data-tab]").forEach(function (btn) {
          btn.classList.remove("is-active");
        });
        tabBtn.classList.add("is-active");

        // Show / hide panes and lazy-load if needed
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

    return;
  }

  if (
    moduleName === "lists-resources" &&
    typeof window.renderEditLists === "function"
  ) {
    const listNames = [
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

    const listOptions = listNames
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");

    canvas.innerHTML = `
      <div class="admin-card">
        <div class="records-list-header">
          <h2>Edit Resource List</h2>
        </div>
        <div class="search-container">
          <label class="list-select-label" for="resource-list-select">Select a resource list:</label>
          <div class="list-select-row">
            <select id="resource-list-select" class="admin-search-input list-select-input">
              ${listOptions}
            </select>
            <button class="quick-action-btn" id="load-resource-list-btn">Load List</button>
          </div>
        </div>
      </div>
    `;

    document
      .getElementById("load-resource-list-btn")
      .addEventListener("click", function () {
        const selected = document.getElementById("resource-list-select").value;
        window.renderEditLists("admin-canvas", selected);
      });

    // Also load on Enter key pressed in the select
    document
      .getElementById("resource-list-select")
      .addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          document.getElementById("load-resource-list-btn").click();
        }
      });

    return;
  }

  if (moduleName === "ranks-responses") {
    canvas.innerHTML = `
      <div class="admin-card">
        <div class="admin-tab-bar" id="ranks-responses-tab-bar">
          <button class="admin-tab-btn is-active" data-tab="academic">Academic Challenges</button>
          <button class="admin-tab-btn" data-tab="popular">Popular Challenges</button>
        </div>
        <div id="tab-content-ranks-responses-academic" class="admin-tab-content"></div>
        <div id="tab-content-ranks-responses-popular" class="admin-tab-content is-hidden"></div>
      </div>
    `;

    // Load default tab (Academic Challenges)
    if (typeof window.renderEditInsertResponseAcademic === "function") {
      window.renderEditInsertResponseAcademic(
        "tab-content-ranks-responses-academic",
      );
    }

    // Event delegation for tab switching
    document
      .getElementById("ranks-responses-tab-bar")
      .addEventListener("click", function (e) {
        var tabBtn = e.target.closest("[data-tab]");
        if (!tabBtn) return;
        var tab = tabBtn.getAttribute("data-tab");

        // Toggle active state on tab buttons
        this.querySelectorAll("[data-tab]").forEach(function (btn) {
          btn.classList.remove("is-active");
        });
        tabBtn.classList.add("is-active");

        // Show / hide panes and lazy-load if needed
        var academicPane = document.getElementById(
          "tab-content-ranks-responses-academic",
        );
        var popularPane = document.getElementById(
          "tab-content-ranks-responses-popular",
        );

        // Hide all panes
        academicPane.classList.add("is-hidden");
        popularPane.classList.add("is-hidden");

        // Show selected pane and lazy-load if pane is empty
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

    return;
  }

  if (
    moduleName === "records-bulk" &&
    typeof window.renderBulkUpload === "function"
  ) {
    window.renderBulkUpload("admin-canvas");
    return;
  }

  if (moduleName === "text-essays") {
    canvas.innerHTML = `
      <div class="admin-card">
        <div class="admin-tab-bar" id="essays-tab-bar">
          <button class="admin-tab-btn is-active" data-tab="essay">Context Essay</button>
          <button class="admin-tab-btn" data-tab="historiography">Historiography</button>
        </div>
        <div id="tab-content-essay" class="admin-tab-content"></div>
        <div id="tab-content-historiography" class="admin-tab-content is-hidden"></div>
      </div>
    `;

    // Load default tab
    if (typeof window.renderEditEssay === "function") {
      window.renderEditEssay("tab-content-essay");
    }

    // Event delegation for tab switching
    document
      .getElementById("essays-tab-bar")
      .addEventListener("click", function (e) {
        var tabBtn = e.target.closest("[data-tab]");
        if (!tabBtn) return;
        var tab = tabBtn.getAttribute("data-tab");

        // Toggle active state on tab buttons
        this.querySelectorAll("[data-tab]").forEach(function (btn) {
          btn.classList.remove("is-active");
        });
        tabBtn.classList.add("is-active");

        // Show / hide panes and lazy-load historiography if needed
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

    return;
  }

  if (
    moduleName === "text-responses" &&
    typeof window.renderEditResponse === "function"
  ) {
    window.renderEditResponse("admin-canvas");
    return;
  }

  if (
    moduleName === "config-diagrams" &&
    typeof window.renderEditDiagram === "function"
  ) {
    window.renderEditDiagram("admin-canvas");
    return;
  }

  if (
    moduleName === "text-mla" &&
    typeof window.renderEditMlaSources === "function"
  ) {
    window.renderEditMlaSources("admin-canvas");
    return;
  }

  if (moduleName === "text-news") {
    canvas.innerHTML = `
      <div class="admin-card">
        <div class="admin-tab-bar" id="news-tab-bar">
          <button class="admin-tab-btn is-active" data-tab="snippet">News Snippet</button>
          <button class="admin-tab-btn" data-tab="sources">News Sources</button>
        </div>
        <div id="tab-content-news-snippet"></div>
        <div id="tab-content-news-sources" class="is-hidden"></div>
      </div>
    `;

    // Load default tab (News Snippet)
    if (typeof window.renderEditNewsSnippet === "function") {
      window.renderEditNewsSnippet("tab-content-news-snippet");
    }

    // Event delegation for tab switching
    document
      .getElementById("news-tab-bar")
      .addEventListener("click", function (e) {
        var tabBtn = e.target.closest("[data-tab]");
        if (!tabBtn) return;
        var tab = tabBtn.getAttribute("data-tab");

        // Toggle active state on tab buttons
        this.querySelectorAll("[data-tab]").forEach(function (btn) {
          btn.classList.remove("is-active");
        });
        tabBtn.classList.add("is-active");

        // Show / hide panes and lazy-load if needed
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

    return;
  }

  if (
    moduleName === "text-blog" &&
    typeof window.renderEditBlogpost === "function"
  ) {
    window.renderEditBlogpost("admin-canvas");
    return;
  }

  if (moduleName === "config-news") {
    if (typeof window.renderEditNewsSources === "function") {
      window.renderEditNewsSources("admin-canvas");
    }
    return;
  }

  // Module router placeholder (waiting for tasks 25-27)
  // Uses Providence 3-column grid (guide_dashboard_appearance.md §0.1)
  canvas.innerHTML = `
    <div class="admin-card">
      <div class="providence-editor-grid">
        <div class="providence-editor-col-actions">
          <h3 class="text-muted" style="font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em;">Actions</h3>
          <button class="quick-action-btn" disabled>Save Changes</button>
          <button class="quick-action-btn" disabled>Discard</button>
        </div>
        <div class="providence-editor-col-list">
          <h3 class="text-muted" style="font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em;">Module: ${moduleName}</h3>
          <p class="text-sm text-muted">Fields pending implementation</p>
          <dl class="system-meta">
            <dt>Status:</dt>
            <dd>Placeholder</dd>
            <dt>Layout:</dt>
            <dd>Providence Grid</dd>
          </dl>
        </div>
        <div class="providence-editor-col-editor">
          <p class="text-sm text-muted">Select a module from the sidebar to begin editing.</p>
        </div>
      </div>
    </div>
  `;
}

// Expose loadModule globally for dashboard_init.js, render_tab_bar.js, and other modules
window.loadModule = loadModule;
