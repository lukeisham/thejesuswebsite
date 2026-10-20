// Smoke tests for utils/date-format.js formatDateShort — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). The blog list card
// depends on the "15 Mar 2024" look and on the empty-string fallback that
// leaves the date line out.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../date-format.js";

describe("formatDateShort", () => {
  test("module imports and exports formatDateShort", async () => {
    const mod = await import(MODULE);
    assert.equal(typeof mod.formatDateShort, "function");
  });

  test("formats an ISO date as day, abbreviated month, year", async () => {
    const { formatDateShort } = await import(MODULE);
    // Midday UTC so any local timezone from -12 to +11 stays on the 15th.
    assert.equal(formatDateShort("2024-03-15T12:00:00Z"), "15 Mar 2024");
  });

  test("missing input gives the empty fallback without a warning", async () => {
    const { formatDateShort } = await import(MODULE);
    assert.equal(formatDateShort(null), "");
    assert.equal(formatDateShort(undefined), "");
    assert.equal(formatDateShort(""), "");
  });

  test("an unparseable date gives the fallback and warns", async (t) => {
    const { formatDateShort } = await import(MODULE);
    const warn = t.mock.method(console, "warn", () => {});
    assert.equal(formatDateShort("not-a-date"), "");
    assert.equal(formatDateShort("not-a-date", "n/a"), "n/a");
    assert.equal(warn.mock.callCount(), 2);
  });
});
