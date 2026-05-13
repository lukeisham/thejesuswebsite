// Trigger:  window.loadModule("blog-posts") → dashboard_app.js calls
//           window.renderBlogPosts()
// Main:    renderBlogPosts() — injects the HTML, sets layout columns,
//           initialises all sub-modules (data display, markdown editor,
//           blog post status handler), and coordinates calls to shared tools
//           (picture, MLA, context links, snippet, metadata).
// Output:  Fully functional Blog Posts editor in the Providence work canvas.
//           Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._blogModuleState = {
  activeRecordId: null, // currently selected blog post ID (slug)
  activeRecordTitle: "", // currently selected blog post title
  isDirty: false, // true when markdown has unsaved changes
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._blogModuleState.activeRecordId;

// Bridge: markdown_editor.js writes to window._essayModuleState.isDirty.
// Point it to our blog module state so dirty tracking works for blog posts.
window._essayModuleState = window._blogModuleState;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderBlogPosts
   Called by dashboard_app.js when the user navigates to this module.
   1. Sets the Providence canvas layout (sidebar collapsed, main 1fr).
   2. Injects the editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
----------------------------------------------------------------------------- */
async function renderBlogPosts() {
  /* -------------------------------------------------------------------------
     1. SET LAYOUT — Sidebar is internal to this module, so we collapse the
        Providence sidebar and use the full main column for our split-pane.
  ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
     2. INJECT HTML — The editor template is loaded via fetch and injected
        into the Providence main column.
  ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/admin/frontend/dashboard_blog_posts.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load editor template (HTTP " + response.status + ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("wysiwyg-function-bar");
      const sidebar = doc.getElementById("wysiwyg-sidebar");
      const editorArea = doc.getElementById("wysiwyg-editor-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }

      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (editorArea) mainHtml += editorArea.outerHTML;

      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error("[dashboard_blog_posts] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Blog Posts editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
     3. INITIALISE SUB-MODULES (in dependency order)
     Each sub-module exposes a function on window. We call them after the
     HTML is injected so DOM elements are available.
  ------------------------------------------------------------------------- */

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._blogModuleState.activeRecordTitle;

  // 3a. Load the sidebar blog post list
  if (typeof window.displayBlogPostsList === "function") {
    await window.displayBlogPostsList();
  }

  // 3b. Initialise the markdown editor with empty content
  if (typeof window.initMarkdownEditor === "function") {
    window.initMarkdownEditor("");
  }

  // 3c. Initialise blog post status handler
  if (typeof window.initBlogPostStatusHandler === "function") {
    window.initBlogPostStatusHandler();
  }

  // 3d. Wire "+ New Blog Post" button
  _wireNewBlogPostButton();

  /* -------------------------------------------------------------------------
     4. INITIALISE SHARED TOOLS — all target unified wysiwyg-* container IDs
  ------------------------------------------------------------------------- */

  // 4a. Picture upload handler
  if (typeof window.renderEditPicture === "function") {
    window.renderEditPicture("wysiwyg-picture-container", "");
  }

  // 4b. MLA bibliography handler
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("wysiwyg-bibliography-container");
  }

  // 4c. Context links handler
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("wysiwyg-context-links-container", []);
  }

  // 4c2. External references handler (iaa, pledius, manuscript)
  if (typeof window.renderExternalRefs === "function") {
    window.renderExternalRefs("wysiwyg-external-refs-container");
  }

  // 4d. Metadata widget — shared unified slug/snippet/metadata UI
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        if (typeof window._saveBlogPost === "function") {
          await window._saveBlogPost();
        }
      },
      getRecordTitle: function () {
        const titleInput = document.getElementById("wysiwyg-title-input");
        return titleInput ? titleInput.value : "";
      },
      getRecordId: function () {
        return window._blogModuleState
          ? window._blogModuleState.activeRecordId || ""
          : "";
      },
    });
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _generateUntitledTitle
   Scans the sidebar lists (Published + Drafts) for existing "Untitled N"
   titles and returns the next available number.
----------------------------------------------------------------------------- */
function _generateUntitledTitle() {
  let maxN = 0;

  const items = document.querySelectorAll(
    "#wysiwyg-published-list .wysiwyg-sidebar-list__item, #wysiwyg-drafts-list .wysiwyg-sidebar-list__item",
  );

  items.forEach(function (item) {
    const title = item.getAttribute("data-record-title") || "";
    const match = title.match(/^Untitled (\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxN) {
        maxN = n;
      }
    }
  });

  return "Untitled " + (maxN + 1);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleNewBlogPost
   Creates a new draft blog post via POST /api/admin/records.
----------------------------------------------------------------------------- */
async function _handleNewBlogPost() {
  const btn = document.getElementById("btn-new-blog-post");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Creating...";

  const newTitle = _generateUntitledTitle();

  try {
    const response = await fetch("/api/admin/records", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        blogposts: "",
        snippet: "",
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();
    const newId = result.id;

    if (!newId) {
      throw new Error("No ID returned from server");
    }

    // Update module state to point to the new draft
    window._blogModuleState.activeRecordId = newId;
    window._blogModuleState.activeRecordTitle = newTitle;
    window._blogModuleState.isDirty = false;

    // Clear the editor fields
    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) titleInput.value = newTitle;

    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent("");
    }

    // Re-initialise shared tools with the new record ID
    if (typeof window.renderEditPicture === "function") {
      window.renderEditPicture("wysiwyg-picture-container", newId);
    }
    if (typeof window.renderEditLinks === "function") {
      window.renderEditLinks("wysiwyg-context-links-container", []);
    }
    if (typeof window.loadEditBibliography === "function") {
      window.loadEditBibliography(null);
    }

    // Reset external refs
    if (typeof window.setExternalRefValues === "function") {
      window.setExternalRefValues({ iaa: "", pledius: "", manuscript: "" });
    }

    // Refresh the sidebar to show the new draft
    if (typeof window.displayBlogPostsList === "function") {
      await window.displayBlogPostsList();

      setTimeout(function () {
        const newItem = document.querySelector(
          '.wysiwyg-sidebar-list__item[data-record-id="' +
            CSS.escape(newId) +
            '"]',
        );
        if (newItem) {
          newItem.classList.add("wysiwyg-sidebar-list__item--active");
        }
      }, 100);
    }

    // Show the Delete button
    const deleteBtn = document.getElementById("btn-delete");
    if (deleteBtn) deleteBtn.hidden = false;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("New draft created: " + newTitle);
    }
  } catch (err) {
    console.error("[dashboard_blog_posts] New blog post failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to create new blog post. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "+ New Blog Post";
    }
  }
}

function _wireNewBlogPostButton() {
  const btn = document.getElementById("btn-new-blog-post");
  if (!btn) return;

  btn.addEventListener("click", _handleNewBlogPost);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderBlogPosts = renderBlogPosts;
