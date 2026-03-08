/**
 * edit_wikipedia_results.js
 * ─────────────────────────
 * Loads and manages Wikipedia article rankings in the
 * dashboard Wikipedia panel. Supports listing and
 * triggering a re-analysis of all articles.
 */
(function initEditWikipedia() {
    "use strict";

    var listEl = document.getElementById("wikipedia-edit-list");
    var reanalyseBtn = document.getElementById("reanalyse-wikipedia");
    var loadAllBtn = document.getElementById("load-all-wikipedia");
    var increaseLimitBtn = document.getElementById("increase-wikipedia-limit");

    var currentLimit = 500; // Default backend limit

    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    /** Fetch ranked articles and render them. */
    function loadArticles(limitOverride) {
        var url = "/api/v1/agent/wiki/rankings";
        if (limitOverride) {
            url += "?limit=" + limitOverride;
        }

        fetch(url, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load rankings");
                return res.json();
            })
            .then(function (articles) {
                renderList(articles);
            })
            .catch(function (err) {
                listEl.innerHTML =
                    '<li style="color:#999;">' + err.message + "</li>";
            });
    }

    /** Render article list items with scores. */
    function renderList(articles) {
        listEl.innerHTML = "";

        if (!articles || articles.length === 0) {
            listEl.innerHTML =
                '<li style="color:#999;">No articles ranked yet.</li>';
            return;
        }

        articles.forEach(function (a) {
            var li = document.createElement("li");

            var link = document.createElement("a");
            link.href = "#";
            link.textContent = a.title || "Untitled";

            var score = document.createElement("span");
            score.className = "label";
            score.style.cssFloat = "right";
            score.textContent = a.score != null ? a.score.toFixed(1) : "—";

            link.appendChild(score);
            li.appendChild(link);
            listEl.appendChild(li);
        });
    }

    /** Trigger a full re-analysis of all Wikipedia articles. */
    if (reanalyseBtn) {
        reanalyseBtn.addEventListener("click", function () {
            reanalyseBtn.disabled = true;
            reanalyseBtn.textContent = "Analysing…";

            fetch("/api/v1/agent/wiki/reanalyse", {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
            })
                .then(function (res) {
                    if (!res.ok)
                        throw new Error("Re-analysis failed (" + res.status + ")");
                    return res.json();
                })
                .then(function () {
                    reanalyseBtn.textContent = "Re-analyse All";
                    reanalyseBtn.disabled = false;
                    loadArticles();
                })
                .catch(function (err) {
                    reanalyseBtn.textContent = "Re-analyse All";
                    reanalyseBtn.disabled = false;
                    alert("Error: " + err.message);
                });
        });
    }

    if (loadAllBtn) {
        loadAllBtn.addEventListener("click", function () {
            currentLimit = 5000;
            loadArticles(currentLimit); // Huge limit to fetch all
        });
    }

    if (increaseLimitBtn) {
        increaseLimitBtn.addEventListener("click", function () {
            currentLimit += 100;
            loadArticles(currentLimit);
        });
    }

    // Initial load
    loadArticles();
})();
