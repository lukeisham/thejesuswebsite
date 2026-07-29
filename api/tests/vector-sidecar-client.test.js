// Unit tests for api/lib/vector-sidecar-client.js — uses node:test's built-in
// mock support to stub globalThis.fetch, so no real sidecar process is needed.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH = require.resolve("../lib/vector-sidecar-client");

function freshClient() {
  delete require.cache[MODULE_PATH];
  return require("../lib/vector-sidecar-client");
}

const SAMPLE_RESPONSE = {
  family: "register",
  store: "register",
  k: 5,
  results: [{ id: "reg-pos-001", type: "positive", similarity: 0.7 }],
  verdict: { label: "strong_fire", nearest_neighbour_type: "positive", similarity: 0.7 },
};

describe("vector-sidecar-client", () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    client = freshClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("resolves with the sidecar's parsed JSON on success", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RESPONSE,
    });

    const result = await client.queryFamily("register", "some text", 5);
    assert.deepEqual(result, SAMPLE_RESPONSE);
  });

  test("throws VECTOR_SIDECAR_UNREACHABLE when fetch rejects (connection refused)", async () => {
    globalThis.fetch = async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:8901");
    };

    await assert.rejects(
      () => client.queryFamily("register", "some other text", 5),
      (err) => {
        assert.ok(err instanceof client.VectorSidecarError);
        assert.equal(err.errorCode, "VECTOR_SIDECAR_UNREACHABLE");
        return true;
      },
    );
  });

  test("throws VECTOR_SIDECAR_TIMEOUT when the AbortController actually aborts", async () => {
    globalThis.fetch = (url, options) =>
      new Promise((resolve, reject) => {
        // Simulate a slow server — outlives the client's ~2s timeout.
        const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => SAMPLE_RESPONSE }), 5000);
        options.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });

    await assert.rejects(
      () => client.queryFamily("register", "slow-request text", 5),
      (err) => {
        assert.ok(err instanceof client.VectorSidecarError);
        assert.equal(err.errorCode, "VECTOR_SIDECAR_TIMEOUT");
        return true;
      },
    );
  });

  test("throws VECTOR_SIDECAR_MALFORMED_RESPONSE on a non-2xx status", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await assert.rejects(
      () => client.queryFamily("register", "bad-status text", 5),
      (err) => {
        assert.ok(err instanceof client.VectorSidecarError);
        assert.equal(err.errorCode, "VECTOR_SIDECAR_MALFORMED_RESPONSE");
        return true;
      },
    );
  });

  test("throws VECTOR_SIDECAR_MALFORMED_RESPONSE when the shape is wrong", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ nonsense: true }),
    });

    await assert.rejects(
      () => client.queryFamily("register", "malformed-shape text", 5),
      (err) => {
        assert.ok(err instanceof client.VectorSidecarError);
        assert.equal(err.errorCode, "VECTOR_SIDECAR_MALFORMED_RESPONSE");
        return true;
      },
    );
  });

  test("caches a repeat (family, text, k) call without invoking fetch again", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_RESPONSE };
    };

    const first = await client.queryFamily("register", "cache-me text", 5);
    const second = await client.queryFamily("register", "cache-me text", 5);

    assert.deepEqual(first, SAMPLE_RESPONSE);
    assert.deepEqual(second, SAMPLE_RESPONSE);
    assert.equal(callCount, 1);
  });
});
