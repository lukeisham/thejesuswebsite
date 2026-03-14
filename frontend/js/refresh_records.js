/**
 * refresh_records.js
 * ──────────────────
 * Fetches the full record list from the server and
 * populates the record grid, feed, and single-record view on the Records page.
 */
(function initRefreshRecords() {
    "use strict";

    var gridEl = document.getElementById("record-grid");
    var feedEl = document.getElementById("record-feed");
    var singleEl = document.getElementById("record-single");
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
                if (singleEl) singleEl.innerHTML = "";

                if (!records || records.length === 0) {
                    const emptyMsg = '<p class="a-col-span-full" style="color: #999;">No records available yet.</p>';
                    gridEl.innerHTML = emptyMsg;
                    if (feedEl) feedEl.innerHTML = emptyMsg;
                    if (singleEl) singleEl.innerHTML = emptyMsg;
                    return;
                }

                // Task 3.1 Pro: Find requested record from URL params
                const params = new URLSearchParams(window.location.search);
                const targetId = params.get('id');
                const targetVerse = params.get('verse');

                var targetRecord = null;
                if (targetId) {
                    targetRecord = records.find(function(r) { return r.id === targetId; });
                } else if (targetVerse) {
                    var formatFn = window.formatVerse || function(v) { return v && v.book ? v.book + " " + v.chapter + ":" + v.verse : ""; };
                    targetRecord = records.find(function(r) { return formatFn(r.primary_verse) === targetVerse; });
                }

                // If a specific record was requested via URL, show it in the single view
                if (targetRecord && typeof window.showRecordDetail === "function") {
                    window.showRecordDetail(targetRecord);
                    
                    // Ensure we are explicitly in "record" view
                    if (typeof window.switchRecordView === "function") {
                        window.switchRecordView("record");
                    }
                    
                    // Smooth scroll to top of content
                    const mainHeader = document.querySelector(".nav-header");
                    if (mainHeader) {
                        setTimeout(function() {
                            mainHeader.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                    }
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

                // Dispatch event for highlighting logic in records.html
                window.dispatchEvent(new CustomEvent('records-loaded', { detail: { records: records } }));
            })
            .catch(function (err) {
                console.error("Failed to refresh records:", err);
            });
    }

    refresh();
    window.refreshRecords = refresh;
})();
