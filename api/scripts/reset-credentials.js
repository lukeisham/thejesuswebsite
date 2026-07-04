#!/usr/bin/env node
// reset-credentials.js — delete all rows from the `credentials` table so the
// real admin can enrol a fresh passkey on a production deploy. WebAuthn
// credentials are re-enrollable (not recoverable secrets), so deletion is safe.
//
// JS-2: never destructive by default — refuses to run without an explicit
// --confirm flag so this script can never be triggered by accident.
//
// Usage:
//   node scripts/reset-credentials.js --confirm
//
// First-time setup: after deploying, run this before visiting /admin/ and
// enrolling your first real passkey. Back up the database file first per the
// deployment guide.

const db = require("../config");

const args = process.argv.slice(2);
const confirmed = args.includes("--confirm");

if (!confirmed) {
  console.error(
    "[reset-credentials] Refusing to run without --confirm flag.\n" +
      "  This script deletes ALL passkey credentials from the database.\n" +
      "  Run with:  node scripts/reset-credentials.js --confirm",
  );
  process.exit(1);
}

const before = db.prepare("SELECT COUNT(*) AS count FROM credentials").get()
  .count;

if (before === 0) {
  console.log("[reset-credentials] No credentials to remove — table is empty.");
  process.exit(0);
}

const result = db.prepare("DELETE FROM credentials").run();
const removed = result.changes;

console.log(
  `[reset-credentials] Removed ${removed} credential(s) (${before} existed before).`,
);
console.log(
  "[reset-credentials] Done. You can now enrol a fresh passkey at /admin/.",
);
