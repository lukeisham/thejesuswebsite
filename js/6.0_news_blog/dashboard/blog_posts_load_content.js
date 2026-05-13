// Trigger:  Called when a sidebar list item is clicked in the Blog Posts
//           editor.
// Main:    loadBlogPostContent(recordId, title) — fetches a single blog post
//           from GET /api/admin/records/{id}, populates the editor fields
//           (title, markdown from blogposts column, slug, snippet, metadata,
//           bibliography, context links, picture), and highlights the active
//           sidebar item — all targeting unified wysiwyg-* DOM IDs.
// Output:  Editor populated with the selected blog post's data. Active sidebar
//           item highlighted. Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const BP_LOAD_API_BASE_URL = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: loadBlogPostContent
   Fetches a single blog post by its record ID and populates the editor
   fields. Called when a sidebar list item is clicked.

   Parameters:
     recordId (string) — The record slug/ID to fetch.
     title    (string) — The blog post title (for error messages).
----------------------------------------------------------------------------- */
async function loadBlogPostContent(recordId, title) {
  if (!recordId) return;

  try {
    const response = await fetch(
      BP_LOAD_API_BASE_URL + "/records/" + encodeURIComponent(recordId),
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
    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) {
      titleInput.value = post.title || "";
    }

    // Populate markdown content from the blogposts column
    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent(
        post.blogposts || post.markdown_content || post.content || "",
      );
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
          "[blog_posts_load_content] Failed to load bibliography:",
          err,
        );
      }
    }

    // Populate context links via shared tool
    if (typeof window.renderEditLinks === "function") {
      try {
        window.renderEditLinks(
          "wysiwyg-context-links-container",
          post.context_links || [],
        );
      } catch (err) {
        console.warn(
          "[blog_posts_load_content] Failed to load context links:",
          err,
        );
      }
    }

    // Populate external references
    if (typeof window.setExternalRefValues === "function") {
      try {
        let extEntries = null;
        try {
          if (post.metadata_json) {
            const meta = JSON.parse(post.metadata_json);
            if (Array.isArray(meta.identifiers) && meta.identifiers.length > 0) {
              extEntries = meta.identifiers;
            }
          }
        } catch (e) { /* ignore parse errors */ }
        window.setExternalRefValues({
          iaa: post.iaa || "",
          pledius: post.pledius || "",
          manuscript: post.manuscript || "",
          entries: extEntries,
        });
      } catch (err) {
        console.warn(
          "[blog_posts_load_content] Failed to set external refs:",
          err,
        );
      }
    }

    // Update picture handler with the record ID
    if (typeof window.renderEditPicture === "function") {
      try {
        window.renderEditPicture("wysiwyg-picture-container", recordId);
      } catch (err) {
        console.warn(
          "[blog_posts_load_content] Failed to wire picture handler:",
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
          "[blog_posts_load_content] Failed to populate metadata widget:",
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
    console.error("[blog_posts_load_content] Failed to load blog post:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load post '" +
          (title || recordId) +
          "'. Please try again.",
      );
    }
  }
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
    ".wysiwyg-sidebar-list__item--active",
  );
  allItems.forEach(function (item) {
    item.classList.remove("wysiwyg-sidebar-list__item--active");
  });

  // Add active class to the matching item
  if (recordId) {
    const activeItem = document.querySelector(
      '.wysiwyg-sidebar-list__item[data-record-id="' +
        CSS.escape(recordId) +
        '"]',
    );
    if (activeItem) {
      activeItem.classList.add("wysiwyg-sidebar-list__item--active");
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.loadBlogPostContent = loadBlogPostContent;
