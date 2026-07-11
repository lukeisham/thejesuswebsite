/**
 * Screen-reader announcer utility.
 *
 * Creates a single visually-hidden aria-live region (cached, JS-6) so
 * screen readers hear dynamic content updates without duplicate elements.
 *
 * @module utils/announce
 */

/** @type {HTMLElement|null} (JS-6: one DOM query, cached forever) */
let region = null;

/**
 * Announce a message to screen readers via a polite aria-live region.
 * Repeated calls within the same tick will replace the previous text
 * so announcements don't queue up.
 *
 * @param {string} text
 */
export function announce(text) {
  if (!region) {
    region = document.createElement("div");
    region.className = "sr-only";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }
  // Clearing and re-setting textContent in the same microtask ensures
  // the announcement is read even if the text hasn't changed.
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = text;
  });
}
