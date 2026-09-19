// Test database helper — creates an in-memory SQLite database with the current
// production schema. schema.sql is the authoritative source (most migrations
// are folded in). Migrations already folded into schema.sql are skipped, and
// the rest are applied after it. Migrations 002 (credentials.last_used_at and
// its index) and 003 (two_column/doi/author_bio) are skipped because
// schema.sql now defines them. Migrations 005 and 009 are skipped
// because their columns (hero_image/hero_image_alt, historiography_period/
// period_sort_order) are already in schema.sql. 023 (news_article_thumbnail)
// and 028 (arbor_edges.waypoints) are also skipped — already in schema.sql.
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
 * Applies schema.sql first (canonical source), then the migrations not yet
 * folded into schema.sql. See the skip list below.
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
  // Skip 001 (duplicate of schema.sql), 002 and 003 (credentials.last_used_at,
  // idx_credentials_user_handle, and two_column/doi/author_bio are in
  // schema.sql), 004 (news_articles_fts and resources_fts
  // now in schema.sql), 005 and 009 (columns already in schema.sql),
  // 010 (arbor_nodes already in schema.sql), 012 (analytics device/geo
  // columns + geoip_blocks already in schema.sql), 013 (site_settings
  // table + seed row already in schema.sql), 023 (news_article_thumbnail
  // already in schema.sql), 028 (arbor_edges.waypoints already in schema.sql),
  // 035 (evidence.image_caption / challenges.challenge_picture_alt+caption
  // already in schema.sql), 036 (resources.in_holding_pen already in
  // schema.sql), 037 (resources.item_type already in schema.sql), and 040
  // (wikipedia_articles.scored_at already in schema.sql).
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (name) =>
        name.endsWith(".sql") &&
        !name.startsWith("001_") &&
        !name.startsWith("002_") &&
        !name.startsWith("003_") &&
        !name.startsWith("004_") &&
        !name.startsWith("005_") &&
        !name.startsWith("009_") &&
        !name.startsWith("010_") &&
        !name.startsWith("012_") &&
        !name.startsWith("013_") &&
        !name.startsWith("016_") &&
        !name.startsWith("017_") &&
        !name.startsWith("023_") &&
        !name.startsWith("024_") &&
        !name.startsWith("025_") &&
        !name.startsWith("026_") &&
        !name.startsWith("027_") &&
        !name.startsWith("028_") &&
        !name.startsWith("032_") &&
        !name.startsWith("042_") &&
        !name.startsWith("035_") &&
        !name.startsWith("036_") &&
        !name.startsWith("037_") &&
        !name.startsWith("040_") &&
        !name.startsWith("041_"),
    )
    .sort();

  for (const file of migrationFiles) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }

  return db;
}

module.exports = { createTestDb };
