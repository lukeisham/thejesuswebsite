/**
 * search_records.js
 * ─────────────────
 * Handles the search bar on the Records page.
 */
(function initSearchRecords() {
    "use strict";

    var inputEl = document.getElementById("search-input");
    var searchBtn = document.getElementById("search-btn");
    var gridEl = document.getElementById("record-grid");
    var feedEl = document.getElementById("record-feed");

    if (!inputEl || !gridEl) return;

    function doSearch() {
        var query = inputEl.value.trim();
        if (!query) return;

        fetch("/api/v1/records?q=" + encodeURIComponent(query))
            .then(function (res) {
                if (!res.ok) throw new Error("Search failed");
                return res.json();
            })
            .then(function (json) {
                // Unwrap ApiResponse<RecordListResponse>: { status, message, data: { count, records } }
                var records = (json && json.data && json.data.records) ? json.data.records : [];

                gridEl.innerHTML = "";
                if (feedEl) feedEl.innerHTML = "";

                if (!records || records.length === 0) {
                    const emptyMsg = '<p class="a-col-span-full" style="color: #999;">No records match your search.</p>';
                    gridEl.innerHTML = emptyMsg;
                    if (feedEl) feedEl.innerHTML = emptyMsg;
                    
                    // Reset single view to placeholder
                    if (typeof window.showRecordDetail === "function") {
                        window.showRecordDetail(null);
                    }
                    return;
                }

                records.forEach(function (r) {
                    // Requires record_card.js to be loaded before this script
                    if (typeof window.createRecordCard === "function") {
                        gridEl.appendChild(window.createRecordCard(r));
                    }
                    if (feedEl && typeof window.createRecordFeedItem === "function") {
                        feedEl.appendChild(window.createRecordFeedItem(r));
                    }
                });

                // Plan: Switch to Record view with the first search result
                if (typeof window.showRecordDetail === "function") {
                    window.showRecordDetail(records[0]);
                    if (typeof window.switchRecordView === "function") {
                        window.switchRecordView("record");
                    }
                }

                // Trigger verse expansion if expand_verse.js is present
                if (typeof window.expandVerses === "function") {
                    window.expandVerses();
                }
            })
            .catch(function (err) {
                const errMsg = '<p class="a-col-span-full" style="color: #999;">' + err.message + "</p>";
                gridEl.innerHTML = errMsg;
                if (feedEl) feedEl.innerHTML = errMsg;
            });
    }

    if (searchBtn) {
        searchBtn.addEventListener("click", doSearch);
    }

    inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            doSearch();
        }
    });

    // Optional real-time filtering (filters loaded records in DOM)
    inputEl.addEventListener("input", function (e) {
        const val = e.target.value.toLowerCase();
        const cards = gridEl.querySelectorAll('.record-card');
        const feedItems = feedEl ? feedEl.querySelectorAll('.record-feed-item') : [];

        const filterFn = (el) => {
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(val) ? "" : "none";
        };

        cards.forEach(filterFn);
        if (feedItems.length > 0) {
            feedItems.forEach(filterFn);
        }
    });
})();
