/**
 * Toast notification system with queue, stacking, auto-dismiss, and manual dismiss.
 *
 * @module utils/toasts
 */

import { createElement } from './dom.js';

/** @type {'success'|'error'|'warning'|'info'} */
const VARIANTS = ['success', 'error', 'warning', 'info'];

const DISMISS_DELAYS = {
  success: 4000,
  info: 4000,
  warning: 7000,
  error: 7000,
};

const MAX_VISIBLE = 3;

let container = null;
let queue = [];
let visible = [];

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

function dismissToast(toastEl) {
  if (!toastEl || !toastEl.parentNode) return;
  if (toastEl.classList.contains('toast--dismissing')) return;

  const index = visible.indexOf(toastEl);
  if (index !== -1) visible.splice(index, 1);

  const remove = () => {
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
  };
  toastEl.addEventListener('transitionend', remove, { once: true });
  // Fallback: transitionend may never fire (reduced motion, hidden tab)
  setTimeout(remove, 400);

  toastEl.classList.add('toast--dismissing');
  processQueue();
}

function processQueue() {
  while (visible.length < MAX_VISIBLE && queue.length > 0) {
    const item = queue.shift();
    const toastEl = createToastElement(item.message, item.variant, item.duration);
    visible.push(toastEl);
    getContainer().appendChild(toastEl);

    // Trigger slide-up animation
    requestAnimationFrame(() => {
      toastEl.classList.add('toast--visible');
    });

    // Auto-dismiss
    if (item.duration > 0) {
      setTimeout(() => dismissToast(toastEl), item.duration);
    }
  }
}

function createToastElement(message, variant, duration) {
  const variantClass = `toast--${variant}`;

  const el = createElement('div', {
    className: `toast ${variantClass}`,
    role: 'alert',
  }, [
    createElement('span', { className: 'toast__message' }, [message]),
    createElement('button', {
      className: 'toast__dismiss',
      'aria-label': 'Dismiss',
      onclick() { dismissToast(el); },
    }),
  ]);

  // Use Feather x icon
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('class', 'toast__dismiss-icon');
  iconSvg.setAttribute('width', '16');
  iconSvg.setAttribute('height', '16');
  iconSvg.setAttribute('viewBox', '0 0 24 24');
  iconSvg.setAttribute('fill', 'none');
  iconSvg.setAttribute('stroke', 'currentColor');
  iconSvg.setAttribute('stroke-width', '2');
  iconSvg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  el.querySelector('.toast__dismiss').appendChild(iconSvg);

  return el;
}

/**
 * Show a toast notification.
 *
 * @param {string} message - The toast message text.
 * @param {'success'|'error'|'warning'|'info'} [variant='info']
 * @param {Object} [options]
 * @param {number} [options.duration] - Override auto-dismiss duration in ms. Use 0 to disable.
 *
 * @example
 * showToast('Item saved', 'success');
 * showToast('Network error', 'error', { duration: 0 });
 */
export function showToast(message, variant = 'info', { duration } = {}) {
  if (typeof message !== 'string' || message.length === 0) return;
  if (!VARIANTS.includes(variant)) {
    console.warn(`showToast: unknown variant "${variant}", falling back to "info"`);
    variant = 'info';
  }

  const autoDuration = duration !== undefined ? duration : DISMISS_DELAYS[variant];

  const item = { message, variant, duration: autoDuration };
  queue.push(item);
  processQueue();
}
