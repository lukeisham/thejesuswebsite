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
