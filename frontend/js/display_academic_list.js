/**
 * display_academic_list.js
 * ────────────────────────
 * Fetches and renders the academic-level challenge
 * responses on the Challenges page.
 */
(function initAcademicList() {
    "use strict";

    var listEl = document.getElementById("academic-list");
    var tabAcademic = document.getElementById("tab-academic");
    var tabPopular = document.getElementById("tab-popular");

    if (!listEl) return;

    /** Activate academic tab and hide popular. */
    function showAcademic() {
        listEl.style.display = "";
        var popularEl = document.getElementById("popular-list");
        if (popularEl) popularEl.style.display = "none";

        if (tabAcademic) tabAcademic.classList.add("active");
        if (tabPopular) tabPopular.classList.remove("active");
    }

    if (tabAcademic) {
        tabAcademic.addEventListener("click", showAcademic);
    }

    /** Fetch academic challenges from the server. */
    function loadAcademic() {
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
                // Keep placeholder content
            });
    }

    loadAcademic();
})();
