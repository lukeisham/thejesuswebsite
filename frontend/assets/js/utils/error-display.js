/**
 * Frontend error display helper — maps API error responses to user-friendly
 * toast notifications. Works with both the admin Error-throwing pattern and
 * the frontend { data, error } tuple pattern.
 *
 * @module utils/error-display
 */

import { showErrorToast } from "../error-toast.js";

const FALLBACK_MESSAGE = "An unexpected error occurred. Please try again.";

/**
 * Handle an API error from either the admin (thrown Error) or frontend
 * ({ data, error } tuple) pattern. Extracts the machine-readable error code,
 * the user-facing message, and any technical detail, then shows a toast.
 *
 * @param {Error|string|object} error
 *   - Admin pattern: a thrown Error whose .message is a server error string
 *                     or (with new error codes) a raw server message.
 *   - Frontend pattern: the `error` property from an { data, error } tuple
 *                        — may be a plain string or a structured error object
 *                        like { code, message, detail }.
 * @returns {string|null} The error code (e.g. "E-INPUT-006") or null if
 *                        unrecognised. Useful for conditional recovery logic.
 */
export function handleApiError(error) {
  let code = null;
  let message = FALLBACK_MESSAGE;
  let detail = "";

  if (error instanceof Error) {
    message = error.message || message;
  } else if (typeof error === "object" && error !== null) {
    code = error.code || null;
    message = error.message || message;
    detail = error.detail || "";
  } else if (typeof error === "string") {
    message = error;
  }

  showErrorToast(message, detail);
  return code;
}

/**
 * Handle a network-level failure (fetch threw, no HTTP response received).
 * Uses the client-only E-INPUT-030 message.
 *
 * @param {Error|string} [error] - The raw fetch error, for logging.
 */
export function handleNetworkError(error) {
  if (error) console.error("Network error:", error);
  showErrorToast(
    "Could not reach the server. Check your connection.",
    "",
  );
}

/**
 * Show a field-level validation error. Designed to be called after a server
 * responds with a structured validation error that includes context.field.
 *
 * @param {string} fieldName - The name of the form field that failed.
 * @param {string} message   - The validation error message to display.
 */
export function handleInputError(fieldName, message) {
  showErrorToast(`${fieldName}: ${message}`, "");
}
