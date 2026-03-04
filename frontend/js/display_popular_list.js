/**
 * display_popular_list.js
 * ───────────────────────
 * Fetches and renders the popular-level challenge
 * responses on the Challenges page.
 */
(function initPopularList() {
    "use strict";

    var listEl = document.getElementById("popular-list");
    var tabPopular = document.getElementById("tab-popular");
    var tabAcademic = document.getElementById("tab-academic");

    if (!listEl) return;

    /** Activate popular tab and hide academic. */
    function showPopular() {
        listEl.style.display = "";
        var academicEl = document.getElementById("academic-list");
        if (academicEl) academicEl.style.display = "none";

        if (tabPopular) tabPopular.classList.add("active");
        if (tabAcademic) tabAcademic.classList.remove("active");
    }

    if (tabPopular) {
        tabPopular.addEventListener("click", showPopular);
    }

    /** Fetch popular challenges from the server. */
    function loadPopular() {
        fetch("/api/challenges?type=popular")
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (challenges) {
                if (!challenges || challenges.length === 0) {
                    listEl.innerHTML =
                        '<p style="font-size:0.9rem;color:#666;">No popular-level responses yet.</p>';
                    return;
                }

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
                // Keep placeholder content
            });
    }

    loadPopular();
})();
