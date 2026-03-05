/**
 * display_blog_feed.js
 * ────────────────────
 * Fetches and renders the full list of published blog posts on
 * the standalone Blog Feed page (blog_feed.html).
 *
 * API:  GET /api/blog/posts
 * Target element: #blog-feed-list
 */
(function initBlogFeed() {
    "use strict";

    var listEl = document.getElementById("blog-feed-list");

    if (!listEl) return;

    /** Escape HTML to prevent XSS when injecting server text. */
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /** Fetch all published blog posts and render them as cards. */
    function loadBlogFeed() {
        fetch("/api/blog/posts")
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (posts) {
                if (!posts || posts.length === 0) return;

                listEl.innerHTML = "";

                posts.forEach(function (post) {
                    var article = document.createElement("article");
                    article.className = "feed-container";
                    article.style.border = "1px solid var(--border-color)";
                    article.style.padding = "1.5rem";

                    var kicker = document.createElement("div");
                    kicker.className = "essay-kicker";
                    kicker.style.fontFamily = "var(--font-sans)";
                    kicker.style.fontSize = "0.7rem";
                    kicker.style.textTransform = "uppercase";
                    kicker.style.letterSpacing = "2px";
                    kicker.style.color = "var(--accent-color)";
                    kicker.textContent = post.category || "Essay";

                    var h3 = document.createElement("h3");
                    h3.style.fontSize = "1.3rem";
                    h3.style.marginTop = "0.5rem";
                    h3.style.marginBottom = "0.5rem";
                    h3.textContent = post.title || "Untitled Post";

                    var p = document.createElement("p");
                    p.style.fontSize = "0.9rem";
                    p.style.color = "#666";
                    p.textContent = post.excerpt || post.body || "";

                    var meta = document.createElement("div");
                    meta.className = "essay-meta";
                    meta.style.marginTop = "1rem";
                    meta.style.fontSize = "0.8rem";
                    meta.style.color = "#888";
                    meta.innerHTML =
                        "<span>Author: " + escapeHtml(post.author || "—") + "</span>" +
                        "&ensp;<span>Date: " + escapeHtml(post.date || "—") + "</span>";

                    var link = document.createElement("a");
                    link.className = "nav-link";
                    link.style.display = "inline-block";
                    link.style.marginTop = "1rem";
                    link.style.fontSize = "0.85rem";
                    link.href = post.url || "#";
                    link.textContent = "Read Full Post \u2192";

                    article.appendChild(kicker);
                    article.appendChild(h3);
                    article.appendChild(p);
                    article.appendChild(meta);
                    article.appendChild(link);
                    listEl.appendChild(article);
                });
            })
            .catch(function () {
                // Keep placeholder content on network error
            });
    }

    loadBlogFeed();
})();
