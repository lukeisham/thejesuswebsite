/**
 * blog_crud.js
 * ────────────
 * Manages blog posts in the dashboard Blog CRUD panel.
 * Supports listing, creating and deleting posts.
 */
(function initBlogCrud() {
    "use strict";

    var listEl = document.getElementById("blog-list");
    var createBtn = document.getElementById("create-blog-post");

    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    var allPosts = []; // Cache for search

    /** Fetch blog posts from the server. */
    function loadPosts() {
        fetch("/api/blog/posts", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load posts");
                return res.json();
            })
            .then(function (posts) {
                allPosts = posts;
                renderList(posts);
            })
            .catch(function (err) {
                listEl.innerHTML =
                    '<li style="color:#999;">' + err.message + "</li>";
            });
    }

    /** Render blog post list items. */
    function renderList(posts) {
        listEl.innerHTML = "";

        if (!posts || posts.length === 0) {
            listEl.innerHTML =
                '<li style="color:#999;">No posts match.</li>';
            return;
        }

        posts.forEach(function (p) {
            var li = document.createElement("li");

            var link = document.createElement("a");
            link.href = "#";
            link.textContent = p.title || "Untitled";

            var status = document.createElement("span");
            status.className = "label";
            status.style.cssFloat = "right";
            status.textContent = p.published ? "published" : "draft";

            link.appendChild(status);
            li.appendChild(link);
            listEl.appendChild(li);
        });
    }

    // --- Search Functionality ---
    var searchInput = document.getElementById("search-blogs-input");
    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            var q = e.target.value.toLowerCase();
            var filtered = allPosts.filter(function (p) {
                return (p.title || "").toLowerCase().indexOf(q) !== -1;
            });
            renderList(filtered);
        });
    }

    // --- Modal WYSIWYG Editor ---
    var modal = document.getElementById("blog-editor-modal");
    var closeBtn = document.getElementById("blog-close-btn");
    var titleEl = document.getElementById("blog-edit-title");
    var bodyEl = document.getElementById("blog-edit-body");
    var saveDraftBtn = document.getElementById("blog-save-draft");
    var publishBtn = document.getElementById("blog-publish");

    function openModal() {
        titleEl.value = "";
        bodyEl.value = "";
        if (modal) modal.style.display = "flex";
    }

    function closeModal() {
        if (modal) modal.style.display = "none";
    }

    if (createBtn) createBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    // Format buttons logic
    var formatBtns = document.querySelectorAll(".blog-format-btn");
    formatBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var tag = btn.getAttribute("data-tag");
            var start = bodyEl.selectionStart;
            var end = bodyEl.selectionEnd;
            var text = bodyEl.value;
            var selectedText = text.substring(start, end);

            var pre = "", post = "";
            switch (tag) {
                case "h3": pre = "### "; break;
                case "b": pre = "**"; post = "**"; break;
                case "i": pre = "*"; post = "*"; break;
                case "ul": pre = "- "; break;
                case "a": pre = "["; post = "](url)"; break;
            }

            bodyEl.value = text.substring(0, start) + pre + selectedText + post + text.substring(end);
            bodyEl.focus();
            bodyEl.selectionStart = start + pre.length;
            bodyEl.selectionEnd = end + pre.length + (post === "](url)" ? -5 : 0);
        });
    });

    function saveOrPublish(isPublished) {
        var title = titleEl.value.trim();
        var body = bodyEl.value.trim();
        if (!title) {
            alert("Title is required.");
            return;
        }

        fetch("/api/blog/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ title: title, body: body, published: isPublished }),
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to save post");
                closeModal();
                loadPosts();
            })
            .catch(function (err) {
                alert("Error: " + err.message);
            });
    }

    if (saveDraftBtn) saveDraftBtn.addEventListener("click", function () { saveOrPublish(false); });
    if (publishBtn) publishBtn.addEventListener("click", function () { saveOrPublish(true); });

    // Initial load
    loadPosts();
})();
