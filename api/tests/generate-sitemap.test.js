// Sitemap generator tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests that the generator produces well-formed XML, includes
// published detail slugs, excludes unpublished rows, and lists section index URLs.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
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

const { buildSitemap, renderXml } = require("../scripts/generate-sitemap");

// ── Helpers ─────────────────────────────────────────────────────────────────

function seedEvidence(overrides = {}) {
  return db
    .prepare(
      `INSERT INTO evidence (title, slug, published_draft)
       VALUES (?, ?, ?)`,
    )
    .run(
      overrides.title || "Test Evidence",
      overrides.slug || "test-evidence",
      overrides.published_draft ?? 1,
    );
}

function seedEssay(overrides = {}) {
  return db
    .prepare(
      `INSERT INTO context_essays (slug, essay_title, published_draft)
       VALUES (?, ?, ?)`,
    )
    .run(
      overrides.slug || "test-essay",
      overrides.essay_title || "Test Essay",
      overrides.published_draft ?? 1,
    );
}

function seedBlog(overrides = {}) {
  return db
    .prepare(
      `INSERT INTO blog_posts (slug, blog_title, published_draft)
       VALUES (?, ?, ?)`,
    )
    .run(
      overrides.slug || "test-blog",
      overrides.blog_title || "Test Blog",
      overrides.published_draft ?? 1,
    );
}

function clearAll() {
  const tables = [
    "evidence",
    "context_essays",
    "responses",
    "blog_posts",
    "historiography",
    "challenges",
    "news_articles",
  ];
  for (const t of tables) {
    db.exec(`DELETE FROM ${t}`);
  }
}

// ── Well-formed XML ──────────────────────────────────────────────────────────

describe("sitemap XML output", () => {
  test("produces well-formed XML with XML declaration and urlset root", () => {
    const urls = [
      {
        loc: "https://thejesuswebsite.org/",
        lastmod: "2026-01-01",
        changefreq: "weekly",
        priority: "1.0",
      },
    ];
    const xml = renderXml(urls);

    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(
      xml.includes(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ),
    );
    assert.ok(xml.includes("</urlset>"));
    assert.ok(xml.includes("<loc>https://thejesuswebsite.org/</loc>"));
  });

  test("escapes XML special characters in URLs", () => {
    const urls = [
      {
        loc: "https://example.com/page?a=1&b=2",
        lastmod: "2026-01-01",
      },
    ];
    const xml = renderXml(urls);

    assert.ok(xml.includes("&amp;"));
    assert.ok(!xml.includes("&b=2")); // raw & should be escaped
  });
});

// ── Section / index pages ────────────────────────────────────────────────────

describe("sitemap includes section index pages", () => {
  test("includes the home page at priority 1.0", () => {
    const urls = buildSitemap();
    const home = urls.find((u) => u.loc === "https://thejesuswebsite.org/");
    assert.ok(home);
    assert.equal(home.priority, "1.0");
  });

  test("includes evidence index", () => {
    const urls = buildSitemap();
    const evidence = urls.find(
      (u) => u.loc === "https://thejesuswebsite.org/evidence/",
    );
    assert.ok(evidence);
  });

  test("includes all 15 resource category pages", () => {
    const urls = buildSitemap();
    const keys = [
      "sermons-and-sayings",
      "parables",
      "objects",
      "people",
      "sites",
      "ot-verses",
      "internal-witnesses",
      "external-witnesses",
      "places",
      "world-events",
      "miracles",
      "events",
      "apologetics",
      "manuscripts",
      "sources",
    ];
    for (const key of keys) {
      assert.ok(
        urls.some(
          (u) => u.loc === `https://thejesuswebsite.org/resources/${key}.html`,
        ),
        `missing sitemap entry for /resources/${key}.html`,
      );
    }
  });

  test("includes all 10 individual map and zoom pages", () => {
    const urls = buildSitemap();
    const mapPages = [
      "/evidence/maps/roman-empire.html",
      "/evidence/maps/levant.html",
      "/evidence/maps/judea.html",
      "/evidence/maps/galilee.html",
      "/evidence/maps/jerusalem.html",
      "/evidence/maps/roman-empire/zoom-roman-empire.html",
      "/evidence/maps/levant/zoom-levant.html",
      "/evidence/maps/judea/zoom-judea.html",
      "/evidence/maps/galilee/zoom-galilee.html",
      "/evidence/maps/jerusalem/zoom-jerusalem.html",
    ];
    for (const page of mapPages) {
      assert.ok(
        urls.some((u) => u.loc === `https://thejesuswebsite.org${page}`),
        `missing sitemap entry for ${page}`,
      );
    }
  });

  test("includes all debate section pages", () => {
    const urls = buildSitemap();
    const debatePages = [
      "https://thejesuswebsite.org/debate/historiography/",
      "https://thejesuswebsite.org/debate/popular-challenges.html",
      "https://thejesuswebsite.org/debate/academic-challenges.html",
    ];
    for (const page of debatePages) {
      assert.ok(
        urls.some((u) => u.loc === page),
        `missing sitemap entry for ${page}`,
      );
    }
  });

  test("uses the apex domain, not www", () => {
    const urls = buildSitemap();
    assert.ok(urls.every((u) => !u.loc.includes("www.")));
  });
});

// ── Published detail slugs ───────────────────────────────────────────────────

describe("sitemap includes published detail pages", () => {
  beforeEach(clearAll);

  test("includes published evidence slugs", () => {
    seedEvidence({ slug: "pilate-stone", published_draft: 1 });
    seedEvidence({ slug: "josephus-testimony", published_draft: 1 });

    const urls = buildSitemap();
    const detailUrls = urls.filter((u) => /\/evidence\/[^./]+$/.test(u.loc));

    assert.equal(detailUrls.length, 2);
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/pilate-stone")));
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/josephus-testimony")));
  });

  test("includes published essay slugs", () => {
    seedEssay({ slug: "minimal-facts", published_draft: 1 });

    const urls = buildSitemap();
    const essayUrls = urls.filter((u) =>
      u.loc.startsWith("https://thejesuswebsite.org/contextual-essays/"),
    );

    // Should have at least one detail URL (plus the section index).
    const detailUrls = essayUrls.filter(
      (u) => !u.loc.endsWith("/contextual-essays/"),
    );
    assert.ok(detailUrls.length >= 1);
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/minimal-facts")));
  });

  test("includes published blog slugs", () => {
    seedBlog({ slug: "easter-apologetics", published_draft: 1 });

    const urls = buildSitemap();
    const blogUrls = urls.filter((u) =>
      u.loc.startsWith("https://thejesuswebsite.org/news-and-blog/blog/"),
    );

    const detailUrls = blogUrls.filter(
      (u) => !u.loc.endsWith("/news-and-blog/blog/"),
    );
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/easter-apologetics")));
  });
});

// ── Excludes unpublished rows ────────────────────────────────────────────────

describe("sitemap excludes unpublished rows", () => {
  beforeEach(clearAll);

  test("does not include draft evidence", () => {
    seedEvidence({ slug: "published-item", published_draft: 1 });
    seedEvidence({ slug: "draft-item", published_draft: 0 });

    const urls = buildSitemap();
    const detailUrls = urls.filter((u) => /\/evidence\/[^./]+$/.test(u.loc));

    assert.equal(detailUrls.length, 1);
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/published-item")));
    assert.ok(!detailUrls.some((u) => u.loc.endsWith("/draft-item")));
  });

  test("does not include draft essays", () => {
    seedEssay({ slug: "published-essay", published_draft: 1 });
    seedEssay({ slug: "draft-essay", published_draft: 0 });

    const urls = buildSitemap();
    const detailUrls = urls.filter(
      (u) =>
        u.loc.startsWith("https://thejesuswebsite.org/contextual-essays/") &&
        !u.loc.endsWith("/contextual-essays/"),
    );

    assert.equal(detailUrls.length, 1);
    assert.ok(detailUrls.some((u) => u.loc.endsWith("/published-essay")));
  });
});

// ── URL counts are reasonable ────────────────────────────────────────────────

describe("sitemap URL counts", () => {
  beforeEach(clearAll);

  test("section pages are always present even with no content", () => {
    const urls = buildSitemap();
    // Should have at least the 41 section pages (28 original + 10 map pages + 3 new debate pages).
    assert.ok(urls.length >= 41);
  });

  test("each published row generates one detail URL", () => {
    seedEvidence({ slug: "item-1", published_draft: 1 });
    seedEvidence({ slug: "item-2", published_draft: 1 });

    const urls1 = buildSitemap();
    const evidenceBefore = urls1.filter((u) =>
      /\/evidence\/[^./]+$/.test(u.loc),
    );
    assert.equal(evidenceBefore.length, 2);

    clearAll();
    seedEvidence({ slug: "only-one", published_draft: 1 });

    const urls2 = buildSitemap();
    const evidenceAfter = urls2.filter((u) =>
      /\/evidence\/[^./]+$/.test(u.loc),
    );
    assert.equal(evidenceAfter.length, 1);
  });
});
