// Smoke tests for lib/request-params.js (TEST-2): the id and page checks that
// routes call before the model.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseIdParam, validatePageParams, isIdArray } = require("../lib/request-params");

// Hand-built fake of the one Express response method that sendValidationError() uses.
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("parseIdParam returns the number for a positive integer", () => {
  const res = fakeRes();
  assert.equal(parseIdParam({ params: { id: "42" } }, res), 42);
  assert.equal(res.statusCode, null);
});

test("parseIdParam sends 400 naming the parameter and returns null for a bad value", () => {
  for (const raw of ["abc", "0", "-3", "1.5", "", "1e2", "0x10", " 5 "]) {
    const res = fakeRes();
    assert.equal(parseIdParam({ params: { mapId: raw } }, res, "mapId"), null);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "E-INPUT-005");
    assert.equal(res.body.error.context.field, "mapId");
    assert.equal(res.body.error.context.received, raw);
  }
});

test("validatePageParams passes when page and limit are absent or valid", () => {
  const res = fakeRes();
  assert.equal(validatePageParams({ query: {} }, res), true);
  assert.equal(validatePageParams({ query: { page: "2", limit: "50" } }, res), true);
  assert.equal(res.statusCode, null);
});

test("validatePageParams sends 400 naming the first bad parameter", () => {
  for (const [query, field] of [
    [{ page: "abc" }, "page"],
    [{ page: "0" }, "page"],
    [{ page: "1", limit: "x" }, "limit"],
  ]) {
    const res = fakeRes();
    assert.equal(validatePageParams({ query }, res), false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.context.field, field);
  }
});

test("isIdArray accepts arrays of positive integers and rejects anything else", () => {
  assert.equal(isIdArray([]), true);
  assert.equal(isIdArray([1, 2, 30]), true);
  for (const bad of ["1,2", null, [0], [1.5], ["2"], [1, -1], {}]) {
    assert.equal(isIdArray(bad), false);
  }
});
