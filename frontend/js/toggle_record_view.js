/**
 * toggle_record_view.js
 * ──────────────────────
 * Handles switching between Feed, Record (single), and Grid views on the Records page.
 * Persists the user's choice in sessionStorage.
 */
(function initToggleRecordView() {
    "use strict";

    const tabs = document.querySelectorAll(".record-view-tabs .tab");
    const gridSection = document.getElementById("record-grid");
    const feedSection = document.getElementById("record-feed");
    const singleSection = document.getElementById("record-single");

    if (!tabs.length || !gridSection || !feedSection || !singleSection) return;

    function switchView(view) {
        // Toggle sections
        gridSection.style.display = (view === "grid") ? "grid" : "none";
        feedSection.style.display = (view === "feed") ? "block" : "none";
        singleSection.style.display = (view === "record") ? "grid" : "none";

        // Toggle active tab class
        tabs.forEach(tab => {
            if (tab.getAttribute("data-view") === view) {
                tab.classList.add("active");
            } else {
                tab.classList.remove("active");
            }
        });

        // Persist choice
        sessionStorage.setItem("records_view_preference", view);
    }

    // Add click listeners
    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            const view = this.getAttribute("data-view");
            switchView(view);
        });
    });

    // Load persisted preference or default to "record", overriding with "record" if a URL parameter suggests a direct link
    const params = new URLSearchParams(window.location.search);
    let initialView = sessionStorage.getItem("records_view_preference") || "record";
    if (params.get("id") || params.get("verse")) {
        initialView = "record";
    }
    switchView(initialView);

    // Expose switchView to window for other scripts (Tasks 5, 6)
    window.switchRecordView = switchView;

})();
