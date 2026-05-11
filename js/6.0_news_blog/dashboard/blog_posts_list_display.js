// Trigger:  Called by dashboard_blog_posts.js when the module loads, and
//           after each Save/Publish/Delete action to refresh the sidebar.
// Main:    displayBlogPostsList() — fetches the blog post list from
//           GET /api/admin/blogposts and populates the sidebar Published/Drafts
//           lists using unified wysiwyg-* DOM IDs. Each list item is clickable,
//           loading the blog post content via window.loadBlogPostContent().
// Output:  Populated sidebar blog post lists. Errors routed via
//           window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const BP_LIST_API_BASE_URL = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayBlogPostsList
   Fetches the blog post list from GET /api/admin/blogposts and populates
   the sidebar Published and Drafts lists.
----------------------------------------------------------------------------- */
async function displayBlogPostsList() {
  try {
    const response = await fetch(BP_LIST_API_BASE_URL + "/blogposts");

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();

    // Separate into published and drafts
    const posts = Array.isArray(data)
      ? data
      : data.records || data.blogposts || data.results || [];

    const published = posts.filter(function (post) {
      return post.status === "published";
    });
    const drafts = posts.filter(function (post) {
      return post.status !== "published";
    });

    // Populate the sidebar lists
    _populateSidebarList("wysiwyg-published-list", published);
    _populateSidebarList("wysiwyg-drafts-list", drafts);
  } catch (err) {
    console.error(
      "[blog_posts_list_display] Failed to load blog post list:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load blog posts list. Please refresh and try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSidebarList
   Populates a sidebar <ul> element with list items for each blog post.

   Parameters:
     listId (string) — The ID of the <ul> element to populate.
     posts  (array)  — Array of blog post objects.
----------------------------------------------------------------------------- */
function _populateSidebarList(listId, posts) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!posts || !posts.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "wysiwyg-sidebar-list__item";
    emptyItem.textContent = "No posts";
    emptyItem.style.color = "var(--color-text-muted)";
    emptyItem.style.fontStyle = "italic";
    emptyItem.style.cursor = "default";
    listEl.appendChild(emptyItem);
    return;
  }

  posts.forEach(function (post) {
    const item = document.createElement("li");
    item.className = "wysiwyg-sidebar-list__item";
    item.textContent = post.title || post.slug || post.id || "Untitled";
    item.setAttribute("data-record-id", post.slug || post.id || "");
    item.setAttribute("data-record-title", post.title || "");

    item.addEventListener("click", function () {
      const recordId = item.getAttribute("data-record-id");
      const title = item.getAttribute("data-record-title");
      if (recordId && typeof window.loadBlogPostContent === "function") {
        window.loadBlogPostContent(recordId, title);
      }
    });

    listEl.appendChild(item);
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.displayBlogPostsList = displayBlogPostsList;
