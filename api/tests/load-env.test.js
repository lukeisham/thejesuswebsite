// Load-env unit tests — covers the .env parser against a temporary file so no
// real .env side-effects leak into other suites. Uses node:test + node:assert.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

// We test the loader in isolation by temporarily writing a .env file and
// pointing the module at it. The loader exports a function; we shadow
// require.cache so each test gets a fresh module with the updated path.
const LOAD_ENV_PATH = path.resolve(__dirname, "..", "config", "load-env.js");

let tmpDir;
let envFile;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "load-env-test-"));
  envFile = path.join(tmpDir, ".env");
  // Point the loader at our temp file by overriding __dirname resolution.
  // We do this by rewriting the module's ENV_PATH before requiring.
  delete require.cache[LOAD_ENV_PATH];
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete require.cache[LOAD_ENV_PATH];
});

// Shim: inject a custom ENV_PATH into a fresh require of the loader.
// The loader uses __dirname + relative path; we override that by temporarily
// monkey-patching the module's internal resolve so it finds our temp file.
// A simpler approach: write the file, then use Module._resolveFilename to
// intercept, or just test parseLine directly for isolation.
// We test end-to-end by writing a .env into the project root's neighbour
// pattern — but to avoid touching the real .env, we patch process.env around
// the call.

/**
 * Write a temp .env, then call loadEnv with ENV_PATH pointed at it.
 * Returns the count of keys loaded and the state of process.env after.
 */
function loadTempEnv(fileContents, preExisting = {}) {
  fs.writeFileSync(envFile, fileContents, "utf8");

  // The loader resolves ENV_PATH from __dirname. Since we can't easily change
  // __dirname, we test the parsing logic via the internal parseLine by
  // importing the module and calling its exported function — but we need to
  // redirect it. We do this by temporarily swapping __dirname via a small
  // wrapper: we re-require the module with a patched path module.
  // Actually, the cleanest way: we directly test the full loadEnv by
  // temporarily setting process.env keys and using a mock filesystem...
  //
  // Simplest robust approach: copy load-env.js, patch ENV_PATH, require.
  const src = fs.readFileSync(LOAD_ENV_PATH, "utf8");
  const patched = src.replace(
    /const ENV_PATH = .+/,
    `const ENV_PATH = ${JSON.stringify(envFile)};`,
  );
  const patchedPath = path.join(tmpDir, "load-env.js");
  fs.writeFileSync(patchedPath, patched, "utf8");

  // Save and set any pre-existing keys, then clear them after.
  const saved = {};
  for (const key of Object.keys(preExisting)) {
    if (key in process.env) {
      saved[key] = process.env[key];
    } else {
      saved[key] = undefined;
    }
    process.env[key] = preExisting[key];
  }

  const loadEnv = require(patchedPath);
  const count = loadEnv();

  // Read back the loaded values.
  const result = { count };
  const lines = fileContents.split("\n");
  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1 || line.trim().startsWith("#") || !line.trim()) continue;
    const key = line.slice(0, eqIdx).trim();
    result[key] = process.env[key];
  }

  // Restore process.env.
  for (const key of Object.keys(saved)) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }

  // Clean up keys set by this test.
  for (const key of Object.keys(result)) {
    if (key !== "count") delete process.env[key];
  }

  delete require.cache[patchedPath];

  return result;
}

describe("load-env — basic parsing", () => {
  test("sets a missing key", () => {
    const result = loadTempEnv("HELLO=world");
    assert.equal(result.count, 1);
    assert.equal(result.HELLO, "world");
  });

  test("sets multiple keys", () => {
    const result = loadTempEnv("A=1\nB=2\nC=3");
    assert.equal(result.count, 3);
    assert.equal(result.A, "1");
    assert.equal(result.B, "2");
    assert.equal(result.C, "3");
  });

  test("does NOT override an already-set key (JS-2)", () => {
    const result = loadTempEnv("ALREADY_SET=new-value", {
      ALREADY_SET: "pre-existing",
    });
    assert.equal(result.count, 0);
    assert.equal(result.ALREADY_SET, "pre-existing");
  });

  test("sets keys alongside pre-existing ones without overriding", () => {
    const result = loadTempEnv("A=1\nB=2", { A: "pre" });
    assert.equal(result.count, 1);
    assert.equal(result.B, "2");
  });

  test("ignores comment lines", () => {
    const result = loadTempEnv("# this is a comment\nACTUAL=value\n# another");
    assert.equal(result.count, 1);
    assert.equal(result.ACTUAL, "value");
  });

  test("ignores blank lines", () => {
    const result = loadTempEnv("\n\nKEY=val\n\n\n");
    assert.equal(result.count, 1);
    assert.equal(result.KEY, "val");
  });

  test("strips surrounding double quotes", () => {
    const result = loadTempEnv('QUOTED="hello world"');
    assert.equal(result.count, 1);
    assert.equal(result.QUOTED, "hello world");
  });

  test("strips surrounding single quotes", () => {
    const result = loadTempEnv("QUOTED='hello world'");
    assert.equal(result.count, 1);
    assert.equal(result.QUOTED, "hello world");
  });

  test("handles values containing = signs", () => {
    const result = loadTempEnv("TOKEN=abc=def=ghi");
    assert.equal(result.count, 1);
    assert.equal(result.TOKEN, "abc=def=ghi");
  });

  test("handles empty value", () => {
    const result = loadTempEnv("EMPTY=");
    assert.equal(result.count, 1);
    assert.equal(result.EMPTY, "");
  });
});

describe("load-env — tolerates missing .env file", () => {
  test("returns 0 and does not throw when .env is missing", () => {
    // Use a non-existent path.
    const src = fs.readFileSync(LOAD_ENV_PATH, "utf8");
    const patched = src.replace(
      /const ENV_PATH = .+/,
      `const ENV_PATH = ${JSON.stringify(path.join(tmpDir, "nonexistent", ".env"))};`,
    );
    const patchedPath = path.join(tmpDir, "load-env-missing.js");
    fs.writeFileSync(patchedPath, patched, "utf8");

    const loadEnv = require(patchedPath);
    assert.doesNotThrow(() => {
      const count = loadEnv();
      assert.equal(count, 0);
    });

    delete require.cache[patchedPath];
  });
});
