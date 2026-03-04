/**
 * display_top_blog_post.js
 * ────────────────────────
 * Fetches the latest published blog post from the server
 * and renders it in the featured blog section on the
 * News & Blog page.
 */
(function initTopBlogPost() {
    "use strict";

    var containerEl = document.getElementById("top-blog-post");

    if (!containerEl) return;

    fetch("/api/blog/latest")
        .then(function (res) {
            if (!res.ok) throw new Error("" + res.status);
            return res.json();
        })
        .then(function (post) {
            if (!post) return;

            var kicker = containerEl.querySelector(".essay-kicker");
            if (kicker) kicker.textContent = post.category || "Featured";

            var h3 = containerEl.querySelector("h3");
            if (h3) h3.textContent = post.title || "Untitled Post";

            var p = containerEl.querySelector("p");
            if (p) p.textContent = post.excerpt || post.body || "";

            var meta = containerEl.querySelector(".essay-meta");
            if (meta) {
                meta.innerHTML =
                    "<span>Author: " + escapeHtml(post.author || "—") + "</span> " +
                    "<span>Date: " + escapeHtml(post.date || "—") + "</span>";
            }

            var link = containerEl.querySelector("a.nav-link");
            if (link && post.url) {
                link.href = post.url;
            }
        })
        .catch(function () {
            // Keep placeholder content
        });

    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
})();
