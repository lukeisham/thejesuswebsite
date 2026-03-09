/**
 * toggle_record_view.js
 * ──────────────────────
 * Handles switching between Grid and Feed views on the Records page.
 * Persists the user's choice in sessionStorage.
 */
(function initToggleRecordView() {
    "use strict";

    const tabs = document.querySelectorAll(".record-view-tabs .tab");
    const gridSection = document.getElementById("record-grid");
    const feedSection = document.getElementById("record-feed");

    if (!tabs.length || !gridSection || !feedSection) return;

    function switchView(view) {
        // Toggle sections
        if (view === "feed") {
            gridSection.style.display = "none";
            feedSection.style.display = "block";
        } else {
            gridSection.style.display = "grid";
            feedSection.style.display = "none";
        }

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

    // Load persisted preference
    const savedView = sessionStorage.getItem("records_view_preference");
    if (savedView) {
        switchView(savedView);
    }
})();
