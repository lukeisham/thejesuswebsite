// Trigger:  Called by dashboard_blog_posts.js when the module loads.
//           Also called after each Save/Publish/Delete action to refresh the
//           sidebar list.
// Main:    displayBlogPostsList() — fetches the blog post list from
//           GET /api/admin/blogposts and populates the sidebar Published/Drafts
//           lists. Each list item is clickable, loading the blog post content
//           into the editor via loadBlogPostContent(recordId, title).
// Output:  Populated sidebar blog post lists. Blog post content loaded into
//           the editor (title, markdown, snippet, bibliography, context links,
//           metadata) when a list item is clicked. Errors routed via
//           window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const API_BASE_URL = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayBlogPostsList
   Fetches the blog post list from GET /api/admin/blogposts and populates
   the sidebar Published and Drafts lists.
----------------------------------------------------------------------------- */
async function displayBlogPostsList() {
  try {
    const response = await fetch(API_BASE_URL + "/blogposts");

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
    _populateSidebarList("blog-published-list", published);
    _populateSidebarList("blog-drafts-list", drafts);
  } catch (err) {
    console.error(
      "[display_blog_posts_data] Failed to load blog post list:",
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
   MAIN FUNCTION: loadBlogPostContent
   Fetches a single blog post by its record ID and populates the editor
   fields (title, markdown content, snippet, bibliography, context links,
   metadata). Called when a sidebar list item is clicked.

   Parameters:
     recordId (string) — The record slug/ID to fetch.
     title    (string) — The blog post title (for error messages).
----------------------------------------------------------------------------- */
async function loadBlogPostContent(recordId, title) {
  if (!recordId) return;

  try {
    const response = await fetch(
      API_BASE_URL + "/records/" + encodeURIComponent(recordId),
    );

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const post = await response.json();

    // Update module state
    window._blogModuleState.activeRecordId = recordId;
    window._blogModuleState.activeRecordTitle = post.title || title || "";
    window._blogModuleState.isDirty = false;

    // Populate title
    const titleInput = document.getElementById("blog-title-input");
    if (titleInput) {
      titleInput.value = post.title || "";
    }

    // Populate markdown content from the blogposts column
    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent(
        post.blogposts || post.markdown_content || post.content || "",
      );
    }

    // Populate snippet
    const snippetInput = document.getElementById("blog-snippet-input");
    if (snippetInput) {
      snippetInput.value = post.snippet || "";
    }

    // Populate slug
    const slugInput = document.getElementById("record-slug");
    if (slugInput) {
      slugInput.value = post.slug || "";
    }

    // Populate metadata display fields
    const metadataJson = document.getElementById("record-metadata-json");
    const createdAt = document.getElementById("record-created-at");
    const updatedAt = document.getElementById("record-updated-at");

    if (metadataJson) {
      metadataJson.value = post.metadata_json
        ? typeof post.metadata_json === "string"
          ? post.metadata_json
          : JSON.stringify(post.metadata_json, null, 2)
        : "";
    }
    if (createdAt) {
      createdAt.value = post.created_at || "";
    }
    if (updatedAt) {
      updatedAt.value = post.updated_at || "";
    }

    // Populate bibliography via shared tool
    if (typeof window.loadEditBibliography === "function") {
      try {
        window.loadEditBibliography(post.bibliography || []);
      } catch (err) {
        console.warn(
          "[display_blog_posts_data] Failed to load bibliography:",
          err,
        );
      }
    }

    // Populate context links via shared tool
    if (typeof window.renderEditLinks === "function") {
      try {
        window.renderEditLinks(
          "blog-context-links-container",
          post.context_links || [],
        );
      } catch (err) {
        console.warn(
          "[display_blog_posts_data] Failed to load context links:",
          err,
        );
      }
    }

    // Update picture handler with the record ID
    if (typeof window.renderEditPicture === "function") {
      try {
        window.renderEditPicture("blog-picture-container", recordId);
      } catch (err) {
        console.warn(
          "[display_blog_posts_data] Failed to wire picture handler:",
          err,
        );
      }
    }

    // Update metadata footer with the record ID
    if (typeof window.renderMetadataFooter === "function") {
      try {
        window.renderMetadataFooter("blog-metadata-container", recordId);
      } catch (err) {
        console.warn(
          "[display_blog_posts_data] Failed to wire metadata footer:",
          err,
        );
      }
    }

    // Populate the shared metadata widget
    if (typeof window.populateMetadataWidget === "function") {
      try {
        window.populateMetadataWidget("metadata-widget-container", post);
      } catch (err) {
        console.warn(
          "[display_blog_posts_data] Failed to populate metadata widget:",
          err,
        );
      }
    }

    // Highlight the active item in the sidebar
    _highlightActiveItem(recordId);

    // Show the Delete button (may have been hidden from init state)
    const deleteBtn = document.getElementById("btn-delete");
    if (deleteBtn) deleteBtn.hidden = false;
  } catch (err) {
    console.error("[display_blog_posts_data] Failed to load blog post:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load post '" +
          (title || recordId) +
          "'. Please try again.",
      );
    }
  }
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSidebarList
   Populates a sidebar <ul> element with list items for each blog post.

   Parameters:
     listId    (string) — The ID of the <ul> element to populate.
     posts     (array)  — Array of blog post objects (each with slug/id and title).
----------------------------------------------------------------------------- */
function _populateSidebarList(listId, posts) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!posts || !posts.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "blog-sidebar-list__item";
    emptyItem.textContent = "No posts";
    emptyItem.style.color = "var(--color-text-muted)";
    emptyItem.style.fontStyle = "italic";
    emptyItem.style.cursor = "default";
    listEl.appendChild(emptyItem);
    return;
  }

  posts.forEach(function (post) {
    const item = document.createElement("li");
    item.className = "blog-sidebar-list__item";
    item.textContent = post.title || post.slug || post.id || "Untitled";
    item.setAttribute("data-record-id", post.slug || post.id || "");
    item.setAttribute("data-record-title", post.title || "");

    item.addEventListener("click", function () {
      const recordId = item.getAttribute("data-record-id");
      const title = item.getAttribute("data-record-title");
      if (recordId) {
        loadBlogPostContent(recordId, title);
      }
    });

    listEl.appendChild(item);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _highlightActiveItem
   Adds the --active class to the currently selected sidebar item and
   removes it from all others.

   Parameters:
     recordId (string) — The record ID of the active blog post.
----------------------------------------------------------------------------- */
function _highlightActiveItem(recordId) {
  // Remove active class from all items
  const allItems = document.querySelectorAll(
    ".blog-sidebar-list__item--active",
  );
  allItems.forEach(function (item) {
    item.classList.remove("blog-sidebar-list__item--active");
  });

  // Add active class to the matching item
  if (recordId) {
    const activeItem = document.querySelector(
      '.blog-sidebar-list__item[data-record-id="' + CSS.escape(recordId) + '"]',
    );
    if (activeItem) {
      activeItem.classList.add("blog-sidebar-list__item--active");
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.displayBlogPostsList = displayBlogPostsList;
window.loadBlogPostContent = loadBlogPostContent;
