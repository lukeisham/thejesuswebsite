/**
 * Express error response helper — produces consistent JSON error bodies for
 * every API route. Import the error codes from error-codes.js and pass them
 * to sendError() or sendValidationError().
 *
 * In non-production environments the response includes the technical `detail`
 * field to speed up debugging. Production responses only surface `code`,
 * `message`, and optional `context`.
 *
 * @module lib/error-handler
 */

/**
 * @param {import('express').Response} res
 * @param {object} errorDef  - An error definition from error-codes.js.
 * @param {object} [context] - Arbitrary key/value pairs appended to the error
 *                             object (e.g. { field: 'slug', received: 'Foo Bar' }).
 */
function sendError(res, errorDef, context = {}) {
  const body = {
    error: {
      code: errorDef.code,
      message: errorDef.message,
    },
  };

  // Only append detail when it provides useful technical insight (JS-2).
  if (process.env.NODE_ENV !== "production" && errorDef.detail) {
    body.error.detail = errorDef.detail;
  }

  if (context && Object.keys(context).length > 0) {
    body.error.context = context;
  }

  return res.status(errorDef.httpStatus).json(body);
}

/**
 * Convenience wrapper for field-level validation errors. Wraps sendError
 * and automatically populates context.field.
 *
 * @param {import('express').Response} res
 * @param {string} fieldName - The name of the field that failed validation.
 * @param {object} errorDef   - An error definition from error-codes.js.
 * @param {object} [extra]    - Additional context keys to merge with { field }.
 */
function sendValidationError(res, fieldName, errorDef, extra = {}) {
  return sendError(res, errorDef, { field: fieldName, ...extra });
}

module.exports = { sendError, sendValidationError };
