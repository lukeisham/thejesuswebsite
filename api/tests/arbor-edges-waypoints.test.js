// Arbor edge waypoints tests — uses node:test + node:assert.
// Round-trips a waypoints array through create/update/get and asserts
// malformed payloads are rejected while valid ones persist. Uses an
// in-memory SQLite DB for isolation (mirrors arbor-nodes.test.js).

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

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

const arborModel = require("../models/arbor.model");
const evidenceModel = require("../models/evidence.model");
const ERRORS = require("../lib/error-codes");

function seedEvidence(title, slug) {
  return evidenceModel.create({
    title: title,
    slug: slug,
    published_draft: 1,
  });
}

describe("arbor.edges: waypoints round-trip", function () {
  let source, target;

  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
    source = seedEvidence("Source", "source");
    target = seedEvidence("Target", "target");
  });

  test("create with no waypoints stores null", function () {
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
    });
    assert.equal(edge.waypoints, null);
  });

  test("create with a valid waypoints array persists and round-trips", function () {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
      waypoints: points,
    });
    assert.deepEqual(edge.waypoints, points);

    const fetched = arborModel.getById(edge.id);
    assert.deepEqual(fetched.waypoints, points);

    const all = arborModel.getAllEdges();
    const found = all.find((e) => e.id === edge.id);
    assert.deepEqual(found.waypoints, points);
  });

  test("update sets waypoints on an existing edge", function () {
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
    });
    const points = [{ x: 5, y: 6 }];
    const updated = arborModel.update(edge.id, { waypoints: points });
    assert.deepEqual(updated.waypoints, points);
    assert.deepEqual(arborModel.getById(edge.id).waypoints, points);
  });

  test("update with waypoints: null clears re-routing", function () {
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
      waypoints: [{ x: 1, y: 2 }],
    });
    const updated = arborModel.update(edge.id, { waypoints: null });
    assert.equal(updated.waypoints, null);
  });

  test("omitting waypoints on update leaves existing routing untouched", function () {
    const points = [{ x: 1, y: 2 }];
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
      waypoints: points,
    });
    const updated = arborModel.update(edge.id, { relationship_type: "related" });
    assert.deepEqual(updated.waypoints, points);
    assert.equal(updated.relationship_type, "related");
  });

  test("rejects a non-array waypoints value", function () {
    assert.throws(
      function () {
        arborModel.create({
          source_id: source.id,
          target_id: target.id,
          relationship_type: "supports",
          waypoints: "not-an-array",
        });
      },
      function (err) {
        return err.code === ERRORS.INVALID_JSON.code;
      },
    );
  });

  test("rejects more than 20 waypoints", function () {
    const tooMany = Array.from({ length: 21 }, function (_v, i) {
      return { x: i, y: i };
    });
    assert.throws(
      function () {
        arborModel.create({
          source_id: source.id,
          target_id: target.id,
          relationship_type: "supports",
          waypoints: tooMany,
        });
      },
      function (err) {
        return err.code === ERRORS.INVALID_JSON.code;
      },
    );
  });

  test("rejects non-numeric coordinates", function () {
    assert.throws(
      function () {
        arborModel.create({
          source_id: source.id,
          target_id: target.id,
          relationship_type: "supports",
          waypoints: [{ x: "10", y: 20 }],
        });
      },
      function (err) {
        return err.code === ERRORS.INVALID_JSON.code;
      },
    );
  });

  test("accepts exactly 20 waypoints (boundary)", function () {
    const exactly20 = Array.from({ length: 20 }, function (_v, i) {
      return { x: i, y: i };
    });
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
      waypoints: exactly20,
    });
    assert.equal(edge.waypoints.length, 20);
  });

  test("malformed JSON already in the database falls back to null on read, does not throw", function () {
    const edge = arborModel.create({
      source_id: source.id,
      target_id: target.id,
      relationship_type: "supports",
    });
    // Simulate corrupted data written outside the model's validation path.
    db.prepare("UPDATE arbor_edges SET waypoints = ? WHERE id = ?").run(
      "{not valid json",
      edge.id,
    );

    const fetched = arborModel.getById(edge.id);
    assert.equal(fetched.waypoints, null);

    const all = arborModel.getAllEdges();
    const found = all.find((e) => e.id === edge.id);
    assert.equal(found.waypoints, null);
  });
});
