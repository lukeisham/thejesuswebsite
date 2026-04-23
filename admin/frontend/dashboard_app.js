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
    const dashboardApp = document.getElementById('dashboard-app');
    if (!dashboardApp) return;

    // Remove is-hidden class and ensure full-height layout via CSS class
    dashboardApp.classList.remove('is-hidden');
    dashboardApp.classList.add('is-visible', 'admin-full-height');

    // Inject the CSS dynamically just to be safe, though it's linked in admin.html
    if (!document.getElementById('dashboard-admin-css-link')) {
        const link = document.createElement('link');
        link.id = 'dashboard-admin-css-link';
        link.rel = 'stylesheet';
        link.href = '../../css/design_layouts/views/dashboard_admin.css';
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
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && typeof window.adminLogout === 'function') {
        logoutBtn.addEventListener('click', window.adminLogout);
    }

    // Attach Navigation Events
    const sidebarLinks = dashboardApp.querySelectorAll('.admin-sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.target.getAttribute('data-module');
            loadModule(moduleName);
            
            // Toggle active class instead of inline fontWeight
            sidebarLinks.forEach(l => l.classList.remove('is-active'));
            e.target.classList.add('is-active');
        });
    });
}

async function loadModule(moduleName) {
    const canvas = document.getElementById('admin-canvas');
    if (!canvas) return;

    // Middleware check
    if (typeof window.verifyAdminSession === 'function') {
        const isValid = await window.verifyAdminSession();
        if (!isValid) {
            if (typeof window.adminLogout === 'function') {
                window.adminLogout();
            } else {
                console.error("Session invalid and window.adminLogout not found.");
            }
            return;
        }
    }

    if (moduleName === 'records-bulk' && typeof window.renderBulkUpload === 'function') {
        window.renderBulkUpload('admin-canvas');
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
window.addEventListener('adminAuthSuccess', renderDashboardShell);
