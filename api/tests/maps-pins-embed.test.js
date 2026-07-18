// Maps pin-embed verification (Issues.md #31).
//
// Proves, at the HTTP layer, that GET /maps/:map_key embeds a map's
// map_pins rows (joined with their linked evidence) rather than returning
// the map alone. Closes the gap where the production DB had zero pins,
// so a missing-pins response couldn't be told apart from "frontend never
// fetches pins" — this test creates its own fixture rows and asserts on
// the pin's coordinates/label/evidence link directly.

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "schema.sql",
);

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const mapModel = require("../models/map.model");
const evidenceModel = require("../models/evidence.model");

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedMap(overrides = {}) {
  return mapModel.createMap({
    map_key: overrides.map_key || "test-map",
    map_name: overrides.map_name || "Test Map",
    description: overrides.description || "A test map.",
    image_path: overrides.image_path || "/assets/images/maps/test.webp",
  });
}

function seedPublishedEvidence(overrides = {}) {
  return evidenceModel.create({
    title: overrides.title || "Test Evidence",
    slug: overrides.slug || "test-evidence",
    published_draft: 1,
    description: "Fixture row for pins-embed verification.",
    primary_verse: "John 1:1",
  });
}

/** Make an HTTP request against a mounted Express app, resolve { status, body }. */
function makeRequest(app, method, reqPath) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        { hostname: "localhost", port, path: reqPath, method },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            server.close();
            try {
              resolve({
                status: res.statusCode,
                body: data ? JSON.parse(data) : null,
              });
            } catch (_e) {
              resolve({ status: res.statusCode, body: data || null });
            }
          });
        },
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      req.end();
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /maps/:map_key embeds map_pins", () => {
  let app;

  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    db.exec("DELETE FROM evidence");

    app = express();
    app.use(express.json());
    app.use("/maps", require("../routes/maps"));
  });

  test("response embeds the pin with its coordinates, label, and linked evidence slug/title", async () => {
    const map = seedMap({ map_key: "galilee", map_name: "Galilee" });
    const evidence = seedPublishedEvidence({
      title: "Capernaum Synagogue",
      slug: "capernaum-synagogue",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: evidence.id,
      label: "Capernaum",
      x: 42.5,
      y: 17.25,
    });

    const res = await makeRequest(app, "GET", "/maps/galilee");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.pins), "pins should be an array");
    assert.equal(res.body.pins.length, 1);

    const pin = res.body.pins[0];
    assert.equal(pin.label, "Capernaum");
    assert.equal(pin.x, 42.5);
    assert.equal(pin.y, 17.25);
    assert.equal(pin.evidence_slug, "capernaum-synagogue");
    assert.equal(pin.evidence_title, "Capernaum Synagogue");
  });

  test("map with no pins returns pins: [] (empty array, not missing/undefined)", async () => {
    seedMap({ map_key: "judea", map_name: "Judea" });

    const res = await makeRequest(app, "GET", "/maps/judea");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.pins), "pins should be an array");
    assert.equal(res.body.pins.length, 0);
  });
});
