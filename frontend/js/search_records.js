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

    if (!inputEl || !gridEl) return;

    function doSearch() {
        var query = inputEl.value.trim();
        if (!query) return;

        fetch("/api/records?q=" + encodeURIComponent(query))
            .then(function (res) {
                if (!res.ok) throw new Error("Search failed");
                return res.json();
            })
            .then(function (records) {
                gridEl.innerHTML = "";

                if (!records || records.length === 0) {
                    gridEl.innerHTML = '<p class="a-col-span-full" style="color: #999;">No records match your search.</p>';
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
                gridEl.innerHTML = '<p class="a-col-span-full" style="color: #999;">' + err.message + "</p>";
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
        if (cards.length > 0) {
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(val)) {
                    card.style.display = "";
                } else {
                    card.style.display = "none";
                }
            });
        }
    });
})();
