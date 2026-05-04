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

// Alias for shared tool compatibility (picture_handler, snippet_generator, etc.)
Object.defineProperty(window, "_recordTitle", {
  get: function () {
    return window._blogModuleState.activeRecordTitle;
  },
  configurable: true,
});
Object.defineProperty(window, "_recordSlug", {
  get: function () {
    return window._blogModuleState.activeRecordId;
  },
  configurable: true,
});

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
    window._setLayoutColumns(false, "1fr");
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
      window._setColumn("main", html);
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

  /* -------------------------------------------------------------------------
     4. INITIALISE SHARED TOOLS
     Each shared tool is included via a <script> tag in the dashboard shell
     and exposes a window.* function. We call them to wire up their
     respective sections within the injected HTML.
  ------------------------------------------------------------------------- */

  // 4a. Picture upload handler
  if (typeof window.renderEditPicture === "function") {
    window.renderEditPicture("blog-picture-container", "");
  }

  // 4b. MLA bibliography handler
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("blog-bibliography-container");
  }

  // 4c. Context links handler
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("blog-context-links-container", []);
  }

  // 4d. Metadata footer
  if (typeof window.renderMetadataFooter === "function") {
    window.renderMetadataFooter("blog-metadata-container", "");
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderBlogPosts = renderBlogPosts;
