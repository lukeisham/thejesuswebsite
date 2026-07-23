// AdminFigureCaptions non-DOM unit tests
// Run with: node --test admin/tests/admin-figure-captions.test.js
// Covers buildRowViewModels (row->figure index mapping) and createDebouncer
// — the parts of the panel that can be exercised without a browser.

const test = require("node:test");
const assert = require("node:assert");

// admin-figure-captions.js expects AdminFigureShortcodes to already be a
// global (it's a classic script loaded after admin-figure-shortcodes.js in
// the browser) — replicate that load order here.
require("../assets/js/admin-figure-shortcodes.js");
const AdminFigureCaptions = require("../assets/js/admin-figure-captions.js");

const { buildRowViewModels, createDebouncer } = AdminFigureCaptions;

// ── buildRowViewModels ───────────────────────────────────────────────────────

test("buildRowViewModels: empty text yields no rows", function () {
  assert.deepStrictEqual(buildRowViewModels(""), []);
});

test("buildRowViewModels: row 2 maps to the second figure, not a stale offset", function () {
  const text =
    '[figure src="/a.webp" caption="First"]\n\n[figure src="/b.webp" caption="Second"]';
  const rows = buildRowViewModels(text);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1].index, 1);
  assert.strictEqual(rows[1].caption, "Second");
  assert.strictEqual(rows[1].src, "/b.webp");
});

test("buildRowViewModels: rebuild after an external textarea edit re-maps correctly", function () {
  const before = '[figure src="/a.webp" caption="Only"]';
  const rowsBefore = buildRowViewModels(before);
  assert.strictEqual(rowsBefore.length, 1);

  // Simulate an external edit (e.g. Insert Image) adding a figure ahead of
  // the tracked one — a stale index would now point at the wrong figure.
  const after =
    '[figure src="/new.webp" caption="Inserted"]\n\n' + before;
  const rowsAfter = buildRowViewModels(after);
  assert.strictEqual(rowsAfter.length, 2);
  assert.strictEqual(rowsAfter[0].caption, "Inserted");
  assert.strictEqual(rowsAfter[1].caption, "Only");
});

test("buildRowViewModels: ids are unique per row", function () {
  const text =
    '[figure src="/a.webp"]\n\n[figure src="/b.webp"]\n\n[figure src="/c.webp"]';
  const rows = buildRowViewModels(text);
  const captionIds = rows.map((r) => r.captionId);
  assert.strictEqual(new Set(captionIds).size, captionIds.length);
});

// ── createDebouncer ──────────────────────────────────────────────────────────

test("createDebouncer: only the last scheduled call fires", function (t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let calls = 0;
  const schedule = createDebouncer(() => calls++, 250);

  schedule();
  t.mock.timers.tick(100);
  schedule(); // reset the timer before it fires
  t.mock.timers.tick(100);
  assert.strictEqual(calls, 0, "should not have fired yet");

  t.mock.timers.tick(150);
  assert.strictEqual(calls, 1, "should fire exactly once after the debounce window");
});

test("createDebouncer: fires again on a subsequent schedule after settling", function (t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let calls = 0;
  const schedule = createDebouncer(() => calls++, 250);

  schedule();
  t.mock.timers.tick(250);
  assert.strictEqual(calls, 1);

  schedule();
  t.mock.timers.tick(250);
  assert.strictEqual(calls, 2);
});
