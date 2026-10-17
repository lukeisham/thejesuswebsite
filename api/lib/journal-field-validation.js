// Shared body validation for the journal article fields: abstract, strength and
// footnotes. Called by the POST and PUT handlers in routes/essays.js,
// routes/responses.js and routes/historiography.js (API-4: validate before the
// model). The limits below must equal the `maxLength` values in the admin
// editors (admin/essays, admin/debate, admin/historiography edit pages) and in
// admin/assets/js/admin-footnotes-panel.js. api/tests/guide-journal-article-fields.test.js
// checks that they match. See setup/ARCHITECTURE/journal-article-fields.md.

const ERRORS = require("./error-codes");

const ABSTRACT_MAX_LENGTH = 2000;
const FOOTNOTE_MAX_LENGTH = 1000;
const FOOTNOTE_MAX_COUNT = 100;
const STRENGTH_MIN = 1;
const STRENGTH_MAX = 5;

/**
 * @typedef {{ field: string, errorDef: object, extra: object }} FieldProblem
 */

function checkAbstract(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    return { field: "abstract", errorDef: ERRORS.INVALID_BODY_FIELD, extra: {} };
  }
  if (value.length > ABSTRACT_MAX_LENGTH) {
    return {
      field: "abstract",
      errorDef: ERRORS.INPUT_EXCEEDS_MAX_LENGTH,
      extra: { max: ABSTRACT_MAX_LENGTH, received: value.length },
    };
  }
  return null;
}

function checkStrength(value, allowStrength) {
  if (value === undefined) return null;
  if (!allowStrength) {
    return { field: "strength", errorDef: ERRORS.INVALID_BODY_FIELD, extra: {} };
  }
  if (value === null) return null;
  if (!Number.isInteger(value) || value < STRENGTH_MIN || value > STRENGTH_MAX) {
    return {
      field: "strength",
      errorDef: ERRORS.INVALID_NUMERIC_PARAM,
      extra: { received: value },
    };
  }
  return null;
}

function checkFootnotes(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > FOOTNOTE_MAX_COUNT) {
    return {
      field: "footnotes",
      errorDef: ERRORS.INVALID_BODY_FIELD,
      extra: { max: FOOTNOTE_MAX_COUNT },
    };
  }
  for (let i = 0; i < value.length; i++) {
    const content = value[i] && value[i].content;
    const field = `footnotes[${i}].content`;
    if (typeof content !== "string" || content.trim() === "") {
      return { field, errorDef: ERRORS.INVALID_BODY_FIELD, extra: {} };
    }
    if (content.length > FOOTNOTE_MAX_LENGTH) {
      return {
        field,
        errorDef: ERRORS.INPUT_EXCEEDS_MAX_LENGTH,
        extra: { max: FOOTNOTE_MAX_LENGTH, received: content.length },
      };
    }
  }
  return null;
}

/**
 * Check the journal article fields in a request body. Fields that are absent
 * pass, so a partial PUT stays valid.
 *
 * @param {object} body - The request body.
 * @param {{ allowStrength: boolean }} options - `allowStrength` is true only
 *   for responses; a `strength` key on any other type is an error.
 * @returns {FieldProblem|null} The first problem found, or null when valid.
 *   Pass `field`, `errorDef` and `extra` to `sendValidationError()`.
 */
function validateJournalFields(body, { allowStrength }) {
  const data = body || {};
  return (
    checkAbstract(data.abstract) ||
    checkStrength(data.strength, allowStrength) ||
    checkFootnotes(data.footnotes)
  );
}

module.exports = {
  validateJournalFields,
  ABSTRACT_MAX_LENGTH,
  FOOTNOTE_MAX_LENGTH,
  FOOTNOTE_MAX_COUNT,
};
