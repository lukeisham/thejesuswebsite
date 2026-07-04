/**
 * localStorage wrapper with JSON serialisation and error handling.
 *
 * @module utils/storage
 */

const STORAGE_UNAVAILABLE = 'localStorage is not available';

function isAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve a value from localStorage.
 *
 * @param {string} key
 * @returns {*} The parsed value, or `null` if not found or on error.
 */
export function get(key) {
  if (typeof key !== 'string') return null;
  if (!isAvailable()) {
    console.warn(STORAGE_UNAVAILABLE);
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Store a value in localStorage.
 *
 * @param {string} key
 * @param {*} value - Any JSON-serialisable value.
 * @returns {boolean} Whether the write succeeded.
 */
export function set(key, value) {
  if (typeof key !== 'string') return false;
  if (!isAvailable()) {
    console.warn(STORAGE_UNAVAILABLE);
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a key from localStorage.
 *
 * @param {string} key
 * @returns {boolean} Whether the removal succeeded.
 */
export function remove(key) {
  if (typeof key !== 'string') return false;
  if (!isAvailable()) {
    console.warn(STORAGE_UNAVAILABLE);
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
