/**
 * show_draft_record.js
 * ───────────────────
 * Fetches draft records from the backend and displays them.
 * Follows patterns from refresh_records.js and record_card.js.
 */
(function initShowDraftRecords() {
    "use strict";

    // Target element where draft records should be displayed
    // This could be a specific section on the dashboard or records page
    var gridEl = document.getElementById("record-grid");
    if (!gridEl) return;

    function fetchDrafts() {
        console.log("[Draft Records] Fetching drafts...");

        fetch("/api/v1/records/drafts")
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load draft records");
                return res.json();
            })
            .then(function (drafts) {
                console.log("[Draft Records] Received drafts:", drafts);

                if (!drafts || drafts.length === 0) {
                    // If we're on a page that expects drafts, we might want to show a message
                    // but usually we just append to the existing grid.
                    return;
                }

                drafts.forEach(function (d) {
                    if (typeof window.createRecordCard === "function") {
                        var card = window.createRecordCard(d);
                        // Add a visual indicator that this is a draft
                        var draftBadge = document.createElement("span");
                        draftBadge.className = "label";
                        draftBadge.style.backgroundColor = "#ff9800";
                        draftBadge.style.color = "white";
                        draftBadge.style.padding = "2px 6px";
                        draftBadge.style.borderRadius = "4px";
                        draftBadge.style.fontSize = "0.7rem";
                        draftBadge.style.marginLeft = "10px";
                        draftBadge.textContent = "DRAFT";

                        var titleEl = card.querySelector("strong") || card.querySelector("h3");
                        if (titleEl) titleEl.appendChild(draftBadge);

                        gridEl.prepend(card); // Put drafts at the top
                    }
                });
            })
            .catch(function (err) {
                console.error("[Draft Records] Error:", err);
            });
    }

    // Run on load
    fetchDrafts();

    // Export for manual refresh
    window.refreshDraftRecords = fetchDrafts;
})();
