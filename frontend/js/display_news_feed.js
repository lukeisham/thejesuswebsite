/**
 * display_news_feed.js
 * ────────────────────
 * Fetches and renders the full list of news items on the
 * standalone News Feed page (news_feed.html).
 *
 * API:  GET /api/blog/news
 * Target element: #news-feed-list
 */
(function initNewsFeed() {
    "use strict";

    var listEl = document.getElementById("news-feed-list");

    if (!listEl) return;

    /** Fetch all news items and render them as cards. */
    function loadNewsFeed() {
        fetch("/api/blog/news")
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (items) {
                if (!items || items.length === 0) return;

                listEl.innerHTML = "";

                items.forEach(function (item) {
                    var article = document.createElement("article");
                    article.className = "feed-container";
                    article.style.marginBottom = "1rem";
                    article.style.border = "1px solid var(--border-color)";

                    var h4 = document.createElement("h4");
                    h4.style.margin = "0 0 0.25rem";
                    h4.textContent = item.title || "News Update";

                    var p = document.createElement("p");
                    p.style.fontSize = "0.8rem";
                    p.style.color = "#666";
                    p.style.margin = "0";
                    p.textContent = item.summary || item.body || "";

                    var date = document.createElement("span");
                    date.className = "label";
                    date.style.fontSize = "0.65rem";
                    date.style.display = "block";
                    date.style.marginTop = "0.5rem";
                    date.textContent = "Date: " + (item.date || "—");

                    article.appendChild(h4);
                    article.appendChild(p);
                    article.appendChild(date);
                    listEl.appendChild(article);
                });
            })
            .catch(function () {
                // Keep placeholder content on network error
            });
    }

    loadNewsFeed();
})();
