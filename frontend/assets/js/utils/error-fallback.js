/**
 * Client-side error fallback — graceful degradation for error display.
 *
 * When an inline error element is missing from the DOM, this module falls
 * back to a toast notification instead of failing silently. A unified
 * console.error wrapper adds structured context for debugging.
 *
 * (JS-2: every DOM interaction is guarded — missing elements never throw.)
 *
 * @module utils/error-fallback
 */

import { showErrorToast } from '../error-toast.js';

// ── Error code constants (mirrors api/lib/error-codes.js egress codes) ──────

const CODE_DISPLAY_ELEMENT_MISSING = 'E-EGRESS-008';
const CODE_TOAST_SUPPRESSED = 'E-EGRESS-009';
const CODE_RENDER_FAILURE = 'E-EGRESS-016';

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Display an error message in a target DOM element. If the element is missing
 * or has no `textContent` property, falls back to showing a toast notification
 * via {@link showErrorToast}.
 *
 * Logs the fallback with a structured error code so monitoring can distinguish
 * between normal inline errors and degraded-to-toast errors.
 *
 * (JS-2: guards against null element, missing textContent, and non-string
 * messages — every path is handled explicitly.)
 *
 * @param {string}  message  - User-facing error text.
 * @param {Element|null|undefined} element - Target DOM element for inline display.
 * @returns {boolean} `true` if the error was displayed inline, `false` if it fell back to toast.
 *
 * @example
 * displayError('Failed to load blog post.', document.getElementById('error-state'));
 */
export function displayError(message, element) {
  const safeMessage =
    typeof message === 'string' && message.length > 0
      ? message
      : 'An unexpected error occurred.';

  // Best path: the target element exists and supports textContent.
  if (element && typeof element.textContent === 'string') {
    element.textContent = safeMessage;
    if (element.hidden !== undefined) element.hidden = false;
    return true;
  }

  // Fallback: element is missing — route to toast instead of showing nothing.
  console.warn(
    `[${CODE_DISPLAY_ELEMENT_MISSING}]`,
    'Error display element missing from DOM. Falling back to toast.',
    { message: safeMessage },
  );

  try {
    showErrorToast(safeMessage);
  } catch (_toastError) {
    // Absolute last resort: toast itself is unavailable (JS-2: never fail
    // silently — log to console so the error is at least recoverable from
    // browser dev tools).
    console.error(
      `[${CODE_TOAST_SUPPRESSED}]`,
      'Toast notification unavailable. Error logged as console fallback.',
      { message: safeMessage },
    );
  }

  return false;
}

/**
 * Wrap a render function with try/catch so a render failure never leaves the
 * skeleton loader visible. If the render function throws, the skeleton is
 * hidden and the fallback error is shown via toast.
 *
 * (JS-2: the skeleton loader is the most confusing UX for a silent failure —
 * this prevents it by guaranteeing one of content or error is always shown.)
 *
 * @param {Function} fn               - The render function to wrap.
 * @param {string}   fallbackMessage  - Message shown via toast on failure.
 * @param {Object}   [options]
 * @param {Element|null} [options.skeletonEl] - Skeleton element to hide on failure.
 * @returns {Promise<boolean>} `true` if render succeeded, `false` if it fell back to error.
 *
 * @example
 * await safeRender(
 *   () => renderBlogPost(data),
 *   'Could not display this blog post.',
 *   { skeletonEl: document.getElementById('skeleton-state') }
 * );
 */
export async function safeRender(fn, fallbackMessage, { skeletonEl } = {}) {
  if (typeof fn !== 'function') {
    logError('safeRender', new TypeError('fn must be a function'));
    return false;
  }

  try {
    await fn();
    return true;
  } catch (error) {
    logError('safeRender', error);

    // Hide the skeleton so the user isn't left staring at a loader.
    if (skeletonEl && skeletonEl.hidden !== undefined) {
      skeletonEl.hidden = true;
    }

    const message =
      typeof fallbackMessage === 'string' && fallbackMessage.length > 0
        ? fallbackMessage
        : 'Something went wrong while displaying this content.';

    try {
      showErrorToast(message, error.message || '');
    } catch (_toastError) {
      console.error(
        `[${CODE_TOAST_SUPPRESSED}]`,
        'Toast unavailable during safeRender fallback.',
        { message, error: error.message },
      );
    }

    return false;
  }
}

/**
 * Unified console.error wrapper that adds structured context so every logged
 * error carries a predictable shape for debugging and log aggregation.
 *
 * Output format: `[context] message { detail: ... }`
 *
 * (JS-2: handles non-Error throws — wraps strings and primitives so the log
 * always has a `.message` property to inspect.)
 *
 * @param {string} context - Where the error occurred (e.g. 'blog-detail', 'search').
 * @param {Error|string|*} error - The caught error or throw value.
 *
 * @example
 * try { ... } catch (err) {
 *   logError('blog-detail.init', err);
 * }
 */
export function logError(context, error) {
  const ctx =
    typeof context === 'string' && context.length > 0 ? context : 'unknown';
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error');

  console.error(`[${ctx}]`, err.message, {
    code: CODE_RENDER_FAILURE,
    stack: err.stack?.split('\n').slice(0, 5) || [],
  });
}
