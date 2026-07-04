/**
 * Client-side routing utilities: URL params, history push, path segments.
 *
 * @module utils/router
 */

/**
 * Parse the current URL's search parameters.
 *
 * @returns {URLSearchParams}
 */
export function getParams() {
  return new URLSearchParams(window.location.search);
}

/**
 * Push a new path onto the browser history stack.
 *
 * @param {string} path - The URL path (e.g. '/evidence/some-slug').
 * @param {Object} [state={}] - State object associated with the history entry.
 */
export function pushState(path, state = {}) {
  if (typeof path !== 'string' || path.length === 0) return;
  history.pushState(state, '', path);
}

/**
 * Get a specific path segment from the current URL.
 *
 * @param {number} n - 0-based segment index.
 * @returns {string} The segment, or an empty string if it doesn't exist.
 *
 * @example
 * // URL: /evidence/single/my-slug
 * getSegment(0) // 'evidence'
 * getSegment(1) // 'single'
 * getSegment(2) // 'my-slug'
 */
export function getSegment(n) {
  if (typeof n !== 'number' || n < 0) return '';

  const segments = window.location.pathname
    .split('/')
    .filter((s) => s.length > 0);

  return segments[n] || '';
}
