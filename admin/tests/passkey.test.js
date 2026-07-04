// Admin passkey JavaScript tests — uses node:test + node:assert.
// Tests the pure utility functions exported from admin/assets/js/passkey.js
// (base64urlToBuffer, bufferToBase64url, arrayBufferToPem, extractSignCount).
//
// The ceremony-flow functions (registerPasskey, loginWithPasskey) depend on
// browser-only APIs (navigator.credentials, fetch) and are verified via manual
// browser testing against a running API server. The pure helpers are the only
// functions that can be tested deterministically without a full browser mock.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load passkey.js in a sandboxed context ──────────────────────────────────
// readFileSync + vm.runInNewContext avoids polluting the Node global scope
// (no DOM APIs are available) and lets us extract only the pure helpers.

const passkeyPath = path.resolve(__dirname, "..", "assets", "js", "passkey.js");
const passkeySource = fs.readFileSync(passkeyPath, "utf8");

const sandbox = {
  Passkey: {},
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  // Stub browser globals so the script parses without error.
  fetch: () => {
    throw new Error("fetch is not available in test — test pure helpers only.");
  },
  navigator: { credentials: {} },
  crypto: globalThis.crypto,
  AuthenticatorAttestationResponse: class {},
  window: {},
  Uint8Array,
  ArrayBuffer,
  TypeError,
};

vm.runInNewContext(passkeySource, sandbox);

const {
  base64urlToBuffer,
  bufferToBase64url,
  arrayBufferToPem,
  extractSignCount,
} = sandbox.window.Passkey;

// ── base64urlToBuffer + bufferToBase64url round-trip ────────────────────────

describe("base64urlToBuffer / bufferToBase64url", () => {
  test("round-trips arbitrary binary data", () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 255, 254, 253]);
    const encoded = bufferToBase64url(original.buffer);
    const decoded = new Uint8Array(base64urlToBuffer(encoded));
    assert.deepStrictEqual(decoded, original);
  });

  test("round-trips an empty buffer", () => {
    const original = new Uint8Array(0);
    const encoded = bufferToBase64url(original.buffer);
    assert.equal(encoded, "");
    const decoded = new Uint8Array(base64urlToBuffer(encoded));
    assert.deepStrictEqual(decoded, original);
  });

  test("base64urlToBuffer accepts a base64url string without padding", () => {
    // "abc" → "YWJj" in base64
    const buf = base64urlToBuffer("YWJj");
    const result = bufferToBase64url(buf);
    assert.equal(result, "YWJj");
  });

  test("bufferToBase64url produces no +, /, or = characters", () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i;
    const encoded = bufferToBase64url(data.buffer);
    assert.ok(!encoded.includes("+"), "must not contain '+'");
    assert.ok(!encoded.includes("/"), "must not contain '/'");
    assert.ok(!encoded.includes("="), "must not contain '='");
  });

  test("base64urlToBuffer throws on non-string input", () => {
    assert.throws(() => base64urlToBuffer(123), TypeError);
    assert.throws(() => base64urlToBuffer(null), TypeError);
  });
});

// ── arrayBufferToPem ────────────────────────────────────────────────────────

describe("arrayBufferToPem", () => {
  test("produces well-formed PEM with correct header and footer", () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const pem = arrayBufferToPem(data.buffer);
    assert.ok(pem.startsWith("-----BEGIN PUBLIC KEY-----\n"));
    assert.ok(pem.endsWith("\n-----END PUBLIC KEY-----"));
  });

  test("wraps base64 lines at 64 characters", () => {
    // Create 130 bytes — should produce 2 full 64-char lines + 1 partial.
    const data = new Uint8Array(130);
    for (let i = 0; i < 130; i++) data[i] = i & 0xff;
    const pem = arrayBufferToPem(data.buffer);

    // Strip headers to get just the base64 body.
    const body = pem
      .replace("-----BEGIN PUBLIC KEY-----\n", "")
      .replace("\n-----END PUBLIC KEY-----", "");
    const lines = body.split("\n");

    assert.equal(lines.length, 3, "130 bytes → 3 base64 lines");
    // First two lines should be exactly 64 chars.
    assert.equal(lines[0].length, 64);
    assert.equal(lines[1].length, 64);
    // Last line should be the remainder.
    assert.ok(lines[2].length > 0 && lines[2].length <= 64);
  });

  test("accepts a Uint8Array directly (not just ArrayBuffer)", () => {
    const data = new Uint8Array([0xab, 0xcd]);
    const pem = arrayBufferToPem(data);
    assert.ok(pem.startsWith("-----BEGIN PUBLIC KEY-----\n"));
    assert.ok(pem.endsWith("\n-----END PUBLIC KEY-----"));
  });
});

// ── extractSignCount ────────────────────────────────────────────────────────

describe("extractSignCount", () => {
  test("extracts a zero counter from minimum authenticatorData", () => {
    // 37 bytes: 32-byte hash + 1 flag + 4 counter bytes.
    const data = new Uint8Array(37);
    assert.equal(extractSignCount(data.buffer), 0);
  });

  test("extracts the counter from bytes 33-36 (big-endian)", () => {
    const data = new Uint8Array(37);
    // Set counter to 0x01020304 (big-endian).
    data[33] = 0x01;
    data[34] = 0x02;
    data[35] = 0x03;
    data[36] = 0x04;
    assert.equal(extractSignCount(data.buffer), 0x01020304);
  });

  test("handles max counter value (0xFFFFFFFF)", () => {
    const data = new Uint8Array(37);
    data[33] = 0xff;
    data[34] = 0xff;
    data[35] = 0xff;
    data[36] = 0xff;
    assert.equal(extractSignCount(data.buffer), 0xffffffff);
  });

  test("returns unsigned 32-bit value (no negative overflow)", () => {
    const data = new Uint8Array(37);
    data[33] = 0x80;
    data[34] = 0x00;
    data[35] = 0x00;
    data[36] = 0x00;
    const result = extractSignCount(data.buffer);
    assert.ok(result >= 0, "must be unsigned");
    assert.equal(result, 0x80000000);
  });

  test("accepts a Uint8Array directly", () => {
    const data = new Uint8Array(37);
    data[33] = 0x00;
    data[34] = 0x00;
    data[35] = 0x00;
    data[36] = 0x2a;
    assert.equal(extractSignCount(data), 42);
  });
});
