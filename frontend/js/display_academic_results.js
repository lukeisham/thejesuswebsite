/**
 * display_academic_results.js
 * ───────────────────────────
 * Fetches and renders the full list of academic-level challenge
 * responses on the standalone Academic Responses page
 * (challenge_academic.html).
 *
 * API:  GET /api/challenges?type=academic
 * Target element: #academic-results
 */
(function initAcademicResults() {
    "use strict";

    var listEl = document.getElementById("academic-results");

    if (!listEl) return;

    /** Fetch academic challenges from the server and render them. */
    function loadAcademicResults() {
        fetch("/api/challenges?type=academic")
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

                    var meta = document.createElement("span");
                    meta.className = "label";
                    meta.style.fontSize = "0.7rem";
                    meta.textContent =
                        "Category: " + (c.category || "—") +
                        " | Difficulty: " + (c.difficulty || "—");

                    article.appendChild(h3);
                    article.appendChild(p);
                    article.appendChild(meta);
                    listEl.appendChild(article);
                });
            })
            .catch(function () {
                // Keep placeholder content on network error
            });
    }

    loadAcademicResults();
})();
