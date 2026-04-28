// =============================================================================
//
//   THE JESUS WEBSITE — DASHBOARD APP CONTROLLER
//   File:    admin/frontend/dashboard_app.js
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
    link.href = "../../css/design_layouts/views/dashboard_admin.css";
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
                        <li><a href="#" data-module="ranks-weights">Edit Weights</a></li>
                        <li><a href="#" data-module="lists-resources">Edit Resources</a></li>
                        <li><a href="#" data-module="ranks-responses">Insert Responses</a></li>
                    </ul>

                    <h3>Text Content</h3>
                    <ul>
                        <li><a href="#" data-module="text-essays">Essays</a></li>
                        <li><a href="#" data-module="text-responses">Responses</a></li>
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
                    <div class="admin-card">
                        <div class="records-list-header">
                            <h2>Edit Existing Records</h2>
                            <span class="text-sm text-muted">${totalText}</span>
                        </div>

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
                `;

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

  if (
    moduleName === "records-bulk" &&
    typeof window.renderBulkUpload === "function"
  ) {
    window.renderBulkUpload("admin-canvas");
    return;
  }


  if (moduleName === "text-essays") {
    canvas.innerHTML = `
      <div class="admin-card" style="overflow: hidden;">
        <div style="display: flex; border-bottom: 2px solid var(--color-border); background-color: var(--color-bg-secondary);" id="essays-tab-bar">
          <button class="admin-tab-btn is-active" data-tab="essay" style="flex: 1; padding: var(--space-3) var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-bold); border: none; background: transparent; cursor: pointer; color: var(--color-text); border-bottom: 2px solid var(--color-accent-primary); transition: all var(--transition-fast);">Context Essay</button>
          <button class="admin-tab-btn" data-tab="historiography" style="flex: 1; padding: var(--space-3) var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-medium); border: none; background: transparent; cursor: pointer; color: var(--color-text-muted); border-bottom: 2px solid transparent; transition: all var(--transition-fast);">Historiography</button>
        </div>
        <div id="tab-content-essay" style="padding: var(--space-6);"></div>
        <div id="tab-content-historiography" class="is-hidden" style="padding: var(--space-6);"></div>
      </div>
    `;

    // Load default tab
    if (typeof window.renderEditEssay === "function") {
      window.renderEditEssay("tab-content-essay");
    }

    // Event delegation for tab switching
    document.getElementById("essays-tab-bar").addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");

      // Toggle active state on tab buttons
      this.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
        btn.style.color = "var(--color-text-muted)";
        btn.style.fontWeight = "var(--weight-medium)";
        btn.style.borderBottomColor = "transparent";
      });
      tabBtn.classList.add("is-active");
      tabBtn.style.color = "var(--color-text)";
      tabBtn.style.fontWeight = "var(--weight-bold)";
      tabBtn.style.borderBottomColor = "var(--color-accent-primary)";

      // Show / hide panes and lazy-load historiography if needed
      var essayPane = document.getElementById("tab-content-essay");
      var histPane = document.getElementById("tab-content-historiography");

      if (tab === "essay") {
        essayPane.classList.remove("is-hidden");
        histPane.classList.add("is-hidden");
      } else {
        histPane.classList.remove("is-hidden");
        essayPane.classList.add("is-hidden");
        if (histPane.innerHTML.trim() === "" && typeof window.renderEditHistoriography === "function") {
          window.renderEditHistoriography("tab-content-historiography");
        }
      }
    });

    return;
  }

  if (moduleName === "text-responses" && typeof window.renderEditResponse === "function") {
    window.renderEditResponse("admin-canvas");
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

// Listen for the auth success event dispatched by admin_login.js
window.addEventListener("adminAuthSuccess", renderDashboardShell);
