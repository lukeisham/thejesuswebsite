// Arbor node position persistence tests — uses node:test + node:assert.
// Tests node upsert, delete, GET /arbor includes x/y, validation,
// authentication gating, and cascade-on-delete.
// Uses an in-memory SQLite DB for isolation.

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

// ── upsertNodePosition ─────────────────────────────────────────────────────────

describe("arbor.nodes: upsertNodePosition", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("creates a new node position", function () {
    const evidence = seedPublishedEvidence("Test Node", "test-node");
    const result = arborModel.upsertNodePosition(evidence.id, 100.5, 200.75);
    assert.equal(result.evidence_id, evidence.id);
    assert.equal(result.x, 100.5);
    assert.equal(result.y, 200.75);
    assert.ok(result.created_at);
    assert.ok(result.updated_at);
  });

  test("updates an existing node position", function () {
    const evidence = seedPublishedEvidence("Test Node", "test-node");
    arborModel.upsertNodePosition(evidence.id, 100, 200);
    const updated = arborModel.upsertNodePosition(evidence.id, 300, 400);
    assert.equal(updated.x, 300);
    assert.equal(updated.y, 400);
  });

  test("handles multiple nodes independently", function () {
    const a = seedPublishedEvidence("Node A", "node-a");
    const b = seedPublishedEvidence("Node B", "node-b");
    arborModel.upsertNodePosition(a.id, 100, 200);
    arborModel.upsertNodePosition(b.id, 300, 400);

    const posA = arborModel.getNodePosition(a.id);
    const posB = arborModel.getNodePosition(b.id);
    assert.equal(posA.x, 100);
    assert.equal(posA.y, 200);
    assert.equal(posB.x, 300);
    assert.equal(posB.y, 400);
  });
});

// ── removeNode ─────────────────────────────────────────────────────────────────

describe("arbor.nodes: removeNode", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("removes a node position without deleting evidence", function () {
    const evidence = seedPublishedEvidence("Test Node", "test-node");
    arborModel.upsertNodePosition(evidence.id, 100, 200);
    const removed = arborModel.removeNode(evidence.id);
    assert.equal(removed, true);

    // Evidence should still exist
    const evidenceAfter = evidenceModel.getById(evidence.id);
    assert.ok(evidenceAfter);
    assert.equal(evidenceAfter.title, "Test Node");
  });

  test("returns false when node position does not exist", function () {
    const removed = arborModel.removeNode(99999);
    assert.equal(removed, false);
  });
});

// ── getNodesAndEdges includes x/y ──────────────────────────────────────────────

describe("arbor.nodes: getNodesAndEdges includes positions", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("returns x/y null for evidence without saved position", function () {
    const a = seedPublishedEvidence("Node A", "node-a");
    const b = seedPublishedEvidence("Node B", "node-b");

    // Create an edge so both nodes appear in the graph
    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(a.id, b.id);

    const graph = arborModel.getNodesAndEdges();
    assert.equal(graph.nodes.length, 2);

    const nodeA = graph.nodes.find(function (n) {
      return n.id === a.id;
    });
    const nodeB = graph.nodes.find(function (n) {
      return n.id === b.id;
    });
    assert.equal(nodeA.x, null);
    assert.equal(nodeA.y, null);
    assert.equal(nodeB.x, null);
    assert.equal(nodeB.y, null);
  });

  test("returns saved x/y for positioned evidence", function () {
    const a = seedPublishedEvidence("Node A", "node-a");
    const b = seedPublishedEvidence("Node B", "node-b");

    arborModel.upsertNodePosition(a.id, 150, 250);

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(a.id, b.id);

    const graph = arborModel.getNodesAndEdges();

    const nodeA = graph.nodes.find(function (n) {
      return n.id === a.id;
    });
    const nodeB = graph.nodes.find(function (n) {
      return n.id === b.id;
    });
    assert.equal(nodeA.x, 150);
    assert.equal(nodeA.y, 250);
    assert.equal(nodeB.x, null);
    assert.equal(nodeB.y, null);
  });

  test("excludes draft evidence from graph", function () {
    const pub = seedPublishedEvidence("Published", "published");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'root')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges();
    // Published node still appears, but draft is excluded and edge is dropped
    // (edge needs both endpoints published)
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0].id, pub.id);
    assert.equal(graph.edges.length, 0);
  });
});

// ── getUnplacedEvidence ────────────────────────────────────────────────────────

describe("arbor.nodes: getUnplacedEvidence", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("returns evidence without a saved position", function () {
    const placed = seedPublishedEvidence("Placed Node", "placed-node");
    const unplaced = seedPublishedEvidence("Unplaced Node", "unplaced-node");

    arborModel.upsertNodePosition(placed.id, 100, 200);

    const result = arborModel.getUnplacedEvidence();
    assert.equal(result.length, 1);
    assert.equal(result[0].id, unplaced.id);
    assert.equal(result[0].title, "Unplaced Node");
  });

  test("includes draft evidence", function () {
    const draft = seedDraftEvidence("Draft Node", "draft-node");

    const result = arborModel.getUnplacedEvidence();
    assert.equal(result.length, 1);
    assert.equal(result[0].id, draft.id);
    assert.equal(result[0].published_draft, 0);
  });

  test("excludes evidence that has a position saved", function () {
    const placed = seedPublishedEvidence("Placed", "placed");
    arborModel.upsertNodePosition(placed.id, 50, 60);

    const result = arborModel.getUnplacedEvidence();
    assert.equal(result.length, 0);
  });

  test("returns multiple unplaced evidence ordered by title", function () {
    const c = seedPublishedEvidence("C Node", "c-node");
    const a = seedDraftEvidence("A Node", "a-node");
    const b = seedPublishedEvidence("B Node", "b-node");

    // Place only B so A and C remain unplaced
    arborModel.upsertNodePosition(b.id, 10, 20);

    const result = arborModel.getUnplacedEvidence();
    assert.equal(result.length, 2);
    assert.equal(result[0].title, "A Node");
    assert.equal(result[1].title, "C Node");
  });

  test("returns empty array when all evidence is placed", function () {
    const e1 = seedPublishedEvidence("E1", "e1");
    const e2 = seedDraftEvidence("E2", "e2");
    arborModel.upsertNodePosition(e1.id, 1, 2);
    arborModel.upsertNodePosition(e2.id, 3, 4);

    const result = arborModel.getUnplacedEvidence();
    assert.equal(result.length, 0);
  });
});

// ── getNodesAndEdges includes published_draft (admin view) ─────────────────────

describe("arbor.nodes: getNodesAndEdges published_draft", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("admin graph includes published_draft on nodes", function () {
    const pub = seedPublishedEvidence("Pub", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });
    assert.equal(graph.nodes.length, 2);

    const pubNode = graph.nodes.find(function (n) {
      return n.id === pub.id;
    });
    const draftNode = graph.nodes.find(function (n) {
      return n.id === draft.id;
    });
    assert.equal(pubNode.published_draft, 1);
    assert.equal(draftNode.published_draft, 0);
  });

  test("public graph omits draft evidence but published_draft is still on included nodes", function () {
    const pub = seedPublishedEvidence("Pub", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges(); // no includeDrafts → published only
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0].published_draft, 1);
  });

  test("admin graph includes draft nodes", function () {
    const pub = seedPublishedEvidence("Pub", "pub");
    const draft = seedDraftEvidence("Draft", "draft");

    db.prepare(
      "INSERT INTO arbor_edges (source_id, target_id, relationship_type) VALUES (?, ?, 'supports')",
    ).run(pub.id, draft.id);

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });
    assert.equal(graph.nodes.length, 2);
  });
});

// ── Cascade on delete ──────────────────────────────────────────────────────────

describe("arbor.nodes: cascade on evidence delete", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("arbor_nodes row is deleted when evidence is deleted", function () {
    const evidence = seedPublishedEvidence("Test Node", "test-node");
    arborModel.upsertNodePosition(evidence.id, 100, 200);

    // Delete the evidence
    db.prepare("DELETE FROM evidence WHERE id = ?").run(evidence.id);

    // The arbor_nodes row should be gone (CASCADE)
    const pos = arborModel.getNodePosition(evidence.id);
    assert.equal(pos, undefined);
  });
});
