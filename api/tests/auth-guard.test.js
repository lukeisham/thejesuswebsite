// Auth guard tests — verifies every write route returns 401 without a session
// cookie and passes through with one. Uses node:test + node:assert/strict.
// Tests representative routes by mounting them in a minimal Express app and
// sending HTTP requests via Node's built-in http module (SR-2: no new deps).

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const requireAuth = require('../middleware/auth');
const { createSession } = requireAuth;

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Make an HTTP request to a test Express app and return the parsed response.
 * Returns a promise that resolves with { status, body }.
 *
 * For positive-auth tests we send deliberately-incomplete data so the route
 * handler returns 400 (validation) rather than actually mutating the database.
 * The key assertion is always: status is NOT 401, proving auth passed.
 */
function makeRequest(app, method, path, { cookie, body } = {}) {
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
      if (cookie) options.headers.Cookie = cookie;

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          } catch (_e) {
            resolve({ status: res.statusCode, body: data || null });
          }
        });
      });
      req.on('error', (e) => {
        server.close();
        reject(e);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

/** Return a valid session cookie string for the "admin" user. */
function authCookie() {
  const token = createSession('admin');
  return `sid=${token}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Evidence
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: evidence routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/evidence', require('../routes/evidence'));
  });

  // POST

  test('POST /evidence returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/evidence', {
      body: { title: 'Test', slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /evidence passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/evidence', {
      cookie: authCookie(),
      body: { title: 'Auth Guard Test' }, // deliberately missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });

  // PUT

  test('PUT /evidence/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'PUT', '/evidence/99999', {
      body: { title: 'Updated' },
    });
    assert.equal(res.status, 401);
  });

  test('PUT /evidence/:id passes through with valid session', async () => {
    const res = await makeRequest(app, 'PUT', '/evidence/99999', {
      cookie: authCookie(),
      body: {}, // no writable fields → 200 with unchanged row, or 404
    });
    assert.notEqual(res.status, 401);
  });

  // DELETE

  test('DELETE /evidence/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'DELETE', '/evidence/99999');
    assert.equal(res.status, 401);
  });

  test('DELETE /evidence/:id passes through with valid session', async () => {
    const res = await makeRequest(app, 'DELETE', '/evidence/99999', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Responses
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: responses routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/responses', require('../routes/responses'));
  });

  test('POST /responses returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/responses', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /responses passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/responses', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });

  test('PUT /responses/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'PUT', '/responses/99999', {
      body: { response_title: 'Test' },
    });
    assert.equal(res.status, 401);
  });

  test('DELETE /responses/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'DELETE', '/responses/99999');
    assert.equal(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Essays
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: essays routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/essays', require('../routes/essays'));
  });

  test('POST /essays returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/essays', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /essays passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/essays', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Blog Posts
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: blog-posts routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/blog-posts', require('../routes/blog-posts'));
  });

  test('POST /blog-posts returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/blog-posts', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /blog-posts passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/blog-posts', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Popular Challenges
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: popular-challenges routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/popular-challenges', require('../routes/popular-challenges'));
  });

  test('POST /popular-challenges returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/popular-challenges', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /popular-challenges passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/popular-challenges', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Wikipedia
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: wikipedia routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/wikipedia', require('../routes/wikipedia'));
  });

  test('POST /wikipedia returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/wikipedia', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /wikipedia passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/wikipedia', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sources — entirely admin-only (even GETs require auth)
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: sources routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/sources', require('../routes/sources'));
  });

  test('GET /sources returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/sources');
    assert.equal(res.status, 401);
  });

  test('GET /sources passes through with valid session', async () => {
    const res = await makeRequest(app, 'GET', '/sources', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });

  test('GET /sources/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/sources/99999');
    assert.equal(res.status, 401);
  });

  test('POST /sources returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/sources', {
      body: { mla_book_title: 'Test' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /sources passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/sources', {
      cookie: authCookie(),
      body: {}, // no valid fields → 400
    });
    assert.notEqual(res.status, 401);
  });

  test('PUT /sources/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'PUT', '/sources/99999', {
      body: { mla_book_title: 'Updated' },
    });
    assert.equal(res.status, 401);
  });

  test('DELETE /sources/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'DELETE', '/sources/99999');
    assert.equal(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Drafts — entirely admin-only
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: drafts routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/drafts', require('../routes/drafts'));
  });

  test('GET /drafts returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/drafts');
    assert.equal(res.status, 401);
  });

  test('GET /drafts passes through with valid session', async () => {
    const res = await makeRequest(app, 'GET', '/drafts', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });

  test('GET /drafts/counts returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/drafts/counts');
    assert.equal(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Publish
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: publish routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/publish', require('../routes/publish'));
  });

  test('POST /publish/:type/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/publish/evidence/99999');
    assert.equal(res.status, 401);
  });

  test('POST /publish/:type/:id passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/publish/evidence/99999', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });

  test('DELETE /publish/:type/:id returns 401 without auth', async () => {
    const res = await makeRequest(app, 'DELETE', '/publish/evidence/99999');
    assert.equal(res.status, 401);
  });

  test('DELETE /publish/:type/:id passes through with valid session', async () => {
    const res = await makeRequest(app, 'DELETE', '/publish/evidence/99999', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Analytics — mixed: POST is public, GETs are admin-only
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: analytics routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/analytics', require('../routes/analytics'));
  });

  test('POST /analytics is public (no 401)', async () => {
    const res = await makeRequest(app, 'POST', '/analytics', {
      body: { page: '/test' },
    });
    assert.notEqual(res.status, 401);
  });

  test('GET /analytics/summary returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/analytics/summary');
    assert.equal(res.status, 401);
  });

  test('GET /analytics/summary passes through with valid session', async () => {
    const res = await makeRequest(app, 'GET', '/analytics/summary', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });

  test('GET /analytics/top-pages returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/analytics/top-pages');
    assert.equal(res.status, 401);
  });

  test('GET /analytics/recent returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/analytics/recent');
    assert.equal(res.status, 401);
  });

  test('GET /analytics returns 401 without auth', async () => {
    const res = await makeRequest(app, 'GET', '/analytics');
    assert.equal(res.status, 401);
  });

  test('GET /analytics passes through with valid session', async () => {
    const res = await makeRequest(app, 'GET', '/analytics', {
      cookie: authCookie(),
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Identifiers
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: identifiers routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/identifiers', require('../routes/identifiers'));
  });

  test('POST /identifiers returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/identifiers', {
      body: { isbn: '978-3-16-148410-0' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /identifiers passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/identifiers', {
      cookie: authCookie(),
      body: {}, // no isbn → validation fails
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Maps
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: maps routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/maps', require('../routes/maps'));
  });

  test('POST /maps returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/maps', {
      body: { map_key: 'test', map_name: 'Test Map' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /maps passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/maps', {
      cookie: authCookie(),
      body: {}, // no map_key/map_name → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Arbor
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: arbor routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/arbor', require('../routes/arbor'));
  });

  test('POST /arbor returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/arbor', {
      body: { source_id: 99999, target_id: 99998, relationship_type: 'related' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /arbor passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/arbor', {
      cookie: authCookie(),
      body: {}, // missing required fields → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Resources
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: resources routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/resources', require('../routes/resources'));
  });

  test('POST /resources returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/resources', {
      body: { list_key: 'sermons-and-sayings', resource_title: 'Test' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /resources passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/resources', {
      cookie: authCookie(),
      body: {}, // missing list_key and resource_title → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// News Articles
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: news-articles routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/news-articles', require('../routes/news-articles'));
  });

  test('POST /news-articles returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/news-articles', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /news-articles passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/news-articles', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Collections
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: collections routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/collections', require('../routes/collections'));
  });

  test('POST /collections returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/collections', {
      body: { slug: 'test-auth-guard', title: 'Test' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /collections passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/collections', {
      cookie: authCookie(),
      body: {}, // missing slug and title → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Academic Challenges
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: academic-challenges routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/academic-challenges', require('../routes/academic-challenges'));
  });

  test('POST /academic-challenges returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/academic-challenges', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /academic-challenges passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/academic-challenges', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Historiography
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth guard: historiography routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/historiography', require('../routes/historiography'));
  });

  test('POST /historiography returns 401 without auth', async () => {
    const res = await makeRequest(app, 'POST', '/historiography', {
      body: { slug: 'test-auth-guard' },
    });
    assert.equal(res.status, 401);
  });

  test('POST /historiography passes through with valid session', async () => {
    const res = await makeRequest(app, 'POST', '/historiography', {
      cookie: authCookie(),
      body: {}, // missing slug → 400
    });
    assert.notEqual(res.status, 401);
  });
});
