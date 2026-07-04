/**
 * Tiny pub/sub state store for cross-component communication.
 *
 * @module utils/state
 */

const state = {};
const listeners = {};

/**
 * Subscribe to changes on a given key.
 *
 * @param {string} key
 * @param {Function} fn - Called with the new data when the key is published.
 * @returns {Function} Unsubscribe function.
 */
export function subscribe(key, fn) {
  if (typeof key !== 'string' || typeof fn !== 'function') {
    console.warn('subscribe: key must be a string and fn must be a function');
    return () => {};
  }

  if (!listeners[key]) {
    listeners[key] = [];
  }
  listeners[key].push(fn);

  return () => {
    if (!listeners[key]) return;
    listeners[key] = listeners[key].filter((f) => f !== fn);
    if (listeners[key].length === 0) {
      delete listeners[key];
    }
  };
}

/**
 * Publish data to all subscribers of a key.
 *
 * @param {string} key
 * @param {*} data
 */
export function publish(key, data) {
  if (typeof key !== 'string') return;

  state[key] = data;
  if (listeners[key]) {
    listeners[key].forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`state: subscriber error for "${key}"`, err);
      }
    });
  }
}

/**
 * Get the current value for a key.
 *
 * @param {string} key
 * @returns {*} The stored value, or `undefined`.
 */
export function getState(key) {
  return state[key];
}

/**
 * Set the value for a key without notifying subscribers.
 *
 * @param {string} key
 * @param {*} data
 */
export function setState(key, data) {
  if (typeof key !== 'string') return;
  state[key] = data;
}
