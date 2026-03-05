/**
 * refresh_records.js
 * ──────────────────
 * Fetches the full record list from the server and
 * populates the record grid on the Records page.
 */
(function initRefreshRecords() {
    "use strict";

    var gridEl = document.getElementById("record-grid");
    if (!gridEl) return;

    function refresh() {
        fetch("/api/records")
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load records");
                return res.json();
            })
            .then(function (records) {
                gridEl.innerHTML = "";

                if (!records || records.length === 0) {
                    gridEl.innerHTML = '<p class="a-col-span-full" style="color: #999;">No records available yet.</p>';
                    return;
                }

                records.forEach(function (r) {
                    // Requires record_card.js to be loaded before this script
                    if (typeof window.createRecordCard === "function") {
                        gridEl.appendChild(window.createRecordCard(r));
                    }
                });

                // Trigger verse expansion if expand_verse.js is present
                if (typeof window.expandVerses === "function") {
                    window.expandVerses();
                }
            })
            .catch(function (err) {
                console.error("Failed to refresh records:", err);
            });
    }

    refresh();
})();
