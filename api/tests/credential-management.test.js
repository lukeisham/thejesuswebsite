// Credential management tests — uses node:test + node:assert with an in-memory
// SQLite database. Mocking the config module via Module._cache lets us test the
// real model and route handlers without touching the production database.

const { test, describe, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const path = require("path");
const Module = require("module");
const Database = require("better-sqlite3");
const express = require("express");

// ── In-memory database setup (runs before any module imports) ──────────────
const testDb = new Database(":memory:");
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

// Replace the real database with our in-memory copy before anything else loads.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// Now it's safe to require modules that depend on ../config.
const credentialModel = require("../models/credential.model");
const auth = require("../middleware/auth");

// ── Helpers ────────────────────────────────────────────────────────────────
let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    const passkeyRouter = require("../routes/passkey");
    const app = express();
    app.use(express.json());
    app.use("/passkey", passkeyRouter);

    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => server.close(resolve));
}

function req(method, urlPath, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { "content-type": "application/json" },
    };
    if (cookie) options.headers.cookie = cookie;

    const r = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

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

// ── Model: getAllByUserHandle() ────────────────────────────────────────────

describe("model: getAllByUserHandle()", () => {
  beforeEach(clearTable);

  test("returns an empty array when no credentials exist", () => {
    const result = credentialModel.getAllByUserHandle("nobody");
    assert.deepStrictEqual(result, []);
  });

  test("returns credentials for the correct user only", () => {
    seedCredential("alice");
    seedCredential("alice");
    seedCredential("bob");

    const result = credentialModel.getAllByUserHandle("alice");
    assert.equal(result.length, 2);
    result.forEach((c) => assert.equal(c.user_handle, "alice"));
  });

  test("never includes public_key in the result", () => {
    seedCredential("testuser");
    const result = credentialModel.getAllByUserHandle("testuser");
    assert.equal(result.length, 1);
    assert.ok(!("public_key" in result[0]), "public_key must not be present");
  });

  test("returns expected fields only", () => {
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

// ── Model: countByUserHandle() ─────────────────────────────────────────────

describe("model: countByUserHandle()", () => {
  beforeEach(clearTable);

  test("returns 0 for a handle with no credentials", () => {
    assert.equal(credentialModel.countByUserHandle("nobody"), 0);
  });

  test("returns N after inserting N credentials", () => {
    assert.equal(credentialModel.countByUserHandle("testuser"), 0);
    seedCredential("testuser");
    assert.equal(credentialModel.countByUserHandle("testuser"), 1);
    seedCredential("testuser");
    assert.equal(credentialModel.countByUserHandle("testuser"), 2);
  });

  test("counts only the given handle", () => {
    seedCredential("alice");
    seedCredential("alice");
    seedCredential("bob");
    assert.equal(credentialModel.countByUserHandle("alice"), 2);
    assert.equal(credentialModel.countByUserHandle("bob"), 1);
  });
});

// ── Model: updateSignCount() ───────────────────────────────────────────────

describe("model: updateSignCount()", () => {
  beforeEach(clearTable);

  test("sets last_used_at when updating sign count", () => {
    const cred = seedCredential("testuser", { sign_count: 0 });
    const before = credentialModel.getById(cred.id);
    assert.equal(before.last_used_at, null);

    credentialModel.updateSignCount(cred.credential_id, 1);

    const after = credentialModel.getById(cred.id);
    assert.equal(after.sign_count, 1);
    assert.ok(after.last_used_at, "last_used_at should be set after update");
    assert.ok(
      after.last_used_at.includes("T") || after.last_used_at.includes(" "),
      "should look like a timestamp",
    );
  });

  test("returns true when the credential exists", () => {
    const cred = seedCredential("testuser");
    assert.equal(credentialModel.updateSignCount(cred.credential_id, 5), true);
  });

  test("returns false when the credential does not exist", () => {
    assert.equal(credentialModel.updateSignCount("nonexistent", 5), false);
  });
});

// ── Route: GET /passkey/credentials ────────────────────────────────────────

describe("route: GET /passkey/credentials", () => {
  before(async () => {
    await startServer();
  });

  after(() => stopServer());

  beforeEach(clearTable);

  test("returns 401 when unauthenticated", async () => {
    const res = await req("GET", "/passkey/credentials");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "E-INPUT-012");
  });

  test("returns an array for an authenticated user", async () => {
    const token = auth.createSession("authtest");
    const cookie = `sid=${token}`;

    seedCredential("authtest");
    seedCredential("authtest");

    const res = await req("GET", "/passkey/credentials", { cookie });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body), "response body should be an array");
    assert.equal(res.body.length, 2);
  });

  test("returns an empty array when the user has no credentials", async () => {
    const token = auth.createSession("emptytest");
    const cookie = `sid=${token}`;

    const res = await req("GET", "/passkey/credentials", { cookie });
    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body, []);
  });
});

// ── Route: DELETE /passkey/credentials/:id ─────────────────────────────────

describe("route: DELETE /passkey/credentials/:id", () => {
  before(async () => {
    await startServer();
  });

  after(() => stopServer());

  beforeEach(clearTable);

  test("returns 401 when unauthenticated", async () => {
    const res = await req("DELETE", "/passkey/credentials/1");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "E-INPUT-012");
  });

  test("returns 404 when the credential id does not exist", async () => {
    const token = auth.createSession("deletetest");
    const cookie = `sid=${token}`;

    const res = await req("DELETE", "/passkey/credentials/9999", { cookie });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Credential not found.");
  });

  test("returns 400 for an invalid id (non-numeric)", async () => {
    const token = auth.createSession("deletetest");
    const cookie = `sid=${token}`;

    const res = await req("DELETE", "/passkey/credentials/abc", { cookie });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Invalid credential id.");
  });

  test("deletes a credential when the user has more than one", async () => {
    const token = auth.createSession("multitest");
    const cookie = `sid=${token}`;

    const c1 = seedCredential("multitest");
    const c2 = seedCredential("multitest");
    assert.equal(credentialModel.countByUserHandle("multitest"), 2);

    const res = await req("DELETE", `/passkey/credentials/${c1.id}`, {
      cookie,
    });
    assert.equal(res.status, 204);
    assert.equal(credentialModel.countByUserHandle("multitest"), 1);
    assert.ok(credentialModel.getById(c2.id));
  });

  test("returns 400 when trying to delete the last credential", async () => {
    const token = auth.createSession("lasttest");
    const cookie = `sid=${token}`;

    const c = seedCredential("lasttest");
    assert.equal(credentialModel.countByUserHandle("lasttest"), 1);

    const res = await req("DELETE", `/passkey/credentials/${c.id}`, { cookie });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Cannot delete the last credential.");
    assert.ok(credentialModel.getById(c.id));
  });

  test("blocks deleting another handle's last credential", async () => {
    // Seed admin with several credentials, editor with just one.
    const adminToken = auth.createSession("admin");
    const adminCookie = `sid=${adminToken}`;
    seedCredential("admin");
    seedCredential("admin");
    seedCredential("admin");
    const editorCred = seedCredential("editor");

    // Authenticated as admin, try to delete editor's sole credential.
    // The lockout guard must count editor's credentials, not the session's.
    const res = await req("DELETE", `/passkey/credentials/${editorCred.id}`, {
      cookie: adminCookie,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Cannot delete the last credential.");
    assert.ok(
      credentialModel.getById(editorCred.id),
      "editor's credential must still exist",
    );
  });
});

// ── last_used_at on login ──────────────────────────────────────────────────

describe("last_used_at on login", () => {
  beforeEach(clearTable);

  test("updateSignCount sets last_used_at", () => {
    const cred = seedCredential("logintest", { sign_count: 0 });
    assert.equal(credentialModel.getById(cred.id).last_used_at, null);

    credentialModel.updateSignCount(cred.credential_id, 1);

    const updated = credentialModel.getById(cred.id);
    assert.ok(updated.last_used_at, "last_used_at should be set");
    assert.equal(updated.sign_count, 1);
  });
});

// ── Route: POST /passkey/credentials/add/options ──────────────────────────────

describe("route: POST /passkey/credentials/add/options", () => {
  before(async () => {
    await startServer();
  });

  after(() => stopServer());

  beforeEach(clearTable);

  test("returns 401 when unauthenticated", async () => {
    const res = await req("POST", "/passkey/credentials/add/options");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "E-INPUT-012");
  });

  test("returns a challenge for an authenticated user", async () => {
    const token = auth.createSession("addtest");
    const cookie = `sid=${token}`;

    const res = await req("POST", "/passkey/credentials/add/options", {
      cookie,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.challenge, "should include a challenge");
    assert.ok(res.body.attemptId, "should include an attemptId");
    assert.equal(res.body.rp.name, "The Jesus Website");
    // The user.id should encode the session's handle.
    assert.ok(res.body.user.id, "should include a user id");
  });
});

// ── Route: POST /passkey/credentials/add/verify ───────────────────────────────

describe("route: POST /passkey/credentials/add/verify", () => {
  before(async () => {
    await startServer();
  });

  after(() => stopServer());

  beforeEach(clearTable);

  test("returns 401 when unauthenticated", async () => {
    const res = await req("POST", "/passkey/credentials/add/verify", {
      body: {},
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "E-INPUT-012");
  });

  test("returns 400 when required fields are missing", async () => {
    const token = auth.createSession("addverify");
    const cookie = `sid=${token}`;

    const res = await req("POST", "/passkey/credentials/add/verify", {
      cookie,
      body: { id: "some-id" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("required"));
  });

  test("returns 409 when credential already registered", async () => {
    const token = auth.createSession("dupcred");
    const cookie = `sid=${token}`;

    // Seed an existing credential.
    const existingId = "existing-credential-id";
    credentialModel.create({
      credential_id: existingId,
      public_key: "-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----",
      user_handle: "dupcred",
      sign_count: 0,
    });

    // Create a challenge.
    const passkey = require("../routes/passkey");
    const { attemptId, challenge } = passkey._issueChallenge("dupcred");

    // Build a valid clientDataJSON.
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.create",
        challenge,
        origin: "http://localhost",
      }),
      "utf8",
    ).toString("base64url");

    const res = await req("POST", "/passkey/credentials/add/verify", {
      cookie,
      body: {
        attemptId,
        id: existingId,
        clientDataJSON,
        publicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nANOTHER\n-----END PUBLIC KEY-----",
      },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "Credential already registered.");
  });

  test("successful round trip creates a credential", async () => {
    const token = auth.createSession("roundtrip");
    const cookie = `sid=${token}`;

    const passkey = require("../routes/passkey");

    // 1 — Get options.
    const optionsRes = await req("POST", "/passkey/credentials/add/options", {
      cookie,
    });
    assert.equal(optionsRes.status, 200);
    const { attemptId, challenge } = optionsRes.body;

    // 2 — Verify with a new credential id.
    const newCredId = "new-cred-" + Math.random().toString(36).slice(2, 10);
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.create",
        challenge,
        origin: "http://localhost",
      }),
      "utf8",
    ).toString("base64url");

    const verifyRes = await req("POST", "/passkey/credentials/add/verify", {
      cookie,
      body: {
        attemptId,
        id: newCredId,
        clientDataJSON,
        publicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nROUNDTRIP\n-----END PUBLIC KEY-----",
      },
    });
    assert.equal(verifyRes.status, 201, "should return 201 Created");
    assert.equal(verifyRes.body.registered, true);

    // 3 — The credential should now exist in the DB.
    const stored = credentialModel.getByCredentialId(newCredId);
    assert.ok(stored, "credential should be stored");
    assert.equal(stored.user_handle, "roundtrip");
  });
});
