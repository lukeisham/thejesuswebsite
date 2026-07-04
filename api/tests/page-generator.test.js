// Page generator tests — uses node:test + node:assert with an in-memory
// SQLite database and a temporary filesystem. Tests that generatePage produces
// correct escaped SEO metadata, rejects unpublished slugs, and removePage
// deletes the file.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema applied.
const db = createTestDb();

// Mock the config module so the generator uses our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: db,
};

// We need to mock the content-pages config to point to a temp directory
// instead of the real frontend/ paths. We'll use Module._cache to override it.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "page-gen-test-"));

// Copy the real template files to the temp dir so we can use them as templates.
const realEvidenceTemplate = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "evidence",
  "single",
  "[slug].html",
);
const tempEvidenceDir = path.join(tmpDir, "evidence", "single");
fs.mkdirSync(tempEvidenceDir, { recursive: true });
fs.copyFileSync(
  realEvidenceTemplate,
  path.join(tempEvidenceDir, "[slug].html"),
);

// Override the content-pages config to use temp paths.
const contentPagesPath = require.resolve(
  path.resolve(__dirname, "..", "config", "content-pages"),
);
const realContentPages = require("../config/content-pages");
Module._cache[contentPagesPath] = {
  id: contentPagesPath,
  filename: contentPagesPath,
  loaded: true,
  exports: {
    CONTENT_PAGES: {
      evidence: {
        ...realContentPages.CONTENT_PAGES.evidence,
        templatePath: path.join(tempEvidenceDir, "[slug].html"),
        outputDir: tempEvidenceDir,
      },
      essays: {
        ...realContentPages.CONTENT_PAGES.essays,
        templatePath: path.join(tempEvidenceDir, "[slug].html"),
        outputDir: path.join(tmpDir, "contextual-essays"),
      },
      "blog-posts": {
        ...realContentPages.CONTENT_PAGES["blog-posts"],
        templatePath: path.join(tempEvidenceDir, "[slug].html"),
        outputDir: path.join(tmpDir, "news-and-blog", "blog"),
      },
    },
  },
};

const { generatePage, removePage } = require("../services/page-generator");

// ── Helpers ─────────────────────────────────────────────────────────────────

function seedEvidence(overrides = {}) {
  return db
    .prepare(
      `INSERT INTO evidence (title, slug, description, published_draft, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      overrides.title || "Test Evidence",
      overrides.slug || "test-evidence",
      overrides.description || "Test description.",
      overrides.published_draft ?? 1,
      overrides.created_at || "2026-01-01T00:00:00Z",
    );
}

function clearAll() {
  db.exec("DELETE FROM evidence");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM blog_posts");
}

afterEach(() => {
  // Clean up generated files from the output dirs.
  for (const dir of [tempEvidenceDir, path.join(tmpDir, "contextual-essays"), path.join(tmpDir, "news-and-blog", "blog")]) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f !== "[slug].html") {
          fs.unlinkSync(path.join(dir, f));
        }
      }
    }
  }
});

// ── generatePage ─────────────────────────────────────────────────────────────

describe("generatePage", () => {
  beforeEach(clearAll);

  test("generates a file with the correct title in <title>", () => {
    seedEvidence({ slug: "test-item", title: "The Pilate Stone" });

    const result = generatePage("evidence", "test-item");
    assert.ok(result.ok);

    const output = fs.readFileSync(result.path, "utf8");
    assert.ok(
      output.includes("<title>The Pilate Stone — Evidence — The Jesus Website</title>"),
    );
  });

  test("includes escaped OG tags", () => {
    seedEvidence({
      slug: "test-item",
      title: "Test & Evidence",
      description: "A description with \"quotes\".",
    });

    const result = generatePage("evidence", "test-item");
    const output = fs.readFileSync(result.path, "utf8");

    // Ampersand in title should be escaped.
    assert.ok(output.includes("Test &amp; Evidence"));
    // Quotes in description should be escaped.
    assert.ok(output.includes("&quot;quotes&quot;"));
    // Raw ampersand should not appear in the title.
    assert.ok(!output.includes("<title>Test & Evidence"));
  });

  test("includes the canonical URL", () => {
    seedEvidence({ slug: "test-item", title: "Test" });

    const result = generatePage("evidence", "test-item");
    const output = fs.readFileSync(result.path, "utf8");

    assert.ok(
      output.includes('href="https://www.thejesuswebsite.org/evidence/single/test-item"'),
    );
  });

  test("includes JSON-LD script", () => {
    seedEvidence({ slug: "test-item", title: "Test Item" });

    const result = generatePage("evidence", "test-item");
    const output = fs.readFileSync(result.path, "utf8");

    assert.ok(output.includes('application/ld+json'));
    assert.ok(output.includes('"@type":"CreativeWork"'));
    assert.ok(output.includes('"headline":"Test Item"'));
  });

  test("rejects an unpublished slug", () => {
    seedEvidence({
      slug: "draft-item",
      title: "Draft",
      published_draft: 0,
    });

    const result = generatePage("evidence", "draft-item");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("No published row found"));
  });

  test("rejects an unknown content type", () => {
    const result = generatePage("nonexistent", "anything");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Unknown content type"));
  });

  test("rejects an empty slug", () => {
    const result = generatePage("evidence", "");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("slug"));
  });

  test("does NOT include a second <h1> in the output", () => {
    // The template already has one <h1> — the SEO block must not add another.
    seedEvidence({ slug: "test-item", title: "Single H1 Test" });

    const result = generatePage("evidence", "test-item");
    const output = fs.readFileSync(result.path, "utf8");

    // Count <h1 occurrences (case-insensitive).
    const h1Matches = output.match(/<h1[ >]/gi);
    // The template has exactly one <h1> — the sr-only page heading.
    assert.ok(h1Matches);
    assert.equal(h1Matches.length, 1);
  });

  test("generates page for type without description column", () => {
    // essays don't have a description column — should still work.
    db.prepare(
      `INSERT INTO context_essays (slug, essay_title, published_draft)
       VALUES (?, ?, ?)`,
    ).run("test-essay", "An Essay Title", 1);

    const result = generatePage("essays", "test-essay");
    assert.ok(result.ok);

    const output = fs.readFileSync(result.path, "utf8");
    assert.ok(output.includes("<title>An Essay Title"));
    // No meta description should be present.
    assert.ok(!output.includes('<meta name="description"'));
  });

  test("generates page for type with extraWhere filter", () => {
    // blog-posts has no extraWhere but we need to test our config
    db.prepare(
      `INSERT INTO blog_posts (slug, blog_title, published_draft)
       VALUES (?, ?, ?)`,
    ).run("test-blog", "Blog Title", 1);

    const result = generatePage("blog-posts", "test-blog");
    assert.ok(result.ok);

    const output = fs.readFileSync(result.path, "utf8");
    assert.ok(output.includes("<title>Blog Title — Blog — The Jesus Website</title>"));
    assert.ok(output.includes('"@type":"BlogPosting"'));
  });
});

// ── removePage ───────────────────────────────────────────────────────────────

describe("removePage", () => {
  test("deletes a generated file", () => {
    seedEvidence({ slug: "to-delete", title: "Delete Me" });

    const genResult = generatePage("evidence", "to-delete");
    assert.ok(genResult.ok);
    assert.ok(fs.existsSync(genResult.path));

    const delResult = removePage("evidence", "to-delete");
    assert.ok(delResult.ok);
    assert.ok(!fs.existsSync(genResult.path));
  });

  test("returns ok when the file does not exist (idempotent)", () => {
    const result = removePage("evidence", "never-existed");
    assert.ok(result.ok);
  });
});
