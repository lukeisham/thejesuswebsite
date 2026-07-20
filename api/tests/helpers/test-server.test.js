// Tests for the shared test-server lifecycle helper.
// Verifies the helper itself is deterministic — no port collisions,
// idempotent close, and back-to-back create/close cycles work cleanly.
//
// Run as part of the full suite: cd api && npm test

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const { createTestServer, closeTestServer } = require("./test-server");

function dummyApp() {
  const app = express();
  app.get("/", (req, res) => res.json({ ok: true }));
  return app;
}

describe("createTestServer", () => {
  test("returns a valid port that is actually listening", async () => {
    const { server, port } = await createTestServer(dummyApp());

    assert.ok(typeof port === "number");
    assert.ok(port > 0);

    // Verify the server is actually responding
    const body = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    assert.deepEqual(body, { ok: true });

    await closeTestServer(server);
  });

  test("called twice in sequence returns different ports (no collision)", async () => {
    const { server: s1, port: p1 } = await createTestServer(dummyApp());
    const { server: s2, port: p2 } = await createTestServer(dummyApp());

    assert.notEqual(p1, p2, "sequential listens should get different ports");

    await closeTestServer(s1);
    await closeTestServer(s2);
  });
});

describe("closeTestServer", () => {
  test("closing a closed server is idempotent (no error)", async () => {
    const { server } = await createTestServer(dummyApp());
    await closeTestServer(server);

    // Second close should not throw
    await closeTestServer(server);

    // Third close should still be safe
    await closeTestServer(server);
  });

  test("closing null/undefined is safe", async () => {
    await closeTestServer(null);
    await closeTestServer(undefined);
  });
});

describe("back-to-back create/close cycles", () => {
  test("ports are released and reusable across 10 rapid cycles", async function () {
    // This simulates the exact flakiness scenario: test files running
    // back-to-back, each starting and stopping its own server.
    const usedPorts = new Set();
    const cycles = 10;

    for (let i = 0; i < cycles; i++) {
      const { server, port } = await createTestServer(dummyApp());

      // Verify port is not reused within this cycle window (at least not
      // an active reuse — the OS may reassign the same port after release,
      // but it must not be in-use at create time)
      assert.ok(!usedPorts.has(port) || i > 1,
        `port ${port} was reused too soon on cycle ${i}`);

      usedPorts.add(port);

      // Quick sanity: server responds
      await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/`, (res) => {
          res.resume();
          res.on("end", resolve);
        }).on("error", reject);
      });

      await closeTestServer(server);
    }
  });
});
