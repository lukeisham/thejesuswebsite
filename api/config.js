// Database connection — shared across all models.
// better-sqlite3 is synchronous; every query runs in-process against the single
// SQLite file on the VPS. Foreign keys must be enabled per connection.

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH =
    process.env.DB_PATH || path.join(__dirname, '..', 'database', 'thejesuswebsite.db');

const db = new Database(DB_PATH);

// Enforce foreign keys (off by default in SQLite) and use WAL for faster
// concurrent reads while the admin writes.
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
