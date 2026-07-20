// Shared field-rendering helpers, generalized from the hand-rolled
// formGroup()-style DOM construction repeated across all five record
// editors' form-rendering sections. Callback-based per-type config only —
// no JSON-driven generic assembly (that's Phase 3, explicitly out of scope).
// Built via DOM factories (JS-6), never innerHTML with server data.
//
// Used by: admin/{evidence,essays,blog,debate,historiography}/edit-[id].html

window.AdminFormBuilder = {};

var AdminFormBuilder = window.AdminFormBuilder;

function buildFieldShell(opts) {
  var div = document.createElement("div");
  div.className = "admin-form-group";

  var lbl = document.createElement("label");
  lbl.className = "admin-form-group__label";
  lbl.setAttribute("for", opts.id);
  lbl.innerHTML =
    opts.label + (opts.required ? ' <span aria-hidden="true">*</span>' : "");
  div.appendChild(lbl);

  return div;
}

function appendHintAndError(div, opts) {
  var hintId = opts.id + "-hint";
  var errId = opts.id + "-error";

  if (opts.hint) {
    var hintEl = document.createElement("span");
    hintEl.className = "admin-form-hint";
    hintEl.id = hintId;
    hintEl.textContent = opts.hint;
    div.appendChild(hintEl);
  }

  var errEl = document.createElement("span");
  errEl.className = "admin-form-hint";
  errEl.id = errId;
  errEl.style.display = "none";
  errEl.style.color = "var(--admin-danger)";
  errEl.setAttribute("role", "alert");
  div.appendChild(errEl);

  return errEl;
}

/**
 * Append a labeled text/url/date/number input field.
 *
 * @param {HTMLElement} container
 * @param {{id: string, label: string, type?: string, required?: boolean,
 *   placeholder?: string, hint?: string, value?: string}} opts
 * @returns {HTMLElement|null} the field's wrapping div
 */
AdminFormBuilder.addField = function (container, opts) {
  opts = opts || {};
  if (!container || !opts.id) {
    console.warn(
      "AdminFormBuilder.addField: container and opts.id are required.",
    );
    return null;
  }

  var div = buildFieldShell(opts);
  var hintId = opts.id + "-hint";
  var errId = opts.id + "-error";

  var input = document.createElement("input");
  input.className = "admin-input";
  input.type =
    opts.type === "url"
      ? "url"
      : opts.type === "date"
        ? "date"
        : opts.type === "number"
          ? "number"
          : "text";
  input.id = opts.id;
  input.placeholder = opts.placeholder || "";
  input.setAttribute("aria-describedby", hintId + " " + errId);
  if (opts.value !== undefined && opts.value !== null) input.value = opts.value;
  div.appendChild(input);

  appendHintAndError(div, opts);
  container.appendChild(div);
  return div;
};

/**
 * Append a labeled textarea field.
 *
 * @param {HTMLElement} container
 * @param {{id: string, label: string, required?: boolean, placeholder?: string,
 *   hint?: string, value?: string, rows?: number}} opts
 * @returns {HTMLElement|null} the field's wrapping div
 */
AdminFormBuilder.addTextarea = function (container, opts) {
  opts = opts || {};
  if (!container || !opts.id) {
    console.warn(
      "AdminFormBuilder.addTextarea: container and opts.id are required.",
    );
    return null;
  }

  var div = buildFieldShell(opts);
  var hintId = opts.id + "-hint";
  var errId = opts.id + "-error";

  var textarea = document.createElement("textarea");
  textarea.className = "admin-textarea";
  textarea.rows = opts.rows || 20;
  textarea.id = opts.id;
  textarea.placeholder = opts.placeholder || "";
  textarea.setAttribute("aria-describedby", hintId + " " + errId);
  if (opts.value !== undefined && opts.value !== null)
    textarea.value = opts.value;
  div.appendChild(textarea);

  appendHintAndError(div, opts);
  container.appendChild(div);
  return div;
};

/**
 * Append a labeled <select> field.
 *
 * @param {HTMLElement} container
 * @param {{id: string, label: string, options: Array<{value: string, label: string}>,
 *   selected?: string, hint?: string}} opts
 * @returns {HTMLElement|null} the field's wrapping div
 */
AdminFormBuilder.addSelectField = function (container, opts) {
  opts = opts || {};
  if (!container || !opts.id) {
    console.warn(
      "AdminFormBuilder.addSelectField: container and opts.id are required.",
    );
    return null;
  }

  var div = buildFieldShell(opts);
  var hintId = opts.id + "-hint";
  var errId = opts.id + "-error";

  var select = document.createElement("select");
  select.className = "admin-select";
  select.id = opts.id;
  select.setAttribute("aria-describedby", hintId + " " + errId);
  (opts.options || []).forEach(function (o) {
    var optionEl = document.createElement("option");
    optionEl.value = o.value;
    optionEl.textContent = o.label;
    if (o.value === opts.selected) optionEl.selected = true;
    select.appendChild(optionEl);
  });
  div.appendChild(select);

  appendHintAndError(div, opts);
  container.appendChild(div);
  return div;
};

/**
 * Read a field's value by id. Checkboxes return a boolean; everything else
 * returns the raw string `.value`.
 *
 * @param {string} id
 * @returns {string|boolean|undefined}
 */
AdminFormBuilder.getFieldValue = function (id) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn("AdminFormBuilder.getFieldValue: no element with id #" + id);
    return undefined;
  }
  if (el.type === "checkbox") return el.checked;
  return el.value;
};

/**
 * Write a field's value by id. Checkboxes take a boolean; everything else
 * takes the raw string `.value`.
 *
 * @param {string} id
 * @param {string|boolean} value
 */
AdminFormBuilder.setFieldValue = function (id, value) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn("AdminFormBuilder.setFieldValue: no element with id #" + id);
    return;
  }
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value;
};

/**
 * Hide and clear the `#<id>-error` hint for each field id, and remove the
 * `admin-input--error` class from the field itself.
 *
 * @param {string[]} ids
 */
AdminFormBuilder.clearFieldErrors = function (ids) {
  (ids || []).forEach(function (id) {
    var input = document.getElementById(id);
    var errEl = document.getElementById(id + "-error");
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }
    if (input) input.classList.remove("admin-input--error");
  });
};
