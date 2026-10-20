/**
 * Lookup of the nodes that a detail-page template always ships.
 *
 * Used by the *-detail.js page scripts (essay, response, historiography, blog,
 * news, challenge, evidence). Each one's `[slug].html` template must keep every
 * id its script asks for. If a template drops an id, the page still renders without that
 * node, and the warning is the only trace that names it.
 *
 * @module utils/template-nodes
 */

/**
 * Get a template node by id, warning when the template does not ship it.
 *
 * @param {string} id - Element id the template is expected to contain.
 * @param {string} page - Script name, so the warning locates the caller.
 * @returns {HTMLElement|null} The node, or null after a console.warn.
 */
export function requireNode(id, page) {
  const node = document.getElementById(id);
  if (!node) console.warn(`${page}: template node #${id} is missing`);
  return node;
}
