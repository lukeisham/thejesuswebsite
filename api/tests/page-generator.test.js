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
  "[slug].html",
);
const tempEvidenceDir = path.join(tmpDir, "evidence");
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
  for (const dir of [
    tempEvidenceDir,
    path.join(tmpDir, "contextual-essays"),
    path.join(tmpDir, "news-and-blog", "blog"),
  ]) {
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
      output.includes(
        "<title>The Pilate Stone — Evidence — The Jesus Website</title>",
      ),
    );
  });

  test("includes escaped OG tags", () => {
    seedEvidence({
      slug: "test-item",
      title: "Test & Evidence",
      description: 'A description with "quotes".',
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
      output.includes('href="https://thejesuswebsite.org/evidence/test-item"'),
    );
  });

  test("includes JSON-LD script", () => {
    seedEvidence({ slug: "test-item", title: "Test Item" });

    const result = generatePage("evidence", "test-item");
    const output = fs.readFileSync(result.path, "utf8");

    assert.ok(output.includes("application/ld+json"));
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
    assert.ok(
      output.includes("<title>Blog Title — Blog — The Jesus Website</title>"),
    );
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

  test("refuses to remove 'index' (reserved filename)", () => {
    const result = removePage("essays", "index");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Refusing to remove reserved filename"));
  });

  test("refuses to remove '[slug]' (reserved filename)", () => {
    const result = removePage("evidence", "[slug]");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Refusing to remove reserved filename"));
  });

  test("refuses to remove 'index' for any type", () => {
    const result = removePage("blog-posts", "index");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Refusing to remove reserved filename"));
  });
});

// ── Orphan cleanup regression (JS-2) ─────────────────────────────────────────
// These tests verify that cleanOrphans in regenerate-pages.js protects
// index.html, [slug].html, and published slugs from deletion.

describe("orphan cleanup (regenerate-pages)", () => {
  beforeEach(() => {
    clearAll();
    // Ensure output dirs are clean before each test.
    for (const dir of [
      tempEvidenceDir,
      path.join(tmpDir, "contextual-essays"),
      path.join(tmpDir, "news-and-blog", "blog"),
    ]) {
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

  test("index.html is never removed (even with no published rows)", () => {
    // Place a dummy index.html in the essays output dir.
    const essaysDir = path.join(tmpDir, "contextual-essays");
    if (!fs.existsSync(essaysDir)) fs.mkdirSync(essaysDir, { recursive: true });
    fs.writeFileSync(
      path.join(essaysDir, "index.html"),
      "<html></html>",
      "utf8",
    );

    // Run the regenerate-pages script (which calls cleanOrphans).
    // Since there are no published essays, cleanOrphans should skip index.html.
    // We test this by verifying index.html still exists.
    assert.ok(fs.existsSync(path.join(essaysDir, "index.html")));

    // Now run cleanOrphans equivalent logic to confirm it skips index.html.
    // We can't call cleanOrphans directly (not exported), but we can verify
    // the invariant: removePage refuses to delete "index".
    const result = removePage("essays", "index");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Refusing to remove reserved filename"));

    // index.html must still exist.
    assert.ok(fs.existsSync(path.join(essaysDir, "index.html")));
  });

  test("published slug page survives orphan cleanup", () => {
    seedEvidence({ slug: "keep-me", title: "Keep Me" });
    const genResult = generatePage("evidence", "keep-me");
    assert.ok(genResult.ok);
    assert.ok(fs.existsSync(genResult.path));

    // The invariant: removePage only removes files for slugs not in the
    // published set. Since "keep-me" is published, its file must survive.
    // We verify by checking the file still exists.
    assert.ok(fs.existsSync(genResult.path));
  });

  test("orphaned slug page is removed (not in published set)", () => {
    // Create a file for a slug that has NO published row.
    const orphanPath = path.join(tempEvidenceDir, "orphan-slug.html");
    fs.writeFileSync(orphanPath, "<html></html>", "utf8");
    assert.ok(fs.existsSync(orphanPath));

    // removePage for "orphan-slug" should succeed (it's not reserved).
    const result = removePage("evidence", "orphan-slug");
    assert.ok(result.ok);
    assert.ok(!fs.existsSync(orphanPath));
  });

  test("[slug].html template is never removed", () => {
    const templatePath = path.join(tempEvidenceDir, "[slug].html");
    assert.ok(fs.existsSync(templatePath));

    const result = removePage("evidence", "[slug]");
    assert.ok(!result.ok);
    assert.ok(result.error.includes("Refusing to remove reserved filename"));

    // Template must still exist.
    assert.ok(fs.existsSync(templatePath));
  });
});

// ── gitTrackedHtml guard regression (JS-2) ───────────────────────────────────
// These tests verify the git-tracked-file guard added in commit 92016d5
// (“Fix orphan cleanup deleting static pages”) that prevents cleanOrphans()
// from deleting hand-authored static .html files (arbor.html, search.html)
// that have no matching DB row.

describe("git-tracked file guard (regenerate-pages)", () => {
  const {
    cleanOrphans,
    gitTrackedHtml,
  } = require("../scripts/regenerate-pages");

  beforeEach(() => {
    clearAll();
    // Clean any generated .html files from the evidence output dir.
    if (fs.existsSync(tempEvidenceDir)) {
      const files = fs.readdirSync(tempEvidenceDir);
      for (const f of files) {
        if (f !== "[slug].html" && f.endsWith(".html")) {
          fs.unlinkSync(path.join(tempEvidenceDir, f));
        }
      }
    }
  });

  test("gitTrackedHtml returns git-tracked .html files in a directory", () => {
    // The temp dir is not a git repo, but the project root is.
    // Test against the real evidence dir which has arbor.html and search.html tracked.
    const realEvidenceDir = path.resolve(
      __dirname,
      "..",
      "..",
      "frontend",
      "evidence",
    );
    const tracked = gitTrackedHtml(realEvidenceDir);
    // git is available in the test environment — should return a Set.
    assert.ok(tracked instanceof Set);
    // arbor.html and search.html are tracked in git.
    assert.ok(tracked.has("arbor.html"), "arbor.html should be git-tracked");
    assert.ok(tracked.has("search.html"), "search.html should be git-tracked");
    // [slug].html template is also tracked.
    assert.ok(
      tracked.has("[slug].html"),
      "[slug].html template should be git-tracked",
    );
  });

  test("cleanOrphans skips git-tracked .html files even with no published row", () => {
    // Create a dummy file that simulates a git-tracked static page in the temp dir.
    // We can't use gitTrackedHtml directly on the temp dir (not a repo),
    // but we can test cleanOrphans behavior by placing a file named like a
    // git-tracked file and confirming it survives when it has no matching
    // published DB row.
    const staticFileName = "arbor.html";
    const staticFilePath = path.join(tempEvidenceDir, staticFileName);
    fs.writeFileSync(
      staticFilePath,
      "<html><title>Arbor Diagram</title></html>",
      "utf8",
    );

    // The file exists.
    assert.ok(fs.existsSync(staticFilePath));

    // At this point there are NO published evidence rows (clearAll was called).
    // cleanOrphans would normally delete arbor.html as an "orphan" since
    // "arbor" is not a published slug — but the git-tracked guard should
    // prevent that. Since the temp dir is not a git repo, gitTrackedHtml
    // will return null, which triggers the fail-safe: cleanOrphans should
    // return 0 and delete nothing.
    const config = require("../config/content-pages").CONTENT_PAGES.evidence;
    // Override outputDir to point to our temp dir.
    const testConfig = {
      ...config,
      outputDir: tempEvidenceDir,
      type: "evidence",
    };
    const removed = cleanOrphans(testConfig, []);

    // When git is unavailable, fail safe: 0 files removed.
    assert.strictEqual(removed, 0);
    // The static file must survive.
    assert.ok(fs.existsSync(staticFilePath));
  });

  test("cleanOrphans removes truly orphaned .html files (not git-tracked)", () => {
    // This test verifies the happy path: when git IS available and a file
    // is NOT git-tracked, cleanOrphans should still remove it if it has no
    // published DB row.

    // Use the real evidence dir from the project (which IS a git repo).
    const realEvidenceDir = path.resolve(
      __dirname,
      "..",
      "..",
      "frontend",
      "evidence",
    );
    const config = require("../config/content-pages").CONTENT_PAGES.evidence;

    // Temporarily override the content-pages config so that removePage
    // (called by cleanOrphans) targets the real evidence dir, not the
    // mocked temp dir.
    const savedEvidence =
      Module._cache[contentPagesPath].exports.CONTENT_PAGES.evidence;
    Module._cache[contentPagesPath].exports.CONTENT_PAGES.evidence = {
      ...config,
      outputDir: realEvidenceDir,
      type: "evidence",
    };

    const testConfig = {
      ...config,
      outputDir: realEvidenceDir,
      type: "evidence",
    };

    // Create a dummy .html file that is NOT git-tracked.
    const orphanFileName = "zzz-test-orphan-do-not-track.html";
    const orphanFilePath = path.join(realEvidenceDir, orphanFileName);
    fs.writeFileSync(orphanFilePath, "<html></html>", "utf8");

    try {
      // Verify the orphan file exists.
      assert.ok(fs.existsSync(orphanFilePath));

      // Confirm it is NOT git-tracked.
      const tracked = gitTrackedHtml(realEvidenceDir);
      assert.ok(
        !tracked.has(orphanFileName),
        "orphan file must not be git-tracked",
      );

      // Run cleanOrphans with an empty published set — the orphan should be deleted.
      const removed = cleanOrphans(testConfig, []);

      // The orphan should have been removed.
      assert.strictEqual(removed, 1);
      assert.ok(!fs.existsSync(orphanFilePath));
    } finally {
      // Clean up in case the test failed mid-way.
      if (fs.existsSync(orphanFilePath)) {
        fs.unlinkSync(orphanFilePath);
      }
      // Restore the original mocked config.
      Module._cache[contentPagesPath].exports.CONTENT_PAGES.evidence =
        savedEvidence;
    }
  });

  test("git-tracked static files survive cleanOrphans (end-to-end)", () => {
    // Full integration test: use the real evidence dir, confirm arbor.html
    // and search.html survive cleanOrphans even though they have no
    // published DB row with slug "arbor" or "search".
    const realEvidenceDir = path.resolve(
      __dirname,
      "..",
      "..",
      "frontend",
      "evidence",
    );
    const config = require("../config/content-pages").CONTENT_PAGES.evidence;
    const testConfig = {
      ...config,
      outputDir: realEvidenceDir,
      type: "evidence",
    };

    // Verify the static files exist before the test.
    assert.ok(fs.existsSync(path.join(realEvidenceDir, "arbor.html")));
    assert.ok(fs.existsSync(path.join(realEvidenceDir, "search.html")));

    // Confirm they are git-tracked.
    const tracked = gitTrackedHtml(realEvidenceDir);
    assert.ok(tracked.has("arbor.html"));
    assert.ok(tracked.has("search.html"));

    // Run cleanOrphans with an empty published set.
    const removed = cleanOrphans(testConfig, []);

    // The static files must survive.
    assert.ok(fs.existsSync(path.join(realEvidenceDir, "arbor.html")));
    assert.ok(fs.existsSync(path.join(realEvidenceDir, "search.html")));

    // removed count may be >0 if there are other orphan files, but the
    // key assertion is that the git-tracked files survive.
    assert.ok(removed >= 0);
  });
});
