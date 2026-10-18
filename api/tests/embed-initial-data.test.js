// Tests the timeline era-page snapshot built by api/scripts/embed-initial-data.js.
// The era pages paint this snapshot first, so it must carry the node offsets
// that timeline-render.js reads. Uses an in-memory SQLite DB for isolation.

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
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

const { PAGES } = require("../scripts/embed-initial-data");
const evidenceModel = require("../models/evidence.model");

function lifeSnapshot() {
  const page = PAGES.find((p) => p.file === "evidence/timeline/life.html");
  assert.ok(page, "PAGES has no entry for evidence/timeline/life.html");
  return page.query();
}

function insertLifeEvent(overrides = {}) {
  return evidenceModel.create({
    title: "Snapshot Event",
    slug: `snapshot-event-${Math.random().toString(36).slice(2, 8)}`,
    timeline_era: "Life",
    timeline_period: "LifeBaptism",
    published_draft: 1,
    ...overrides,
  });
}

describe("embed-initial-data: timeline era snapshot", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("carries the stored offsets of a placed node", () => {
    insertLifeEvent({ timeline_offset_x: 0.25, timeline_offset_y: -0.3 });

    const rows = lifeSnapshot();

    assert.equal(rows.length, 1);
    assert.equal(rows[0].timeline_offset_x, 0.25);
    assert.equal(rows[0].timeline_offset_y, -0.3);
  });

  test("carries null offsets for a node nobody moved", () => {
    insertLifeEvent();

    const [row] = lifeSnapshot();

    assert.equal(row.timeline_offset_x, null);
    assert.equal(row.timeline_offset_y, null);
  });

  test("leaves out drafts and nodes without a period", () => {
    insertLifeEvent({ slug: "draft-event", published_draft: 0 });
    insertLifeEvent({ slug: "unplaced-event", timeline_period: null });

    assert.deepEqual(lifeSnapshot(), []);
  });
});
