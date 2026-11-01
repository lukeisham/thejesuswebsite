// Smoke test for scripts/backfill-evidence-images.js — in-memory database and a
// temp folder, no network.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const { createTestDb } = require("./helpers/db");
const { backfillEvidenceImages } = require("../scripts/backfill-evidence-images");

let db;
let root;

async function writeJpeg(relPath, width, height) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    .jpeg()
    .toFile(file);
}

function insert(slug, image) {
  db.prepare("INSERT INTO evidence (title, slug, image) VALUES (?, ?, ?)").run(slug, slug, image);
}

const row = (slug) => db.prepare("SELECT image, image_width, image_height, image_display_path FROM evidence WHERE slug = ?").get(slug);

beforeEach(() => {
  db = createTestDb();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("backfillEvidenceImages", () => {
  test("a dry run changes nothing", async () => {
    await writeJpeg("2026/01/a.jpg", 1600, 1000);
    insert("a", "/uploads/2026/01/a.jpg");
    const result = await backfillEvidenceImages(db, root, false);
    assert.equal(result.candidates, 1);
    assert.equal(result.updated, 0);
    assert.equal(row("a").image, "/uploads/2026/01/a.jpg");
    assert.equal(row("a").image_width, null);
    assert.deepEqual(fs.readdirSync(path.join(root, "2026/01")), ["a.jpg"]);
  });

  test("--apply gives a new image path, the size and both files", async () => {
    await writeJpeg("2026/01/a.jpg", 1600, 1000);
    insert("a", "/uploads/2026/01/a.jpg");
    const result = await backfillEvidenceImages(db, root, true);
    assert.equal(result.updated, 1);
    const after = row("a");
    assert.notEqual(after.image, "/uploads/2026/01/a.jpg");
    assert.equal(after.image_width, 1440);
    assert.equal(after.image_height, 900);
    assert.match(after.image_display_path, /_720\.jpg$/);
    assert.ok(fs.existsSync(path.join(root, after.image.replace(/^\/uploads\//, ""))));
    assert.ok(fs.existsSync(path.join(root, after.image_display_path.replace(/^\/uploads\//, ""))));
    assert.ok(fs.existsSync(path.join(root, "2026/01/a.jpg")), "old file stays");
  });

  test("a row with a missing file is skipped with a warning", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    insert("gone", "/uploads/2026/01/gone.jpg");
    const result = await backfillEvidenceImages(db, root, true);
    assert.equal(result.skipped, 1);
    assert.equal(warn.mock.callCount(), 1);
    assert.equal(row("gone").image_width, null);
  });

  test("a second run changes nothing", async () => {
    await writeJpeg("2026/01/a.jpg", 1600, 1000);
    insert("a", "/uploads/2026/01/a.jpg");
    await backfillEvidenceImages(db, root, true);
    const first = row("a");
    const second = await backfillEvidenceImages(db, root, true);
    assert.equal(second.candidates, 0);
    assert.deepEqual(row("a"), first);
  });
});
