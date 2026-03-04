/**
 * search_records.js
 * ─────────────────
 * Handles the search bar on the Records page.
 * Sends the query to the records API and re-renders
 * the record grid with matching results.
 */
(function initSearchRecords() {
    "use strict";

    var inputEl = document.getElementById("search-input");
    var searchBtn = document.getElementById("search-btn");
    var gridEl = document.getElementById("record-grid");

    if (!inputEl || !gridEl) return;

    /** Build a record card element. */
    function createCard(record) {
        var article = document.createElement("article");
        article.className = "feed-container";
        article.style.border = "1px solid var(--border-color)";

        var h3 = document.createElement("h3");
        h3.style.marginTop = "0";
        h3.textContent = record.name || record.title || "Untitled Record";

        var p = document.createElement("p");
        p.style.fontSize = "0.9rem";
        p.style.color = "#666";
        p.textContent = record.description || record.summary || "";

        var meta = document.createElement("span");
        meta.className = "label";
        meta.style.fontSize = "0.7rem";
        meta.textContent =
            "Source: " + (record.source || "—") +
            " | Date: " + (record.date || "—") +
            " | Region: " + (record.region || "—");

        article.appendChild(h3);
        article.appendChild(p);
        article.appendChild(meta);
        return article;
    }

    /** Execute search. */
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
                    gridEl.innerHTML =
                        '<p style="grid-column: 1 / -1; color: #999;">No records match your search.</p>';
                    return;
                }

                records.forEach(function (r) {
                    gridEl.appendChild(createCard(r));
                });
            })
            .catch(function (err) {
                gridEl.innerHTML =
                    '<p style="grid-column: 1 / -1; color: #999;">' + err.message + "</p>";
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
})();
