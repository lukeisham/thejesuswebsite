// Trigger:  Called by dashboard_essay_historiography.js at module initialisation,
//           and whenever a document is selected from the sidebar list.
// Main:    initMarkdownEditor(initialContent) — wires the markdown textarea,
//           toolbar buttons, and live preview rendering. Tracks dirty state
//           via window._essayModuleState.isDirty.
// Output:  Interactive markdown editor with toolbar formatting, keyboard
//           shortcuts, and debounced live HTML preview. Consumers (Blog Posts,
//           Challenge Response) call window.initMarkdownEditor().

/* 🔑 OWNED shared tool — consumed by plan_dashboard_blog_posts and
   plan_dashboard_challenge_response via <script> tag inclusion.
   Those plans MUST NOT create local copies. */

"use strict";

/* -----------------------------------------------------------------------------
   INTERNAL STATE
----------------------------------------------------------------------------- */
let _debounceTimer = null;
const MARKDOWN_DEBOUNCE_MS = 300;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initMarkdownEditor
   Wires up the markdown textarea, toolbar buttons, and live preview.
   Accepts optional initial content to populate the editor.

   Parameters:
     initialContent (string) — Markdown text to populate the editor with.
----------------------------------------------------------------------------- */
function initMarkdownEditor(initialContent) {
  const textarea = document.getElementById("markdown-textarea");
  const preview = document.getElementById("markdown-preview");
  const toolbar = document.getElementById("markdown-toolbar");

  if (!textarea) {
    console.warn(
      "[markdown_editor] #markdown-textarea not found — editor not initialised.",
    );
    return;
  }
  if (!preview) {
    console.warn(
      "[markdown_editor] #markdown-preview not found — preview disabled.",
    );
  }

  // Set initial content
  if (typeof initialContent === "string" && initialContent) {
    textarea.value = initialContent;
    _renderPreview(textarea.value, preview);
  }

  // Reset dirty state
  window._essayModuleState.isDirty = false;

  // Wire textarea input → debounced live preview + dirty tracking
  textarea.addEventListener("input", function () {
    window._essayModuleState.isDirty = true;

    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      _renderPreview(textarea.value, preview);
    }, MARKDOWN_DEBOUNCE_MS);
  });

  // Wire toolbar buttons
  if (toolbar) {
    _wireToolbar(toolbar, textarea, preview);
  }

  // Wire keyboard shortcuts
  _wireKeyboardShortcuts(textarea, preview);
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: getMarkdownContent
   Returns the current content of the markdown textarea. Called by the
   document status handler before saving.

   Returns:
     (string) — Current markdown content.
----------------------------------------------------------------------------- */
function getMarkdownContent() {
  const textarea = document.getElementById("markdown-textarea");
  return textarea ? textarea.value : "";
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setMarkdownContent
   Replaces the editor content and renders the preview. Called by the data
   display module when loading a document. Resets dirty state.

   Parameters:
     content (string) — Markdown text to load into the editor.
----------------------------------------------------------------------------- */
function setMarkdownContent(content) {
  const textarea = document.getElementById("markdown-textarea");
  const preview = document.getElementById("markdown-preview");

  if (textarea) {
    textarea.value = typeof content === "string" ? content : "";
  }

  window._essayModuleState.isDirty = false;

  if (preview) {
    _renderPreview(textarea ? textarea.value : "", preview);
  }
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _renderPreview
   Converts markdown text to HTML and renders it into the preview pane.
   Uses a simple but effective markdown-to-HTML parser that matches the
   public frontend rendering behaviour.

   On failure, surfaces an error via window.surfaceError().
----------------------------------------------------------------------------- */
function _renderPreview(markdownText, previewEl) {
  if (!previewEl) return;

  try {
    const html = _markdownToHtml(markdownText || "");
    previewEl.innerHTML = html;
  } catch (err) {
    console.error("[markdown_editor] Preview render failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Markdown preview failed. Check document content for invalid syntax.",
      );
    }
    previewEl.innerHTML =
      '<p class="state-error__label">Preview error — check console for details.</p>';
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _markdownToHtml
   Simple but robust markdown-to-HTML converter. Handles:
   - Headings (h1–h6)
   - Bold, italic, underline
   - Inline code, code blocks
   - Links, images
   - Unordered and ordered lists
   - Blockquotes
   - Horizontal rules
   - Paragraphs and line breaks

   Matches the public frontend rendering behaviour — same output semantics,
   same typographic CSS class structure from typography.css.

   Parameters:
     md (string) — Raw markdown text.

   Returns:
     (string) — HTML output.
----------------------------------------------------------------------------- */
function _markdownToHtml(md) {
  if (!md || typeof md !== "string") return "";

  let html = md;

  // Escape HTML entities in the source to prevent injection
  html = _escapeMarkdownSource(html);

  // --- Code Blocks (fenced: ``` ... ```) ---
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
    const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return "<pre><code>" + escaped.trim() + "</code></pre>";
  });

  // --- Headings ---
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // --- Horizontal Rules ---
  html = html.replace(/^(---|\*\*\*|___)\s*$/gm, "<hr>");

  // --- Bold + Italic + Underline ---
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/~(.+?)~/g, "<u>$1</u>");

  // --- Images (before links to avoid false matches) ---
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // --- Links ---
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // --- Inline Code ---
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // --- Blockquotes ---
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, "\n");

  // --- Unordered Lists ---
  html = html.replace(/^[\*\-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function (match) {
    return "<ul>" + match + "</ul>";
  });

  // --- Ordered Lists ---
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // (Ordered items already wrapped by the unordered list handler above — re-wrap)
  // We handle by processing ordered lists before unordered, so do a final pass
  // Actually, let's handle ordered separately. The unordered regex catches
  // ordered list items too since they both produce <li>. We'll use a two-pass.
  // First, tag ordered list markers:
  html = html.replace(/^(\d+)\. (.+)$/gm, "<!--ol-li-->$2<!--/ol-li-->");

  // Wrap consecutive <!--ol-li--> blocks in <ol>
  html = html.replace(/(<!--ol-li-->.*?<!--\/ol-li-->\n?)+/g, function (match) {
    const items = match
      .replace(/<!--ol-li-->/g, "<li>")
      .replace(/<!--\/ol-li-->/g, "</li>");
    return "<ol>" + items + "</ol>";
  });

  // --- Paragraphs ---
  // Split on double newlines, wrap non-tag blocks in <p>
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map(function (block) {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Skip if already wrapped in a block-level tag
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|table)/.test(trimmed)) {
        return trimmed;
      }

      // Convert single newlines within paragraphs to <br>
      const withBreaks = trimmed.replace(/\n/g, "<br>");
      return "<p>" + withBreaks + "</p>";
    })
    .join("\n");

  // Clean up: remove empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _escapeMarkdownSource
   Escapes raw HTML characters in the markdown source so they render as
   literal text rather than being interpreted as HTML. Preserves markdown
   syntax characters (*, _, #, etc.) that we'll parse ourselves.
----------------------------------------------------------------------------- */
function _escapeMarkdownSource(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireToolbar
   Binds click handlers to markdown toolbar buttons. Each button wraps
   selected text in the appropriate markdown syntax.

   Parameters:
     toolbar  (HTMLElement) — The toolbar container element.
     textarea (HTMLElement) — The markdown textarea.
     preview  (HTMLElement) — The live preview container.
----------------------------------------------------------------------------- */
function _wireToolbar(toolbar, textarea, preview) {
  const buttons = toolbar.querySelectorAll("[data-action]");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const action = btn.getAttribute("data-action");
      _applyToolbarAction(action, textarea, preview);
    });
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _applyToolbarAction
   Applies a formatting action to the selected text in the textarea.

   Supported actions: bold, italic, underline, link, image, code
----------------------------------------------------------------------------- */
function _applyToolbarAction(action, textarea, preview) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  let replacement = "";
  let cursorOffset = 0;

  switch (action) {
    case "bold":
      replacement = "**" + (selectedText || "bold text") + "**";
      cursorOffset = selectedText ? 0 : -2; // Place cursor before closing **
      break;

    case "italic":
      replacement = "*" + (selectedText || "italic text") + "*";
      cursorOffset = selectedText ? 0 : -1;
      break;

    case "underline":
      replacement = "~" + (selectedText || "underlined text") + "~";
      cursorOffset = selectedText ? 0 : -1;
      break;

    case "link":
      if (selectedText) {
        replacement = "[" + selectedText + "](url)";
        cursorOffset = -4; // Place cursor on "url"
      } else {
        replacement = "[link text](url)";
        cursorOffset = -4;
      }
      break;

    case "image":
      if (selectedText) {
        replacement = "![" + selectedText + "](image-url)";
        cursorOffset = -11;
      } else {
        replacement = "![alt text](image-url)";
        cursorOffset = -11;
      }
      break;

    case "code":
      if (selectedText.includes("\n")) {
        replacement = "```\n" + selectedText + "\n```";
        cursorOffset = selectedText ? -4 : 0;
      } else {
        replacement = "`" + (selectedText || "code") + "`";
        cursorOffset = selectedText ? 0 : -1;
      }
      break;

    default:
      return;
  }

  // Insert the replacement text
  textarea.focus();
  document.execCommand("insertText", false, replacement);

  // If there was no selection, place cursor inside the markup
  if (!selectedText) {
    const newPos = start + replacement.length + cursorOffset;
    textarea.setSelectionRange(newPos, newPos);
  }

  // Trigger input event for preview update
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireKeyboardShortcuts
   Binds Ctrl+B (bold), Ctrl+I (italic) keyboard shortcuts.
----------------------------------------------------------------------------- */
function _wireKeyboardShortcuts(textarea, preview) {
  textarea.addEventListener("keydown", function (e) {
    // Ctrl+B / Cmd+B → Bold
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      _applyToolbarAction("bold", textarea, preview);
    }

    // Ctrl+I / Cmd+I → Italic
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      _applyToolbarAction("italic", textarea, preview);
    }
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Shared tool API
   Consumer plans call window.initMarkdownEditor(), window.getMarkdownContent(),
   and window.setMarkdownContent() via <script> tag inclusion.
----------------------------------------------------------------------------- */
window.initMarkdownEditor = initMarkdownEditor;
window.getMarkdownContent = getMarkdownContent;
window.setMarkdownContent = setMarkdownContent;
