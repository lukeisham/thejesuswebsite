// Timeline model tests — uses node:test + node:assert.
// Tests getUnplacedEvents, getTimelineEvents draft filtering, and null-clearing.
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

const timelineModel = require("../models/timeline.model");
const evidenceModel = require("../models/evidence.model");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Insert a minimal evidence row and return the full record. */
function insertEvidence(overrides = {}) {
  const base = {
    title: "Test Evidence",
    slug: `test-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    published_draft: 1,
    ...overrides,
  };
  return evidenceModel.create(base);
}

// ── getUnplacedEvents ────────────────────────────────────────────────────────

describe("timeline: getUnplacedEvents", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("returns evidence with null period when era IS set", () => {
    insertEvidence({
      title: "Has era no period",
      slug: "has-era-no-period",
      timeline_era: "Life",
      timeline_period: null,
    });
    insertEvidence({
      title: "Fully placed",
      slug: "fully-placed",
      timeline_era: "Life",
      timeline_period: "LifeBaptism",
    });

    const unplaced = timelineModel.getUnplacedEvents();

    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0].title, "Has era no period");
    assert.equal(unplaced[0].timeline_era, "Life");
    assert.equal(unplaced[0].timeline_period, null);
  });

  test("returns evidence with null period when era IS NULL (Group A requirement)", () => {
    insertEvidence({
      title: "No era no period",
      slug: "no-era-no-period",
      timeline_era: null,
      timeline_period: null,
    });
    insertEvidence({
      title: "Has era and period",
      slug: "has-era-and-period",
      timeline_era: "EarlyLife",
      timeline_period: "EarlyLifeBirth",
    });

    const unplaced = timelineModel.getUnplacedEvents();

    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0].title, "No era no period");
    assert.equal(unplaced[0].timeline_era, null);
    assert.equal(unplaced[0].timeline_period, null);
  });

  test("sorts rows with era before rows with null era", () => {
    insertEvidence({
      title: "Null era",
      slug: "null-era",
      timeline_era: null,
      timeline_period: null,
    });
    insertEvidence({
      title: "Has era",
      slug: "has-era",
      timeline_era: "EarlyLife",
      timeline_period: null,
    });

    const unplaced = timelineModel.getUnplacedEvents();

    assert.equal(unplaced.length, 2);
    // Rows with an era should sort first; null-era rows sort last.
    assert.equal(unplaced[0].title, "Has era");
    assert.equal(unplaced[1].title, "Null era");
  });

  test("includes gospel_category in returned rows", () => {
    insertEvidence({
      title: "With gospel category",
      slug: "with-gospel-category",
      timeline_era: "PassionWeek",
      timeline_period: null,
      gospel_category: "events",
    });

    const unplaced = timelineModel.getUnplacedEvents();

    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0].gospel_category, "events");
  });

  test("returns empty array when all evidence has a period", () => {
    insertEvidence({
      title: "Fully placed",
      slug: "fully-placed-2",
      timeline_era: "Life",
      timeline_period: "LifeTradie",
    });
    insertEvidence({
      title: "Also placed",
      slug: "also-placed",
      timeline_era: "PassionWeek",
      timeline_period: "PassionFridayDeath",
    });

    const unplaced = timelineModel.getUnplacedEvents();

    assert.equal(unplaced.length, 0);
  });
});

// ── getTimelineEvents draft filtering ────────────────────────────────────────

describe("timeline: getTimelineEvents draft filtering", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("excludes draft (published_draft=0) evidence by default (Group A)", () => {
    insertEvidence({
      title: "Published event",
      slug: "published-event",
      timeline_era: "Life",
      timeline_period: "LifeBaptism",
      published_draft: 1,
    });
    insertEvidence({
      title: "Draft event",
      slug: "draft-event",
      timeline_era: "Life",
      timeline_period: "LifeTradie",
      published_draft: 0,
    });

    const events = timelineModel.getTimelineEvents();

    assert.equal(events.length, 1);
    assert.equal(events[0].title, "Published event");
  });

  test("includes drafts when includeDrafts: true", () => {
    insertEvidence({
      title: "Published event",
      slug: "published-event-2",
      timeline_era: "Life",
      timeline_period: "LifeBaptism",
      published_draft: 1,
    });
    insertEvidence({
      title: "Draft event",
      slug: "draft-event-2",
      timeline_era: "Life",
      timeline_period: "LifeTradie",
      published_draft: 0,
    });

    const events = timelineModel.getTimelineEvents({ includeDrafts: true });

    assert.equal(events.length, 2);
    const titles = events.map((e) => e.title).sort();
    assert.deepEqual(titles, ["Draft event", "Published event"]);
  });

  test("only includes evidence with a period (not unplaced items)", () => {
    insertEvidence({
      title: "Placed",
      slug: "placed-item",
      timeline_era: "EarlyLife",
      timeline_period: "EarlyLifeBirth",
      published_draft: 1,
    });
    insertEvidence({
      title: "Unplaced (has era)",
      slug: "unplaced-has-era",
      timeline_era: "EarlyLife",
      timeline_period: null,
      published_draft: 1,
    });
    insertEvidence({
      title: "Unplaced (null era)",
      slug: "unplaced-null-era",
      timeline_era: null,
      timeline_period: null,
      published_draft: 1,
    });

    const events = timelineModel.getTimelineEvents();

    assert.equal(events.length, 1);
    assert.equal(events[0].title, "Placed");
  });
});

// ── Null clearing via evidence.update ────────────────────────────────────────

describe("timeline: null clearing via evidence update", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("clears both timeline_era and timeline_period to null (Group A)", () => {
    const created = insertEvidence({
      title: "Will be cleared",
      slug: "will-be-cleared",
      timeline_era: "PassionWeek",
      timeline_period: "PassionFridayDeath",
    });

    assert.equal(created.timeline_era, "PassionWeek");
    assert.equal(created.timeline_period, "PassionFridayDeath");

    const updated = evidenceModel.update(created.id, {
      timeline_era: null,
      timeline_period: null,
    });

    assert.equal(updated.timeline_era, null);
    assert.equal(updated.timeline_period, null);
  });

  test("clears only timeline_period, leaving era intact", () => {
    const created = insertEvidence({
      title: "Clear period only",
      slug: "clear-period-only",
      timeline_era: "GalileeMinistry",
      timeline_period: "GalileeSermonMount",
    });

    const updated = evidenceModel.update(created.id, {
      timeline_period: null,
    });

    assert.equal(updated.timeline_era, "GalileeMinistry");
    assert.equal(updated.timeline_period, null);
  });

  test("clears only timeline_era, leaving period intact", () => {
    const created = insertEvidence({
      title: "Clear era only",
      slug: "clear-era-only",
      timeline_era: "Life",
      timeline_period: "LifeTemptation",
    });

    const updated = evidenceModel.update(created.id, {
      timeline_era: null,
    });

    assert.equal(updated.timeline_era, null);
    assert.equal(updated.timeline_period, "LifeTemptation");
  });

  test("cleared row appears in getUnplacedEvents (period is null)", () => {
    const created = insertEvidence({
      title: "To unplace",
      slug: "to-unplace",
      timeline_era: "Life",
      timeline_period: "LifeBaptism",
    });

    evidenceModel.update(created.id, { timeline_period: null });

    const unplaced = timelineModel.getUnplacedEvents();
    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0].title, "To unplace");
    assert.equal(unplaced[0].timeline_era, "Life");
    assert.equal(unplaced[0].timeline_period, null);
  });
});
