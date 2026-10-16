// escape-html.js — the one HTML escape for server code (JS-6, HTML-6).
//
// Every api/ module that puts text into HTML or SVG requires this function.
// Do not add a local copy. The browser has the same rules in
// frontend/assets/js/utils/escape-html.js. Keep the two files the same.
//
// Exports: { escapeHTML(str) }

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
function escapeHTML(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

module.exports = { escapeHTML };
