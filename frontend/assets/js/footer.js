/**
 * Footer action handlers: Print, Copy Contents, and Copy URL.
 *
 * @module footer
 */

import { showToast } from "./utils/toasts.js";

/**
 * Strip navigation, footer, sidebar, and interactive diagram controls from
 * body text for "Copy Contents".
 *
 * For diagram pages (maps, timeline, arbor), removes tooltips, detail
 * panels, controls, and SVG/canvas layers so the remaining text is the
 * page title, description, and visible labels rather than raw diagram markup.
 *
 * @returns {string} Cleaned body text.
 */
function getStrippedBodyText() {
  const clone = document.body.cloneNode(true);

  // Remove nav, footer, sidebar, their toggles/backdrops, and transient
  // overlays (toasts, cookie banner) that live directly in <body>
  clone
    .querySelectorAll(
      [
        "nav",
        "footer",
        ".sidebar",
        ".sidebar__toggle",
        ".sidebar-backdrop",
        ".toast-container",
        ".error-toast-container",
        ".cookie-consent",
      ].join(","),
    )
    .forEach((el) => el.remove());

  // Remove interactive diagram-only containers so innerText is readable
  clone
    .querySelectorAll(
      [
        ".timeline-tooltip",
        ".timeline-detail-panel",
        ".map-tooltip",
        ".map-controls",
        ".arbor-tooltip",
        ".arbor-controls",
        ".arbor-edges",
        ".map-pins-layer",
      ].join(","),
    )
    .forEach((el) => el.remove());

  return clone.innerText.trim();
}

/**
 * Copy text to the clipboard. Shows a toast on success/failure.
 *
 * @param {string} text
 * @param {string} successLabel - Label for the success toast.
 */
async function copyToClipboard(text, successLabel) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successLabel, "success");
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast(successLabel, "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
    textarea.remove();
  }
}

/**
 * Handler for the "Print" button.
 */
function handlePrint() {
  window.print();
}

/**
 * Handler for the "Copy Contents" button.
 * Copies the page body text excluding nav and footer.
 */
function handleCopyContents() {
  const text = getStrippedBodyText();
  copyToClipboard(text, "Page contents copied");
}

/**
 * Handler for the "Copy URL" button.
 */
function handleCopyUrl() {
  copyToClipboard(window.location.href, "URL copied");
}

/**
 * Bind footer button handlers.
 * Looks for buttons with `data-action` attribute and binds the appropriate handler.
 *
 * Expected values: `print`, `copy-contents`, `copy-url`.
 */
export function initFooter() {
  const footer = document.querySelector("footer");
  if (!footer) return;

  const yearEl = footer.querySelector("#footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const handlers = {
    print: handlePrint,
    "copy-contents": handleCopyContents,
    "copy-url": handleCopyUrl,
  };

  footer.querySelectorAll("[data-action]").forEach((btn) => {
    const action = btn.getAttribute("data-action");
    if (handlers[action]) {
      btn.addEventListener("click", handlers[action]);
    }
  });
}
