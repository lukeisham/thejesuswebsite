// Analytics model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests getTopReferrers returning `count` and
// getTopPagesWithTrend returning views/unique/trend for a seeded date range.

const { test, describe, beforeEach, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory database setup ────────────────────────────────────────────────
const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const analyticsModel = require("../models/analytics.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearTable() {
  testDb.exec("DELETE FROM analytics");
}

function seedPageView(overrides = {}) {
  return analyticsModel.record({
    page: overrides.page || "/test",
    referrer: overrides.referrer || null,
    user_agent: overrides.user_agent || "test-agent",
    session_id: overrides.session_id || "sess-1",
  });
}

// ── getTopReferrers() — count field rename ──────────────────────────────────

describe("model: getTopReferrers()", () => {
  beforeEach(clearTable);

  test("returns a count field (not views)", () => {
    seedPageView({ referrer: "google.com", session_id: "s1" });
    seedPageView({ referrer: "google.com", session_id: "s2" });

    const result = analyticsModel.getTopReferrers(10);
    assert.equal(result.length, 1);
    assert.equal(result[0].count, 2);
    assert.equal(result[0].views, undefined);
  });

  test("excludes empty referrers (null and empty string)", () => {
    seedPageView({ referrer: "", session_id: "s1" });
    seedPageView({ referrer: null, session_id: "s2" });
    seedPageView({ referrer: "example.com", session_id: "s3" });

    const result = analyticsModel.getTopReferrers(10);
    assert.equal(result.length, 1);
    assert.equal(result[0].referrer, "example.com");
  });

  test("orders by count descending", () => {
    seedPageView({ referrer: "a.com", session_id: "s1" });
    seedPageView({ referrer: "b.com", session_id: "s2" });
    seedPageView({ referrer: "b.com", session_id: "s3" });
    seedPageView({ referrer: "b.com", session_id: "s4" });

    const result = analyticsModel.getTopReferrers(10);
    assert.equal(result[0].referrer, "b.com");
    assert.equal(result[0].count, 3);
  });

  test("respects the limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      seedPageView({ referrer: "ref-" + i + ".com", session_id: "sess-" + i });
    }

    const result = analyticsModel.getTopReferrers(3);
    assert.ok(result.length <= 3);
  });
});

// ── getTopPagesWithTrend() ──────────────────────────────────────────────────

describe("model: getTopPagesWithTrend()", () => {
  beforeEach(clearTable);

  test("returns views and unique counts per page", () => {
    // Two views of /about by different sessions, one of /home
    seedPageView({ page: "/about", session_id: "s1" });
    seedPageView({ page: "/about", session_id: "s2" });
    seedPageView({ page: "/home", session_id: "s3" });

    const result = analyticsModel.getTopPagesWithTrend(7, 5);
    assert.equal(result.length, 2);
    assert.equal(result[0].page, "/about");
    assert.equal(result[0].views, 2);
    assert.equal(result[0].unique, 2);
    assert.equal(result[1].page, "/home");
    assert.equal(result[1].views, 1);
    assert.equal(result[1].unique, 1);
  });

  test("returns a zero-filled trend array for the date range", () => {
    seedPageView({ page: "/test", session_id: "s1" });

    const result = analyticsModel.getTopPagesWithTrend(7, 1);
    const trend = result[0].trend;
    assert.ok(Array.isArray(trend));
    assert.ok(trend.length > 0, "trend should have at least one entry");
    // The last entry (today) should have 1 view; earlier days are zero
    assert.equal(trend[trend.length - 1], 1);
  });

  test("reports 0, not 1, for days with no views", () => {
    seedPageView({ page: "/test", session_id: "s1" });

    const result = analyticsModel.getTopPagesWithTrend(7, 1);
    // One point per day: today plus the `days - 1` days before it.
    assert.deepStrictEqual(result[0].trend, [0, 0, 0, 0, 0, 0, 1]);
  });

  test("respects the limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      seedPageView({ page: "/page-" + i, session_id: "sess-" + i });
    }

    const result = analyticsModel.getTopPagesWithTrend(7, 3);
    assert.ok(result.length <= 3);
  });

  test("excludes views outside the days window", () => {
    // Insert a view with an old visited_at timestamp
    testDb
      .prepare(
        `
      INSERT INTO analytics (page, referrer, user_agent, session_id, visited_at)
      VALUES ('/old', NULL, 'agent', 'sess-old', datetime('now', '-100 days'))
    `,
      )
      .run();

    seedPageView({ page: "/recent", session_id: "s1" });

    const result = analyticsModel.getTopPagesWithTrend(7, 5);
    const pages = result.map((r) => r.page);
    assert.ok(
      !pages.includes("/old"),
      "old page should be outside 7-day window",
    );
    assert.ok(pages.includes("/recent"));
  });

  test("returns an empty array when there are no views", () => {
    const result = analyticsModel.getTopPagesWithTrend(7, 5);
    assert.deepStrictEqual(result, []);
  });
});

// ── getTopReferrers() — external-only filter ─────────────────────────────────

describe("model: getTopReferrers() external filter", () => {
  beforeEach(clearTable);

  test("excludes same-site referrers when external=true", () => {
    seedPageView({
      referrer: "https://thejesuswebsite.org/evidence/",
      session_id: "s1",
    });
    seedPageView({
      referrer: "https://thejesuswebsite.org/blog/",
      session_id: "s2",
    });
    seedPageView({ referrer: "https://google.com", session_id: "s3" });

    const result = analyticsModel.getTopReferrers(10, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].referrer, "https://google.com");
  });

  test("includes same-site referrers when external=false (default)", () => {
    seedPageView({
      referrer: "https://thejesuswebsite.org/evidence/",
      session_id: "s1",
    });
    seedPageView({ referrer: "https://google.com", session_id: "s2" });

    const result = analyticsModel.getTopReferrers(10);
    assert.equal(result.length, 2);
  });
});

// ── getSearchTerms() ─────────────────────────────────────────────────────────

describe("model: getSearchTerms()", () => {
  beforeEach(clearTable);

  test("returns search terms grouped by term with count", () => {
    analyticsModel.record({
      page: "/test",
      search_terms: "historical jesus",
      user_agent: "test",
      session_id: "s1",
    });
    analyticsModel.record({
      page: "/test",
      search_terms: "historical jesus",
      user_agent: "test",
      session_id: "s2",
    });
    analyticsModel.record({
      page: "/test",
      search_terms: "roman empire",
      user_agent: "test",
      session_id: "s3",
    });

    const result = analyticsModel.getSearchTerms(null, 10);
    assert.equal(result.length, 2);
    assert.equal(result[0].term, "historical jesus");
    assert.equal(result[0].count, 2);
    assert.equal(result[1].term, "roman empire");
    assert.equal(result[1].count, 1);
  });

  test("returns empty array when no search terms exist", () => {
    const result = analyticsModel.getSearchTerms(null, 10);
    assert.deepStrictEqual(result, []);
  });

  test("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      analyticsModel.record({
        page: "/test",
        search_terms: "term-" + i,
        user_agent: "test",
        session_id: "s-" + i,
      });
    }
    const result = analyticsModel.getSearchTerms(null, 5);
    assert.ok(result.length <= 5);
  });
});

// ── getBotStats() ────────────────────────────────────────────────────────────

describe("model: getBotStats()", () => {
  beforeEach(clearTable);

  test("returns human and bot counts", () => {
    analyticsModel.record({
      page: "/test",
      user_agent: "Chrome",
      session_id: "s1",
      is_bot: 0,
    });
    analyticsModel.record({
      page: "/test",
      user_agent: "Googlebot",
      session_id: "s2",
      is_bot: 1,
    });

    const result = analyticsModel.getBotStats(null);
    assert.equal(result.human, 1);
    assert.equal(result.bot, 1);
    assert.ok(Array.isArray(result.bot_breakdown));
  });

  test("bot_breakdown groups bots by user_agent", () => {
    analyticsModel.record({
      page: "/test",
      user_agent: "Googlebot/2.1",
      session_id: "s1",
      is_bot: 1,
    });
    analyticsModel.record({
      page: "/test",
      user_agent: "Googlebot/2.1",
      session_id: "s2",
      is_bot: 1,
    });
    analyticsModel.record({
      page: "/test",
      user_agent: "Bingbot/2.0",
      session_id: "s3",
      is_bot: 1,
    });

    const result = analyticsModel.getBotStats(null);
    assert.equal(result.bot, 3);
    assert.ok(result.bot_breakdown.length >= 2);
  });

  test("returns zero bot count when no bots recorded", () => {
    analyticsModel.record({
      page: "/test",
      user_agent: "Chrome",
      session_id: "s1",
      is_bot: 0,
    });

    const result = analyticsModel.getBotStats(null);
    assert.equal(result.human, 1);
    assert.equal(result.bot, 0);
  });

  test("UA-less rows increment unknown, not human", () => {
    analyticsModel.record({
      page: "/test",
      user_agent: null,
      session_id: "s1",
    });
    analyticsModel.record({
      page: "/test",
      user_agent: "Chrome",
      session_id: "s2",
      is_bot: 0,
    });
    analyticsModel.record({
      page: "/test",
      user_agent: "Googlebot",
      session_id: "s3",
      is_bot: 1,
    });

    const result = analyticsModel.getBotStats(null);
    assert.equal(result.human, 1, "only the Chrome row should be human");
    assert.equal(result.bot, 1, "Googlebot row should be bot");
    assert.equal(result.unknown, 1, "UA-less row should be unknown, not human");
    assert.equal(
      result.human + result.bot + result.unknown,
      3,
      "human + bot + unknown should account for every seeded row",
    );
  });
});

// ── Human-only statistics and pruning ────────────────────────────────────────

describe("model: bots are excluded from visitor statistics", () => {
  beforeEach(clearTable);

  function seedHumanAndBot() {
    analyticsModel.record({
      page: "/human",
      user_agent: "Chrome",
      session_id: "s1",
      is_bot: 0,
    });
    analyticsModel.record({
      page: "/bot",
      user_agent: "Googlebot",
      session_id: "s2",
      is_bot: 1,
    });
  }

  test("getSummary counts the human row and ignores the bot row", () => {
    seedHumanAndBot();
    const result = analyticsModel.getSummary();
    assert.equal(result.total_views, 1);
    assert.equal(result.unique_sessions, 1);
  });

  test("getTopPages lists only the human page", () => {
    seedHumanAndBot();
    assert.deepStrictEqual(analyticsModel.getTopPages(10), [
      { page: "/human", views: 1 },
    ]);
  });

  test("getBotStats still counts the bot", () => {
    seedHumanAndBot();
    const result = analyticsModel.getBotStats(null);
    assert.equal(result.human, 1);
    assert.equal(result.bot, 1);
  });
});

describe("model: pruneOlderThan()", () => {
  beforeEach(clearTable);

  test("deletes rows older than the window and keeps newer ones", () => {
    const insert = testDb.prepare(
      "INSERT INTO analytics (page, visited_at) VALUES (?, datetime('now', ?))",
    );
    insert.run("/old", "-400 days");
    insert.run("/recent", "-10 days");

    assert.equal(analyticsModel.pruneOlderThan(365), 1);
    const pages = testDb.prepare("SELECT page FROM analytics").all();
    assert.deepStrictEqual(pages, [{ page: "/recent" }]);
  });
});

// Route: POST /analytics hardening

const http = require("http");
const express = require("express");

function startAnalyticsServer() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    const analyticsRouter = require("../routes/analytics");
    app.use("/analytics", analyticsRouter);

    const server = http.createServer(app);
    server.listen(0, () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function analyticsReq(method, path, { body, port } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: "localhost",
      port,
      path,
      headers: { "content-type": "application/json" },
    };
    const r = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

describe("route: POST /analytics field validation", () => {
  let server, port;

  before(async () => {
    const s = await startAnalyticsServer();
    server = s.server;
    port = s.port;
  });

  after(() => server.close());

  test("accepts valid request with 204", async () => {
    const res = await analyticsReq("POST", "/analytics", {
      port,
      body: {
        page: "/valid-page",
        referrer: "example.com",
        session_id: "abc123",
      },
    });
    assert.equal(res.status, 204);
  });

  test("rejects page > 500 chars with 400", async () => {
    const res = await analyticsReq("POST", "/analytics", {
      port,
      body: { page: "x".repeat(501) },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "E-INPUT-022");
  });

  test("rejects referrer > 500 chars with 400", async () => {
    const res = await analyticsReq("POST", "/analytics", {
      port,
      body: { page: "/test", referrer: "x".repeat(501) },
    });
    assert.equal(res.status, 400);
  });

  test("rejects session_id > 100 chars with 400", async () => {
    const res = await analyticsReq("POST", "/analytics", {
      port,
      body: { page: "/test", session_id: "x".repeat(101) },
    });
    assert.equal(res.status, 400);
  });

  test("stores no IP value, not even a client-supplied one", async () => {
    await analyticsReq("POST", "/analytics", {
      port,
      body: { page: "/test-ip", ip_hash: "evil-hash" },
    });
    const row = testDb
      .prepare("SELECT * FROM analytics WHERE page = ?")
      .get("/test-ip");
    assert.ok(row, "row should exist");
    assert.ok(!("ip_hash" in row), "analytics has no ip_hash column");
    assert.ok(!Object.values(row).includes("evil-hash"));
  });
});

describe("route: POST /analytics rate limiting", () => {
  let server, port;

  before(async () => {
    // Clear the cached analytics route module so the rate limiter starts fresh.
    const routePath = require.resolve("../routes/analytics");
    delete require.cache[routePath];
    const s = await startAnalyticsServer();
    server = s.server;
    port = s.port;
  });

  after(() => server.close());

  test("returns 429 after exceeding 30 requests", async () => {
    // First 30 requests should succeed.
    for (let i = 0; i < 30; i++) {
      const res = await analyticsReq("POST", "/analytics", {
        port,
        body: { page: `/rate-test-${i}` },
      });
      assert.equal(
        res.status,
        204,
        `request ${i + 1} should be 204 but got ${res.status}`,
      );
    }
    // 31st request should be rate-limited.
    const blocked = await analyticsReq("POST", "/analytics", {
      port,
      body: { page: "/rate-limit-exceeded" },
    });
    assert.equal(blocked.status, 429);
  });
});
