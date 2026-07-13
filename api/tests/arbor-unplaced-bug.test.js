/**
 * Arbor diagram bug reproduction test.
 *
 * Bug: Published evidence without arbor_nodes row does not appear
 * in admin editor (neither canvas nor holding pen).
 *
 * Fix: getNodesAndEdges({ includeDrafts: true }) now includes ALL evidence,
 * so admins can see everything. Unplaced evidence has x/y = null.
 * The holding pen (getUnplacedEvidence) separately shows unplaced-only.
 */

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
  "schema.sql"
);

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const arborModel = require("../models/arbor.model");
const evidenceModel = require("../models/evidence.model");

describe("arbor-unplaced-bug: Published evidence visibility", function () {
  beforeEach(function () {
    db.exec("DELETE FROM arbor_nodes");
    db.exec("DELETE FROM arbor_edges");
    db.exec("DELETE FROM evidence");
  });

  test("published evidence without arbor_nodes row appears in GET /arbor (public) only if connected", function () {
    const published = evidenceModel.create({
      title: "Unconnected Published",
      slug: "unconnected-pub",
      published_draft: 1,
      description: "Not in any edge",
      primary_verse: "John 1:1"
    });

    // Unconnected, unplaced evidence should NOT appear in public graph
    const graph = arborModel.getNodesAndEdges({ includeDrafts: false });
    assert.equal(
      graph.nodes.filter(n => n.id === published.id).length,
      0,
      "unconnected unplaced published evidence should NOT appear in public"
    );
  });

  test("published evidence without arbor_nodes row appears in GET /arbor/admin (admin graph)", function () {
    const published = evidenceModel.create({
      title: "Test Published for Admin",
      slug: "test-published-admin",
      published_draft: 1,
      description: "For admin visibility",
      primary_verse: "John 1:1"
    });

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });

    assert.ok(
      graph.nodes.some(n => n.id === published.id),
      "unplaced published evidence should appear in admin graph"
    );
    const node = graph.nodes.find(n => n.id === published.id);
    assert.equal(node.title, "Test Published for Admin");
    assert.equal(node.published_draft, 1);
    assert.equal(node.x, null, "unplaced nodes should have null x/y");
    assert.equal(node.y, null, "unplaced nodes should have null x/y");
  });

  test("published evidence without arbor_nodes row appears in GET /arbor/admin/unplaced (holding pen)", function () {
    const published = evidenceModel.create({
      title: "Test Published for Pen",
      slug: "test-published-pen",
      published_draft: 1,
      description: "A published evidence record",
      primary_verse: "John 1:1"
    });

    const unplaced = arborModel.getUnplacedEvidence();

    assert.ok(
      unplaced.some(e => e.id === published.id),
      "published evidence should appear in unplaced (holding pen)"
    );
    const evidence = unplaced.find(e => e.id === published.id);
    assert.equal(evidence.title, "Test Published for Pen");
    assert.equal(evidence.published_draft, 1);
  });

  test("draft evidence without arbor_nodes row is excluded from public graph", function () {
    const draft = evidenceModel.create({
      title: "Test Draft",
      slug: "test-draft",
      published_draft: 0,
      description: "A draft evidence record",
      primary_verse: "John 1:1"
    });

    const graph = arborModel.getNodesAndEdges({ includeDrafts: false });

    assert.equal(
      graph.nodes.filter(n => n.id === draft.id).length,
      0,
      "draft evidence should NOT appear in public graph"
    );
  });

  test("draft evidence without arbor_nodes row appears in admin graph", function () {
    const draft = evidenceModel.create({
      title: "Test Draft for Admin",
      slug: "test-draft-admin",
      published_draft: 0,
      description: "A draft evidence record",
      primary_verse: "John 1:1"
    });

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });

    assert.ok(
      graph.nodes.some(n => n.id === draft.id),
      "draft evidence should appear in admin graph"
    );
    const node = graph.nodes.find(n => n.id === draft.id);
    assert.equal(node.title, "Test Draft for Admin");
    assert.equal(node.published_draft, 0);
  });

  test("draft evidence without arbor_nodes row appears in holding pen", function () {
    const draft = evidenceModel.create({
      title: "Test Draft for Pen",
      slug: "test-draft-pen",
      published_draft: 0,
      description: "A draft evidence record",
      primary_verse: "John 1:1"
    });

    const unplaced = arborModel.getUnplacedEvidence();

    assert.ok(
      unplaced.some(e => e.id === draft.id),
      "draft evidence should appear in unplaced (holding pen)"
    );
    const evidence = unplaced.find(e => e.id === draft.id);
    assert.equal(evidence.title, "Test Draft for Pen");
    assert.equal(evidence.published_draft, 0);
  });

  test("published evidence with arbor_nodes row appears on canvas", function () {
    const published = evidenceModel.create({
      title: "Test Published with Position",
      slug: "test-published-positioned",
      published_draft: 1,
      description: "A published evidence record",
      primary_verse: "John 1:1"
    });

    arborModel.upsertNodePosition(published.id, 100, 200);

    const graph = arborModel.getNodesAndEdges({ includeDrafts: false });

    assert.ok(
      graph.nodes.some(n => n.id === published.id),
      "positioned published evidence should appear in public graph"
    );
    const node = graph.nodes.find(n => n.id === published.id);
    assert.equal(node.x, 100);
    assert.equal(node.y, 200);
  });

  test("published evidence with arbor_nodes row does NOT appear in holding pen", function () {
    const published = evidenceModel.create({
      title: "Test Published Placed",
      slug: "test-published-placed",
      published_draft: 1,
      description: "A published evidence record",
      primary_verse: "John 1:1"
    });

    arborModel.upsertNodePosition(published.id, 100, 200);

    const unplaced = arborModel.getUnplacedEvidence();

    assert.equal(
      unplaced.filter(e => e.id === published.id).length,
      0,
      "placed published evidence should NOT appear in unplaced"
    );
  });

  test("mixed published and draft evidence all visible to admin", function () {
    const published1 = evidenceModel.create({
      title: "Published 1",
      slug: "pub-1",
      published_draft: 1
    });

    const published2 = evidenceModel.create({
      title: "Published 2",
      slug: "pub-2",
      published_draft: 1
    });

    const draft1 = evidenceModel.create({
      title: "Draft 1",
      slug: "draft-1",
      published_draft: 0
    });

    arborModel.upsertNodePosition(published1.id, 100, 200);

    // Admin canvas should show all evidence
    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });
    assert.ok(
      graph.nodes.some(n => n.id === published1.id),
      "placed published should be on canvas"
    );
    assert.ok(
      graph.nodes.some(n => n.id === published2.id),
      "unplaced published should also be visible in admin graph"
    );
    assert.ok(
      graph.nodes.some(n => n.id === draft1.id),
      "unplaced draft should also be visible in admin graph"
    );

    // Admin pen should show unplaced (published2 and draft1)
    const unplaced = arborModel.getUnplacedEvidence();
    assert.ok(
      unplaced.some(e => e.id === published2.id),
      "unplaced published should be in pen"
    );
    assert.ok(
      unplaced.some(e => e.id === draft1.id),
      "unplaced draft should be in pen"
    );
  });

  test("admin graph shows unplaced nodes with null x/y positions", function () {
    const unplaced = evidenceModel.create({
      title: "Unplaced",
      slug: "unplaced",
      published_draft: 1
    });

    const graph = arborModel.getNodesAndEdges({ includeDrafts: true });
    const node = graph.nodes.find(n => n.id === unplaced.id);

    assert.ok(node, "unplaced evidence should exist in graph");
    assert.equal(node.x, null, "unplaced node should have x=null");
    assert.equal(node.y, null, "unplaced node should have y=null");
  });
});
