// Relations helper tests — uses node:test + node:assert.
// Tests the generic child-row and junction helpers with an in-memory SQLite DB.
// Verifies get/replace round-trips, ordering, and empty-set handling.

// Must set before any config require so better-sqlite3 opens :memory:.
process.env.DB_PATH = ':memory:';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'database', 'migrations');

// Require config first — it reads process.env.DB_PATH once and returns a singleton.
// The helpers will share this same DB instance via their require('../../config').
const db = require('../config');

// Apply the full schema.
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Apply migrations, skipping 001 which duplicates schema.sql.
const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql') && !name.startsWith('001_'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  db.exec(sql);
}

// Now the helpers will use this same DB via their require('../../config').
const { getChildren, replaceChildren } = require('../models/relations/child-rows');
const { getLinked, replaceLinks } = require('../models/relations/junctions');

// ── Seed helpers ────────────────────────────────────────────────────────────
// Each helper uses a counter so slugs/titles stay unique across tests.

let evidenceCounter = 0;
function seedEvidence() {
  evidenceCounter++;
  return db
    .prepare('INSERT INTO evidence (title, slug, published_draft) VALUES (?, ?, 1)')
    .run('Test', 'test-' + evidenceCounter).lastInsertRowid;
}

function seedEvidencePicture(evidenceId, sortOrder, imagePath, caption) {
  return db
    .prepare(
      'INSERT INTO evidence_pictures (evidence_id, sort_order, image_path, caption) VALUES (?, ?, ?, ?)'
    )
    .run(evidenceId, sortOrder, imagePath, caption);
}

let mlaCounter = 0;
function seedMlaSource() {
  mlaCounter++;
  return db
    .prepare('INSERT INTO mla_sources (mla_book_title, published_draft) VALUES (?, 1)')
    .run('Book ' + mlaCounter).lastInsertRowid;
}

function seedEvidenceMlaLink(evidenceId, mlaId, order) {
  return db
    .prepare(
      'INSERT INTO evidence_mla_sources (evidence_id, mla_source_id, citation_order) VALUES (?, ?, ?)'
    )
    .run(evidenceId, mlaId, order);
}

// ── Child Rows ──────────────────────────────────────────────────────────────

describe('child-rows: getChildren', () => {
  test('returns empty array when no children exist', () => {
    const evidenceId = seedEvidence();
    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.deepStrictEqual(children, []);
  });

  test('returns children ordered by sort_order', () => {
    const evidenceId = seedEvidence();
    seedEvidencePicture(evidenceId, 2, '/b.jpg', 'B');
    seedEvidencePicture(evidenceId, 0, '/a.jpg', 'A');
    seedEvidencePicture(evidenceId, 1, '/c.jpg', 'C');

    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.equal(children.length, 3);
    assert.equal(children[0].sort_order, 0);
    assert.equal(children[1].sort_order, 1);
    assert.equal(children[2].sort_order, 2);
    assert.equal(children[0].caption, 'A');
  });

  test('returns only children for the specified parent', () => {
    const ev1 = seedEvidence();
    const ev2 = seedEvidence();
    seedEvidencePicture(ev1, 0, '/ev1.jpg', 'EV1');
    seedEvidencePicture(ev2, 0, '/ev2.jpg', 'EV2');

    const children = getChildren('evidence_pictures', 'evidence_id', ev1);
    assert.equal(children.length, 1);
    assert.equal(children[0].caption, 'EV1');
  });
});

describe('child-rows: replaceChildren', () => {
  test('inserts new children when table is empty', () => {
    const evidenceId = seedEvidence();
    replaceChildren('evidence_pictures', 'evidence_id', evidenceId, [
      { image_path: '/a.jpg', caption: 'First' },
      { image_path: '/b.jpg', caption: 'Second' },
    ], ['image_path', 'caption']);

    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.equal(children.length, 2);
    assert.equal(children[0].sort_order, 0);
    assert.equal(children[0].caption, 'First');
    assert.equal(children[1].sort_order, 1);
    assert.equal(children[1].caption, 'Second');
  });

  test('replaces existing children', () => {
    const evidenceId = seedEvidence();
    seedEvidencePicture(evidenceId, 0, '/old.jpg', 'Old');
    seedEvidencePicture(evidenceId, 1, '/old2.jpg', 'Old2');

    replaceChildren('evidence_pictures', 'evidence_id', evidenceId, [
      { image_path: '/new.jpg', caption: 'New' },
    ], ['image_path', 'caption']);

    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.equal(children.length, 1);
    assert.equal(children[0].caption, 'New');
  });

  test('empty array deletes all children', () => {
    const evidenceId = seedEvidence();
    seedEvidencePicture(evidenceId, 0, '/img.jpg', 'Img');

    replaceChildren('evidence_pictures', 'evidence_id', evidenceId, [], ['image_path', 'caption']);

    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.equal(children.length, 0);
  });

  test('null/undefined rows argument deletes all children', () => {
    const evidenceId = seedEvidence();
    seedEvidencePicture(evidenceId, 0, '/img.jpg', 'Img');

    replaceChildren('evidence_pictures', 'evidence_id', evidenceId, undefined, ['image_path', 'caption']);

    const children = getChildren('evidence_pictures', 'evidence_id', evidenceId);
    assert.equal(children.length, 0);
  });
});

// ── Junctions ───────────────────────────────────────────────────────────────

describe('junctions: getLinked', () => {
  test('returns empty array when no links exist', () => {
    const evidenceId = seedEvidence();
    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.deepStrictEqual(links, []);
  });

  test('returns links ordered by the order column', () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mla2, 0);
    seedEvidenceMlaLink(evidenceId, mla1, 2);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 2);
    assert.equal(links[0].citation_order, 0);
    assert.equal(links[1].citation_order, 2);
  });
});

describe('junctions: replaceLinks', () => {
  test('inserts new links', () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();

    replaceLinks('evidence_mla_sources', 'evidence_id', 'mla_source_id', 'citation_order', evidenceId, [mlaId]);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 1);
    assert.equal(links[0].mla_source_id, mlaId);
    assert.equal(links[0].citation_order, 0);
  });

  test('replaces existing links', () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mla1, 0);

    replaceLinks('evidence_mla_sources', 'evidence_id', 'mla_source_id', 'citation_order', evidenceId, [mla2]);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 1);
    assert.equal(links[0].mla_source_id, mla2);
  });

  test('empty array deletes all links', () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mlaId, 0);

    replaceLinks('evidence_mla_sources', 'evidence_id', 'mla_source_id', 'citation_order', evidenceId, []);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 0);
  });

  test('null/undefined rows deletes all links', () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mlaId, 0);

    replaceLinks('evidence_mla_sources', 'evidence_id', 'mla_source_id', 'citation_order', evidenceId, undefined);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 0);
  });

  test('multiple links are ordered sequentially', () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    const mla3 = seedMlaSource();

    replaceLinks('evidence_mla_sources', 'evidence_id', 'mla_source_id', 'citation_order', evidenceId, [mla1, mla2, mla3]);

    const links = getLinked('evidence_mla_sources', 'evidence_id', 'citation_order', evidenceId);
    assert.equal(links.length, 3);
    assert.equal(links[0].citation_order, 0);
    assert.equal(links[1].citation_order, 1);
    assert.equal(links[2].citation_order, 2);
  });
});
