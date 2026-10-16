// escape-html tests — smoke tests for the shared browser HTML escape (TEST-2).
// Uses node:test + node:assert. The module is a browser ES module, so it is
// loaded with dynamic import().

const { test } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../assets/js/utils/escape-html.js");

test("module loads and exports escapeHTML", async () => {
  const { escapeHTML } = await load();
  assert.equal(typeof escapeHTML, "function");
});

test("escapes all five HTML special characters", async () => {
  const { escapeHTML } = await load();
  assert.equal(
    escapeHTML(`<a href="x" title='y'>&</a>`),
    "&lt;a href=&quot;x&quot; title=&#x27;y&#x27;&gt;&amp;&lt;/a&gt;",
  );
});

test("null and undefined give an empty string, numbers become strings", async () => {
  const { escapeHTML } = await load();
  assert.equal(escapeHTML(null), "");
  assert.equal(escapeHTML(undefined), "");
  assert.equal(escapeHTML(42), "42");
});
