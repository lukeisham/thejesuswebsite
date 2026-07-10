// Test database helper — creates an in-memory SQLite database with the current
// production schema. schema.sql is the authoritative source (most migrations
// are folded in), but migrations 002–004 add columns not yet present in
// schema.sql, so they're applied after. Migrations 005 and 009 are skipped
// because their columns (hero_image/hero_image_alt, historiography_period/
// period_sort_order) are already in schema.sql. Migration 003's
// `historiography` statements are filtered out (not skipped wholesale) because
// schema.sql also already defines two_column/doi/author_bio on that one table,
// while context_essays and responses still rely on migration 003 for them.
// Every test suite gets a fresh copy via createTestDb() (JS-2: no shared state).
//
// Usage:
//   const { createTestDb } = require('./helpers/db');
//   const testDb = createTestDb();

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "schema.sql",
);
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "migrations",
);

/**
 * Create an in-memory SQLite database with the full production schema.
 * Applies schema.sql first (canonical source), then migrations 002–004
 * for columns not yet folded into schema.sql. Skips 001 (duplicate of
 * schema.sql), 005 (hero_image already in schema.sql), and 009
 * (historiography_period/period_sort_order already in schema.sql).
 *
 * @returns {import('better-sqlite3').Database}
 */
function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  // Apply the authoritative schema.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  // Apply migrations not yet folded into schema.sql.
  // Skip 001 (duplicate of schema.sql), 005 and 009 (columns already in schema.sql),
  // 010 (arbor_nodes already in schema.sql), 012 (analytics device/geo
  // columns + geoip_blocks already in schema.sql), and 013 (site_settings
  // table + seed row already in schema.sql).
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (name) =>
        name.endsWith(".sql") &&
        !name.startsWith("001_") &&
        !name.startsWith("005_") &&
        !name.startsWith("009_") &&
        !name.startsWith("010_") &&
        !name.startsWith("012_") &&
        !name.startsWith("013_"),
    )
    .sort();

  for (const file of migrationFiles) {
    let sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    if (file.startsWith("003_")) {
      // historiography already has two_column/doi/author_bio via schema.sql.
      sql = sql
        .split("\n")
        .filter((line) => !line.startsWith("ALTER TABLE historiography"))
        .join("\n");
    }
    db.exec(sql);
  }

  return db;
}

module.exports = { createTestDb };
