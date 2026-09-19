// Test database helper: creates an in-memory SQLite database from
// schema.sql. schema.sql is the full current schema, so no migrations are
// applied. deploy.sh treats a fresh database the same way. Migrations only
// upgrade an older database, and they run for real on the server at deploy.
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

/**
 * Create an in-memory SQLite database from schema.sql.
 *
 * @returns {import('better-sqlite3').Database}
 */
function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  return db;
}

module.exports = { createTestDb };
