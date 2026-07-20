// Shared server lifecycle helper for the API test suite.
//
// Eliminates the three root causes of intermittent test flakiness:
//   1. Synchronous server.address() before the listener is ready
//   2. server.close() without awaiting the close callback
//   3. Port collisions from back-to-back listen(0) calls
//
// Usage (per-test pattern):
//   const { createTestServer, closeTestServer } = require("./helpers/test-server");
//   const { server, port } = await createTestServer(app);
//   // ... make requests using `port` ...
//   await closeTestServer(server);
//
// Or in a request helper:
//   const { server, port } = await createTestServer(app);
//   const req = http.request({ hostname: "127.0.0.1", port, ... }, (res) => {
//     // ... read response ...
//     closeTestServer(server).then(() => resolve(result));
//   });
//   req.on("error", (err) => {
//     closeTestServer(server).then(() => reject(err));
//   });

const http = require("http");

/**
 * Start the Express app on an ephemeral port and resolve once the server is
 * fully listening. Returns { server, port }.
 *
 * @param {import("express").Express} app
 * @returns {Promise<{ server: http.Server, port: number }>}
 */
function createTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
    server.on("error", reject);
  });
}

/**
 * Close a test server and resolve once the port is fully released.
 * Safe to call on an already-closed server (idempotent).
 *
 * @param {http.Server} server
 * @returns {Promise<void>}
 */
function closeTestServer(server) {
  return new Promise((resolve) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }
    // Give close() a short grace period, then force-resolve so a
    // never-finishing close (e.g. lingering keep-alive) doesn't hang the suite.
    const timeout = setTimeout(() => resolve(), 1000);
    server.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

module.exports = { createTestServer, closeTestServer };
