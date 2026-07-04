// Test database helper — creates an in-memory SQLite database with the full
// schema and migrations applied. Every test suite that needs a database gets a
// fresh copy via createTestDb(), ensuring test isolation (JS-2: no shared state).
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
 * Create an in-memory SQLite database with the full production schema and all
 * migrations applied. Returns the database instance ready for use.
 *
 * @returns {import('better-sqlite3').Database}
 */
function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  // Apply the base schema.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  // Apply migrations in sorted order, skipping 001 which duplicates schema.sql.
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && !name.startsWith("001_"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
  }

  return db;
}

module.exports = { createTestDb };
