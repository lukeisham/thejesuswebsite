/**
 * Error toast notifications.
 * Red-themed toasts that stack at the bottom-right of the viewport.
 * Each toast provides copy-to-clipboard and two dismiss actions
 * (X icon or "Dismiss" button).
 *
 * @module error-toast
 */

const CONTAINER_CLASS = 'error-toast-container';
const TOAST_CLASS = 'error-toast';
const REMOVING_CLASS = 'removing';
const DISMISS_DURATION_MS = 150;

function getOrCreateContainer() {
  let container = document.querySelector(`.${CONTAINER_CLASS}`);
  if (container) return container;

  container = document.createElement('div');
  container.className = CONTAINER_CLASS;
  container.setAttribute('aria-label', 'Error notifications');
  container.addEventListener('click', handleContainerClick);
  document.body.appendChild(container);
  return container;
}

function handleContainerClick(event) {
  const copyButton = event.target.closest('.error-toast__copy');
  if (copyButton) {
    const toast = copyButton.closest(`.${TOAST_CLASS}`);
    if (!toast) return;
    copyToClipboard(buildClipboardText(toast));
    return;
  }

  const dismissButton =
    event.target.closest('.error-toast__dismiss') ||
    event.target.closest('.error-toast__dismiss-text');
  if (dismissButton) {
    const toast = dismissButton.closest(`.${TOAST_CLASS}`);
    if (toast) removeToast(toast);
  }
}

function buildClipboardText(toast) {
  const message = toast.querySelector('.error-toast__message').textContent;
  const details = toast.querySelector('.error-toast__details');
  if (details && details.textContent.trim()) {
    return `${message}\n\n${details.textContent}`;
  }
  return message;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Clipboard is unavailable — no further fallback available.
    }
    textarea.remove();
  }
}

function removeToast(toast) {
  if (toast.classList.contains(REMOVING_CLASS)) return;
  toast.classList.add(REMOVING_CLASS);
  toast.addEventListener(
    'animationend',
    () => {
      toast.remove();
      pruneContainer();
    },
    { once: true }
  );
}

function pruneContainer() {
  const container = document.querySelector(`.${CONTAINER_CLASS}`);
  if (!container || container.children.length > 0) return;
  container.removeEventListener('click', handleContainerClick);
  container.remove();
}

/**
 * Show an error toast notification at the bottom-right of the screen.
 * Multiple calls stack toasts vertically; each includes copy and dismiss.
 *
 * @param {string} message - The primary error message to display.
 * @param {string} [details] - Optional technical details included in copied text.
 * @returns {HTMLElement} The toast DOM element.
 */
export function showErrorToast(message, details = '') {
  const container = getOrCreateContainer();

  const toast = document.createElement('div');
  toast.className = TOAST_CLASS;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const messageEl = document.createElement('p');
  messageEl.className = 'error-toast__message';
  messageEl.textContent = message;

  const dismissX = document.createElement('button');
  dismissX.className = 'error-toast__dismiss';
  dismissX.setAttribute('aria-label', 'Dismiss error');
  dismissX.textContent = '\u00d7';

  toast.appendChild(dismissX);
  toast.appendChild(messageEl);

  if (details) {
    const detailsEl = document.createElement('div');
    detailsEl.className = 'error-toast__details';
    detailsEl.textContent = details;
    toast.appendChild(detailsEl);
  }

  const actions = document.createElement('div');
  actions.className = 'error-toast__actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'error-toast__copy';
  copyBtn.textContent = 'Copy';
  copyBtn.setAttribute('aria-label', 'Copy error message to clipboard');

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'error-toast__dismiss-text';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss error notification');

  actions.appendChild(copyBtn);
  actions.appendChild(dismissBtn);
  toast.appendChild(actions);
  container.appendChild(toast);

  return toast;
}
