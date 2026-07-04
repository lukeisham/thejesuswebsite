/**
 * Footer action handlers: Print, Copy Contents, and Copy URL.
 *
 * @module footer
 */

import { showToast } from './utils/toasts.js';

/**
 * Strip navigation and footer from body text for "Copy Contents".
 *
 * @returns {string} Cleaned body text.
 */
function getStrippedBodyText() {
  const clone = document.body.cloneNode(true);

  // Remove nav and footer
  clone.querySelectorAll('nav, footer').forEach((el) => el.remove());

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
    showToast(successLabel, 'success');
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(successLabel, 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
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
  copyToClipboard(text, 'Page contents copied');
}

/**
 * Handler for the "Copy URL" button.
 */
function handleCopyUrl() {
  copyToClipboard(window.location.href, 'URL copied');
}

/**
 * Bind footer button handlers.
 * Looks for buttons with `data-action` attribute and binds the appropriate handler.
 *
 * Expected values: `print`, `copy-contents`, `copy-url`.
 */
export function initFooter() {
  const footer = document.querySelector('footer');
  if (!footer) return;

  const handlers = {
    print: handlePrint,
    'copy-contents': handleCopyContents,
    'copy-url': handleCopyUrl,
  };

  footer.querySelectorAll('[data-action]').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    if (handlers[action]) {
      btn.addEventListener('click', handlers[action]);
    }
  });
}
