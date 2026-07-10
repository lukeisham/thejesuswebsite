// Maps API tests — model + route layer, using node:test + node:assert.
// Covers the map-pin CRUD that the model already provides and the HTTP routes
// that this plan exposes (POST/PUT/DELETE /maps/pins, GET /maps/pins/by-map/:id).
// Also verifies the route-ordering constraint: GET /:map_key does not shadow
// the /pins endpoints.

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
const requireAuth = require("../middleware/auth");
const { createSession } = requireAuth;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Seed a single map row and return it. */
function seedMap(overrides = {}) {
  return mapModel.createMap({
    map_key: overrides.map_key || "test-map",
    map_name: overrides.map_name || "Test Map",
    description: overrides.description || "A test map.",
    image_path: overrides.image_path || "/assets/images/maps/test.webp",
  });
}

/** Seed a map that has all the fields so getMapByKey can find it. */
let seededMapId;
function ensureSeededMap() {
  if (!seededMapId) {
    const map = seedMap({
      map_key: "galilee",
      map_name: "Galilee",
      description: "Region of Galilee.",
    });
    seededMapId = map.id;
  }
  return seededMapId;
}

/** Seed a pin and return it. */
function seedPin(mapId, overrides = {}) {
  return mapModel.createPin({
    map_id: mapId || ensureSeededMap(),
    x: overrides.x != null ? overrides.x : 50,
    y: overrides.y != null ? overrides.y : 50,
    label: overrides.label || "Test Pin",
  });
}

/** Make an HTTP request against a mounted Express app, resolve { status, body }. */
function makeRequest(app, method, path, { cookie, body } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "localhost",
        port,
        path,
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (cookie) options.headers.Cookie = cookie;

      const req = http.request(options, (res) => {
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
      });
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

function authCookie() {
  const token = createSession("admin");
  return `sid=${token}`;
}

// ── Model: Maps ───────────────────────────────────────────────────────────────

describe("map model: getAllMaps", () => {
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;
  });

  test("returns maps with pin_count", () => {
    const map = seedMap({ map_key: "test-1", map_name: "Map One" });
    seedPin(map.id, { label: "Pin A" });
    seedPin(map.id, { label: "Pin B" });

    const maps = mapModel.getAllMaps();
    assert.equal(maps.length, 1);
    assert.equal(maps[0].pin_count, 2);
  });

  test("pin_count is 0 when map has no pins", () => {
    seedMap({ map_key: "no-pins", map_name: "No Pins" });

    const maps = mapModel.getAllMaps();
    assert.equal(maps.length, 1);
    assert.equal(maps[0].pin_count, 0);
  });

  test("multiple maps ordered by map_key", () => {
    seedMap({ map_key: "z-map", map_name: "Z Map" });
    seedMap({ map_key: "a-map", map_name: "A Map" });

    const maps = mapModel.getAllMaps();
    assert.equal(maps.length, 2);
    assert.equal(maps[0].map_key, "a-map");
    assert.equal(maps[1].map_key, "z-map");
  });
});

describe("map model: getMapByKey / getMapById", () => {
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;
  });

  test("getMapByKey returns map with embedded pins", () => {
    const map = seedMap({ map_key: "jerusalem", map_name: "Jerusalem" });
    seedPin(map.id, { label: "Temple", x: 30, y: 40 });
    seedPin(map.id, { label: "Golgotha", x: 60, y: 70 });

    const found = mapModel.getMapByKey("jerusalem");
    assert.ok(found);
    assert.equal(found.map_name, "Jerusalem");
    assert.equal(found.pins.length, 2);
    assert.equal(found.pins[0].label, "Golgotha"); // sorted alphabetically
    assert.equal(found.pins[1].label, "Temple");
  });

  test("getMapByKey returns undefined for unknown key", () => {
    assert.equal(mapModel.getMapByKey("atlantis"), undefined);
  });

  test("getMapById returns map with pins", () => {
    const map = seedMap({ map_key: "judea", map_name: "Judea" });
    seedPin(map.id, { label: "Bethlehem" });

    const found = mapModel.getMapById(map.id);
    assert.ok(found);
    assert.equal(found.map_name, "Judea");
    assert.equal(found.pins.length, 1);
    assert.equal(found.pins[0].label, "Bethlehem");
  });

  test("getMapById returns undefined for unknown id", () => {
    assert.equal(mapModel.getMapById(99999), undefined);
  });
});

describe("map model: createMap / updateMap / removeMap", () => {
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;
  });

  test("createMap returns the created map", () => {
    const map = mapModel.createMap({
      map_key: "new-map",
      map_name: "New Map",
      description: "Fresh map.",
    });
    assert.ok(map.id > 0);
    assert.equal(map.map_key, "new-map");
    assert.equal(map.map_name, "New Map");
  });

  test("updateMap changes writable fields", () => {
    const map = seedMap({ map_key: "original", map_name: "Original" });
    const updated = mapModel.updateMap(map.id, { map_name: "Updated" });
    assert.equal(updated.map_name, "Updated");
    assert.equal(updated.map_key, "original"); // unchanged
  });

  test("updateMap returns undefined for unknown id", () => {
    assert.equal(mapModel.updateMap(99999, { map_name: "Ghost" }), undefined);
  });

  test("removeMap deletes the map and cascades pins", () => {
    const map = seedMap({ map_key: "to-delete" });
    seedPin(map.id, { label: "Pin to cascade" });

    const removed = mapModel.removeMap(map.id);
    assert.equal(removed, true);
    assert.equal(mapModel.getMapById(map.id), undefined);

    const pins = mapModel.getPinsByMap(map.id);
    assert.equal(pins.length, 0);
  });

  test("removeMap returns false for unknown id", () => {
    assert.equal(mapModel.removeMap(99999), false);
  });
});

// ── Model: Pins ───────────────────────────────────────────────────────────────

describe("pin model: createPin / getPinById / updatePin / removePin / getPinsByMap", () => {
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;
  });

  test("createPin returns the created pin", () => {
    const map = seedMap();
    const pin = mapModel.createPin({
      map_id: map.id,
      x: 25.5,
      y: 75.0,
      label: "Capernaum",
    });
    assert.ok(pin.id > 0);
    assert.equal(pin.map_id, map.id);
    assert.equal(pin.x, 25.5);
    assert.equal(pin.y, 75.0);
    assert.equal(pin.label, "Capernaum");
  });

  test("getPinById returns pin data", () => {
    const pin = seedPin(ensureSeededMap(), { label: "Nazareth" });
    const found = mapModel.getPinById(pin.id);
    assert.ok(found);
    assert.equal(found.label, "Nazareth");
    assert.equal(found.x, 50);
    assert.equal(found.y, 50);
  });

  test("getPinById returns undefined for unknown id", () => {
    assert.equal(mapModel.getPinById(99999), undefined);
  });

  test("updatePin changes writable fields", () => {
    const pin = seedPin(ensureSeededMap(), {
      label: "Old Label",
      x: 10,
      y: 20,
    });
    const updated = mapModel.updatePin(pin.id, { label: "New Label", x: 99 });
    assert.equal(updated.label, "New Label");
    assert.equal(updated.x, 99);
    assert.equal(updated.y, 20); // unchanged
  });

  test("updatePin returns undefined for unknown id", () => {
    assert.equal(mapModel.updatePin(99999, { label: "Ghost" }), undefined);
  });

  test("removePin deletes the pin", () => {
    const pin = seedPin(ensureSeededMap());
    const removed = mapModel.removePin(pin.id);
    assert.equal(removed, true);
    assert.equal(mapModel.getPinById(pin.id), undefined);
  });

  test("removePin returns false for unknown id", () => {
    assert.equal(mapModel.removePin(99999), false);
  });

  test("getPinsByMap returns pins for a specific map ordered by label", () => {
    const map = seedMap({ map_key: "levant" });
    seedPin(map.id, { label: "Z", x: 0, y: 0 });
    seedPin(map.id, { label: "A", x: 10, y: 10 });
    seedPin(map.id, { label: "M", x: 20, y: 20 });

    const pins = mapModel.getPinsByMap(map.id);
    assert.equal(pins.length, 3);
    assert.equal(pins[0].label, "A");
    assert.equal(pins[1].label, "M");
    assert.equal(pins[2].label, "Z");
  });

  test("getPinsByMap returns empty array for map with no pins", () => {
    const map = seedMap();
    const pins = mapModel.getPinsByMap(map.id);
    assert.deepStrictEqual(pins, []);
  });
});

// ── Routes: Pin validation & error handling ───────────────────────────────────

describe("maps routes: pin validation", () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/maps", require("../routes/maps"));
  });

  test("POST /maps/pins returns 400 when map_id is missing", async () => {
    const res = await makeRequest(app, "POST", "/maps/pins", {
      cookie: authCookie(),
      body: { x: 50, y: 50 },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test("POST /maps/pins returns 400 when x is missing", async () => {
    const res = await makeRequest(app, "POST", "/maps/pins", {
      cookie: authCookie(),
      body: { map_id: 1, y: 50 },
    });
    assert.equal(res.status, 400);
  });

  test("POST /maps/pins returns 400 when y is missing", async () => {
    const res = await makeRequest(app, "POST", "/maps/pins", {
      cookie: authCookie(),
      body: { map_id: 1, x: 50 },
    });
    assert.equal(res.status, 400);
  });

  test("PUT /maps/pins/:id returns 404 for unknown id", async () => {
    const res = await makeRequest(app, "PUT", "/maps/pins/99999", {
      cookie: authCookie(),
      body: { label: "Ghost" },
    });
    assert.equal(res.status, 404);
  });

  test("DELETE /maps/pins/:id returns 404 for unknown id", async () => {
    const res = await makeRequest(app, "DELETE", "/maps/pins/99999", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 404);
  });
});

// ── Routes: Auth guard on pin write endpoints ─────────────────────────────────

describe("maps routes: pin auth guard", () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/maps", require("../routes/maps"));
  });

  test("POST /maps/pins returns 401 without auth", async () => {
    const res = await makeRequest(app, "POST", "/maps/pins", {
      body: { map_id: 1, x: 50, y: 50 },
    });
    assert.equal(res.status, 401);
  });

  test("PUT /maps/pins/:id returns 401 without auth", async () => {
    const res = await makeRequest(app, "PUT", "/maps/pins/1", {
      body: { label: "Test" },
    });
    assert.equal(res.status, 401);
  });

  test("DELETE /maps/pins/:id returns 401 without auth", async () => {
    const res = await makeRequest(app, "DELETE", "/maps/pins/1");
    assert.equal(res.status, 401);
  });
});

// ── Routes: Map metadata updates ────────────────────────────────────────────

describe("maps routes: map metadata", () => {
  let app;
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;

    app = express();
    app.use(express.json());
    app.use("/maps", require("../routes/maps"));
  });

  test("PUT /maps/:id updates map_name", async () => {
    const map = seedMap({ map_key: "test-edit", map_name: "Original" });
    const res = await makeRequest(app, "PUT", `/maps/${map.id}`, {
      cookie: authCookie(),
      body: { map_name: "Renamed" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.map_name, "Renamed");
    assert.equal(res.body.map_key, "test-edit"); // unchanged
  });

  test("PUT /maps/:id updates description", async () => {
    const map = seedMap({
      map_key: "test-desc",
      map_name: "Map",
      description: "Old description.",
    });
    const res = await makeRequest(app, "PUT", `/maps/${map.id}`, {
      cookie: authCookie(),
      body: { description: "New description." },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.description, "New description.");
  });

  test("PUT /maps/:id updates image_path", async () => {
    const map = seedMap({
      map_key: "test-img",
      map_name: "Map",
      image_path: "/old/path.webp",
    });
    const res = await makeRequest(app, "PUT", `/maps/${map.id}`, {
      cookie: authCookie(),
      body: { image_path: "/new/path.svg" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.image_path, "/new/path.svg");
  });

  test("PUT /maps/:id rejects empty map_name", async () => {
    const map = seedMap({ map_key: "test-reject", map_name: "Original" });
    const res = await makeRequest(app, "PUT", `/maps/${map.id}`, {
      cookie: authCookie(),
      body: { map_name: "" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test("PUT /maps/:id returns 404 for unknown id", async () => {
    const res = await makeRequest(app, "PUT", "/maps/99999", {
      cookie: authCookie(),
      body: { map_name: "Ghost" },
    });
    assert.equal(res.status, 404);
  });

  test("PUT /maps/:id returns 401 without auth", async () => {
    const map = seedMap({ map_key: "test-auth", map_name: "Map" });
    const res = await makeRequest(app, "PUT", `/maps/${map.id}`, {
      body: { map_name: "Hacked" },
    });
    assert.equal(res.status, 401);
  });
});

// ── Routes: Route-ordering — GET /:map_key is not shadowed by /pins ───────────

describe("maps routes: route ordering", () => {
  let app;
  beforeEach(() => {
    db.exec("DELETE FROM map_pins");
    db.exec("DELETE FROM maps");
    seededMapId = undefined;

    app = express();
    app.use(express.json());
    app.use("/maps", require("../routes/maps"));
  });

  test("GET /maps/pins/by-map/:id is not caught by GET /maps/:map_key", async () => {
    const map = seedMap({ map_key: "roman-empire", map_name: "Roman Empire" });
    seedPin(map.id, { label: "Rome", x: 10, y: 20 });

    const res = await makeRequest(app, "GET", `/maps/pins/by-map/${map.id}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].label, "Rome");
  });

  test("GET /maps/:map_key still resolves a seeded map", async () => {
    seedMap({ map_key: "roman-empire", map_name: "Roman Empire" });

    const res = await makeRequest(app, "GET", "/maps/roman-empire");
    assert.equal(res.status, 200);
    assert.equal(res.body.map_key, "roman-empire");
    assert.equal(res.body.map_name, "Roman Empire");
  });
});
