// Trigger:  Called by dashboard_blog_posts.js at module initialisation.
//           Wires the Save, Publish, and Delete buttons in the function bar.
// Main:    initBlogPostStatusHandler() — binds click handlers to status action
//           buttons. Before executing any action, checks for unsaved changes in
//           the markdown editor (dirty-state flag set by markdown_editor.js).
//           If unsaved changes exist, prompts the admin to save first.
// Output:  Save, Publish, and Delete operations performed via the admin API.
//           Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const BLOG_API_BASE = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initBlogPostStatusHandler
   Wires click handlers to the Save, Publish, and Delete buttons.
----------------------------------------------------------------------------- */
function initBlogPostStatusHandler() {
  const btnSaveDraft = document.getElementById("btn-save-draft");
  const btnPublish = document.getElementById("btn-publish");
  const btnDelete = document.getElementById("btn-delete");

  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", _handleSaveDraft);
  }

  if (btnPublish) {
    btnPublish.addEventListener("click", _handlePublish);
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", _handleDelete);

    // Hide Delete button when no blog post is selected (initial state)
    if (!window._blogModuleState.activeRecordId) {
      btnDelete.hidden = true;
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Save Draft
   Collects all editor data and PUTs to /api/admin/records/{id} with
   status = 'draft'. Before saving, checks for unsaved changes — if none,
   notifies the admin that there are no changes to save.
----------------------------------------------------------------------------- */
async function _handleSaveDraft() {
  const recordId = window._blogModuleState.activeRecordId;
  const title = window._blogModuleState.activeRecordTitle || "this post";

  // If there IS a recordId but no unsaved changes, skip the save
  if (recordId && !window._blogModuleState.isDirty) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No changes to save.");
    }
    return;
  }

  const payload = _collectEditorData();
  payload.status = "draft";

  const btn = document.getElementById("btn-save-draft");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  try {
    if (recordId) {
      // --- UPDATE existing record ---
      const response = await fetch(
        BLOG_API_BASE + "/records/" + encodeURIComponent(recordId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(function () {
          return {};
        });
        const detail = errorBody.detail || "HTTP " + response.status;
        throw new Error(detail);
      }
    } else {
      // --- CREATE new record ---
      const response = await fetch(BLOG_API_BASE + "/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(function () {
          return {};
        });
        const detail = errorBody.detail || "HTTP " + response.status;
        throw new Error(detail);
      }

      const result = await response.json();

      if (result.id) {
        // Update module state with the new ID
        window._blogModuleState.activeRecordId = result.id;
        window._blogModuleState.activeRecordTitle = payload.title || "Untitled";

        // Re-initialise shared tools with the new ID
        if (typeof window.renderEditPicture === "function") {
          window.renderEditPicture("blog-picture-container", result.id);
        }

        // Show Delete button
        const deleteBtn = document.getElementById("btn-delete");
        if (deleteBtn) deleteBtn.hidden = false;
      }
    }

    // Mark as clean
    window._blogModuleState.isDirty = false;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Saved: " + title);
    }

    // Refresh the sidebar list to reflect status changes
    if (typeof window.displayBlogPostsList === "function") {
      await window.displayBlogPostsList();
    }
  } catch (err) {
    console.error("[blog_post_status_handler] Save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save changes to '" + title + "'. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save Draft";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Publish
   Collects all editor data and PUTs to /api/admin/records/{id} with
   status = 'published'. Requires all mandatory fields to be filled.
----------------------------------------------------------------------------- */
async function _handlePublish() {
  const recordId = window._blogModuleState.activeRecordId;
  const title = window._blogModuleState.activeRecordTitle || "this post";

  if (!recordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No blog post selected. Please select a post from the sidebar first.",
      );
    }
    return;
  }

  // Check dirty state — warn about unsaved changes before publishing
  if (window._blogModuleState.isDirty) {
    const proceed = confirm(
      "You have unsaved changes. Save before publishing?",
    );
    if (!proceed) return;

    // Auto-save first
    await _handleSave();
    // If save failed, isDirty will still be true
    if (window._blogModuleState.isDirty) return;
  }

  // Collect data and validate required fields
  const payload = _collectEditorData();

  if (!payload.title || !payload.title.trim()) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
    return;
  }

  if (!payload.blogposts || !payload.blogposts.trim()) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
    return;
  }

  payload.status = "published";

  const btn = document.getElementById("btn-publish");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Publishing…";
  }

  try {
    const response = await fetch(
      BLOG_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(function () {
        return {};
      });
      const detail = errorBody.detail || "HTTP " + response.status;
      throw new Error(detail);
    }

    // Mark as clean
    window._blogModuleState.isDirty = false;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Published: " + title);
    }

    // Refresh the sidebar list
    if (typeof window.displayBlogPostsList === "function") {
      await window.displayBlogPostsList();
    }
  } catch (err) {
    console.error("[blog_post_status_handler] Publish failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Publish";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Delete
   Prompts for confirmation, then DELETEs the record. Clears the editor
   and refreshes the sidebar on success.
----------------------------------------------------------------------------- */
async function _handleDelete() {
  const recordId = window._blogModuleState.activeRecordId;
  const title = window._blogModuleState.activeRecordTitle || "this post";

  if (!recordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No blog post selected. Please select a post from the sidebar first.",
      );
    }
    return;
  }

  // Confirmation prompt
  const confirmed = confirm(
    "Are you sure you want to delete '" + title + "'? This cannot be undone.",
  );
  if (!confirmed) return;

  const btn = document.getElementById("btn-delete");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Deleting…";
  }

  try {
    const response = await fetch(
      BLOG_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(function () {
        return {};
      });
      const detail = errorBody.detail || "HTTP " + response.status;
      throw new Error(detail);
    }

    // Clear the editor
    window._blogModuleState.activeRecordId = null;
    window._blogModuleState.activeRecordTitle = "";
    window._blogModuleState.isDirty = false;

    // Reset editor fields
    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent("");
    }

    const titleInput = document.getElementById("blog-title-input");
    if (titleInput) titleInput.value = "";

    // Clear metadata widget
    if (typeof window.populateMetadataWidget === "function") {
      window.populateMetadataWidget("metadata-widget-container", null);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Deleted: " + title);
    }

    // Refresh sidebar
    if (typeof window.displayBlogPostsList === "function") {
      await window.displayBlogPostsList();
    }
  } catch (err) {
    console.error("[blog_post_status_handler] Delete failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to delete '" + title + "'. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _collectEditorData
   Gathers all data from the editor fields and shared tool sections into a
   single payload object for the API.

   Returns:
     (Object) — Payload with title, blogposts (markdown content), snippet,
                bibliography, context_links, and slug fields.
----------------------------------------------------------------------------- */
function _collectEditorData() {
  const titleInput = document.getElementById("blog-title-input");
  const textarea = document.getElementById("markdown-textarea");
  const snippetInput = document.getElementById("blog-snippet-input");
  const slugInput = document.getElementById("record-slug");

  const payload = {
    title: titleInput ? titleInput.value : "",
    blogposts: textarea ? textarea.value : "",
  };

  // Collect from metadata widget
  if (typeof window.collectMetadataWidget === "function") {
    const metaData = window.collectMetadataWidget("metadata-widget-container");
    payload.slug = metaData.slug;
    payload.snippet = metaData.snippet;
    payload.metadata_json = metaData.metadata_json;
  }

  // Collect bibliography from shared tool
  if (typeof window.collectEditBibliography === "function") {
    try {
      payload.bibliography = window.collectEditBibliography();
    } catch (err) {
      console.warn(
        "[blog_post_status_handler] Failed to collect bibliography:",
        err,
      );
      payload.bibliography = [];
    }
  }

  // Collect context links from shared tool
  if (typeof window.collectEditLinks === "function") {
    try {
      payload.context_links = window.collectEditLinks();
    } catch (err) {
      console.warn(
        "[blog_post_status_handler] Failed to collect context links:",
        err,
      );
      payload.context_links = [];
    }
  }

  return payload;
}

/* -----------------------------------------------------------------------------
   GLOBAL: _saveBlogPost
   Silent save for the metadata widget's auto-save feature.
----------------------------------------------------------------------------- */
async function _saveBlogPost() {
  const recordId = window._blogModuleState.activeRecordId;
  if (!recordId) return;

  const payload = _collectEditorData();
  payload.status = "draft";

  try {
    const response = await fetch(
      BLOG_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error("Silent save failed");
  } catch (err) {
    console.error("[blog_post_status_handler] Silent save failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: scheduleAutoSave
   Debounced auto-save (1500ms) that collects editor data via
   _collectEditorData() and PUTs with status: 'draft'. Wired to input/change
   events on title and markdown textarea. Clears the isDirty flag on success.
----------------------------------------------------------------------------- */
function scheduleAutoSave() {
  if (window._autoSaveTimer) {
    clearTimeout(window._autoSaveTimer);
  }

  window._autoSaveTimer = setTimeout(async function () {
    var recordId = window._blogModuleState.activeRecordId;
    if (!recordId) return;

    var payload = _collectEditorData();
    payload.status = "draft";

    try {
      var response = await fetch(
        BLOG_API_BASE + "/records/" + encodeURIComponent(recordId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        var errorBody = await response.json().catch(function () {
          return {};
        });
        throw new Error(errorBody.detail || "HTTP " + response.status);
      }

      // Clear dirty flag on success
      window._blogModuleState.isDirty = false;
    } catch (err) {
      console.error("[blog_post_status_handler] Auto-save failed:", err);
    }
  }, 1500);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initBlogPostStatusHandler = initBlogPostStatusHandler;
window._saveBlogPost = _saveBlogPost;
window.scheduleAutoSave = scheduleAutoSave;
