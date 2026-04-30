// =============================================================================
//
//   THE JESUS WEBSITE — TOP-LEVEL SECTION TAB BAR
//   File:    js/7.0_system/dashboard/render_tab_bar.js
//   Version: 1.0.0
//   Purpose: Renders the top-level section tab bar (Records, Lists & Ranks,
//            Text Content, Configuration) into a given container element.
//            Sub-tab bars (e.g., Academic/Popular, Essay/Historiography)
//            remain handled by dashboard_app.js event delegation.
//   Source:  guide_style.md §18.1, guide_dashboard_appearance.md §7.1
//
// =============================================================================

// Trigger: dashboard_app.js routing or editor module calls renderTabBar()
// Function: Injects top-level section tab bar HTML into container, wires click
//           navigation via data-module attributes
// Output: Populated tab bar with active state styling and navigation handlers

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
