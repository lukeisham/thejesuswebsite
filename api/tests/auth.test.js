// Auth middleware tests — uses node:test + node:assert.
// Tests the session store (create, get, destroy, eviction), the requireAuth
// guard, the readToken cookie parser, and securityHeaders middleware.
// Guide: setup/ARCHITECTURE/security.md (sessions and cookie rows).
// The sessions Map is private to middleware/auth.js, so no test here can make an
// entry that is already expired. No database needed — all state is in-memory.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const requireAuth = require("../middleware/auth");
const { createSession, getSession, destroySession, readToken, _evictExpired } = requireAuth;
const securityHeaders = require("../middleware/security-headers");

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockReq({ cookie, headers, method } = {}) {
  const req = {};
  req.headers = headers || {};
  if (cookie !== undefined) req.headers.cookie = cookie;
  req.method = method || "GET";
  return req;
}

function mockRes() {
  const res = {};
  res._status = null;
  res._body = null;
  res._headers = {};
  res.status = function (code) {
    res._status = code;
    return res;
  };
  res.json = function (body) {
    res._body = body;
    return res;
  };
  res.setHeader = function (name, value) {
    res._headers[name.toLowerCase()] = value;
  };
  return res;
}

function mockNext() {
  let called = false;
  const fn = () => {
    called = true;
  };
  fn.called = false;
  // We mutate to track whether next was called.
  const wrapper = () => {
    called = true;
  };
  wrapper.called = () => called;
  return wrapper;
}

// ── Session store ───────────────────────────────────────────────────────────

describe("session: createSession", () => {
  test("returns a non-empty hex token", () => {
    const token = createSession("testuser");
    assert.ok(typeof token === "string");
    assert.ok(token.length > 0);
    assert.ok(/^[0-9a-f]+$/.test(token));
  });

  test("stores the session so getSession can retrieve it", () => {
    const token = createSession("alice");
    const session = getSession(token);
    assert.ok(session);
    assert.equal(session.userHandle, "alice");
  });

  test("different users get different sessions", () => {
    const t1 = createSession("alice");
    const t2 = createSession("bob");
    assert.notEqual(t1, t2);
    assert.equal(getSession(t1).userHandle, "alice");
    assert.equal(getSession(t2).userHandle, "bob");
  });
});

describe("session: getSession", () => {
  test("returns null for an unknown token", () => {
    assert.equal(getSession("nonexistent"), null);
  });

  test("returns null for an empty string", () => {
    assert.equal(getSession(""), null);
  });

  test("returns session data for a valid token", () => {
    const token = createSession("testuser");
    const session = getSession(token);
    assert.ok(session);
    assert.equal(session.userHandle, "testuser");
    assert.ok(typeof session.createdAt === "number");
    assert.ok(typeof session.expiresAt === "number");
    assert.ok(session.expiresAt > session.createdAt);
  });

  test("returns a fresh session before it expires", () => {
    const token = createSession("testuser");
    assert.ok(getSession(token));
  });
});

describe("session: destroySession", () => {
  test("returns true when the session existed", () => {
    const token = createSession("testuser");
    assert.equal(destroySession(token), true);
    assert.equal(getSession(token), null);
  });

  test("returns false when no session existed", () => {
    assert.equal(destroySession("nonexistent"), false);
  });
});

describe("session: _evictExpired", () => {
  test("keeps live sessions", () => {
    const liveToken = createSession("liveuser");
    _evictExpired();
    assert.ok(getSession(liveToken));
    destroySession(liveToken);
  });
});

// ── Cookie parsing ──────────────────────────────────────────────────────────

describe("readToken", () => {
  test("returns null when there is no cookie header", () => {
    assert.equal(readToken(mockReq()), null);
  });

  test("returns null when the cookie header is empty", () => {
    assert.equal(readToken(mockReq({ cookie: "" })), null);
  });

  test("returns null when the sid cookie is absent", () => {
    assert.equal(readToken(mockReq({ cookie: "foo=bar; baz=qux" })), null);
  });

  test("extracts the sid token from a cookie header", () => {
    const req = mockReq({ cookie: "sid=abc123; other=value" });
    assert.equal(readToken(req), "abc123");
  });

  test("decodes URI-encoded token values", () => {
    const req = mockReq({ cookie: "sid=hello%20world" });
    assert.equal(readToken(req), "hello world");
  });

  test("returns null, and does not throw, for a malformed percent sequence", () => {
    assert.equal(readToken(mockReq({ cookie: "sid=%" })), null);
    assert.equal(readToken(mockReq({ cookie: "sid=%E0%A4%A" })), null);
  });
});

// ── requireAuth guard ───────────────────────────────────────────────────────

describe("requireAuth middleware", () => {
  test("returns 401 and sets Cache-Control: no-store when no session cookie is present", () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, "E-INPUT-012");
    assert.equal(next.called(), false);
    assert.equal(res._headers["cache-control"], "no-store");
  });

  test("returns 401 and sets Cache-Control: no-store for an invalid token", () => {
    const req = mockReq({ cookie: "sid=badtoken" });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, "E-INPUT-013");
    assert.equal(res._headers["cache-control"], "no-store");
  });

  test("returns 401 and sets Cache-Control: no-store for a malformed sid cookie", () => {
    const req = mockReq({ cookie: "sid=%" });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, "E-INPUT-012");
    assert.equal(next.called(), false);
    assert.equal(res._headers["cache-control"], "no-store");
  });

  test("passes next(), sets req.user, and sets Cache-Control: no-store for a valid session", () => {
    const token = createSession("admin");
    const req = mockReq({ cookie: `sid=${token}` });
    const res = mockRes();

    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res._status, null);
    assert.deepStrictEqual(req.user, { handle: "admin" });
    assert.equal(res._headers["cache-control"], "no-store");
  });
});

// ── securityHeaders middleware ──────────────────────────────────────────────

describe("securityHeaders middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  test("sets Cache-Control: public, max-age=60 for GET requests", () => {
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    let nextCalled = false;
    securityHeaders(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res._headers["x-content-type-options"], "nosniff");
    assert.equal(res._headers["x-frame-options"], "DENY");
    assert.equal(res._headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.equal(res._headers["cache-control"], "public, max-age=60");
    assert.ok(
      res._headers["content-security-policy"].includes("default-src 'self'"),
    );
  });

  test("sets Cache-Control: public, max-age=60 for HEAD requests", () => {
    const req = mockReq({ method: "HEAD" });
    const res = mockRes();
    securityHeaders(req, res, () => {});
    assert.equal(res._headers["cache-control"], "public, max-age=60");
  });

  test("sets Cache-Control: no-store for POST requests", () => {
    const req = mockReq({ method: "POST" });
    const res = mockRes();
    securityHeaders(req, res, () => {});
    assert.equal(res._headers["cache-control"], "no-store");
  });

  test("sets Content-Security-Policy header with default-src 'self'", () => {
    const res = mockRes();
    securityHeaders(mockReq(), res, () => {});
    const csp = res._headers["content-security-policy"];
    assert.ok(csp);
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
  });

  test("does not set HSTS when NODE_ENV is not production", () => {
    process.env.NODE_ENV = "development";
    const res = mockRes();
    securityHeaders(mockReq(), res, () => {});
    assert.equal(res._headers["strict-transport-security"], undefined);
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("sets HSTS when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    const res = mockRes();
    securityHeaders(mockReq(), res, () => {});
    assert.ok(res._headers["strict-transport-security"]);
    assert.ok(
      res._headers["strict-transport-security"].includes("max-age=63072000"),
    );
    process.env.NODE_ENV = originalNodeEnv;
  });
});
