// Visual editors placement eligibility tests.
// Covers arbor, timeline, and map publishing gates:
//   - Public endpoints exclude drafts
//   - Admin endpoints include drafts
//   - Pin placement is rejected when evidence_id doesn't exist

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

const evidenceModel = require("../models/evidence.model");
const arborModel = require("../models/arbor.model");
const timelineModel = require("../models/timeline.model");
const mapModel = require("../models/map.model");
const requireAuth = require("../middleware/auth");

// ── Helpers ────────────────────────────────────────────────────────────────────

function seedPublishedEvidence(title, slug) {
  return evidenceModel.create({
    title: title,
    slug: slug,
    published_draft: 1,
  });
}

function seedDraftEvidence(title, slug) {
  return evidenceModel.create({
    title: title,
    slug: slug,
    published_draft: 0,
  });
}

function seedPublishedTimelineEvidence(title, slug, era, period) {
  return evidenceModel.create({
    title: title,
    slug: slug,
    published_draft: 1,
    timeline_era: era,
    timeline_period: period,
  });
}

function seedDraftTimelineEvidence(title, slug, era, period) {
  return evidenceModel.create({
    title: title,
    slug: slug,
    published_draft: 0,
    timeline_era: era,
    timeline_period: period,
  });
}

/** Spin up a tiny Express app on a random port, make a single HTTP request,
 *  and return { status, body }. */
function makeRequest(method, path, { cookie, body } = {}) {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());
    app.use("/arbor", require("../routes/arbor"));
    app.use("/timeline", require("../routes/timeline"));
    app.use("/maps", require("../routes/maps"));

    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (cookie) options.headers.cookie = cookie;

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data || null });
          }
        });
      });
      req.on("error", (err) => {
        server.close();
        reject(err);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

/** Return a session cookie string for an authenticated request. */
function authCookie() {
  const token = requireAuth.createSession("admin-test");
  return `sid=${encodeURIComponent(token)}`;
}

// ── Cleanup between suites ─────────────────────────────────────────────────────

function cleanEvidenceTables() {
  db.exec("DELETE FROM arbor_nodes");
  db.exec("DELETE FROM arbor_edges");
  db.exec("DELETE FROM map_pins");
  db.exec("DELETE FROM maps");
  db.exec("DELETE FROM evidence");
}

// ════════════════════════════════════════════════════════════════════════════════
//  Arbor — draft eligibility
// ════════════════════════════════════════════════════════════════════════════════

describe("arbor: public excludes drafts, admin includes them", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("getNodesAndEdges() excludes draft evidence", function () {
    const pub = seedPublishedEvidence("Published Node", "pub-node");
    const draft = seedDraftEvidence("Draft Node", "draft-node");

    // Create an edge from published → draft
    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges();
    // Published node appears, draft is excluded, edge dropped
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0].id, pub.id);
    assert.equal(graph.edges.length, 0);
  });

  test("getNodesAndEdges({ includeDrafts: true }) includes draft evidence", function () {
    const pub = seedPublishedEvidence("Published Node", "pub-node");
    const draft = seedDraftEvidence("Draft Node", "draft-node");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });
    assert.equal(graph.nodes.length, 2);

    const ids = graph.nodes.map((n) => n.id).sort();
    assert.deepEqual(ids, [pub.id, draft.id].sort());
    assert.equal(graph.edges.length, 1);
  });

  test("public GET /arbor does not include drafts", async function () {
    const pub = seedPublishedEvidence("Published", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'root')",
    ).run(pub.id, draft.id);

    const res = await makeRequest("GET", "/arbor");
    assert.equal(res.status, 200);
    assert.equal(res.body.nodes.length, 1);
    assert.equal(res.body.nodes[0].id, pub.id);
  });

  test("admin GET /arbor/admin includes drafts with auth", async function () {
    const pub = seedPublishedEvidence("Published", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'root')",
    ).run(pub.id, draft.id);

    const res = await makeRequest("GET", "/arbor/admin", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.nodes.length, 2);
  });

  test("admin GET /arbor/admin returns 401 without auth", async function () {
    const res = await makeRequest("GET", "/arbor/admin");
    assert.equal(res.status, 401);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  Timeline — draft eligibility
// ════════════════════════════════════════════════════════════════════════════════

describe("timeline: public excludes drafts, admin includes them", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("getTimelineEvents() excludes draft evidence", function () {
    seedPublishedTimelineEvidence("Published", "pub-tl", "Life", "LifeTradie");
    seedDraftTimelineEvidence("Draft", "draft-tl", "Life", "LifeBaptism");

    const events = timelineModel.getTimelineEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].title, "Published");
  });

  test("getTimelineEvents({ includeDrafts: true }) includes draft evidence", function () {
    seedPublishedTimelineEvidence("Published", "pub-tl", "Life", "LifeTradie");
    seedDraftTimelineEvidence("Draft", "draft-tl", "Life", "LifeBaptism");

    const events = timelineModel.getTimelineEvents({ includeDrafts: true });
    assert.equal(events.length, 2);
  });

  test("public GET /timeline does not include drafts", async function () {
    seedPublishedTimelineEvidence("Published", "pub-tl", "Life", "LifeTradie");
    seedDraftTimelineEvidence("Draft", "draft-tl", "Life", "LifeBaptism");

    const res = await makeRequest("GET", "/timeline");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, "Published");
  });

  test("admin GET /timeline/admin includes drafts with auth", async function () {
    seedPublishedTimelineEvidence("Published", "pub-tl", "Life", "LifeTradie");
    seedDraftTimelineEvidence("Draft", "draft-tl", "Life", "LifeBaptism");

    const res = await makeRequest("GET", "/timeline/admin", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  test("admin GET /timeline/admin returns 401 without auth", async function () {
    const res = await makeRequest("GET", "/timeline/admin");
    assert.equal(res.status, 401);
  });

  test("getTimelineEvents still requires timeline_period IS NOT NULL even with includeDrafts", function () {
    // Create an evidence record without timeline_period
    evidenceModel.create({
      title: "No Period",
      slug: "no-period",
      published_draft: 0,
    });

    const events = timelineModel.getTimelineEvents({ includeDrafts: true });
    assert.equal(events.length, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  Maps — pin placement eligibility
// ════════════════════════════════════════════════════════════════════════════════

describe("maps: evidence existence validation", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("createPin rejects non-existent evidence_id", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });

    assert.throws(
      () =>
        mapModel.createPin({
          map_id: map.id,
          evidence_id: 99999,
          x: 50,
          y: 50,
          label: "Bad Pin",
        }),
      /Evidence record not found/,
    );
  });

  test("createPin accepts null evidence_id", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });

    const pin = mapModel.createPin({
      map_id: map.id,
      evidence_id: null,
      x: 50,
      y: 50,
      label: "No Evidence",
    });
    assert.ok(pin);
    assert.equal(pin.label, "No Evidence");
  });

  test("createPin accepts existing evidence_id (draft or published)", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });
    const draft = seedDraftEvidence("Draft Ev", "draft-ev");

    const pin = mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 50,
      y: 50,
      label: "Draft Pin",
    });
    assert.ok(pin);
    assert.equal(pin.evidence_id, draft.id);
  });

  test("updatePin rejects non-existent evidence_id", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });
    const pin = mapModel.createPin({
      map_id: map.id,
      x: 50,
      y: 50,
    });

    assert.throws(
      () => mapModel.updatePin(pin.id, { evidence_id: 99999 }),
      /Evidence record not found/,
    );
  });

  test("POST /maps/pins returns 404 when evidence_id does not exist", async function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });

    const res = await makeRequest("POST", "/maps/pins", {
      cookie: authCookie(),
      body: { map_id: map.id, x: 50, y: 50, evidence_id: 99999 },
    });
    assert.equal(res.status, 404);
    assert.match(res.body.error, /Evidence record not found/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  Maps — draft filtering (public vs admin)
// ════════════════════════════════════════════════════════════════════════════════

describe("maps: public excludes draft-evidence pins, admin includes them", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("getMapByKey excludes pins linked to draft evidence", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });
    const pub = seedPublishedEvidence("Published", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub Pin",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft Pin",
    });

    const result = mapModel.getMapByKey("test-map");
    assert.equal(result.pins.length, 1);
    assert.equal(result.pins[0].label, "Pub Pin");
  });

  test("getMapByKey({ includeDrafts: true }) includes pins for draft evidence", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });
    const pub = seedPublishedEvidence("Published", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub Pin",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft Pin",
    });

    const result = mapModel.getMapByKey("test-map", { includeDrafts: true });
    assert.equal(result.pins.length, 2);
  });

  test("getMapByKey includes pins without evidence_id (null evidence) regardless of drafts flag", function () {
    const map = mapModel.createMap({
      map_key: "test-map",
      map_name: "Test Map",
    });

    mapModel.createPin({
      map_id: map.id,
      evidence_id: null,
      x: 10,
      y: 10,
      label: "No Ev",
    });

    const resultPublic = mapModel.getMapByKey("test-map");
    assert.equal(resultPublic.pins.length, 1);

    const resultAdmin = mapModel.getMapByKey("test-map", {
      includeDrafts: true,
    });
    assert.equal(resultAdmin.pins.length, 1);
  });

  test("public GET /maps/:map_key excludes draft-evidence pins", async function () {
    const map = mapModel.createMap({
      map_key: "pub-map",
      map_name: "Public Map",
    });
    const pub = seedPublishedEvidence("Published", "pub-ev");
    const draft = seedDraftEvidence("Draft", "draft-ev");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft",
    });

    const res = await makeRequest("GET", "/maps/pub-map");
    assert.equal(res.status, 200);
    assert.equal(res.body.pins.length, 1);
  });

  test("admin GET /maps/admin/:map_key includes draft-evidence pins with auth", async function () {
    const map = mapModel.createMap({
      map_key: "admin-map",
      map_name: "Admin Map",
    });
    const pub = seedPublishedEvidence("Published", "pub-ev");
    const draft = seedDraftEvidence("Draft", "draft-ev");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft",
    });

    const res = await makeRequest("GET", "/maps/admin/admin-map", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.pins.length, 2);
  });

  test("admin GET /maps/admin/:map_key returns 401 without auth", async function () {
    const res = await makeRequest("GET", "/maps/admin/some-map");
    assert.equal(res.status, 401);
  });

  test("public GET /maps/pins/by-map/:mapId excludes draft-evidence pins", async function () {
    const map = mapModel.createMap({
      map_key: "pins-map",
      map_name: "Pins Map",
    });
    const pub = seedPublishedEvidence("Published", "pub-ev2");
    const draft = seedDraftEvidence("Draft", "draft-ev2");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft",
    });

    const res = await makeRequest("GET", `/maps/pins/by-map/${map.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
  });

  test("admin GET /maps/admin/pins/by-map/:mapId includes draft-evidence pins with auth", async function () {
    const map = mapModel.createMap({
      map_key: "admin-pins",
      map_name: "Admin Pins",
    });
    const pub = seedPublishedEvidence("Published", "pub-ev3");
    const draft = seedDraftEvidence("Draft", "draft-ev3");

    mapModel.createPin({
      map_id: map.id,
      evidence_id: pub.id,
      x: 10,
      y: 10,
      label: "Pub",
    });
    mapModel.createPin({
      map_id: map.id,
      evidence_id: draft.id,
      x: 20,
      y: 20,
      label: "Draft",
    });

    const res = await makeRequest("GET", `/maps/admin/pins/by-map/${map.id}`, {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  test("admin GET /maps/admin/pins/by-map/:mapId returns 401 without auth", async function () {
    const map = mapModel.createMap({
      map_key: "sec-pins",
      map_name: "Security",
    });
    const res = await makeRequest("GET", `/maps/admin/pins/by-map/${map.id}`);
    assert.equal(res.status, 401);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  Maps — unplaced evidence endpoint
// ════════════════════════════════════════════════════════════════════════════════

describe("maps: admin unplaced evidence", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("GET /maps/admin/unplaced returns 401 without auth", async function () {
    const res = await makeRequest("GET", "/maps/admin/unplaced?map_id=1");
    assert.equal(res.status, 401);
  });

  test("GET /maps/admin/unplaced returns 400 when map_id is missing", async function () {
    const res = await makeRequest("GET", "/maps/admin/unplaced", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 400);
  });

  test("returns evidence with map_location set but no pin on the map", async function () {
    const map = mapModel.createMap({
      map_key: "unplaced-map",
      map_name: "Unplaced Map",
    });

    // Evidence with map_location — the kind that should appear as unplaced
    const ev1 = evidenceModel.create({
      title: "Located Evidence",
      slug: "located-ev",
      published_draft: 1,
      map_location: "Galilee",
    });

    // Evidence without map_location — should NOT appear
    evidenceModel.create({
      title: "No Location",
      slug: "no-loc",
      published_draft: 1,
    });

    const res = await makeRequest(
      "GET",
      `/maps/admin/unplaced?map_id=${map.id}`,
      { cookie: authCookie() },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, ev1.id);
    assert.equal(res.body[0].title, "Located Evidence");
  });

  test("excludes evidence that already has a pin on the map", async function () {
    const map = mapModel.createMap({
      map_key: "pinned-map",
      map_name: "Pinned Map",
    });

    const ev = evidenceModel.create({
      title: "Already Pinned",
      slug: "already-pinned",
      published_draft: 1,
      map_location: "Jerusalem",
    });

    mapModel.createPin({
      map_id: map.id,
      evidence_id: ev.id,
      x: 50,
      y: 50,
      label: "Pinned",
    });

    const res = await makeRequest(
      "GET",
      `/maps/admin/unplaced?map_id=${map.id}`,
      { cookie: authCookie() },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 0);
  });

  test("includes draft evidence", async function () {
    const map = mapModel.createMap({
      map_key: "draft-map",
      map_name: "Draft Map",
    });

    evidenceModel.create({
      title: "Draft Located",
      slug: "draft-located",
      published_draft: 0,
      map_location: "Nazareth",
    });

    const res = await makeRequest(
      "GET",
      `/maps/admin/unplaced?map_id=${map.id}`,
      { cookie: authCookie() },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, "Draft Located");
  });

  test("includes timeline_era and map_location in the response", async function () {
    const map = mapModel.createMap({
      map_key: "era-map",
      map_name: "Era Map",
    });

    evidenceModel.create({
      title: "Era Evidence",
      slug: "era-ev",
      published_draft: 1,
      timeline_era: "GalileeMinistry",
      map_location: "Capernaum",
    });

    const res = await makeRequest(
      "GET",
      `/maps/admin/unplaced?map_id=${map.id}`,
      { cookie: authCookie() },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].timeline_era, "GalileeMinistry");
    assert.equal(res.body[0].map_location, "Capernaum");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  Maps — era data on pin payloads
// ════════════════════════════════════════════════════════════════════════════════

describe("maps: pin payloads include era data", function () {
  beforeEach(function () {
    cleanEvidenceTables();
  });

  test("getMapByKey returns timeline_era on pins", function () {
    const map = mapModel.createMap({
      map_key: "era-pin-map",
      map_name: "Era Pin Map",
    });
    const ev = evidenceModel.create({
      title: "Era Pin",
      slug: "era-pin",
      published_draft: 1,
      timeline_era: "PassionWeek",
      gospel_category: "events",
    });

    mapModel.createPin({
      map_id: map.id,
      evidence_id: ev.id,
      x: 50,
      y: 50,
      label: "Test",
    });

    const result = mapModel.getMapByKey("era-pin-map");
    assert.equal(result.pins.length, 1);
    assert.equal(result.pins[0].timeline_era, "PassionWeek");
    assert.equal(result.pins[0].gospel_category, "events");
  });

  test("getPinsByMap returns timeline_era on pins", function () {
    const map = mapModel.createMap({
      map_key: "era-pins-list",
      map_name: "Era Pins List",
    });
    const ev = evidenceModel.create({
      title: "Era Listed",
      slug: "era-listed",
      published_draft: 1,
      timeline_era: "EarlyLife",
    });

    mapModel.createPin({
      map_id: map.id,
      evidence_id: ev.id,
      x: 30,
      y: 60,
      label: "Listed",
    });

    const pins = mapModel.getPinsByMap(map.id);
    assert.equal(pins.length, 1);
    assert.equal(pins[0].timeline_era, "EarlyLife");
  });

  test("pins without evidence have null timeline_era", function () {
    const map = mapModel.createMap({
      map_key: "no-ev-map",
      map_name: "No Evidence Map",
    });

    mapModel.createPin({
      map_id: map.id,
      evidence_id: null,
      x: 50,
      y: 50,
      label: "No Ev",
    });

    const pins = mapModel.getPinsByMap(map.id);
    assert.equal(pins.length, 1);
    assert.equal(pins[0].timeline_era, null);
    assert.equal(pins[0].gospel_category, null);
  });
});
