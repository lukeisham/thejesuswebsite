// Smoke test for the daily analytics prune scheduler, against an in-memory database.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

const testDb = createTestDb();
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const {
  startAnalyticsPruning,
  RETENTION_DAYS,
} = require("../lib/analytics-retention");

test("startAnalyticsPruning prunes immediately and returns a clearable timer", () => {
  const insert = testDb.prepare(
    "INSERT INTO analytics (page, visited_at) VALUES (?, datetime('now', ?))",
  );
  insert.run("/expired", `-${RETENTION_DAYS + 5} days`);
  insert.run("/kept", "-10 days");

  const timer = startAnalyticsPruning();
  clearInterval(timer);

  assert.deepStrictEqual(testDb.prepare("SELECT page FROM analytics").all(), [
    { page: "/kept" },
  ]);
});
