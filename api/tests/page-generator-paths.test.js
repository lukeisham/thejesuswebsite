// Page generator path tests — verifies that generatePage writes output files
// to the correct path (no doubled segment), and that slug validation rejects
// path separators before any file write.
//
// Run:  node api/tests/page-generator-paths.test.js

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

const db = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: db,
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "page-gen-paths-test-"));

// Copy the real blog [slug].html template to temp dir.
const realBlogTemplate = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "news-and-blog",
  "blog",
  "[slug].html",
);
const tempBlogDir = path.join(tmpDir, "news-and-blog", "blog");
fs.mkdirSync(tempBlogDir, { recursive: true });
fs.copyFileSync(
  realBlogTemplate,
  path.join(tempBlogDir, "[slug].html"),
);

// Override the content-pages config for blog-posts.
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
      "blog-posts": {
        ...realContentPages.CONTENT_PAGES["blog-posts"],
        templatePath: path.join(tempBlogDir, "[slug].html"),
        outputDir: tempBlogDir,
      },
    },
  },
};

const { generatePage } = require("../services/page-generator");
const { validateSlug, generateUniqueSlug } = require("../models/model-helpers");
const ERRORS = require("../lib/error-codes");

// ── Helpers ─────────────────────────────────────────────────────────────────

function seedBlogPost(overrides = {}) {
  return db
    .prepare(
      `INSERT INTO blog_posts (slug, blog_title, blog_content, published_draft, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      overrides.slug || "test-post",
      overrides.blog_title || "Test Post",
      overrides.blog_content || "Test content.",
      overrides.published_draft ?? 1,
      overrides.created_at || "2026-01-01T00:00:00Z",
    );
}

function clearAll() {
  db.exec("DELETE FROM blog_posts");
}

afterEach(() => {
  // Clean up generated files.
  if (fs.existsSync(tempBlogDir)) {
    const files = fs.readdirSync(tempBlogDir);
    for (const f of files) {
      if (f !== "[slug].html") {
        fs.unlinkSync(path.join(tempBlogDir, f));
      }
    }
  }
});

// ── generatePage output path ─────────────────────────────────────────────────

describe("generatePage output path", () => {
  beforeEach(clearAll);

  test('writes blog post to correct path (no doubled segment)', () => {
    seedBlogPost({ slug: "test", blog_title: "Test Blog" });

    const result = generatePage("blog-posts", "test");
    assert.ok(result.ok, `Expected ok, got error: ${result.error}`);
    assert.ok(result.path, "Expected a path property");

    // Path must end with news-and-blog/blog/test.html — no doubled segment.
    assert.ok(
      result.path.endsWith(`news-and-blog${path.sep}blog${path.sep}test.html`),
      `Unexpected output path: ${result.path}`,
    );

    // The file must actually exist.
    assert.ok(fs.existsSync(result.path), `File not found: ${result.path}`);
  });

  test('generates slug with hyphens correctly', () => {
    seedBlogPost({ slug: "my-test-post", blog_title: "My Test" });

    const result = generatePage("blog-posts", "my-test-post");
    assert.ok(result.ok, `Expected ok, got error: ${result.error}`);
    assert.ok(
      result.path.endsWith(`news-and-blog${path.sep}blog${path.sep}my-test-post.html`),
      `Unexpected output path: ${result.path}`,
    );
  });
});

// ── validateSlug ─────────────────────────────────────────────────────────────

describe("validateSlug", () => {
  test("accepts a valid slug", () => {
    assert.doesNotThrow(() => validateSlug("test"));
    assert.doesNotThrow(() => validateSlug("my-post-123"));
    assert.doesNotThrow(() => validateSlug("a"));
    assert.doesNotThrow(() => validateSlug("era-PreIncarnation"));
  });

  test("rejects slug containing /", () => {
    assert.throws(
      () => validateSlug("blog/test"),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects slug containing backslash", () => {
    assert.throws(
      () => validateSlug("blog\\test"),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects slug containing ..", () => {
    assert.throws(
      () => validateSlug(".."),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
    assert.throws(
      () => validateSlug("test/../etc"),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects empty string", () => {
    assert.throws(
      () => validateSlug(""),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects non-string input", () => {
    assert.throws(
      () => validateSlug(null),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
    assert.throws(
      () => validateSlug(undefined),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });
});

// ── generateUniqueSlug rejects bad slugs ─────────────────────────────────────

describe("generateUniqueSlug validates slug", () => {
  test("rejects /-bearing slug before any DB access", () => {
    assert.throws(
      () => generateUniqueSlug(db, "blog_posts", "blog/test"),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects \\-bearing slug", () => {
    assert.throws(
      () => generateUniqueSlug(db, "blog_posts", "blog\\test"),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("rejects .. slug", () => {
    assert.throws(
      () => generateUniqueSlug(db, "blog_posts", ".."),
      (err) => err.code === ERRORS.INVALID_SLUG.code,
    );
  });

  test("accepts and de-duplicates valid slug", () => {
    seedBlogPost({ slug: "foo" });
    const result = generateUniqueSlug(db, "blog_posts", "foo");
    assert.equal(result, "foo-2");
  });
});

console.log("\nDone.");
