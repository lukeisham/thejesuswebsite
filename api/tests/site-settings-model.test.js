// Site Settings model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests that get() returns the seeded singleton row,
// update() changes and persists values, empty/blank payloads are rejected,
// and unknown fields are silently ignored (pickWritable).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema applied — site_settings is seeded via
// schema.sql's INSERT (see database/schema.sql).
const db = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: db,
};

const siteSettingsModel = require("../models/site-settings.model");

// ── get() ────────────────────────────────────────────────────────────────────

describe("get()", () => {
  test("returns the seeded singleton row", () => {
    const settings = siteSettingsModel.get();
    assert.ok(settings);
    assert.equal(settings.id, 1);
    assert.equal(settings.title, "The Jesus Website");
    assert.ok(settings.description.length > 0);
    assert.ok(settings.og_image);
  });
});

// ── update() ─────────────────────────────────────────────────────────────────

describe("update()", () => {
  test("changes and persists title, description, and og_image", () => {
    const updated = siteSettingsModel.update({
      title: "New Site Title",
      description: "New description text.",
      og_image: "https://example.com/new-image.jpg",
    });

    assert.equal(updated.title, "New Site Title");
    assert.equal(updated.description, "New description text.");
    assert.equal(updated.og_image, "https://example.com/new-image.jpg");

    // Persisted — a fresh get() reflects the change.
    assert.deepEqual(siteSettingsModel.get(), updated);

    // Restore for other tests in this file.
    siteSettingsModel.update({
      title: "The Jesus Website",
      description:
        "A comprehensive survey of the historical evidence for Jesus the Messiah, presenting about 300 historical data points from the four gospels.",
      og_image:
        "https://thejesuswebsite.org/assets/images/jesus_walking_on_water.jpg",
    });
  });

  test("updates a single field without touching the others", () => {
    const before = siteSettingsModel.get();
    const updated = siteSettingsModel.update({ og_image: "https://example.com/only-image.jpg" });

    assert.equal(updated.og_image, "https://example.com/only-image.jpg");
    assert.equal(updated.title, before.title);
    assert.equal(updated.description, before.description);

    siteSettingsModel.update({ og_image: before.og_image });
  });

  test("returns undefined (no-op) for an empty payload", () => {
    assert.equal(siteSettingsModel.update({}), undefined);
  });

  test("returns undefined when every provided field is blank", () => {
    assert.equal(
      siteSettingsModel.update({ title: "  ", description: "" }),
      undefined,
    );
  });

  test("ignores unknown/unwritable fields", () => {
    const before = siteSettingsModel.get();
    const result = siteSettingsModel.update({ id: 999, unknown_field: "x" });
    assert.equal(result, undefined);
    assert.deepEqual(siteSettingsModel.get(), before);
  });

  test("title is required — a blank title is dropped, not persisted as empty", () => {
    const before = siteSettingsModel.get();
    const updated = siteSettingsModel.update({
      title: "",
      description: "Description only update.",
    });

    // Title untouched (blank was dropped); description did change.
    assert.equal(updated.title, before.title);
    assert.equal(updated.description, "Description only update.");

    siteSettingsModel.update({ description: before.description });
  });
});
