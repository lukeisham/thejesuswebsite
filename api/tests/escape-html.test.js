// escape-html tests — smoke tests for the shared server HTML escape (TEST-2).
// Uses node:test + node:assert.

const { test } = require("node:test");
const assert = require("node:assert/strict");

test("module loads and exports escapeHTML", () => {
  const { escapeHTML } = require("../lib/escape-html");
  assert.equal(typeof escapeHTML, "function");
});

test("escapes all five HTML special characters", () => {
  const { escapeHTML } = require("../lib/escape-html");
  assert.equal(
    escapeHTML(`<a href="x" title='y'>&</a>`),
    "&lt;a href=&quot;x&quot; title=&#x27;y&#x27;&gt;&amp;&lt;/a&gt;",
  );
});

test("null and undefined give an empty string, numbers become strings", () => {
  const { escapeHTML } = require("../lib/escape-html");
  assert.equal(escapeHTML(null), "");
  assert.equal(escapeHTML(undefined), "");
  assert.equal(escapeHTML(42), "42");
});
