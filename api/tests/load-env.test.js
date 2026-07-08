// Environment-loading assertion tests — uses node:test + node:assert.
// Tests that loadEnv() throws in production when RP_ID or ORIGIN is missing,
// and that non-production boots do not throw. (JS-2: fail loudly at startup.)

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load the env module with a custom .env file content by mocking
 * fs.readFileSync. Returns the loadEnv function wrapped so the mock
 * stays in place during the call.
 */
function createLoaderWithEnv(envContent) {
  // Clear the module cache so we get a fresh load.
  delete require.cache[require.resolve("../config/load-env")];

  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = function (filePath, encoding) {
    // Intercept only the .env file read (the module uses ENV_PATH which
    // resolves to the project-root .env).
    const envPath = path.resolve(__dirname, "..", "..", "..", ".env");
    if (filePath === envPath || String(filePath).endsWith(".env")) {
      return envContent;
    }
    return originalReadFileSync.call(fs, filePath, encoding);
  };

  const loadEnv = require("../config/load-env");

  return {
    /** Call loadEnv — the mock is still active. */
    call: () => loadEnv(),
    /** Restore the real fs.readFileSync and clear the cache. */
    restore: () => {
      fs.readFileSync = originalReadFileSync;
      delete require.cache[require.resolve("../config/load-env")];
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("loadEnv production assertions", () => {
  let originalNodeEnv;
  let hadRpId;
  let originalRpId;
  let hadOrigin;
  let originalOrigin;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    hadRpId = "RP_ID" in process.env;
    originalRpId = process.env.RP_ID;
    hadOrigin = "ORIGIN" in process.env;
    originalOrigin = process.env.ORIGIN;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (hadRpId) {
      process.env.RP_ID = originalRpId;
    } else {
      delete process.env.RP_ID;
    }
    if (hadOrigin) {
      process.env.ORIGIN = originalOrigin;
    } else {
      delete process.env.ORIGIN;
    }
  });

  test("throws when NODE_ENV=production and RP_ID is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RP_ID;
    process.env.ORIGIN = "https://test.example.com";

    const loader = createLoaderWithEnv("");
    try {
      assert.throws(
        () => loader.call(),
        (err) =>
          err instanceof Error && err.message.includes("RP_ID is required"),
        "should throw about missing RP_ID",
      );
    } finally {
      loader.restore();
    }
  });

  test("throws when NODE_ENV=production and ORIGIN is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.RP_ID = "test.example.com";
    delete process.env.ORIGIN;

    const loader = createLoaderWithEnv("");
    try {
      assert.throws(
        () => loader.call(),
        (err) =>
          err instanceof Error && err.message.includes("ORIGIN is required"),
        "should throw about missing ORIGIN",
      );
    } finally {
      loader.restore();
    }
  });

  test("does NOT throw in production when both RP_ID and ORIGIN are set", () => {
    process.env.NODE_ENV = "production";
    process.env.RP_ID = "test.example.com";
    process.env.ORIGIN = "https://test.example.com";

    const loader = createLoaderWithEnv("");
    try {
      assert.doesNotThrow(() => loader.call());
    } finally {
      loader.restore();
    }
  });

  test("does NOT throw when NODE_ENV is not production (even with missing keys)", () => {
    delete process.env.NODE_ENV;
    delete process.env.RP_ID;
    delete process.env.ORIGIN;

    const loader = createLoaderWithEnv("");
    try {
      assert.doesNotThrow(() => loader.call());
    } finally {
      loader.restore();
    }
  });

  test("does NOT throw when NODE_ENV=development with missing keys", () => {
    process.env.NODE_ENV = "development";
    delete process.env.RP_ID;
    delete process.env.ORIGIN;

    const loader = createLoaderWithEnv("");
    try {
      assert.doesNotThrow(() => loader.call());
    } finally {
      loader.restore();
    }
  });
});
