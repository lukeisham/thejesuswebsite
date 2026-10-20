// api tests — smoke tests for the shared frontend fetch wrapper (TEST-2).
// Uses node:test + node:assert with a hand-built fake fetch (TEST-8). The module
// is a browser ES module, so it is loaded with dynamic import().
// request() is private and no exported helper passes custom headers, so the
// header merge is covered through its observable default: Content-Type is sent.

const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../assets/js/api.js");
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("module loads and exports getEvidence", async () => {
  const { getEvidence } = await load();
  assert.equal(typeof getEvidence, "function");
});

test("sends the JSON Content-Type header and returns parsed data", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ items: [1] }) };
  };
  const { getEvidence } = await load();

  const result = await getEvidence();

  assert.equal(calls[0].url, "/api/evidence");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(result, { data: { items: [1] }, error: null });
});

test("returns the API error string for a non-ok response", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: "boom" }),
  });
  const { getEvidence } = await load();

  const result = await getEvidence();

  assert.deepEqual(result, { data: null, error: "boom" });
});
