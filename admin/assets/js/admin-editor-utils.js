// Shared helpers duplicated identically (or near-identically) across the five
// admin record editors (evidence, essays, blog, debate/responses,
// historiography). Extracted so a fix here — e.g. the mla_source_id -> id
// bibliography bug — only has to happen once instead of five times.
//
// Used by: admin/{evidence,essays,blog,debate,historiography}/edit-[id].html

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

/**
 * Escape a string for safe interpolation into an HTML attribute/text
 * position. Null/undefined are treated as empty string.
 *
 * @param {string} val
 * @returns {string}
 */
AdminEditorUtils.esc = function (val) {
  return (val || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

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
 * Mirrors the title/slug "required" validation duplicated in every editor.
 *
 * @param {HTMLElement} formError
 * @param {Array<{input: HTMLElement, errEl: HTMLElement, label: string}>} fields
 * @returns {boolean} true if every field is valid
 */
AdminEditorUtils.validate = function (formError, fields) {
  AdminEditorUtils.clearErrors(formError, fields);
  var valid = true;
  (fields || []).forEach(function (field) {
    if (!field.input.value.trim()) {
      field.errEl.textContent = field.label + " is required.";
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
 * Build the "Bibliography" card (title + mount point) and mount
 * AdminMlaSources into it, seeded from this record's existing MLA source
 * links. Always reads `link.id` — this is the field the mla_source_id ->
 * id regression bug got wrong in all five editors, so baking the correct
 * read in here means it can only ever be broken once, not five times.
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
