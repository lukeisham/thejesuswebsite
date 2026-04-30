// =============================================================================
//
//   THE JESUS WEBSITE — TOP-LEVEL SECTION TAB BAR
//   File:    js/7.0_system/dashboard/render_tab_bar.js
//   Version: 1.0.0
//   Purpose: Renders module tab bars into a given container element. Has two
//            call sites: (1) dashboard_init.js for the top-level 13-tab module bar;
//            (2) individual editor render functions for within-canvas sub-module
//            tab bars (e.g. Academic/Popular, Essay/Historiography).
//   Source:  guide_style.md §18.1, guide_dashboard_appearance.md §7.1
//
// =============================================================================

// Trigger: Two call sites — (1) dashboard_init.js on DOMContentLoaded calls
//         renderTabBar("module-tab-bar", allModules, "records-all") to build the
//         top-level 13-tab module bar; (2) individual editor render functions
//         call renderTabBar(containerId, tabs, activeTab) for within-canvas
//         sub-module tab bars (e.g. Academic/Popular, Essay/Historiography)
// Function: Injects tab bar HTML into the given container, wires click navigation
//           via data-module attributes, and toggles is-active state
// Output: Populated tab bar with active state styling; clicking any tab calls
//         window.loadModule(moduleName); clicking the already-active tab
//         re-fires loadModule() to refresh the editor and clear unsaved input

window.renderTabBar = function (containerId, tabs, activeTab) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Build the tab bar HTML
  var html =
    '<div class="admin-tab-bar" id="' +
    containerId +
    '-section-tabs">';

  tabs.forEach(function (tab) {
    var isActive = tab.name === activeTab;
    var moduleName = tab.module || "";

    html +=
      '<button class="admin-tab-btn' +
      (isActive ? " is-active" : "") +
      '" data-module="' +
      moduleName +
      '" data-tab-name="' +
      tab.name +
      '">' +
      tab.label +
      "</button>";
  });

  html += "</div>";

  // Remove any existing tab bar in this container before inserting a fresh one
  var existingTabBar = document.getElementById(containerId + "-section-tabs");
  if (existingTabBar) {
    existingTabBar.remove();
  }

  // Render into container (prepend so it sits above existing content)
  container.insertAdjacentHTML("afterbegin", html);

  // Wire click navigation on the tab bar
  var tabBar = document.getElementById(containerId + "-section-tabs");
  if (!tabBar) return;

  tabBar.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-module]");
    if (!btn) return;

    var moduleName = btn.getAttribute("data-module");
    if (!moduleName) return;

    // Update active state on all tab buttons in this bar
    tabBar.querySelectorAll("[data-module]").forEach(function (b) {
      b.classList.remove("is-active");
    });
    btn.classList.add("is-active");

    // Navigate via loadModule if available (dashboard_app.js exposes it)
    if (typeof window.loadModule === "function") {
      window.loadModule(moduleName);
    }
  });
};
