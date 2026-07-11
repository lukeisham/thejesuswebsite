// Admin HTTP tests — uses node:test + node:assert.
// Verifies the AdminHttp.request and AdminHttp.postJson wrappers
// via a mock global fetch injected into a sandboxed VM context.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load admin-http.js in a sandboxed context ────────────────────────────────
// We provide a fake fetch so we can observe what AdminHttp passes through and
// how it handles network errors.

const httpPath = path.resolve(__dirname, "..", "assets", "js", "admin-http.js");
const httpSource = fs.readFileSync(httpPath, "utf8");

/** Create a fresh sandbox with a custom fetch mock. */
function makeSandbox(mockFetch) {
  const sandbox = {
    window: {},
    fetch: mockFetch,
    Object,
    Error,
    TypeError,
  };
  vm.runInNewContext(httpSource, sandbox);
  return sandbox.window.AdminHttp;
}

// ── Success passthrough ──────────────────────────────────────────────────────

describe("AdminHttp.request — success passthrough", () => {
  test("returns the Response object on success", async () => {
    const expected = new Response("hello", { status: 200 });
    let fetchCalled = false;

    const AdminHttp = makeSandbox(async function fetch(url, options) {
      fetchCalled = true;
      assert.equal(url, "/api/test");
      return expected;
    });

    const res = await AdminHttp.request("/api/test");
    assert.ok(fetchCalled, "fetch must be called");
    assert.equal(res, expected, "must return the exact Response from fetch");
  });

  test("preserves non-ok responses (e.g. 500) — callers handle status", async () => {
    const serverError = new Response("Internal Server Error", { status: 500 });

    const AdminHttp = makeSandbox(async () => serverError);

    const res = await AdminHttp.request("/api/broken");
    assert.equal(res.status, 500);
    assert.equal(await res.text(), "Internal Server Error");
  });

  test("passes options through to fetch unchanged", async () => {
    const opts = { method: "DELETE", headers: { "X-Foo": "bar" } };
    let receivedOpts;

    const AdminHttp = makeSandbox(async (url, options) => {
      receivedOpts = options;
      return new Response(null, { status: 204 });
    });

    await AdminHttp.request("/api/item/1", opts);
    assert.deepStrictEqual(receivedOpts, opts);
  });
});

// ── Network error ────────────────────────────────────────────────────────────

describe("AdminHttp.request — network error", () => {
  test("throws a typed error with the correct message", async () => {
    const AdminHttp = makeSandbox(async () => {
      throw new TypeError("Failed to fetch");
    });

    await assert.rejects(() => AdminHttp.request("/api/offline"), {
      name: "Error",
      message:
        "Could not reach the server. Check your connection and try again.",
    });
  });
});

// ── postJson convenience ─────────────────────────────────────────────────────

describe("AdminHttp.postJson", () => {
  test("sets Content-Type header and stringifies the JSON body", async () => {
    let capturedOptions;

    const AdminHttp = makeSandbox(async (url, options) => {
      capturedOptions = options;
      return new Response('{"ok":true}', { status: 200 });
    });

    const body = { key: "value", num: 42 };
    const res = await AdminHttp.postJson("/api/echo", body);

    // Verify the request shape.
    assert.equal(res.status, 200);
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.headers["Content-Type"], "application/json");
    assert.equal(capturedOptions.body, '{"key":"value","num":42}');
  });

  test("merges extraHeaders on top of Content-Type", async () => {
    let capturedOptions;

    const AdminHttp = makeSandbox(async (url, options) => {
      capturedOptions = options;
      return new Response(null, { status: 200 });
    });

    await AdminHttp.postJson(
      "/api/auth",
      { handle: "admin" },
      { "x-setup-token": "abc123" },
    );

    assert.equal(capturedOptions.headers["Content-Type"], "application/json");
    assert.equal(capturedOptions.headers["x-setup-token"], "abc123");
  });

  test("network error in postJson bubbles up through AdminHttp.request", async () => {
    const AdminHttp = makeSandbox(async () => {
      throw new TypeError("Failed to fetch");
    });

    await assert.rejects(() => AdminHttp.postJson("/api/down", {}), {
      name: "Error",
      message:
        "Could not reach the server. Check your connection and try again.",
    });
  });
});

// ── 401 redirect ──────────────────────────────────────────────────────────────

describe("AdminHttp.request — 401 redirect", () => {
  test("redirects to login on 401 from a non-login path", async () => {
    const sandbox = {
      window: {
        location: {
          pathname: "/admin/evidence/index.html",
          href: "",
        },
      },
      fetch: async () => new Response("Unauthorized", { status: 401 }),
      Object,
      Error,
      TypeError,
    };
    vm.runInNewContext(httpSource, sandbox);
    const AdminHttp = sandbox.window.AdminHttp;

    // The redirect sets window.location.href; the returned value is a pending
    // never-resolving promise.
    const result = await AdminHttp.request("/api/protected");
    assert.equal(sandbox.window.location.href, "../auth/login.html");
    assert.equal(result.status, 401);
  });

  test("does NOT redirect on 401 when already on login page", async () => {
    const sandbox = {
      window: {
        location: {
          pathname: "/admin/auth/login.html",
          href: "https://thejesuswebsite.org/admin/auth/login.html",
        },
      },
      fetch: async () => new Response("Unauthorized", { status: 401 }),
      Object,
      Error,
      TypeError,
    };
    vm.runInNewContext(httpSource, sandbox);
    const AdminHttp = sandbox.window.AdminHttp;

    const res = await AdminHttp.request("/api/protected");
    // Should NOT redirect — should return the 401 response as-is.
    assert.equal(res.status, 401);
    assert.equal(
      sandbox.window.location.href,
      "https://thejesuswebsite.org/admin/auth/login.html",
    );
  });
});
