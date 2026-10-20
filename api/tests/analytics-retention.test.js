// Smoke test for the daily analytics prune scheduler, against an in-memory database.

const { test, mock } = require("node:test");
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

const analyticsModel = require("../models/analytics.model");
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

test("a failing prune is logged with its message and the timer is still returned", () => {
  const failure = new Error("disk is full");
  mock.method(analyticsModel, "pruneOlderThan", () => {
    throw failure;
  });
  const logged = mock.method(console, "error", () => {});
  let timer;
  try {
    timer = startAnalyticsPruning();
  } finally {
    if (timer) clearInterval(timer);
    mock.restoreAll();
  }

  assert.equal(logged.mock.callCount(), 1);
  assert.match(logged.mock.calls[0].arguments[0], /Analytics retention prune failed/);
  assert.equal(logged.mock.calls[0].arguments[1].message, "disk is full");
  assert.ok(timer, "startAnalyticsPruning returned no timer after a failed prune.");
  assert.equal(timer.hasRef(), false);
});
