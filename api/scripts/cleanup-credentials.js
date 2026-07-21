// One-shot script: purge excess credentials so allowCredentials stays under 64.
// Also runs any pending migrations (adds last_used_at column if missing).
//
//   node api/scripts/cleanup-credentials.js         # delete excess
//   DRY_RUN=1 node api/scripts/cleanup-credentials.js  # preview only
//
// Safe to run repeatedly — only deletes credentials beyond the 64 most-recent.

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, "..", "..", "database", "thejesuswebsite.db");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const dryRun = process.env.DRY_RUN === "1";
const KEEP = 64;

// ── Ensure last_used_at column exists ──────────────────────────────────────

const cols = db
  .prepare("PRAGMA table_info(credentials)")
  .all()
  .map((c) => c.name);

if (!cols.includes("last_used_at")) {
  console.log("Adding missing last_used_at column to credentials table...");
  db.exec("ALTER TABLE credentials ADD COLUMN last_used_at TEXT;");
  console.log("Column added.");
}

// Also ensure the index exists.
const indexes = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'credentials' AND name = 'idx_credentials_user_handle'")
  .all();
if (indexes.length === 0) {
  console.log("Adding missing user_handle index...");
  db.exec("CREATE INDEX IF NOT EXISTS idx_credentials_user_handle ON credentials(user_handle);");
  console.log("Index added.");
}

// ── Find handles with excess credentials ───────────────────────────────────

// Use COALESCE to sort NULLs last (credentials that were never used).
const orderCol = "COALESCE(last_used_at, updated_at, created_at, '')";

const handles = db
  .prepare(
    `SELECT user_handle, COUNT(*) AS cnt
     FROM credentials
     GROUP BY user_handle
     HAVING cnt > ?`,
  )
  .all(KEEP);

if (handles.length === 0) {
  console.log("No handles exceed %d credentials. Nothing to clean up.", KEEP);
  db.close();
  process.exit(0);
}

for (const { user_handle, cnt } of handles) {
  const excess = cnt - KEEP;
  console.log(
    '\nHandle "%s" has %d credentials (%d over the %d limit).',
    user_handle,
    cnt,
    excess,
    KEEP,
  );

  // Find the ids that fall outside the top KEEP most-recently-used.
  // Credentials that have never been used sort last.
  const toDelete = db
    .prepare(
      `SELECT id, credential_id, ${orderCol} AS sort_date
       FROM credentials
       WHERE user_handle = ?
       ORDER BY sort_date DESC
       LIMIT -1 OFFSET ?`,
    )
    .all(user_handle, KEEP);

  for (const row of toDelete) {
    const label = row.sort_date || "never used";
    console.log(
      "  %s credential %d (%s) — last activity: %s",
      dryRun ? "[DRY RUN]" : "Deleting",
      row.id,
      row.credential_id.slice(0, 24) + "\u2026",
      label,
    );

    if (!dryRun) {
      db.prepare("DELETE FROM credentials WHERE id = ?").run(row.id);
    }
  }

  if (dryRun) {
    console.log(
      '  → %d credential(s) would be deleted for "%s". Run without DRY_RUN to apply.',
      toDelete.length,
      user_handle,
    );
  } else {
    console.log(
      '  → Deleted %d credential(s) for "%s".',
      toDelete.length,
      user_handle,
    );
  }
}

if (!dryRun) {
  const remaining = db
    .prepare(
      "SELECT user_handle, COUNT(*) AS cnt FROM credentials GROUP BY user_handle",
    )
    .all();
  console.log("\nRemaining credentials after cleanup:");
  for (const r of remaining) {
    console.log('  "%s": %d', r.user_handle, r.cnt);
  }
}

db.close();
