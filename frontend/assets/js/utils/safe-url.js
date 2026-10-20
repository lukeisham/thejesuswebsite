/**
 * The one check for a URL that goes into an `href` (JS-6, HTML-6).
 * `escapeHTML()` keeps a value inside its attribute but does not stop a
 * `javascript:` URL from running when a reader clicks the link. Every
 * module that puts a database URL in an `href` calls this function first.
 *
 * @module utils/safe-url
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// A relative URL resolves against this base, so it keeps its own scheme-less
// form and passes. The browser strips tabs and newlines inside a scheme
// (`java\nscript:`); the URL parser strips them too, so both see one scheme.
const RELATIVE_BASE = "https://relative.invalid";

/**
 * Return the URL when it is a relative path or an `http` or `https` URL.
 * Return an empty string for any other scheme (`javascript:`, `data:`,
 * `vbscript:`) and for a value that is not a string or does not parse.
 *
 * @param {*} value
 * @returns {string}
 */
export function safeHref(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const { protocol } = new URL(trimmed, RELATIVE_BASE);
    return ALLOWED_PROTOCOLS.has(protocol) ? trimmed : "";
  } catch {
    return "";
  }
}
