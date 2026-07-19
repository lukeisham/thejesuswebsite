// stamp-about-dates.js — parseGitLogDates unit tests
// Run with: node --test api/tests/stamp-about-dates.test.js
//
// Tests only the pure `git log` output parser. The script's only external
// dependency (`git log` against the live repo) makes mocking execSync of
// limited value; parseGitLogDates is exported specifically so the
// first/last-line ISO-date logic can be verified without shelling out.

const test = require("node:test");
const assert = require("node:assert");
const { parseGitLogDates } = require("../scripts/stamp-about-dates.js");

test("parseGitLogDates: single commit — created and edited are the same date", () => {
  const result = parseGitLogDates("2026-07-19T10:00:00+00:00\n");
  assert.deepStrictEqual(result, {
    created: "2026-07-19T10:00:00+00:00",
    edited: "2026-07-19T10:00:00+00:00",
  });
});

test("parseGitLogDates: multiple commits — first line is edited, last line is created", () => {
  const output = [
    "2026-07-19T10:00:00+00:00",
    "2026-07-10T08:00:00+00:00",
    "2026-07-01T09:00:00+00:00",
  ].join("\n");
  const result = parseGitLogDates(output);
  assert.deepStrictEqual(result, {
    created: "2026-07-01T09:00:00+00:00",
    edited: "2026-07-19T10:00:00+00:00",
  });
});

test("parseGitLogDates: ignores blank lines and trailing newline", () => {
  const output = "2026-07-19T10:00:00+00:00\n\n2026-07-01T09:00:00+00:00\n";
  const result = parseGitLogDates(output);
  assert.deepStrictEqual(result, {
    created: "2026-07-01T09:00:00+00:00",
    edited: "2026-07-19T10:00:00+00:00",
  });
});

test("parseGitLogDates: throws on empty output", () => {
  assert.throws(() => parseGitLogDates(""), /No git history/);
});

test("parseGitLogDates: throws on whitespace-only output", () => {
  assert.throws(() => parseGitLogDates("   \n  \n"), /No git history/);
});
