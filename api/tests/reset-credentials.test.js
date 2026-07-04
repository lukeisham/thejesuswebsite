// Reset-credentials script tests — verifies the --confirm guard and the
// deletion effect against an in-memory SQLite database. Uses node:test +
// node:assert.

const { test, describe, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Database = require("better-sqlite3");
const Module = require("module");

// ── In-memory database setup ──────────────────────────────────────────────────
let testDb;

before(() => {
  testDb = new Database(":memory:");
  testDb.pragma("foreign_keys = ON");
  testDb.exec(`
    CREATE TABLE credentials (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id  TEXT UNIQUE NOT NULL,
      public_key     TEXT NOT NULL,
      user_handle    TEXT NOT NULL,
      sign_count     INTEGER DEFAULT 0,
      last_used_at   TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_credentials_user_handle ON credentials(user_handle);
  `);

  // Replace the real database with our in-memory copy.
  const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
  Module._cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: testDb,
  };
});

after(() => {
  const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
  delete Module._cache[configPath];
});

function clearTable() {
  testDb.exec("DELETE FROM credentials");
}

function seedCredentials(count = 3) {
  const insert = testDb.prepare(`
    INSERT INTO credentials (credential_id, public_key, user_handle, sign_count)
    VALUES (?, ?, ?, ?)
  `);
  for (let i = 0; i < count; i++) {
    insert.run(
      `cred-${i}-${Math.random().toString(36).slice(2, 8)}`,
      "-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----",
      "admin",
      0,
    );
  }
}

function countRows() {
  return testDb.prepare("SELECT COUNT(*) AS count FROM credentials").get()
    .count;
}

// Run the reset script in a child process so we can test the --confirm flag.
// We reuse the same in-memory DB via the module cache trick, but the child
// process would get its own process. For the guard test we test it in-process;
// for the deletion effect we test in-process too.

function runResetInProcess(confirm = false) {
  // Clear the script's require cache so it re-reads config (our in-memory DB).
  const scriptPath = require.resolve(
    path.resolve(__dirname, "..", "scripts", "reset-credentials"),
  );
  delete require.cache[scriptPath];

  // Temporarily override process.argv.
  const originalArgv = process.argv;
  process.argv = confirm
    ? ["node", "reset-credentials.js", "--confirm"]
    : ["node", "reset-credentials.js"];
  // Save original exit to prevent the script from killing the test process.
  const originalExit = process.exit;

  let exitCode = null;
  let stdout = "";
  let stderr = "";

  process.exit = (code) => {
    exitCode = code;
    // Throw instead of exiting so the script stops executing after the guard.
    throw new Error("EXIT:" + code);
  };

  // Capture console output.
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  const errors = [];
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));

  try {
    require(scriptPath);
  } catch (_e) {
    // The script calls process.exit which we stubbed, so require may throw
    // after our fake exit. That's fine.
  }

  // Restore.
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
  process.argv = originalArgv;
  delete require.cache[scriptPath];

  return { exitCode, logs, errors };
}

describe("reset-credentials — guard", () => {
  beforeEach(() => {
    clearTable();
    seedCredentials(3);
  });

  test("refuses to run without --confirm", () => {
    const result = runResetInProcess(false);
    assert.equal(result.exitCode, 1);
    // Rows should still be there.
    assert.equal(countRows(), 3);
    const combined = [...result.logs, ...result.errors].join(" ");
    assert.ok(
      combined.includes("Refusing to run") || combined.includes("--confirm"),
      "should include a message about the --confirm flag",
    );
  });

  test("seeded rows survive without --confirm", () => {
    const before = countRows();
    assert.equal(before, 3);

    runResetInProcess(false);

    const after = countRows();
    assert.equal(after, 3, "no rows should have been deleted");
  });
});

describe("reset-credentials — deletion", () => {
  beforeEach(() => {
    clearTable();
    seedCredentials(5);
  });

  test("removes all credentials with --confirm", () => {
    const before = countRows();
    assert.equal(before, 5);

    const result = runResetInProcess(true);
    assert.equal(result.exitCode, null);

    const after = countRows();
    assert.equal(after, 0, "all rows should be deleted");
    const combined = [...result.logs, ...result.errors].join(" ");
    assert.ok(
      combined.includes("Removed 5 credential"),
      "should report the count",
    );
  });

  test("is a no-op on an already-empty table with --confirm", () => {
    clearTable();
    assert.equal(countRows(), 0);

    const result = runResetInProcess(true);
    const combined = [...result.logs, ...result.errors].join(" ");
    assert.ok(combined.includes("No credentials"), "should report empty table");
  });
});
