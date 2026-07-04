/**
 * Debounce and throttle utilities.
 *
 * @module utils/debounce
 */

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last invocation.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} wait - Delay in milliseconds.
 * @returns {Function} A debounced version of `fn` with a `.cancel()` method.
 */
export function debounce(fn, wait) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce: fn must be a function');
  }
  if (typeof wait !== 'number' || wait < 0) {
    throw new TypeError('debounce: wait must be a non-negative number');
  }

  let timer;

  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };

  debounced.cancel = function () {
    clearTimeout(timer);
  };

  return debounced;
}

/**
 * Creates a throttled function that invokes `fn` at most once per `wait`
 * milliseconds.
 *
 * @param {Function} fn - The function to throttle.
 * @param {number} wait - Minimum interval in milliseconds.
 * @returns {Function} A throttled version of `fn`.
 */
export function throttle(fn, wait) {
  if (typeof fn !== 'function') {
    throw new TypeError('throttle: fn must be a function');
  }
  if (typeof wait !== 'number' || wait < 0) {
    throw new TypeError('throttle: wait must be a non-negative number');
  }

  let last = 0;
  let timer;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = wait - (now - last);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };

  throttled.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled;
}
