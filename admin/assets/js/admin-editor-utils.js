// Form helpers shared by the admin record editors: id-list parsing, the admin's
// single HTML escaper, required/slug validation, and mounting of the image and
// bibliography panels. One copy here means a fix reaches every editor.
//
// Used by: admin/{evidence,essays,blog,debate,historiography}/edit-[id].html
// and the new.html pages of essays, blog, debate and historiography.
// Tested by: admin/tests/admin-editor-utils.test.js

window.AdminEditorUtils = {};

var AdminEditorUtils = window.AdminEditorUtils;

/**
 * Parse a comma-separated string of IDs into an array of integers.
 * Non-numeric entries are dropped. Returns undefined for empty/blank input
 * so callers can omit the field from a PUT payload rather than sending [].
 *
 * @param {string} str
 * @returns {number[]|undefined}
 */
AdminEditorUtils.parseIdList = function (str) {
  if (!str || !str.trim()) return undefined;
  return str
    .split(",")
    .map(function (s) {
      return parseInt(s.trim(), 10);
    })
    .filter(function (n) {
      return !isNaN(n);
    });
};

// Admin scripts are classic scripts and cannot import the ES module
// frontend/assets/js/utils/escape-html.js, so this is the admin's one escaper
// (JS-6). It must produce the same output as that module; the test in
// admin/tests/admin-editor-utils.test.js compares the two.
var ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape a value for HTML text content and quoted attributes. Never use it
 * for a URL, an inline script or a style. Null/undefined give an empty
 * string; other non-strings are converted to strings first.
 *
 * @param {*} val
 * @returns {string}
 */
AdminEditorUtils.esc = function (val) {
  var str = typeof val === "string" ? val : String(val == null ? "" : val);
  return str.replace(/[&<>"']/g, function (c) {
    return ESCAPE_MAP[c];
  });
};

// Must equal SLUG_PATTERN in api/lib/journal-field-validation.js, which
// rejects any slug this pattern rejects. If the two differ, the form accepts a
// slug that the API then refuses.
AdminEditorUtils.SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Clear the form-level error banner and any per-field error state.
 *
 * @param {HTMLElement} formError   the form-level error banner element
 * @param {Array<{input?: HTMLElement, errEl?: HTMLElement}>} [fields]
 */
AdminEditorUtils.clearErrors = function (formError, fields) {
  if (formError) {
    formError.style.display = "none";
    formError.textContent = "";
  }
  (fields || []).forEach(function (field) {
    if (field.errEl) {
      field.errEl.style.display = "none";
      field.errEl.textContent = "";
    }
    if (field.input) {
      field.input.classList.remove("admin-input--error");
    }
  });
};

/**
 * Clear errors, then validate that every field in `fields` is non-blank.
 * A field with `slug: true` must also match SLUG_PATTERN.
 *
 * @param {HTMLElement} formError
 * @param {Array<{input: HTMLElement, errEl: HTMLElement, label: string, slug?: boolean}>} fields
 * @returns {boolean} true if every field is valid
 */
AdminEditorUtils.validate = function (formError, fields) {
  AdminEditorUtils.clearErrors(formError, fields);
  var valid = true;
  (fields || []).forEach(function (field) {
    var value = field.input.value.trim();
    var message = "";
    if (!value) {
      message = field.label + " is required.";
    } else if (field.slug && !AdminEditorUtils.SLUG_PATTERN.test(value)) {
      message = field.label + " must be lowercase letters, numbers, and hyphens.";
    }
    if (message) {
      field.errEl.textContent = message;
      field.errEl.style.display = "block";
      field.input.classList.add("admin-input--error");
      valid = false;
    }
  });
  return valid;
};

/**
 * Create and wire an "Insert Image" button immediately after a content
 * textarea, delegating the upload/caption/insert flow to AdminInsertImage.
 *
 * @param {string} contentFieldId  id of the textarea to insert the button after
 * @returns {HTMLButtonElement|null} the created button, or null if the
 *   content field wasn't found (guard logs via console.warn per JS-2)
 */
AdminEditorUtils.wireInsertImageButton = function (contentFieldId) {
  var contentField = document.getElementById(contentFieldId);
  if (!contentField || !contentField.parentNode) {
    console.warn(
      "AdminEditorUtils.wireInsertImageButton: content field #" +
        contentFieldId +
        " not found in the DOM; skipping insert-image wiring.",
    );
    return null;
  }

  var insertBtn = document.createElement("button");
  insertBtn.type = "button";
  insertBtn.className =
    "admin-btn admin-btn--secondary admin-btn--sm aimg-insert-btn";
  insertBtn.id = "insert-image-btn";
  insertBtn.textContent = "Insert Image";
  contentField.parentNode.insertBefore(insertBtn, contentField.nextSibling);

  if (typeof AdminInsertImage !== "undefined") {
    AdminInsertImage.wire("#insert-image-btn", "#" + contentFieldId);
  } else {
    console.warn(
      "AdminEditorUtils.wireInsertImageButton: AdminInsertImage is not loaded; " +
        "the button was created but will not respond to clicks.",
    );
  }

  return insertBtn;
};

/**
 * Build the "Images" card (title + mount point) and mount
 * AdminFigureCaptions into it, tracking the given content textarea. Shared
 * so every editor calls one line instead of hand-rolling the same card
 * markup (SR-4) — mirrors mountMlaPanel's shape below.
 *
 * @param {HTMLElement} containerEl  element to append the Images card to
 * @param {string} textareaId        id of the content textarea to track
 * @returns {{rescan: function}|null} the mounted AdminFigureCaptions panel
 */
AdminEditorUtils.mountFigureCaptionsPanel = function (containerEl, textareaId) {
  if (!containerEl) {
    console.warn(
      "AdminEditorUtils.mountFigureCaptionsPanel: containerEl is required.",
    );
    return null;
  }
  if (typeof AdminFigureCaptions === "undefined") {
    console.warn(
      "AdminEditorUtils.mountFigureCaptionsPanel: AdminFigureCaptions is not loaded.",
    );
    return null;
  }

  var imagesCard = document.createElement("div");
  imagesCard.className = "admin-form-card";
  imagesCard.style.marginTop = "var(--space-md)";

  var imagesTitle = document.createElement("div");
  imagesTitle.className = "admin-form-card__title";
  imagesTitle.textContent = "Images";
  imagesCard.appendChild(imagesTitle);

  var imagesMount = document.createElement("div");
  imagesCard.appendChild(imagesMount);

  containerEl.appendChild(imagesCard);

  return AdminFigureCaptions.mount(imagesMount, { textareaId: textareaId });
};

/**
 * Build the "Bibliography" card (title + mount point) and mount
 * AdminMlaSources into it, seeded from this record's existing MLA source
 * links. Always reads `link.id`, the field the API returns for a linked MLA
 * source, so no editor reads a different key.
 *
 * @param {HTMLElement} containerEl   element to append the Bibliography card to
 * @param {Array<{id: number}>} mlaSources  the record's existing mla_sources links
 * @param {{hintVariant?: string}} [opts]
 * @returns {{getSelectedIds: function}|null} the mounted AdminMlaSources panel
 */
AdminEditorUtils.mountMlaPanel = function (containerEl, mlaSources, opts) {
  opts = opts || {};

  if (!containerEl) {
    console.warn("AdminEditorUtils.mountMlaPanel: containerEl is required.");
    return null;
  }
  if (typeof AdminMlaSources === "undefined") {
    console.warn(
      "AdminEditorUtils.mountMlaPanel: AdminMlaSources is not loaded.",
    );
    return null;
  }

  var mlaCard = document.createElement("div");
  mlaCard.className = "admin-form-card";
  mlaCard.style.marginTop = "var(--space-md)";

  var mlaTitle = document.createElement("div");
  mlaTitle.className = "admin-form-card__title";
  mlaTitle.textContent = "Bibliography";
  mlaCard.appendChild(mlaTitle);

  var mlaMount = document.createElement("div");
  mlaMount.id = "mla-sources-mount";
  mlaCard.appendChild(mlaMount);

  containerEl.appendChild(mlaCard);

  var mountOpts = {
    initialSourceIds: (mlaSources || []).map(function (link) {
      return link.id;
    }),
  };
  if (opts.hintVariant) mountOpts.hintVariant = opts.hintVariant;

  return AdminMlaSources.mount(mlaMount, mountOpts);
};
