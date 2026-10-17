// Smoke tests for lib/journal-field-validation.js — node:test + node:assert.
// Checks that valid bodies pass and each bad value returns the right registry
// error and field name.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateJournalFields,
  ABSTRACT_MAX_LENGTH,
  FOOTNOTE_MAX_LENGTH,
  FOOTNOTE_MAX_COUNT,
} = require("../lib/journal-field-validation");
const ERRORS = require("../lib/error-codes");

const RESPONSE = { allowStrength: true };
const ESSAY = { allowStrength: false };

describe("validateJournalFields: valid bodies", () => {
  test("an empty body passes", () => {
    assert.equal(validateJournalFields({}, ESSAY), null);
    assert.equal(validateJournalFields(undefined, ESSAY), null);
  });

  test("a full valid response body passes", () => {
    const body = {
      abstract: "A short abstract.",
      strength: 3,
      footnotes: [{ content: "One." }, { content: "Two." }],
    };
    assert.equal(validateJournalFields(body, RESPONSE), null);
  });

  test("null abstract and null strength pass (they clear the field)", () => {
    assert.equal(
      validateJournalFields({ abstract: null, strength: null }, RESPONSE),
      null,
    );
  });

  test("limits are accepted at exactly the maximum", () => {
    const body = {
      abstract: "a".repeat(ABSTRACT_MAX_LENGTH),
      footnotes: Array.from({ length: FOOTNOTE_MAX_COUNT }, () => ({
        content: "n".repeat(FOOTNOTE_MAX_LENGTH),
      })),
    };
    assert.equal(validateJournalFields(body, ESSAY), null);
  });
});

describe("validateJournalFields: abstract", () => {
  test("an abstract over the limit returns INPUT_EXCEEDS_MAX_LENGTH", () => {
    const problem = validateJournalFields(
      { abstract: "a".repeat(ABSTRACT_MAX_LENGTH + 1) },
      ESSAY,
    );
    assert.equal(problem.field, "abstract");
    assert.equal(problem.errorDef, ERRORS.INPUT_EXCEEDS_MAX_LENGTH);
  });

  test("a non-string abstract returns INVALID_BODY_FIELD", () => {
    const problem = validateJournalFields({ abstract: 12 }, ESSAY);
    assert.equal(problem.field, "abstract");
    assert.equal(problem.errorDef, ERRORS.INVALID_BODY_FIELD);
  });
});

describe("validateJournalFields: strength", () => {
  for (const bad of [0, 6, 2.5, "3", true]) {
    test(`strength ${JSON.stringify(bad)} returns INVALID_NUMERIC_PARAM`, () => {
      const problem = validateJournalFields({ strength: bad }, RESPONSE);
      assert.equal(problem.field, "strength");
      assert.equal(problem.errorDef, ERRORS.INVALID_NUMERIC_PARAM);
    });
  }

  test("1 and 5 pass", () => {
    assert.equal(validateJournalFields({ strength: 1 }, RESPONSE), null);
    assert.equal(validateJournalFields({ strength: 5 }, RESPONSE), null);
  });

  test("a strength key on an essay or historiography is rejected", () => {
    const problem = validateJournalFields({ strength: 3 }, ESSAY);
    assert.equal(problem.field, "strength");
    assert.equal(problem.errorDef, ERRORS.INVALID_BODY_FIELD);
  });
});

describe("validateJournalFields: footnotes", () => {
  test("footnotes that are not an array are rejected", () => {
    const problem = validateJournalFields({ footnotes: "text" }, ESSAY);
    assert.equal(problem.field, "footnotes");
    assert.equal(problem.errorDef, ERRORS.INVALID_BODY_FIELD);
  });

  test("more than the maximum count is rejected", () => {
    const footnotes = Array.from({ length: FOOTNOTE_MAX_COUNT + 1 }, () => ({
      content: "x",
    }));
    const problem = validateJournalFields({ footnotes }, ESSAY);
    assert.equal(problem.field, "footnotes");
    assert.equal(problem.errorDef, ERRORS.INVALID_BODY_FIELD);
  });

  test("a blank footnote names its position in the field", () => {
    const problem = validateJournalFields(
      { footnotes: [{ content: "ok" }, { content: "   " }] },
      ESSAY,
    );
    assert.equal(problem.field, "footnotes[1].content");
    assert.equal(problem.errorDef, ERRORS.INVALID_BODY_FIELD);
  });

  test("a footnote that is a bare string is rejected", () => {
    const problem = validateJournalFields({ footnotes: ["text"] }, ESSAY);
    assert.equal(problem.field, "footnotes[0].content");
  });

  test("a footnote over the length limit returns INPUT_EXCEEDS_MAX_LENGTH", () => {
    const problem = validateJournalFields(
      { footnotes: [{ content: "n".repeat(FOOTNOTE_MAX_LENGTH + 1) }] },
      ESSAY,
    );
    assert.equal(problem.field, "footnotes[0].content");
    assert.equal(problem.errorDef, ERRORS.INPUT_EXCEEDS_MAX_LENGTH);
  });
});
