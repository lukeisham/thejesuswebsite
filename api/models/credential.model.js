// Credential data access — all SQL for the `credentials` table lives here.
// Stores WebAuthn / passkey public-key credentials used for admin sign-in.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { pickWritable } = require("./model-helpers");

// A credential is written once at registration; only `sign_count` changes after.
const WRITABLE_COLUMNS = [
  "credential_id",
  "public_key",
  "user_handle",
  "sign_count",
];

/** Single credential by its WebAuthn credential id, or undefined if unknown. */
function getByCredentialId(credentialId) {
  return db
    .prepare("SELECT * FROM credentials WHERE credential_id = ?")
    .get(credentialId);
}

/** All credentials enrolled to a given user handle (a user may register several). */
function getByUserHandle(userHandle) {
  return db
    .prepare("SELECT * FROM credentials WHERE user_handle = ?")
    .all(userHandle);
}

/**
 * Most-recently-used credentials for a user handle, capped at 64.
 * WebAuthn browsers reject allowCredentials > 64 entries, so this
 * function is the safe variant for login/assertion ceremonies.
 */
function getByUserHandleForLogin(userHandle) {
  return db
    .prepare(
      "SELECT * FROM credentials WHERE user_handle = ? ORDER BY last_used_at DESC LIMIT 64",
    )
    .all(userHandle);
}

/**
 * All credentials for a user handle — metadata only (never includes public_key).
 * Used by the admin credential-management UI.
 */
function getAllByUserHandle(userHandle) {
  return db
    .prepare(
      "SELECT id, credential_id, user_handle, sign_count, last_used_at FROM credentials WHERE user_handle = ?",
    )
    .all(userHandle);
}

/** Total number of credentials across all users. Used by the setup-token guard
 *  to determine if any credential has ever been enrolled (restart-proof). */
function countAll() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM credentials").get();
  return row.count;
}

/** Number of credentials enrolled to a given user handle. */
function countByUserHandle(userHandle) {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM credentials WHERE user_handle = ?")
    .get(userHandle);
  return row.count;
}

/** Single credential by primary key — used right after insert. */
function getById(id) {
  return db.prepare("SELECT * FROM credentials WHERE id = ?").get(id);
}

/** Insert a freshly-registered credential. Returns the created row. */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO credentials (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Persist the authenticator's signature counter after a successful assertion.
 * The caller checks that the new value advanced before calling this — a counter
 * that fails to move can indicate a cloned authenticator (JS-2: don't trust input).
 */
function updateSignCount(credentialId, signCount) {
  const result = db
    .prepare(
      "UPDATE credentials SET sign_count = ?, last_used_at = datetime('now') WHERE credential_id = ?",
    )
    .run(signCount, credentialId);
  return result.changes > 0;
}

/** Delete a credential by its WebAuthn id. Returns true if a row was removed. */
function remove(credentialId) {
  const result = db
    .prepare("DELETE FROM credentials WHERE credential_id = ?")
    .run(credentialId);
  return result.changes > 0;
}

module.exports = {
  getByCredentialId,
  getByUserHandle,
  getByUserHandleForLogin,
  getAllByUserHandle,
  countAll,
  countByUserHandle,
  getById,
  create,
  updateSignCount,
  remove,
};
