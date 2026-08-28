// Model helpers unit tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests pickWritable, generateUniqueSlug, and runUpdate
// in isolation from the models that consume them.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/db");
const { pickWritable, generateUniqueSlug, runUpdate, paginate } = require("../models/model-helpers");
const ERRORS = require("../lib/error-codes");

const WRITABLE = ["slug", "title", "content", "published_draft"];

// ── pickWritable() ────────────────────────────────────────────────────────────

describe("pickWritable", () => {
  test("filters to whitelisted columns only", () => {
    const input = {
      slug: "test",
      title: "Hello",
      content: "<p>Body</p>",
      published_draft: 1,
      evil_field: "DROP TABLE",
    };
    const result = pickWritable(input, WRITABLE);
    assert.deepStrictEqual(Object.keys(result).sort(), ["content", "published_draft", "slug", "title"]);
    assert.equal(result.evil_field, undefined);
  });

  test("ignores undefined values", () => {
    const input = { slug: "test", title: undefined, content: null };
    const result = pickWritable(input, WRITABLE);
    assert.ok("slug" in result);
    assert.ok("content" in result);
    assert.ok(!("title" in result), "undefined title should be excluded");
  });

  test("returns an empty object when nothing matches", () => {
    const result = pickWritable({ foo: 1, bar: 2 }, WRITABLE);
    assert.deepStrictEqual(result, {});
  });

  test("returns empty object for completely empty input", () => {
    assert.deepStrictEqual(pickWritable({}, WRITABLE), {});
  });
});

// ── generateUniqueSlug() ──────────────────────────────────────────────────────

describe("generateUniqueSlug", () => {
  let db;

  // generateUniqueSlug now whitelists its `table` argument (SQL-4), so tests
  // must use a real whitelisted table rather than an ad-hoc CREATE TABLE.
  // `collections` already exists in the schema createTestDb() loads.
  beforeEach(() => {
    db = createTestDb();
  });

  test("returns the base slug when no collision exists", () => {
    const slug = generateUniqueSlug(db, "collections", "my-slug");
    assert.equal(slug, "my-slug");
  });

  test("appends -2 on collision", () => {
    db.prepare("INSERT INTO collections (slug, title) VALUES (?, ?)").run("my-slug", "Title");
    const slug = generateUniqueSlug(db, "collections", "my-slug");
    assert.equal(slug, "my-slug-2");
  });

  test("increments the suffix across multiple collisions", () => {
    db.prepare("INSERT INTO collections (slug, title) VALUES (?, ?)").run("my-slug", "Title");
    db.prepare("INSERT INTO collections (slug, title) VALUES (?, ?)").run("my-slug-2", "Title 2");
    const slug = generateUniqueSlug(db, "collections", "my-slug");
    assert.equal(slug, "my-slug-3");
  });

  test("excludeId lets a row keep its own slug", () => {
    db.prepare("INSERT INTO collections (id, slug, title) VALUES (1, 'my-slug', 'Title')").run();
    // Row with id=1 already has 'my-slug', but we exclude it.
    const slug = generateUniqueSlug(db, "collections", "my-slug", 1);
    assert.equal(slug, "my-slug");
  });

  test("collides with a different row's slug when excludeId doesn't match", () => {
    db.prepare("INSERT INTO collections (id, slug, title) VALUES (1, 'my-slug', 'Title')").run();
    db.prepare("INSERT INTO collections (id, slug, title) VALUES (2, 'my-slug-2', 'Title 2')").run();
    // Excluding id=1 means 'my-slug' is free, but 'my-slug-2' is taken by id=2.
    const slug = generateUniqueSlug(db, "collections", "my-slug", 1);
    assert.equal(slug, "my-slug");
  });

  test("throws for a table not in the whitelist", () => {
    assert.throws(
      () => generateUniqueSlug(db, "not_a_real_table", "my-slug"),
      /Unknown table in generateUniqueSlug/,
    );
  });
});

// ── runUpdate() ───────────────────────────────────────────────────────────────

describe("runUpdate", () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
    db.exec(`
      CREATE TABLE test_table (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        body  TEXT
      );
    `);
  });

  test("updates provided columns and returns true", () => {
    db.prepare("INSERT INTO test_table (id, title, body) VALUES (1, 'Old', 'Old body')").run();
    const row = { title: "New" };
    const changed = runUpdate(db, "test_table", row, 1);
    assert.equal(changed, true);

    const updated = db.prepare("SELECT * FROM test_table WHERE id = 1").get();
    assert.equal(updated.title, "New");
    assert.equal(updated.body, "Old body");
  });

  test("returns false and runs nothing when row is empty", () => {
    db.prepare("INSERT INTO test_table (id, title, body) VALUES (1, 'Old', 'Old body')").run();
    const changed = runUpdate(db, "test_table", {}, 1);
    assert.equal(changed, false);

    const row = db.prepare("SELECT * FROM test_table WHERE id = 1").get();
    assert.equal(row.title, "Old");
  });

  test("builds correct SQL with multiple columns", () => {
    db.prepare("INSERT INTO test_table (id, title, body) VALUES (1, 'A', 'B')").run();
    const row = { title: "X", body: "Y" };
    runUpdate(db, "test_table", row, 1);

    const updated = db.prepare("SELECT * FROM test_table WHERE id = 1").get();
    assert.equal(updated.title, "X");
    assert.equal(updated.body, "Y");
  });
});

// ── paginate() ────────────────────────────────────────────────────────────────

describe("paginate", () => {
  let db;
  const ITEMS_SQL = "SELECT * FROM paginate_items ORDER BY id ASC";
  const COUNT_SQL = "SELECT COUNT(*) AS total FROM paginate_items";

  beforeEach(() => {
    db = createTestDb();
    db.exec(`
      CREATE TABLE paginate_items (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT
      );
    `);
    const insert = db.prepare("INSERT INTO paginate_items (title) VALUES (?)");
    for (let i = 1; i <= 5; i += 1) insert.run(`Item ${i}`);
  });

  test("returns a flat array when page/limit are absent", () => {
    const result = paginate(db, ITEMS_SQL, COUNT_SQL, []);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 5);
  });

  test("returns the envelope shape when page/limit are given", () => {
    const result = paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    assert.equal(result.total, 5);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 2);
    assert.equal(result.totalPages, 3);
  });

  test("clamps a limit above 100 down to 100", () => {
    const result = paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: 1, limit: 500 });
    assert.equal(result.limit, 100);
  });

  test("clamps a negative limit up to 1", () => {
    // Note: limit: 0 is falsy, so `Number(limit) || 20` treats it as "not
    // given" and defaults to 20 — matching evidence.model.js's original
    // behavior. A genuinely out-of-range value like -5 exercises the clamp.
    const result = paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: 1, limit: -5 });
    assert.equal(result.limit, 1);
  });

  test("page: 0 throws with the INVALID_NUMERIC_PARAM code", () => {
    assert.throws(
      () => paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: 0, limit: 2 }),
      (err) => {
        assert.equal(err.code, ERRORS.INVALID_NUMERIC_PARAM.code);
        assert.equal(err.field, "page");
        return true;
      },
    );
  });

  test("page: -1 throws with the INVALID_NUMERIC_PARAM code", () => {
    assert.throws(
      () => paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: -1, limit: 2 }),
      (err) => {
        assert.equal(err.code, ERRORS.INVALID_NUMERIC_PARAM.code);
        return true;
      },
    );
  });

  test("a non-numeric page throws with the INVALID_NUMERIC_PARAM code", () => {
    assert.throws(
      () => paginate(db, ITEMS_SQL, COUNT_SQL, [], { page: "abc", limit: 2 }),
      (err) => {
        assert.equal(err.code, ERRORS.INVALID_NUMERIC_PARAM.code);
        return true;
      },
    );
  });
});
