// Schema analytics columns parity test — verifies that a fresh DB built
// from schema.sql includes the is_bot and search_terms columns (with correct
// types and defaults) and the idx_analytics_is_bot index, matching migration
// 017. Catches drift between the canonical schema and applied migrations.
//
// Run:  node api/tests/schema-analytics-parity.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/db");

const db = createTestDb();

// ── Column presence ──────────────────────────────────────────────────────────

describe("analytics table columns", () => {
  test("includes is_bot with type INTEGER and default 0", () => {
    const columns = db.pragma("table_info(analytics)");
    const isBot = columns.find((c) => c.name === "is_bot");

    assert.ok(isBot, "is_bot column missing from analytics table");
    assert.equal(isBot.type, "INTEGER", `Expected type INTEGER, got ${isBot.type}`);
    assert.equal(isBot.dflt_value, "0", `Expected default 0, got ${isBot.dflt_value}`);
  });

  test("includes search_terms with type TEXT", () => {
    const columns = db.pragma("table_info(analytics)");
    const searchTerms = columns.find((c) => c.name === "search_terms");

    assert.ok(searchTerms, "search_terms column missing from analytics table");
    assert.equal(searchTerms.type, "TEXT", `Expected type TEXT, got ${searchTerms.type}`);
  });
});

// ── Index presence ───────────────────────────────────────────────────────────

describe("analytics indexes", () => {
  test("includes idx_analytics_is_bot", () => {
    const index = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
      .get("idx_analytics_is_bot");

    assert.ok(index, "idx_analytics_is_bot index missing from schema");
    assert.equal(index.name, "idx_analytics_is_bot");
  });
});

// ── Full column list parity ──────────────────────────────────────────────────

describe("analytics full column list", () => {
  test("has exactly the expected columns in order", () => {
    const expected = [
      { name: "id",          type: "INTEGER" },
      { name: "page",        type: "TEXT"    },
      { name: "referrer",    type: "TEXT"    },
      { name: "user_agent",  type: "TEXT"    },
      { name: "ip_hash",     type: "TEXT"    },
      { name: "session_id",  type: "TEXT"    },
      { name: "visited_at",  type: "DATETIME"},
      { name: "device_type", type: "TEXT"    },
      { name: "browser",     type: "TEXT"    },
      { name: "os",          type: "TEXT"    },
      { name: "country",     type: "TEXT"    },
      { name: "is_bot",      type: "INTEGER" },
      { name: "search_terms", type: "TEXT"   },
    ];

    const actual = db.pragma("table_info(analytics)").map((c) => ({
      name: c.name,
      type: c.type,
    }));

    assert.equal(actual.length, expected.length,
      `Expected ${expected.length} columns, got ${actual.length}`);

    for (let i = 0; i < expected.length; i++) {
      assert.equal(actual[i].name, expected[i].name,
        `Column ${i}: expected ${expected[i].name}, got ${actual[i].name}`);
      assert.equal(actual[i].type, expected[i].type,
        `Column ${expected[i].name}: expected type ${expected[i].type}, got ${actual[i].type}`);
    }
  });
});

console.log("\nDone.");
