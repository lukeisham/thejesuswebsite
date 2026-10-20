// Shared body validation for the journal article routes: abstract, strength,
// footnotes, the slug, and a typed check of each other writable column.
// Called by the POST and PUT handlers in routes/essays.js,
// routes/responses.js and routes/historiography.js (API-4: validate before the
// model). The limits below must equal the `maxLength` values in the admin
// editors (admin/essays, admin/debate, admin/historiography edit pages) and in
// admin/assets/js/admin-footnotes-panel.js. api/tests/guide-journal-article-fields.test.js
// checks that they match. See setup/ARCHITECTURE/journal-article-fields.md.
//
// The column specs below mirror the types and CHECK constraints of
// context_essays, responses and historiography in database/schema.sql, and the
// WRITABLE_COLUMNS of the matching models. A column added to a model or a
// schema CHECK that changes needs the same change here, or a bad value reaches
// SQLite and comes back as a generic E-PERSIST-002.

const ERRORS = require("./error-codes");

const ABSTRACT_MAX_LENGTH = 2000;
const FOOTNOTE_MAX_LENGTH = 1000;
const FOOTNOTE_MAX_COUNT = 100;
const STRENGTH_MIN = 1;
const STRENGTH_MAX = 5;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HISTORIOGRAPHY_PERIODS = [
  "early-church",
  "medieval",
  "reformation-early-modern",
  "enlightenment-old-quest",
  "no-quest-period-of-silence",
  "second-quest-new-quest",
  "third-quest",
  "contemporary",
];

// Spec kinds: text and int accept null (they clear the column); flag is a
// 0/1 column that has a default, so it never takes null. `abstract` is
// checked separately for its length limit.
const FLAG = { kind: "flag" };
const TEXT = { kind: "text" };
const INT = { kind: "int" };

const ESSAY_COLUMNS = {
  essay_title: TEXT,
  essay_content: TEXT,
  essay_author: TEXT,
  essay_date: TEXT,
  essay_publisher: TEXT,
  essay_headings: TEXT,
  published_draft: FLAG,
  metadata_keywords: TEXT,
  two_column: FLAG,
  doi: TEXT,
  author_bio: TEXT,
};

const RESPONSE_COLUMNS = {
  challenge_id: INT,
  response_title: TEXT,
  response_content: TEXT,
  response_author: TEXT,
  response_date: TEXT,
  response_publisher: TEXT,
  response_headings: TEXT,
  published_draft: FLAG,
  metadata_keywords: TEXT,
  two_column: FLAG,
  doi: TEXT,
  author_bio: TEXT,
};

const HISTORIOGRAPHY_COLUMNS = {
  ...ESSAY_COLUMNS,
  historiography_period: { kind: "enum", values: HISTORIOGRAPHY_PERIODS },
  period_sort_order: INT,
};

/**
 * @typedef {{ field: string, errorDef: object, extra: object }} FieldProblem
 */

function checkSlug(value, storedSlug) {
  if (value === undefined) return null;
  // An unchanged slug passes so a row saved before the pattern existed can
  // still be edited; only a new slug has to match.
  if (value === storedSlug) return null;
  if (typeof value !== "string" || !SLUG_PATTERN.test(value)) {
    return { field: "slug", errorDef: ERRORS.INVALID_SLUG, extra: {} };
  }
  return null;
}

function checkColumn(field, value, spec) {
  if (value === undefined) return null;
  const invalid = { field, errorDef: ERRORS.INVALID_BODY_FIELD, extra: {} };
  switch (spec.kind) {
    case "text":
      return value === null || typeof value === "string" ? null : invalid;
    case "flag":
      return value === 0 || value === 1 ? null : invalid;
    case "int":
      if (value === null || Number.isInteger(value)) return null;
      return { field, errorDef: ERRORS.INVALID_NUMERIC_PARAM, extra: { received: value } };
    case "enum":
      return value === null || spec.values.includes(value) ? null : invalid;
    default:
      throw new Error(`Unknown column kind for ${field}: ${spec.kind}`);
  }
}

function checkColumns(data, columns) {
  for (const [field, spec] of Object.entries(columns)) {
    const problem = checkColumn(field, data[field], spec);
    if (problem) return problem;
  }
  return null;
}

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
 * Check the writable fields in a request body. Fields that are absent pass, so
 * a partial PUT stays valid. A `slug`, when sent, must match the slug pattern.
 *
 * @param {object} body - The request body.
 * @param {{ allowStrength: boolean, columns?: object, storedSlug?: string }} options -
 *   `allowStrength` is true only for responses; a `strength` key on any other
 *   type is an error. `columns` is one of the exported column specs; when
 *   omitted only the journal fields and the slug are checked. `storedSlug` is
 *   the row's current slug on PUT, so an unchanged legacy slug is accepted.
 * @returns {FieldProblem|null} The first problem found, or null when valid.
 *   Pass `field`, `errorDef` and `extra` to `sendValidationError()`.
 */
function validateJournalFields(body, { allowStrength, columns = {}, storedSlug }) {
  const data = body || {};
  return (
    checkSlug(data.slug, storedSlug) ||
    checkColumns(data, columns) ||
    checkAbstract(data.abstract) ||
    checkStrength(data.strength, allowStrength) ||
    checkFootnotes(data.footnotes)
  );
}

module.exports = {
  validateJournalFields,
  ESSAY_COLUMNS,
  RESPONSE_COLUMNS,
  HISTORIOGRAPHY_COLUMNS,
  ABSTRACT_MAX_LENGTH,
  FOOTNOTE_MAX_LENGTH,
  FOOTNOTE_MAX_COUNT,
};
