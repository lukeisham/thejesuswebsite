// Setup-token guard tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests the requireSetupToken middleware and the countAll()
// model function to verify registration is properly locked down.

const {
  test,
  describe,
  before,
  beforeEach,
  after,
  afterEach,
} = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const path = require("path");
const Module = require("module");
const Database = require("better-sqlite3");
const express = require("express");

// ── In-memory database setup ────────────────────────────────────────────────
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

// Replace the real database with our in-memory copy.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const credentialModel = require("../models/credential.model");

// ── Helpers ─────────────────────────────────────────────────────────────────
let server;
let baseUrl;
const SETUP_TOKEN = "test-setup-token-abc123";

function startServer() {
  return new Promise((resolve) => {
    // Clear module cache so the passkey router picks up fresh env + rate-limit state.
    delete require.cache[require.resolve("../routes/passkey")];
    delete require.cache[require.resolve("../middleware/rate-limit")];

    const passkeyRouter = require("../routes/passkey");
    const app = express();
    app.set("trust proxy", 1);
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

function req(method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "content-type": "application/json", ...headers },
    };

    const r = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks).toString();
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf ? JSON.parse(buf) : null,
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: buf });
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

function seedCredential() {
  return credentialModel.create({
    credential_id: "cred-" + Math.random().toString(36).slice(2, 10),
    public_key: "-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----",
    user_handle: "admin",
    sign_count: 0,
  });
}

// ── Model: countAll() ───────────────────────────────────────────────────────

describe("model: countAll()", () => {
  beforeEach(clearTable);

  test("returns 0 on an empty database", () => {
    assert.equal(credentialModel.countAll(), 0);
  });

  test("returns N after N inserts", () => {
    assert.equal(credentialModel.countAll(), 0);
    seedCredential();
    assert.equal(credentialModel.countAll(), 1);
    seedCredential();
    assert.equal(credentialModel.countAll(), 2);
  });

  test("counts across all user handles", () => {
    credentialModel.create({
      credential_id: "cred-alice",
      public_key: "-----BEGIN PUBLIC KEY-----\nA\n-----END PUBLIC KEY-----",
      user_handle: "alice",
      sign_count: 0,
    });
    credentialModel.create({
      credential_id: "cred-bob",
      public_key: "-----BEGIN PUBLIC KEY-----\nB\n-----END PUBLIC KEY-----",
      user_handle: "bob",
      sign_count: 0,
    });
    assert.equal(credentialModel.countAll(), 2);
  });
});

// ── Middleware: requireSetupToken ────────────────────────────────────────────

describe("middleware: requireSetupToken", () => {
  before(async () => {
    clearTable();
    process.env.SETUP_TOKEN = SETUP_TOKEN;
    await startServer();
  });

  after(() => {
    delete process.env.SETUP_TOKEN;
    stopServer();
  });

  beforeEach(clearTable);

  test("returns 404 when SETUP_TOKEN env is absent", async () => {
    process.env.SETUP_TOKEN = "";

    const res = await req("POST", "/passkey/register/options", {
      body: { handle: "admin" },
      headers: { "x-setup-token": SETUP_TOKEN },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");

    process.env.SETUP_TOKEN = SETUP_TOKEN;
  });

  test("returns 404 when a credential already exists (countAll() > 0)", async () => {
    seedCredential();

    const res = await req("POST", "/passkey/register/options", {
      body: { handle: "admin" },
      headers: { "x-setup-token": SETUP_TOKEN },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");
  });

  test("returns 404 with the wrong token in header", async () => {
    const res = await req("POST", "/passkey/register/options", {
      body: { handle: "admin" },
      headers: { "x-setup-token": "wrong-token" },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");
  });

  test("returns 404 with the wrong token in query param", async () => {
    const res = await req(
      "POST",
      `/passkey/register/options?setupToken=wrong-token`,
      { body: { handle: "admin" } },
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");
  });

  test("returns 404 with no token at all", async () => {
    const res = await req("POST", "/passkey/register/options", {
      body: { handle: "admin" },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");
  });

  test("passes through with the correct token via header and empty DB", async () => {
    const res = await req("POST", "/passkey/register/options", {
      body: { handle: "admin" },
      headers: { "x-setup-token": SETUP_TOKEN },
    });
    // Should pass the guard and return 200 with a challenge (not a 404).
    assert.equal(res.status, 200);
    assert.ok(res.body.challenge, "should include a challenge");
    assert.equal(res.body.rp.name, "The Jesus Website");
  });

  test("passes through with the correct token via query param and empty DB", async () => {
    const res = await req(
      "POST",
      `/passkey/register/options?setupToken=${SETUP_TOKEN}`,
      { body: { handle: "admin" } },
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.challenge, "should include a challenge");
  });

  test("also guards the /register/verify endpoint", async () => {
    process.env.SETUP_TOKEN = "";

    const res = await req("POST", "/passkey/register/verify", {
      body: {},
      headers: { "x-setup-token": SETUP_TOKEN },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found.");

    process.env.SETUP_TOKEN = SETUP_TOKEN;
  });
});
