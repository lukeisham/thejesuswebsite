// sidebar_toggle.js — Hamburger toggle for the sidebar navigation
// One script per task (readme rule)

// START SIDEBAR_TOGGLE
(function () {
    "use strict";

    var STORAGE_KEY = "sidebar-collapsed";
    var sidebar = document.getElementById("nav-sidebar");
    var btn = document.getElementById("btn-hamburger");

    if (!sidebar || !btn) return;

    // --- Determine initial state ---
    // On mobile (< 768px) default to collapsed; on desktop respect localStorage
    var isMobile = window.matchMedia("(max-width: 767px)").matches;
    var stored = localStorage.getItem(STORAGE_KEY);
    var startCollapsed = stored !== null ? stored === "true" : isMobile;

    if (startCollapsed) {
        sidebar.classList.add("sidebar--collapsed");
        btn.setAttribute("aria-expanded", "false");
    }

    // --- Toggle handler ---
    btn.addEventListener("click", function () {
        var isCollapsed = sidebar.classList.toggle("sidebar--collapsed");
        btn.setAttribute("aria-expanded", String(!isCollapsed));
        localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    });

    // --- Respond to resize (collapse on shrink to mobile) ---
    window.matchMedia("(max-width: 767px)").addEventListener("change", function (e) {
        if (e.matches && !sidebar.classList.contains("sidebar--collapsed")) {
            sidebar.classList.add("sidebar--collapsed");
            btn.setAttribute("aria-expanded", "false");
            localStorage.setItem(STORAGE_KEY, "true");
        }
    });
})();
// END SIDEBAR_TOGGLE
