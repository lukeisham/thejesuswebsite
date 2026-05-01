// =============================================================================
//   THE JESUS WEBSITE — DASHBOARD INITIALISATION
//   File:    js/7.0_system/dashboard/dashboard_init.js
//   Version: 1.0.0
//   Purpose: One-time initialisation on dashboard.html load — renders the
//            top-level 13-tab module bar, wires the logout button, and loads
//            the default module (records-edit) into the canvas.
// =============================================================================

// Trigger: DOMContentLoaded on dashboard.html (after dashboard_auth.js passes)
// Function: Defines the full 13-module tab config, calls renderTabBar() to
//           populate #module-tab-bar, attaches the logout click handler, and
//           calls loadModule("records-edit") to render the default view
// Output: #module-tab-bar populated with all 13 tabs (records-edit active),
//         logout button wired, default records-edit editor rendered in canvas

document.addEventListener("DOMContentLoaded", function () {
  // 13-module tab config — matches dashboard_page_split.md §Module Tab Structure
  var allModules = [
    { name: "records-edit", label: "Single Record", module: "records-edit" },
    { name: "records-all", label: "All Records", module: "records-all" },
    {
      name: "lists-ordinary",
      label: "Ordinary Lists",
      module: "lists-ordinary",
    },
    { name: "records-bulk", label: "Bulk CSV", module: "records-bulk" },
    { name: "config-arbor", label: "Arbor", module: "config-arbor" },
    { name: "ranks-wikipedia", label: "Wikipedia", module: "ranks-wikipedia" },
    {
      name: "ranks-challenges",
      label: "Challenge",
      module: "ranks-challenges",
    },
    { name: "ranks-responses", label: "Responses", module: "ranks-responses" },
    {
      name: "text-essays",
      label: "Essay & Historiography",
      module: "text-essays",
    },
    {
      name: "text-responses",
      label: "Challenge Response",
      module: "text-responses",
    },
    { name: "text-news", label: "News & Sources", module: "text-news" },
    { name: "text-blog", label: "Blog Posts", module: "text-blog" },
    { name: "system-admin", label: "System", module: "system-admin" },
  ];

  // Render the flat module tab bar into the shell nav container
  window.renderTabBar("module-tab-bar", allModules, "records-edit");

  // Wire the return-to-frontend button (verifies session, then redirects to "/")
  var returnBtn = document.getElementById("return-to-frontend-btn");
  if (returnBtn && typeof window.returnToFrontend === "function") {
    returnBtn.addEventListener("click", window.returnToFrontend);
  }

  // Wire the logout button
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn && typeof window.adminLogout === "function") {
    logoutBtn.addEventListener("click", window.adminLogout);
  }

  // Load the default module view
  if (typeof window.loadModule === "function") {
    window.loadModule("records-edit");
  }
});
