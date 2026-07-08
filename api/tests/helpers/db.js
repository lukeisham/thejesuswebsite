// Test database helper — creates an in-memory SQLite database with the current
// production schema. schema.sql is the authoritative source (most migrations
// are folded in), but migrations 002–004 add columns not yet present in
// schema.sql, so they're applied after. Migration 005 is skipped because its
// columns (hero_image, hero_image_alt) are already in schema.sql.
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
 * schema.sql) and 005 (hero_image already in schema.sql).
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
  // Skip 001 (duplicate of schema.sql) and 005 (hero_image already in schema.sql).
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (name) =>
        name.endsWith(".sql") &&
        !name.startsWith("001_") &&
        !name.startsWith("005_"),
    )
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
  }

  return db;
}

module.exports = { createTestDb };
