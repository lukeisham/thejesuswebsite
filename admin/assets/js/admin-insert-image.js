// Inline "Insert Image" widget — opens a file picker, uploads via Admin.uploadImage,
// prompts for a caption via a small inline text field, and inserts a
// [figure src="..." caption="..."] shortcode at the cursor position in a textarea.
//
// Used by: Evidence, Blog, Essay, Historiography, and Response content forms.
//
// Note: Admin MUST be loaded before this script so Admin.uploadImage is available.
// Note: admin-figure-shortcodes.js MUST be loaded before this script so
// AdminFigureShortcodes.buildFigureShortcode is available (SR-4 — the
// shortcode grammar lives in one module, never a second copy here).

window.AdminInsertImage = {};

var AdminInsertImage = window.AdminInsertImage;

/**
 * Insert text at a cursor position, replacing any selection.
 * Pure function — returns new text and cursor position, no DOM.
 *
 * @param {string} text          current textarea value
 * @param {string} insertion     text to insert
 * @param {number} selectionStart cursor start
 * @param {number} selectionEnd   cursor end
 * @returns {{ text: string, cursorPos: number }}
 */
function insertAtCursor(text, insertion, selectionStart, selectionEnd) {
  var before = text.slice(0, selectionStart);
  var after = text.slice(selectionEnd);
  var newText = before + insertion + after;
  var cursorPos = (before + insertion).length;
  return { text: newText, cursorPos: cursorPos };
}

/**
 * Wire an "Insert Image" button to a textarea.
 * Clicking the button opens a file picker, uploads the image, shows a small
 * inline caption field, and inserts the [figure] shortcode at the cursor.
 *
 * @param {string} buttonSelector    CSS selector for the trigger button
 * @param {string} textareaSelector  CSS selector for the target textarea
 */
AdminInsertImage.wire = function (buttonSelector, textareaSelector) {
  var btn = document.querySelector(buttonSelector);
  var textarea = document.querySelector(textareaSelector);

  if (!btn || !textarea) return;

  // Hidden file input
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/gif,image/webp";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  // Inline caption prompt (hidden by default)
  var promptEl = document.createElement("div");
  promptEl.className = "aimg-insert-prompt";
  promptEl.hidden = true;
  promptEl.setAttribute("role", "dialog");
  promptEl.setAttribute("aria-label", "Image caption");

  var promptLabel = document.createElement("label");
  promptLabel.className = "admin-form-group__label";
  promptLabel.setAttribute("for", "aimg-insert-caption");
  promptLabel.textContent = "Caption (optional)";

  var captionInput = document.createElement("input");
  captionInput.type = "text";
  captionInput.className = "admin-input";
  captionInput.id = "aimg-insert-caption";
  captionInput.placeholder = "e.g. The earliest known manuscript fragment";

  var promptActions = document.createElement("div");
  promptActions.className = "aimg-insert-prompt__actions";

  var insertBtn = document.createElement("button");
  insertBtn.type = "button";
  insertBtn.className = "admin-btn admin-btn--primary admin-btn--sm";
  insertBtn.textContent = "Insert";

  var cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
  cancelBtn.textContent = "Cancel";

  promptActions.appendChild(insertBtn);
  promptActions.appendChild(cancelBtn);

  promptEl.appendChild(promptLabel);
  promptEl.appendChild(captionInput);
  promptEl.appendChild(promptActions);

  // Insert after the button
  btn.parentNode.insertBefore(promptEl, btn.nextSibling);

  var pendingPath = null;

  function resetPrompt() {
    captionInput.value = "";
    promptEl.hidden = true;
    pendingPath = null;
    fileInput.value = "";
  }

  // When the button is clicked, open the file picker
  btn.addEventListener("click", function () {
    fileInput.click();
  });

  // When a file is selected, upload it
  fileInput.addEventListener("change", async function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;

    btn.disabled = true;
    btn.textContent = "Uploading…";

    try {
      var result = await Admin.uploadImage(file);
      pendingPath = result.image_path;
      promptEl.hidden = false;
      captionInput.focus();
    } catch (err) {
      var msg = "Upload failed: " + (err.message || "Unknown error");
      if (typeof showToast === "function") {
        showToast(msg, "error");
      } else {
        alert(msg);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Insert Image";
      fileInput.value = "";
    }
  });

  // Insert button inside prompt
  insertBtn.addEventListener("click", function () {
    if (!pendingPath) return;

    var shortcode = AdminFigureShortcodes.buildFigureShortcode({
      src: pendingPath,
      caption: captionInput.value.trim(),
    });

    var result = insertAtCursor(
      textarea.value,
      shortcode,
      textarea.selectionStart,
      textarea.selectionEnd,
    );

    textarea.value = result.text;
    textarea.focus();
    textarea.setSelectionRange(result.cursorPos, result.cursorPos);

    // Trigger input event so any slug-auto or validation handlers fire
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    resetPrompt();
  });

  // Cancel button
  cancelBtn.addEventListener("click", function () {
    resetPrompt();
  });

  // Close on Escape
  captionInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      resetPrompt();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      insertBtn.click();
    }
  });
};
