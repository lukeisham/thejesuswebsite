/**
 * refresh_list.js
 * ───────────────
 * Fetches the latest Wikipedia article rankings from the
 * server and refreshes the ranking table on the Wikipedia
 * Ranking page.
 */
(function initRefreshList() {
    "use strict";

    var tableBody = document.getElementById("ranking-body");
    var refreshBtn = document.getElementById("refresh-rankings");

    if (!tableBody) return;

    /** Map a numeric score to a badge class and label. */
    function scoreBadge(score) {
        if (score >= 7) return { cls: "score-high", label: score.toFixed(1) };
        if (score >= 5) return { cls: "score-mid", label: score.toFixed(1) };
        return { cls: "score-low", label: score.toFixed(1) };
    }

    function neutralityBadge(neutrality) {
        if (neutrality === "good" || neutrality === "Good")
            return { cls: "score-high", label: "Good" };
        if (neutrality === "mixed" || neutrality === "Mixed")
            return { cls: "score-mid", label: "Mixed" };
        return { cls: "score-low", label: "Poor" };
    }

    /** Fetch rankings and render. */
    function refresh() {
        fetch("/api/wikipedia/rankings")
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (articles) {
                if (!articles || articles.length === 0) return;

                tableBody.innerHTML = "";

                articles.forEach(function (a, i) {
                    var tr = document.createElement("tr");

                    var tdRank = document.createElement("td");
                    tdRank.textContent = i + 1;

                    var tdTitle = document.createElement("td");
                    var link = document.createElement("a");
                    link.href = a.url || "#";
                    link.style.color = "var(--accent-color)";
                    link.textContent = a.title || "Untitled";
                    if (a.url) link.target = "_blank";
                    tdTitle.appendChild(link);

                    var tdCat = document.createElement("td");
                    tdCat.textContent = a.category || "—";

                    var tdSources = document.createElement("td");
                    tdSources.textContent = a.source_count != null ? a.source_count : "—";

                    var tdNeutrality = document.createElement("td");
                    var nBadge = neutralityBadge(a.neutrality || "");
                    var nSpan = document.createElement("span");
                    nSpan.className = "score-badge " + nBadge.cls;
                    nSpan.textContent = nBadge.label;
                    tdNeutrality.appendChild(nSpan);

                    var tdScore = document.createElement("td");
                    var sBadge = scoreBadge(a.score || 0);
                    var sSpan = document.createElement("span");
                    sSpan.className = "score-badge " + sBadge.cls;
                    sSpan.textContent = sBadge.label;
                    tdScore.appendChild(sSpan);

                    tr.appendChild(tdRank);
                    tr.appendChild(tdTitle);
                    tr.appendChild(tdCat);
                    tr.appendChild(tdSources);
                    tr.appendChild(tdNeutrality);
                    tr.appendChild(tdScore);
                    tableBody.appendChild(tr);
                });
            })
            .catch(function () {
                // Keep placeholder content
            });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", refresh);
    }

    // Initial load
    refresh();
})();
