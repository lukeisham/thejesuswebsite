// Model helpers unit tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests pickWritable, generateUniqueSlug, and runUpdate
// in isolation from the models that consume them.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/db");
const { pickWritable, generateUniqueSlug, runUpdate } = require("../models/model-helpers");

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
