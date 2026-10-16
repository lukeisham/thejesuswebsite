/**
 * The one HTML escape for browser code (JS-6, HTML-6). Every module that
 * puts text into HTML imports this function. Do not add a local copy.
 *
 * The server has its own copy of the same rules in api/lib/escape-html.js.
 * Keep the two files the same.
 *
 * @module utils/escape-html
 */

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape a value for HTML text content and quoted attributes.
 * `null` and `undefined` give an empty string. Other non-strings are
 * changed to strings first.
 *
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}
