// Test data seeding helper — creates an in-memory SQLite database with sample
// rows for all major entities plus related child/junction rows. Every test suite
// that needs realistic data gets a fresh copy via seedTestDb(), ensuring test
// isolation (JS-2: no shared state).
//
// Usage:
//   const { seedTestDb } = require('./helpers/seed');
//   const db = seedTestDb();

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "schema.sql",
);
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "migrations",
);

/**
 * Create a fresh in-memory SQLite database with the full schema and sample data.
 * Returns the database instance ready for testing.
 *
 * @returns {import('better-sqlite3').Database}
 */
function seedTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  // Apply schema.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  // Apply migrations (skip 001 which duplicates schema.sql).
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && !name.startsWith("001_"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
  }

  // Seed sample data.
  seedData(db);

  return db;
}

function seedData(db) {
  // --- Evidence ---
  const insertEvidence = db.prepare(`
    INSERT INTO evidence (title, slug, description, primary_verse, gospel_category, published_draft)
    VALUES (@title, @slug, @description, @primary_verse, @gospel_category, @published_draft)
  `);

  insertEvidence.run({
    title: "The Empty Tomb",
    slug: "the-empty-tomb",
    description: "Evidence for the empty tomb",
    primary_verse: "Mark 16:1-8",
    gospel_category: "events",
    published_draft: 1,
  });

  insertEvidence.run({
    title: "Draft Evidence Item",
    slug: "draft-item",
    description: "This is a draft",
    primary_verse: "John 1:1",
    gospel_category: "theme",
    published_draft: 0,
  });

  // --- Challenges ---
  const insertChallenge = db.prepare(`
    INSERT INTO challenges (slug, academic_popular, challenge_title, challenge_summary, published_draft, challenge_rank_number)
    VALUES (@slug, @academic_popular, @challenge_title, @challenge_summary, @published_draft, @challenge_rank_number)
  `);

  insertChallenge.run({
    slug: "popular-challenge-1",
    academic_popular: "popular",
    challenge_title: "Popular Challenge One",
    challenge_summary: "A popular challenge summary",
    published_draft: 1,
    challenge_rank_number: 1,
  });

  insertChallenge.run({
    slug: "academic-challenge-1",
    academic_popular: "academic",
    challenge_title: "Academic Challenge One",
    challenge_summary: "An academic challenge summary",
    published_draft: 1,
    challenge_rank_number: 1,
  });

  // --- Responses ---
  db.prepare(
    `
    INSERT INTO responses (slug, challenge_id, response_title, response_content, published_draft)
    VALUES (@slug, @challenge_id, @response_title, @response_content, @published_draft)
  `,
  ).run({
    slug: "response-to-popular",
    challenge_id: 1,
    response_title: "Response to Popular Challenge",
    response_content: "This is a response.",
    published_draft: 1,
  });

  // --- Context Essays ---
  db.prepare(
    `
    INSERT INTO context_essays (slug, essay_title, essay_content, published_draft)
    VALUES (@slug, @essay_title, @essay_content, @published_draft)
  `,
  ).run({
    slug: "context-essay-1",
    essay_title: "Context Essay One",
    essay_content: "Content of the essay.",
    published_draft: 1,
  });

  // --- Blog Posts ---
  db.prepare(
    `
    INSERT INTO blog_posts (slug, blog_title, blog_content, published_draft)
    VALUES (@slug, @blog_title, @blog_content, @published_draft)
  `,
  ).run({
    slug: "blog-post-1",
    blog_title: "Blog Post One",
    blog_content: "Blog content.",
    published_draft: 1,
  });

  // --- Historiography ---
  db.prepare(
    `
    INSERT INTO historiography (slug, essay_title, essay_content, published_draft)
    VALUES (@slug, @essay_title, @essay_content, @published_draft)
  `,
  ).run({
    slug: "historiography-1",
    essay_title: "Historiography One",
    essay_content: "Historiography content.",
    published_draft: 1,
  });

  // --- MLA Sources ---
  db.prepare(
    `
    INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date, published_draft)
    VALUES (@mla_book_title, @mla_book_author, @mla_book_date, @published_draft)
  `,
  ).run({
    mla_book_title: "Test Book",
    mla_book_author: "Author Name",
    mla_book_date: "2024",
    published_draft: 1,
  });

  // --- Identifiers ---
  db.prepare(
    `
    INSERT INTO identifiers (isbn, isbn_book_title, published_draft)
    VALUES (@isbn, @isbn_book_title, @published_draft)
  `,
  ).run({
    isbn: "978-3-16-148410-0",
    isbn_book_title: "Test ISBN Book",
    published_draft: 1,
  });

  // --- About Pages ---
  db.prepare(
    `
    INSERT INTO about_pages (about_section_title, about_section_content, published_draft)
    VALUES (@about_section_title, @about_section_content, @published_draft)
  `,
  ).run({
    about_section_title: "About This Site",
    about_section_content: "This is a test about page.",
    published_draft: 1,
  });

  // --- Evidence pictures (child) ---
  db.prepare(
    `
    INSERT INTO evidence_pictures (evidence_id, sort_order, image_path, caption)
    VALUES (1, 0, '/uploads/tomb.jpg', 'The Garden Tomb')
  `,
  ).run();

  // --- Evidence MLA sources (junction) ---
  db.prepare(
    `
    INSERT INTO evidence_mla_sources (evidence_id, mla_source_id, citation_order)
    VALUES (1, 1, 0)
  `,
  ).run();

  // --- Evidence identifiers (junction) ---
  db.prepare(
    `
    INSERT INTO evidence_identifiers (evidence_id, identifier_id, citation_order)
    VALUES (1, 1, 0)
  `,
  ).run();

  // --- Evidence links (junction) ---
  db.prepare(
    `
    INSERT INTO evidence_links_evidence (source_evidence_id, target_evidence_id, sort_order)
    VALUES (1, 2, 0)
  `,
  ).run();

  // --- Challenge MLA sources (junction) ---
  db.prepare(
    `
    INSERT INTO challenge_mla_sources (challenge_id, mla_source_id, citation_order)
    VALUES (1, 1, 0)
  `,
  ).run();

  // --- Challenge identifiers (junction) ---
  db.prepare(
    `
    INSERT INTO challenge_identifiers (challenge_id, identifier_id, citation_order)
    VALUES (1, 1, 0)
  `,
  ).run();

  // --- Response breakout (child) ---
  db.prepare(
    `
    INSERT INTO response_breakouts (response_id, sort_order, title, content)
    VALUES (1, 0, 'Breakout Title', 'Breakout content.')
  `,
  ).run();

  // --- Response picture (child) ---
  db.prepare(
    `
    INSERT INTO response_pictures (response_id, sort_order, image_path, caption)
    VALUES (1, 0, '/uploads/response.jpg', 'Response Image')
  `,
  ).run();

  // --- Essay breakout ---
  db.prepare(
    `
    INSERT INTO essay_breakouts (context_essay_id, sort_order, title, content)
    VALUES (1, 0, 'Essay Breakout', 'Essay breakout content.')
  `,
  ).run();

  // --- Blog breakout ---
  db.prepare(
    `
    INSERT INTO blog_breakouts (blog_post_id, sort_order, title, content)
    VALUES (1, 0, 'Blog Breakout', 'Blog breakout content.')
  `,
  ).run();

  // --- Historiography breakout ---
  db.prepare(
    `
    INSERT INTO historiography_breakouts (historiography_id, sort_order, title, content)
    VALUES (1, 0, 'Historiography Breakout', 'Hist breakout content.')
  `,
  ).run();
}

module.exports = { seedTestDb };
