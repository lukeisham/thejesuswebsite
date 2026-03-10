/**
 * display_top_four_news_items.js
 * ──────────────────────────────
 * Fetches the four most recent news items from the server
 * and renders them in the news feed sidebar on the
 * News & Blog page.
 */
(function initTopFourNews() {
    "use strict";

    var feedEl = document.getElementById("news-feed");

    if (!feedEl) return;

    fetch("/api/blog/news?limit=4")
        .then(function (res) {
            if (!res.ok) throw new Error("" + res.status);
            return res.json();
        })
        .then(function (items) {
            if (!items || items.length === 0) return;

            feedEl.innerHTML = "";

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
                p.textContent = item.snippet || "";

                var date = document.createElement("span");
                date.className = "label";
                date.style.fontSize = "0.65rem";
                date.style.display = "block";
                date.style.marginTop = "0.5rem";
                date.textContent =
                    "Date: " +
                    (item.harvested_at ? new Date(item.harvested_at).toLocaleDateString() : "—");

                if (item.picture_url) {
                    var img = document.createElement("img");
                    img.src = item.picture_url;
                    img.alt = item.title || "";
                    img.style.width = "100%";
                    img.style.height = "180px";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "4px";
                    img.style.marginBottom = "0.75rem";
                    img.loading = "lazy";
                    img.onerror = function () {
                        this.style.display = "none";
                    };
                    article.appendChild(img);
                }

                article.appendChild(h4);
                article.appendChild(p);
                article.appendChild(date);
                feedEl.appendChild(article);
            });
        })
        .catch(function () {
            // Keep placeholder content
        });
})();
