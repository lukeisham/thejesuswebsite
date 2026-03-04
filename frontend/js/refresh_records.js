/**
 * refresh_records.js
 * ──────────────────
 * Fetches the full record list from the server and
 * populates the record grid on the Records page.
 * Called on initial page load.
 */
(function initRefreshRecords() {
    "use strict";

    var gridEl = document.getElementById("record-grid");

    if (!gridEl) return;

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

    /** Load all records and render. */
    function refresh() {
        fetch("/api/records")
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load records");
                return res.json();
            })
            .then(function (records) {
                gridEl.innerHTML = "";

                if (!records || records.length === 0) {
                    gridEl.innerHTML =
                        '<p style="grid-column: 1 / -1; color: #999;">No records available yet.</p>';
                    return;
                }

                records.forEach(function (r) {
                    gridEl.appendChild(createCard(r));
                });
            })
            .catch(function () {
                // Keep placeholder content on failure
            });
    }

    refresh();
})();
