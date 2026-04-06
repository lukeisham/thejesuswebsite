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
                        <p class="text-base" style="color: #2e7d32; font-weight: bold;">● Online (WASM SQLite Sync Active)</p>
                    </div>

                    <div class="admin-card">
                        <h2>Recent Edits / Activity Log</h2>
                        <ul>
                            <li>Updated Record: "Crucifixion"</li>
                            <li>Modified Wiki Weight: +0.5</li>
                            <li>Added Essay: "Historiography Overview"</li>
                        </ul>
                    </div>

                    <div class="admin-card" style="border: none; box-shadow: none; padding: 0;">
                        <h2 style="border: none; padding-bottom: 0;">Quick Actions</h2>
                        <div style="margin-top: var(--space-4);">
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

function loadModule(moduleName) {
    const canvas = document.getElementById('admin-canvas');
    if (!canvas) return;

    // Middleware check
    if (typeof window.verifyAdminSession === 'function' && !window.verifyAdminSession()) {
        window.adminLogout();
        return;
    }

    // Module router placeholder (waiting for tasks 25-27)
    canvas.innerHTML = `
        <div class="admin-card">
            <h2>Module Details</h2>
            <p style="font-family: var(--font-mono); font-size: var(--text-sm); background: #eee; padding: var(--space-2); border-radius: var(--radius-sm); display: inline-block;">
                Action: Load ${moduleName}.js
            </p>
            <p class="mt-4">This backend editing interface is pending implementation in Tasks 25-27.</p>
        </div>
    `;
}

// Listen for the auth success event dispatched by admin_login.js
window.addEventListener('adminAuthSuccess', renderDashboardShell);
