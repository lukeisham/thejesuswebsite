/**
 * refresh_records.js
 * ──────────────────
 * Fetches the full record list from the server and
 * populates the record grid on the Records page.
 */
(function initRefreshRecords() {
    "use strict";

    var gridEl = document.getElementById("record-grid");
    var feedEl = document.getElementById("record-feed");
    if (!gridEl) return;

    function refresh() {
        fetch("/api/v1/records")
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load records");
                return res.json();
            })
            .then(function (json) {
                // Unwrap ApiResponse<RecordListResponse>: { status, message, data: { count, records } }
                var records = (json && json.data && json.data.records) ? json.data.records : [];

                gridEl.innerHTML = "";
                if (feedEl) feedEl.innerHTML = "";

                if (!records || records.length === 0) {
                    const emptyMsg = '<p class="a-col-span-full" style="color: #999;">No records available yet.</p>';
                    gridEl.innerHTML = emptyMsg;
                    if (feedEl) feedEl.innerHTML = emptyMsg;
                    return;
                }

                records.forEach(function (r) {
                    // Requires record_card.js to be loaded before this script
                    if (typeof window.createRecordCard === "function") {
                        gridEl.appendChild(window.createRecordCard(r));
                    }
                    // Requires record_feed.js to be loaded before this script
                    if (feedEl && typeof window.createRecordFeedItem === "function") {
                        feedEl.appendChild(window.createRecordFeedItem(r));
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
