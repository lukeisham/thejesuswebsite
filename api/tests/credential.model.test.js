// Credential model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests every CRUD function in the credential model against
// a fresh database (JS-2: no shared mutable state).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory database setup ────────────────────────────────────────────────
// Use the shared helper to create a fully-migrated in-memory database, then
// mock the config module so the model uses it.
const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const credentialModel = require("../models/credential.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearTable() {
  testDb.exec("DELETE FROM credentials");
}

function seedCredential(handle, overrides = {}) {
  const id = "cred-" + Math.random().toString(36).slice(2, 10);
  return credentialModel.create({
    credential_id: overrides.credential_id || id,
    public_key:
      overrides.public_key ||
      "-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----",
    user_handle: handle || "testuser",
    sign_count: overrides.sign_count ?? 0,
  });
}

// ── create() ────────────────────────────────────────────────────────────────

describe("model: create()", () => {
  beforeEach(clearTable);

  test("inserts a credential and returns the created row", () => {
    const cred = credentialModel.create({
      credential_id: "cred-abc",
      public_key: "-----BEGIN PUBLIC KEY-----\nKEY\n-----END PUBLIC KEY-----",
      user_handle: "admin",
      sign_count: 0,
    });

    assert.ok(cred);
    assert.ok(typeof cred.id === "number");
    assert.equal(cred.credential_id, "cred-abc");
    assert.equal(cred.user_handle, "admin");
    assert.equal(cred.sign_count, 0);
    assert.ok(cred.public_key);
  });

  test("the inserted credential is retrievable by getByCredentialId", () => {
    credentialModel.create({
      credential_id: "cred-def",
      public_key: "-----BEGIN PUBLIC KEY-----\nK2\n-----END PUBLIC KEY-----",
      user_handle: "admin",
      sign_count: 0,
    });

    const fetched = credentialModel.getByCredentialId("cred-def");
    assert.ok(fetched);
    assert.equal(fetched.user_handle, "admin");
  });

  test("fails with UNIQUE constraint on duplicate credential_id", () => {
    credentialModel.create({
      credential_id: "cred-dup",
      public_key: "-----BEGIN PUBLIC KEY-----\nK1\n-----END PUBLIC KEY-----",
      user_handle: "a",
      sign_count: 0,
    });

    assert.throws(() =>
      credentialModel.create({
        credential_id: "cred-dup",
        public_key: "-----BEGIN PUBLIC KEY-----\nK2\n-----END PUBLIC KEY-----",
        user_handle: "b",
        sign_count: 0,
      }),
    );
  });
});

// ── getByCredentialId() ─────────────────────────────────────────────────────

describe("model: getByCredentialId()", () => {
  beforeEach(clearTable);

  test("returns undefined for an unknown credential id", () => {
    assert.equal(credentialModel.getByCredentialId("nonexistent"), undefined);
  });

  test("returns the full credential row including public_key", () => {
    seedCredential("admin", { credential_id: "cred-xyz" });
    const cred = credentialModel.getByCredentialId("cred-xyz");
    assert.ok(cred);
    assert.ok(cred.public_key, "must include public_key for signature verification");
    assert.equal(cred.user_handle, "admin");
  });
});

// ── getByUserHandle() ───────────────────────────────────────────────────────

describe("model: getByUserHandle()", () => {
  beforeEach(clearTable);

  test("returns an empty array for an unknown handle", () => {
    assert.deepStrictEqual(credentialModel.getByUserHandle("nobody"), []);
  });

  test("returns all credentials for the given handle", () => {
    seedCredential("alice");
    seedCredential("alice");
    seedCredential("bob");

    const result = credentialModel.getByUserHandle("alice");
    assert.equal(result.length, 2);
    result.forEach((c) => assert.equal(c.user_handle, "alice"));
  });

  test("includes public_key in the results", () => {
    seedCredential("testuser");
    const result = credentialModel.getByUserHandle("testuser");
    assert.equal(result.length, 1);
    assert.ok(result[0].public_key);
  });
});

// ── getAllByUserHandle() ────────────────────────────────────────────────────

describe("model: getAllByUserHandle()", () => {
  beforeEach(clearTable);

  test("never includes public_key in the result", () => {
    seedCredential("testuser");
    const result = credentialModel.getAllByUserHandle("testuser");
    assert.equal(result.length, 1);
    assert.ok(!("public_key" in result[0]), "public_key must not be present");
  });

  test("returns expected metadata fields only", () => {
    seedCredential("testuser");
    const result = credentialModel.getAllByUserHandle("testuser");
    assert.equal(result.length, 1);
    const keys = Object.keys(result[0]).sort();
    assert.deepStrictEqual(keys, [
      "credential_id",
      "id",
      "last_used_at",
      "sign_count",
      "user_handle",
    ]);
  });
});

// ── countAll() ──────────────────────────────────────────────────────────────

describe("model: countAll()", () => {
  beforeEach(clearTable);

  test("returns 0 on an empty database", () => {
    assert.equal(credentialModel.countAll(), 0);
  });

  test("returns N after N inserts", () => {
    assert.equal(credentialModel.countAll(), 0);
    seedCredential("alice");
    assert.equal(credentialModel.countAll(), 1);
    seedCredential("bob");
    assert.equal(credentialModel.countAll(), 2);
  });

  test("counts across all user handles", () => {
    seedCredential("alice");
    seedCredential("bob");
    seedCredential("charlie");
    assert.equal(credentialModel.countAll(), 3);
  });
});

// ── countByUserHandle() ─────────────────────────────────────────────────────

describe("model: countByUserHandle()", () => {
  beforeEach(clearTable);

  test("returns 0 for a handle with no credentials", () => {
    assert.equal(credentialModel.countByUserHandle("nobody"), 0);
  });

  test("counts only the given handle", () => {
    seedCredential("alice");
    seedCredential("alice");
    seedCredential("bob");
    assert.equal(credentialModel.countByUserHandle("alice"), 2);
    assert.equal(credentialModel.countByUserHandle("bob"), 1);
  });
});

// ── getById() ───────────────────────────────────────────────────────────────

describe("model: getById()", () => {
  beforeEach(clearTable);

  test("returns undefined for an unknown id", () => {
    assert.equal(credentialModel.getById(9999), undefined);
  });

  test("returns the credential for a known id", () => {
    const created = seedCredential("admin");
    const fetched = credentialModel.getById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.credential_id, created.credential_id);
    assert.equal(fetched.user_handle, "admin");
  });
});

// ── updateSignCount() ───────────────────────────────────────────────────────

describe("model: updateSignCount()", () => {
  beforeEach(clearTable);

  test("updates the sign count", () => {
    const cred = seedCredential("testuser", { sign_count: 0 });
    credentialModel.updateSignCount(cred.credential_id, 5);
    const updated = credentialModel.getById(cred.id);
    assert.equal(updated.sign_count, 5);
  });

  test("sets last_used_at on update", () => {
    const cred = seedCredential("testuser", { sign_count: 0 });
    assert.equal(credentialModel.getById(cred.id).last_used_at, null);

    credentialModel.updateSignCount(cred.credential_id, 1);
    const updated = credentialModel.getById(cred.id);
    assert.ok(updated.last_used_at, "last_used_at should be set");
  });

  test("returns true when the credential exists", () => {
    const cred = seedCredential("testuser");
    assert.equal(credentialModel.updateSignCount(cred.credential_id, 5), true);
  });

  test("returns false when the credential does not exist", () => {
    assert.equal(credentialModel.updateSignCount("nonexistent", 5), false);
  });
});

// ── remove() ────────────────────────────────────────────────────────────────

describe("model: remove()", () => {
  beforeEach(clearTable);

  test("returns true and deletes the credential", () => {
    const cred = seedCredential("testuser");
    assert.equal(credentialModel.countAll(), 1);

    const result = credentialModel.remove(cred.credential_id);
    assert.equal(result, true);
    assert.equal(credentialModel.countAll(), 0);
    assert.equal(credentialModel.getByCredentialId(cred.credential_id), undefined);
  });

  test("returns false when the credential does not exist", () => {
    assert.equal(credentialModel.remove("nonexistent"), false);
  });
});
