/**
 * Safe DOM creation, event delegation, and batch-write utilities.
 *
 * @module utils/dom
 */

/**
 * Create an HTML element with attributes and children.
 *
 * @param {string} tag - HTML tag name.
 * @param {Object<string, string|Function>} [attrs={}] - Attribute key/value pairs.
 *   Event listeners are prefixed with `on` (e.g. `onclick`).
 * @param {Array<string|Node>} [children=[]] - Child nodes or text strings.
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  if (typeof tag !== 'string' || tag.length === 0) {
    throw new TypeError('createElement: tag must be a non-empty string');
  }

  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (value !== false && value != null) {
      el.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    el.appendChild(
      typeof child === 'string' ? document.createTextNode(child) : child
    );
  }

  return el;
}

/**
 * Delegate an event listener on a root element for a given selector.
 *
 * @param {Element} root - The container to listen on.
 * @param {string} selector - CSS selector to match event targets against.
 * @param {string} event - Event name (e.g. 'click').
 * @param {(e: Event, target: Element) => void} handler - Called when a match is found.
 * @returns {Function} A teardown function that removes the listener.
 */
export function delegate(root, selector, event, handler) {
  if (!(root instanceof Element)) {
    throw new TypeError('delegate: root must be an Element');
  }

  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) {
      handler(e, target);
    }
  };

  root.addEventListener(event, listener);
  return () => root.removeEventListener(event, listener);
}

/**
 * Batch DOM writes inside a single requestAnimationFrame callback.
 * Accepts either a function or returns a Promise.
 *
 * @param {Function} fn
 * @returns {number} The rAF id.
 */
export function batchWrite(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('batchWrite: fn must be a function');
  }
  return requestAnimationFrame(() => {
    fn();
  });
}
