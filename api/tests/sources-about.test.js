// Sources & About CRUD tests — uses node:test + node:assert.
// Tests mla_sources and about_pages create/view/edit/delete operations.
// Uses an in-memory SQLite DB for isolation.

process.env.DB_PATH = ':memory:';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');

const db = require('../config');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

const mlaSourceModel = require('../models/mla-source.model');
const aboutModel = require('../models/about.model');

// ── MLA Sources ─────────────────────────────────────────────────────────────

describe('mla_sources: CRUD', () => {
  beforeEach(() => {
    db.exec('DELETE FROM mla_sources');
  });

  test('create inserts a new mla source', () => {
    const created = mlaSourceModel.create({
      mla_book_title: 'The Historical Jesus',
      mla_book_author: 'John P. Meier',
      mla_book_date: '1991',
    });

    assert.ok(created);
    assert.ok(created.id > 0);
    assert.equal(created.mla_book_title, 'The Historical Jesus');
    assert.equal(created.mla_book_author, 'John P. Meier');
  });

  test('create with website fields', () => {
    const created = mlaSourceModel.create({
      mla_website_title: 'Biblical Archaeology',
      mla_website_url: 'https://example.com',
      mla_website_date: '2024',
      mla_website_author: 'Dr. Scholar',
    });

    assert.ok(created);
    assert.equal(created.mla_website_title, 'Biblical Archaeology');
    assert.equal(created.mla_website_url, 'https://example.com');
  });

  test('create with journal article fields', () => {
    const created = mlaSourceModel.create({
      mla_journal_article_author: 'E.P. Sanders',
      mla_journal_article_title: 'Jesus and Judaism',
      mla_journal_title: 'Journal of Biblical Literature',
      mla_journal_volume: '104',
      mla_journal_date: '1985',
    });

    assert.ok(created);
    assert.equal(created.mla_journal_article_author, 'E.P. Sanders');
    assert.equal(created.mla_journal_title, 'Journal of Biblical Literature');
  });

  test('getAll returns all sources', () => {
    mlaSourceModel.create({ mla_book_title: 'Book 1' });
    mlaSourceModel.create({ mla_book_title: 'Book 2' });

    const all = mlaSourceModel.getAll();
    assert.equal(all.length, 2);
  });

  test('getById returns the correct source', () => {
    const created = mlaSourceModel.create({ mla_book_title: 'Find Me' });
    const found = mlaSourceModel.getById(created.id);

    assert.ok(found);
    assert.equal(found.mla_book_title, 'Find Me');
  });

  test('getById returns undefined for non-existent id', () => {
    assert.equal(mlaSourceModel.getById(99999), undefined);
  });

  test('update changes fields', () => {
    const created = mlaSourceModel.create({
      mla_book_title: 'Original Title',
      mla_book_author: 'Original Author',
    });

    const updated = mlaSourceModel.update(created.id, {
      mla_book_title: 'Updated Title',
    });

    assert.equal(updated.mla_book_title, 'Updated Title');
    assert.equal(updated.mla_book_author, 'Original Author'); // unchanged
  });

  test('update ignores non-writable fields', () => {
    const created = mlaSourceModel.create({ mla_book_title: 'Safe' });
    const updated = mlaSourceModel.update(created.id, {
      id: 99999, // should be ignored
      mla_book_title: 'Still Safe',
      nonexistent_field: 'should be ignored',
    });

    assert.equal(updated.id, created.id); // id unchanged
    assert.equal(updated.mla_book_title, 'Still Safe');
    assert.equal(updated.nonexistent_field, undefined);
  });

  test('update returns undefined for non-existent id', () => {
    assert.equal(mlaSourceModel.update(99999, { mla_book_title: 'Ghost' }), undefined);
  });

  test('update with no fields returns existing row', () => {
    const created = mlaSourceModel.create({ mla_book_title: 'Unchanged' });
    const updated = mlaSourceModel.update(created.id, {});

    assert.ok(updated);
    assert.equal(updated.mla_book_title, 'Unchanged');
  });

  test('remove deletes the source', () => {
    const created = mlaSourceModel.create({ mla_book_title: 'To Delete' });
    const removed = mlaSourceModel.remove(created.id);

    assert.equal(removed, true);
    assert.equal(mlaSourceModel.getById(created.id), undefined);
  });

  test('remove returns false for non-existent id', () => {
    assert.equal(mlaSourceModel.remove(99999), false);
  });

  test('published_draft defaults to 0', () => {
    const created = mlaSourceModel.create({ mla_book_title: 'Default Draft' });
    assert.equal(created.published_draft, 0);
  });

  test('can set published_draft', () => {
    const created = mlaSourceModel.create({
      mla_book_title: 'Published Book',
      published_draft: 1,
    });
    assert.equal(created.published_draft, 1);
  });
});

// ── About Pages ─────────────────────────────────────────────────────────────

describe('about_pages: CRUD', () => {
  beforeEach(() => {
    db.exec('DELETE FROM about_pages');
  });

  test('create inserts a new about section', () => {
    const created = aboutModel.create({
      about_section_title: 'Our Mission',
      about_section_content: 'This website exists to...',
    });

    assert.ok(created);
    assert.ok(created.id > 0);
    assert.equal(created.about_section_title, 'Our Mission');
    assert.equal(created.about_section_content, 'This website exists to...');
  });

  test('getAll returns all sections ordered by id', () => {
    aboutModel.create({ about_section_title: 'Section 1' });
    aboutModel.create({ about_section_title: 'Section 2' });

    const all = aboutModel.getAll();
    assert.equal(all.length, 2);
    assert.equal(all[0].about_section_title, 'Section 1');
    assert.equal(all[1].about_section_title, 'Section 2');
  });

  test('getAllPublished returns only published sections', () => {
    aboutModel.create({ about_section_title: 'Published', published_draft: 1 });
    aboutModel.create({ about_section_title: 'Draft', published_draft: 0 });

    const published = aboutModel.getAllPublished();
    assert.equal(published.length, 1);
    assert.equal(published[0].about_section_title, 'Published');
  });

  test('getById returns the correct section', () => {
    const created = aboutModel.create({ about_section_title: 'Find Me' });
    const found = aboutModel.getById(created.id);

    assert.ok(found);
    assert.equal(found.about_section_title, 'Find Me');
  });

  test('getById returns undefined for non-existent id', () => {
    assert.equal(aboutModel.getById(99999), undefined);
  });

  test('update changes fields', () => {
    const created = aboutModel.create({
      about_section_title: 'Original',
      about_section_content: 'Original content',
    });

    const updated = aboutModel.update(created.id, {
      about_section_title: 'Updated',
      about_section_content: 'Updated content',
    });

    assert.equal(updated.about_section_title, 'Updated');
    assert.equal(updated.about_section_content, 'Updated content');
  });

  test('update returns undefined for non-existent id', () => {
    assert.equal(aboutModel.update(99999, { about_section_title: 'Ghost' }), undefined);
  });

  test('update partial — only changes provided fields', () => {
    const created = aboutModel.create({
      about_section_title: 'Original Title',
      about_section_content: 'Original content',
      metadata_keywords: 'test, data',
    });

    const updated = aboutModel.update(created.id, {
      about_section_title: 'New Title',
    });

    assert.equal(updated.about_section_title, 'New Title');
    assert.equal(updated.about_section_content, 'Original content');
  });

  test('remove deletes the section', () => {
    const created = aboutModel.create({ about_section_title: 'To Delete' });
    const removed = aboutModel.remove(created.id);

    assert.equal(removed, true);
    assert.equal(aboutModel.getById(created.id), undefined);
  });

  test('remove returns false for non-existent id', () => {
    assert.equal(aboutModel.remove(99999), false);
  });

  test('metadata_keywords and version_update are writable', () => {
    const created = aboutModel.create({
      about_section_title: 'Meta Test',
      metadata_keywords: 'jesus, history',
      version_update: 3,
    });

    assert.equal(created.metadata_keywords, 'jesus, history');
    assert.equal(created.version_update, 3);
  });
});
