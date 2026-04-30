// =============================================================================
//
//   THE JESUS WEBSITE — DASHBOARD APP CONTROLLER
//   File:    js/7.0_system/dashboard/dashboard_app.js
//   Version: 1.1.0
//   Purpose: Main Dashboard controller, UI router & Sidebar navigation.
//
// =============================================================================

// Trigger: 'adminAuthSuccess' custom event dispatched by admin_login.js after successful authentication
// Function: Renders the full dashboard shell (header, sidebar, canvas) and attaches navigation routing
// Output: Injects admin interface HTML into the #dashboard-app element and wires all nav links

function renderDashboardShell() {
  const dashboardApp = document.getElementById("dashboard-app");
  if (!dashboardApp) return;

  // Remove is-hidden class and ensure full-height layout via CSS class
  dashboardApp.classList.remove("is-hidden");
  dashboardApp.classList.add("is-visible", "admin-full-height");

  // Inject the CSS dynamically just to be safe, though it's linked in admin.html
  if (!document.getElementById("dashboard-admin-css-link")) {
    const link = document.createElement("link");
    link.id = "dashboard-admin-css-link";
    link.rel = "stylesheet";
    link.href = "/css/1.0_foundation/dashboard/admin_shell.css";
    document.head.appendChild(link);
  }

  const html = `
        <div class="admin-dashboard-container">
            <header class="admin-header">
                <h1>Dashboard App: Authenticated as Admin</h1>
                <button id="logout-btn" class="admin-logout-btn">Logout</button>
            </header>
            <div class="admin-body-layout">
                <nav class="admin-sidebar" id="admin-sidebar">
                    <h3>Records</h3>
                    <ul>
                        <li><a href="#" data-module="records-new">Create New</a></li>
                        <li><a href="#" data-module="records-edit">Edit Existing</a></li>
                        <li><a href="#" data-module="records-bulk">Bulk Upload CSV</a></li>
                    </ul>

                    <h3>Lists & Ranks</h3>
                    <ul>
                        <li><a href="#" data-module="ranks-wikipedia">Wikipedia Weights</a></li>
                        <li><a href="#" data-module="ranks-challenges">Challenge Weights</a></li>
                        <li><a href="#" data-module="lists-resources">Edit Resources</a></li>
                        <li><a href="#" data-module="ranks-responses">Insert Responses</a></li>
                    </ul>

                    <h3>Text Content</h3>
                    <ul>
                        <li><a href="#" data-module="text-essays">Essays</a></li>
                        <li><a href="#" data-module="text-responses">Responses</a></li>
                        <li><a href="#" data-module="text-mla">MLA Sources</a></li>
                        <li><a href="#" data-module="text-news">News</a></li>
                        <li><a href="#" data-module="text-blog">Blog Posts</a></li>
                    </ul>

                    <h3>Configuration</h3>
                    <ul>
                        <li><a href="#" data-module="config-diagrams">Edit Diagrams</a></li>
                        <li><a href="#" data-module="config-news">News Sources</a></li>
                    </ul>

                    <a id="sidebar-return-link" href="/">Return to Front-End</a>
                </nav>
                <main class="admin-canvas" id="admin-canvas">
                    <!-- Default Dashboard Home / Status -->
                    <div class="admin-card">
                        <h2>System Status</h2>
                        <p class="status-indicator status-online">● Online (WASM SQLite Sync Active)</p>
                    </div>

                    <div class="admin-card">
                        <h2>Recent Edits / Activity Log</h2>
                        <ul>
                            <li>Updated Record: "Crucifixion"</li>
                            <li>Modified Wiki Weight: +0.5</li>
                            <li>Added Essay: "Historiography Overview"</li>
                        </ul>
                    </div>

                    <div class="admin-card">
                        <h2>Quick Actions</h2>
                        <div class="mt-4">
                            <button class="quick-action-btn">Add New Record</button>
                            <button class="quick-action-btn">Run Sync Pipeline</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;

  dashboardApp.innerHTML = html;

  // Attach Logout Event
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn && typeof window.adminLogout === "function") {
    logoutBtn.addEventListener("click", window.adminLogout);
  }

  // Attach Navigation Events
  const sidebarLinks = dashboardApp.querySelectorAll(".admin-sidebar a");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const moduleName = e.target.getAttribute("data-module");
      loadModule(moduleName);

      // Toggle active class instead of inline fontWeight
      sidebarLinks.forEach((l) => l.classList.remove("is-active"));
      e.target.classList.add("is-active");
    });
  });
}

async function loadModule(moduleName) {
  const canvas = document.getElementById("admin-canvas");
  if (!canvas) return;

  // Middleware check
  if (typeof window.verifyAdminSession === "function") {
    const isValid = await window.verifyAdminSession();
    if (!isValid) {
      if (typeof window.adminLogout === "function") {
        window.adminLogout();
      } else {
        console.error("Session invalid and window.adminLogout not found.");
      }
      return;
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

        // Render top-level section tab bar (Records active)
        if (typeof window.renderTabBar === "function") {
          window.renderTabBar(
            "records-list-card",
            [
              { name: "records", label: "Records", module: "records-edit" },
              {
                name: "lists-ranks",
                label: "Lists & Ranks",
                module: "lists-resources",
              },
              {
                name: "text-content",
                label: "Text Content",
                module: "text-blog",
              },
              {
                name: "configuration",
                label: "Configuration",
                module: "config-diagrams",
              },
            ],
            "records",
          );
        }

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
  // Module mockup with Split-Pane and Action Bar (Technical Blueprint Verification)
  canvas.innerHTML = `
        <div class="admin-module-header">
            <h2>Editing Module: ${moduleName}</h2>
            <p class="text-sm text-muted">Technical Ledger Interface — Split Pane Active</p>
        </div>

        <div class="admin-editor-split">
            <div class="admin-editor-pane">
                <h3>Data Entry (Mono)</h3>
                <label>Title</label>
                <input type="text" value="Sample Record Title" placeholder="Enter title...">

                <label class="mt-4">Slug</label>
                <input type="text" value="sample-record-slug" placeholder="Enter slug...">

                <label class="mt-4">Content (Markdown)</label>
                <textarea class="editor-textarea">## Introduction\n\nThe historical evidence for this record suggests...</textarea>
            </div>

            <div class="admin-preview-pane">
                <h3>Live Preview</h3>
                <div class="preview-content">
                    <h2 class="font-serif">Sample Record Title</h2>
                    <p class="font-body">The historical evidence for this record suggests...</p>
                </div>
            </div>
        </div>

        <footer class="admin-action-bar">
            <button class="btn-outline">Discard Changes</button>
            <button class="btn-primary">Save to Database</button>
        </footer>
    `;
}

// Expose loadModule globally so renderTabBar and other modules can navigate
window.loadModule = loadModule;

// Listen for the auth success event dispatched by admin_login.js
window.addEventListener("adminAuthSuccess", renderDashboardShell);
