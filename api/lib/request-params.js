// Route-side checks for path and query parameters, so a malformed value gets a
// 400 that names the parameter instead of reaching a model as NaN (API-4).
// Called by every route in routes/ that takes a numeric :id and by the public
// list routes that accept ?page= and ?limit=. models/model-helpers.js
// paginate() still throws INVALID_NUMERIC_PARAM for a bad page; that throw is
// the backstop for a caller that skips validatePageParams().

const ERRORS = require("./error-codes");
const { sendValidationError } = require("./error-handler");

// Digits only: Number() alone would read "1e2", "0x10" and " 5 " as integers.
function isPositiveInteger(text) {
  return /^[1-9]\d*$/.test(String(text)) && Number.isSafeInteger(Number(text));
}

/**
 * Read a numeric path parameter. Sends a 400 naming the parameter and returns
 * null when it is not a positive integer, so a handler can write
 * `if (id === null) return;`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} [name="id"] - The route parameter name, e.g. "mapId".
 * @returns {number|null} The id, or null after a 400 response was sent.
 */
function parseIdParam(req, res, name = "id") {
  const raw = req.params[name];
  if (!isPositiveInteger(raw)) {
    sendValidationError(res, name, ERRORS.INVALID_NUMERIC_PARAM, { received: raw });
    return null;
  }
  return Number(raw);
}

/**
 * Check the optional ?page= and ?limit= query values of a list route. Each,
 * when present, must be a positive integer. Sends a 400 naming the first bad
 * parameter and returns false; the handler then returns without calling the
 * model.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {boolean} True when both are absent or valid.
 */
function validatePageParams(req, res) {
  for (const name of ["page", "limit"]) {
    const raw = req.query[name];
    if (raw !== undefined && !isPositiveInteger(raw)) {
      sendValidationError(res, name, ERRORS.INVALID_NUMERIC_PARAM, { received: raw });
      return false;
    }
  }
  return true;
}

/**
 * True when `value` is an array whose every item is a positive integer; an
 * empty array passes, because it clears a relation list.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isIdArray(value) {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 1);
}

module.exports = { parseIdParam, validatePageParams, isIdArray };
