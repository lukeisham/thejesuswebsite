# API Test Suite — Developer Guide

## Running the tests

```bash
cd api && npm test
```

All tests use Node's built-in `node:test` + `node:assert/strict` with an
in-memory SQLite database. No external test runner or database server is
required. There are currently **951 tests across 53 test files**.

## Server lifecycle: the centralized pattern

Several test files start their own HTTP listeners to exercise Express routes
end-to-end. **All new test files that start a server MUST use the shared
`createTestServer` / `closeTestServer` helpers.** The old patterns described
below cause intermittent port/timing races that make the suite flaky.

### The helper (`api/tests/helpers/test-server.js`)

```js
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// Start the Express app on an ephemeral port:
const { server, port } = await createTestServer(app);

// Make requests using `port`...

// Release the port when done:
await closeTestServer(server);
```

`closeTestServer` is **idempotent** — safe to call on an already-closed or
null server (no error, resolves immediately).

### Why the old patterns caused flakiness

1. **Synchronous `server.address()` before the listener is ready:**
   ```js
   // ❌ WRONG — race condition: address() may return null if listen hasn't finished
   const server = app.listen(0);
   const { port } = server.address();
   ```
   The `listen(0)` call is asynchronous; reading `address()` on the next
   tick can return `null` (port not yet assigned) or a port whose listener
   hasn't finished binding.

2. **`server.close()` without awaiting:**
   ```js
   // ❌ WRONG — the port may still be in TIME_WAIT when the next test starts
   server.close();
   resolve(result);
   ```
   Without waiting for the `close` callback (or promisifying it), the OS may
   keep the port reserved for up to 30 seconds. The next test's `listen(0)`
   can then fail with `EADDRINUSE` or the request can "hang up" on a socket
   that hasn't been fully released.

3. **Shared session store leaking across test files:**
   The auth middleware stores sessions in an in-process `Map`. When
   `auth-guard.test.js` creates an "admin" session and `site-settings-route.test.js`
   later starts its own server, that stale token can match a guard check,
   causing a 401-vs-404 assertion failure or a "socket hang up" when the
   expected response shape doesn't match.

### The correct patterns

**Per-request server** (most common — each test starts/tears down its own server):

```js
async function request(app, { method, path, body, headers }) {
  const { server, port } = await createTestServer(app);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, ... }, (res) => {
      // read response...
      res.on("end", () => {
        closeTestServer(server).then(() => resolve(result));
      });
    });
    req.on("error", (err) => {
      closeTestServer(server).then(() => reject(err));
    });
    // ...
  });
}
```

**Singleton server** (one server reused across a whole test file):

```js
let server, port;

before(async () => {
  const created = await createTestServer(app);
  server = created.server;
  port = created.port;
});

after(async () => {
  await closeTestServer(server);
});
```

## Session isolation

Test files that create sessions for auth-guarded routes should call
`clearAuthSessions()` before each test:

```js
const { clearAuthSessions } = require("./helpers/test-setup");
beforeEach(() => clearAuthSessions());
```

This clears the in-process session Map so stale tokens from one test file
can't leak into another.

## In-memory database

Most test files use `createTestDb()` from `tests/helpers/db.js`, which
creates a `:memory:` SQLite database with the full schema (including all
migrations folded in). The database is installed in the Node module cache
so that `require("../config")` returns the test DB instead of the real one.

```js
const { createTestDb } = require("./helpers/db");
const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = { ... testDb ... };
```

## Adding a new test file

1. Place it at `api/tests/<name>.test.js` (the `node:test` runner picks up
   all `*.test.js` files in the `tests/` directory).
2. If your tests need an HTTP server, use `createTestServer` / `closeTestServer`
   from `./helpers/test-server`.
3. If your tests touch auth-guarded routes, call `clearAuthSessions()` in a
   `beforeEach`.
4. If your tests need the in-memory DB, use `createTestDb()` from
   `./helpers/db`.
5. Use `node:test` and `node:assert/strict` — no external test dependencies.
