/**
 * display_popular_results.js
 * ──────────────────────────
 * Fetches and renders the full list of popular-level challenge
 * responses on the standalone Popular Responses page
 * (challenge_popular.html).
 *
 * API:  GET /api/challenges?type=popular
 * Target element: #popular-results
 */
(function initPopularResults() {
    "use strict";

    var listEl = document.getElementById("popular-results");

    if (!listEl) return;

    /** Fetch popular challenges from the server and render them. */
    function loadPopularResults() {
        fetch("/api/challenges?type=popular")
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (challenges) {
                if (!challenges || challenges.length === 0) return;

                listEl.innerHTML = "";

                challenges.forEach(function (c) {
                    var article = document.createElement("article");
                    article.className = "feed-container";
                    article.style.marginBottom = "1.5rem";
                    article.style.border = "1px solid var(--border-color)";

                    var h3 = document.createElement("h3");
                    h3.style.marginTop = "0";
                    h3.textContent = c.title || "Untitled";

                    var p = document.createElement("p");
                    p.style.fontSize = "0.9rem";
                    p.textContent = c.summary || "";

                    article.appendChild(h3);
                    article.appendChild(p);
                    listEl.appendChild(article);
                });
            })
            .catch(function () {
                // Keep placeholder content on network error
            });
    }

    loadPopularResults();
})();
