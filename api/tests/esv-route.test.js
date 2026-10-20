// ESV route tests — verifies passage validation, ESV_API_KEY handling, caching,
// and error propagation. Uses node:test + node:assert/strict with stubbed fetch.

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { closeTestServer } = require('./helpers/test-server');

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const originalFetch = globalThis.fetch;
const originalEnv = process.env.ESV_API_KEY;

/**
 * Make an HTTP request to a test Express app and return the parsed response.
 * Returns a promise that resolves with { status, body }.
 */
function makeRequest(app, method, path, { body } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          closeTestServer(server).then(() => {
            try {
              resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
            } catch (_e) {
              resolve({ status: res.statusCode, body: data || null });
            }
          });
        });
      });
      req.on('error', (e) => {
        closeTestServer(server).then(() => reject(e));
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /esv/passage', () => {
  let app;

  beforeEach(() => {
    // The route's cache Map lives at module scope; a fresh require resets it.
    delete require.cache[require.resolve('../routes/esv')];

    app = express();
    app.use(express.json());
    app.use('/esv', require('../routes/esv'));

    process.env.ESV_API_KEY = 'test-api-key-12345';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.ESV_API_KEY;
    else process.env.ESV_API_KEY = originalEnv;
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  test('GET /passage with valid ref and ok fetch returns 200 with reference and text', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        canonical: 'Luke 1:1–3',
        passages: ['In the beginning was the Word...'],
      }),
    };
    globalThis.fetch = async () => mockResponse;

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1-3');
    assert.equal(res.status, 200);
    assert.ok(res.body.reference);
    assert.ok(res.body.text);
    assert.match(res.body.text, /In the beginning/);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  test('GET /passage with q over 60 chars returns 400', async () => {
    const longRef = 'A'.repeat(61);
    const res = await makeRequest(app, 'GET', `/esv/passage?q=${longRef}`);
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('GET /passage with invalid characters in q returns 400', async () => {
    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke!1@1');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'E-INPUT-011');
  });

  test('GET /passage with missing q returns 400', async () => {
    const res = await makeRequest(app, 'GET', '/esv/passage');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('GET /passage with empty q returns 400', async () => {
    const res = await makeRequest(app, 'GET', '/esv/passage?q=');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('GET /passage with whitespace-only q returns 400', async () => {
    const res = await makeRequest(app, 'GET', '/esv/passage?q=+++');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  // ── ESV_API_KEY configuration ─────────────────────────────────────────────

  test('GET /passage with missing ESV_API_KEY returns 503', async () => {
    delete process.env.ESV_API_KEY;

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1');
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'E-PERSIST-008');
  });

  // ── Upstream error handling ───────────────────────────────────────────────

  test('GET /passage with non-ok upstream response propagates error code', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
    };
    globalThis.fetch = async () => mockResponse;

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1');
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'E-PERSIST-014');
  });

  test('GET /passage with network error (fetch throws TypeError) returns error', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Network error');
    };

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1');
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'E-PERSIST-013');
  });

  test('GET /passage with JSON parse error returns error', async () => {
    const mockResponse = {
      ok: true,
      json: async () => {
        throw new SyntaxError('Invalid JSON');
      },
    };
    globalThis.fetch = async () => mockResponse;

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1');
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'E-TRANSFORM-007');
  });

  test('GET /passage with empty passages array returns 404', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        canonical: 'Luke 1:1',
        passages: [],
      }),
    };
    globalThis.fetch = async () => mockResponse;

    const res = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'E-PERSIST-004');
  });

  // ── Caching ───────────────────────────────────────────────────────────────

  test('GET /passage caches result and returns cached value on second request', async () => {
    let fetchCallCount = 0;
    const mockResponse = {
      ok: true,
      json: async () => ({
        canonical: 'Luke 1:1–3',
        passages: ['Cached passage text...'],
      }),
    };
    globalThis.fetch = async () => {
      fetchCallCount++;
      return mockResponse;
    };

    const res1 = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1-3');
    assert.equal(res1.status, 200);
    assert.equal(fetchCallCount, 1);

    const res2 = await makeRequest(app, 'GET', '/esv/passage?q=Luke+1:1-3');
    assert.equal(res2.status, 200);
    assert.equal(fetchCallCount, 1, 'fetch should not be called again on cache hit');
    assert.deepEqual(res2.body, res1.body);
  });

  test('GET /passage cache miss for a different reference still calls fetch', async () => {
    let fetchCallCount = 0;
    globalThis.fetch = async () => {
      fetchCallCount++;
      return {
        ok: true,
        json: async () => ({
          canonical: 'John 3:16',
          passages: ['For God so loved the world...'],
        }),
      };
    };

    const res1 = await makeRequest(app, 'GET', '/esv/passage?q=John+3:16');
    assert.equal(res1.status, 200);
    assert.equal(fetchCallCount, 1);

    const res2 = await makeRequest(app, 'GET', '/esv/passage?q=John+3:17');
    assert.equal(res2.status, 200);
    assert.equal(fetchCallCount, 2, 'fetch should be called again for a different reference');
  });
});
