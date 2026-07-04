/**
 * Safe HTML templating via tagged template literals and DOM-helpers.
 *
 * @module utils/templates
 */

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

function escapeHTML(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Marker class for strings that are already safe HTML.
 * `html` skips escaping interpolation values that are `SafeString` instances,
 * which lets already-escaped fragments compose without double-escaping.
 *
 * `toString()` returns the underlying string so the value can be used
 * in `innerHTML` assignments directly.
 */
class SafeString {
  #value;

  constructor(value) {
    this.#value = String(value ?? "");
  }

  toString() {
    return this.#value;
  }
}

/**
 * Mark a value as safe HTML. Use this as an escape-hatch **only** for strings
 * the code itself produced (via `html` or `renderBadge`) or a server value
 * already known to be safe (e.g. an FTS `<mark>` snippet). Never pass raw
 * user-supplied values to `raw()`.
 *
 * @param {string} value
 * @returns {SafeString}
 */
export function raw(value) {
  return new SafeString(value);
}

/**
 * Join an array of `SafeString` values into a single `SafeString`.
 * Non-`SafeString` values are escaped before joining.
 *
 * @param {Array<string|SafeString>} items
 * @param {string} [separator='']
 * @returns {SafeString}
 */
export function safeJoin(items, separator = "") {
  if (!Array.isArray(items)) return new SafeString("");
  const parts = items.map((item) =>
    item instanceof SafeString ? String(item) : escapeHTML(item),
  );
  return new SafeString(parts.join(separator));
}

/**
 * Tagged template literal that escapes all interpolated values unless they
 * are `SafeString` instances. Returns a `SafeString` so nested `html` calls
 * compose without re-escaping.
 *
 * @param {TemplateStringsArray} strings
 * @param {...*} values
 * @returns {SafeString} Safe HTML string.
 *
 * @example
 * const safe = html`<p>Hello, ${userInput}</p>`;
 * document.body.innerHTML = safe; // SafeString.toString() called implicitly
 */
export function html(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val instanceof SafeString) {
      result += String(val);
    } else {
      result += escapeHTML(val);
    }
    result += strings[i + 1];
  }
  return new SafeString(result);
}

/**
 * Render an evidence/blog card as a safe HTML string.
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} [data.description]
 * @param {string} [data.url]
 * @param {string[]} [data.badges]
 * @returns {SafeString}
 */
export function renderCard(data) {
  if (!data || typeof data.title !== "string") return new SafeString("");

  const title = data.title;
  const desc = data.description
    ? html`<p class="card-description">${data.description}</p>`
    : "";
  const badges = safeJoin((data.badges || []).map((b) => renderBadge(b)));

  const inner = html`
    <h3 class="card-title">${title}</h3>
    ${desc}
    <div class="card-badges">${badges}</div>
  `;

  if (data.url) {
    return html`<a href="${data.url}" class="card">${inner}</a>`;
  }
  return html`<div class="card">${inner}</div>`;
}

/**
 * Render a content badge as a safe HTML string.
 *
 * @param {string} label
 * @returns {SafeString}
 */
export function renderBadge(label) {
  if (typeof label !== "string" || label.length === 0)
    return new SafeString("");
  return html`<span class="badge">${label}</span>`;
}
