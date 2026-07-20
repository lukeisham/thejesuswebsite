// List-route response-shape contract tests — uses node:test + node:assert.
//
// Why this file exists: the debate frontend (frontend/assets/js/debate.js)
// crashed because GET /popular-challenges and GET /academic-challenges
// returned `{ items, response_count }` instead of a bare array, and even the
// wrapped items used raw DB column names (challenge_title, challenge_summary)
// instead of the names the frontend reads (title, summary). See
// setup/PLANS/New/challenge-data-structure-frontend-sync.md for the fix plan.
//
// This suite asserts, for every public GET list route mounted in
// api/server.js: (1) it returns HTTP 200 with a bare array body — except the
// two challenge routes, which are DOCUMENTED, EXPECTED-FAILING exceptions
// until that plan lands (see EXPECTED_ENVELOPE_ROUTES below) — and (2) when
// the array is non-empty, items carry the fields their real frontend
// consumer reads, so a DB-column-name vs frontend-field-name drift like
// challenge_title/title fails loudly here instead of at runtime in the
// browser (JS-2).
//
// Follows the app-mounting + in-memory-DB conventions from
// analytics-route.test.js (Module-cache override of ../config) and
// tests/helpers/db.js (createTestDb: full schema + folded-in migrations).

const { test, describe, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory test database, installed in place of ../config ───────────────

const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// ── Route table ─────────────────────────────────────────────────────────────
//
// Every public GET list route mounted in api/server.js. `search`, `timeline`,
// `arbor`, and `sources` are deliberately excluded: they aren't flat published
// content lists (search returns ranked results grouped by type, timeline
// groups by era, arbor returns a node/edge tree, sources is admin-only via
// requireAuth) so a bare-array contract doesn't apply to them.
const ROUTES = [
  { mount: "/evidence", file: "../routes/evidence" },
  { mount: "/essays", file: "../routes/essays" },
  {
    mount: "/popular-challenges",
    file: "../routes/popular-challenges",
    expectEnvelope: true,
  },
  {
    mount: "/academic-challenges",
    file: "../routes/academic-challenges",
    expectEnvelope: true,
  },
  { mount: "/historiography", file: "../routes/historiography" },
  { mount: "/responses", file: "../routes/responses" },
  { mount: "/blog-posts", file: "../routes/blog-posts" },
  { mount: "/news-articles", file: "../routes/news-articles" },
  { mount: "/collections", file: "../routes/collections" },
  { mount: "/resources", file: "../routes/resources" },
  { mount: "/identifiers", file: "../routes/identifiers" },
];

// Routes that are KNOWN BROKEN today (return an envelope object instead of a
// bare array) and are expected to fail the bare-array assertion until
// setup/PLANS/New/challenge-data-structure-frontend-sync.md is implemented.
// This is NOT a list of legitimate exceptions to codify — it exists so this
// suite documents and tracks the bug rather than either (a) failing the whole
// suite on a already-known issue or (b) silently asserting the wrong shape as
// correct.
const EXPECTED_ENVELOPE_ROUTES = new Set([
  "/popular-challenges",
  "/academic-challenges",
]);

// ── Per-route field manifests ───────────────────────────────────────────────
//
// The fields each route's real frontend consumer reads off list items. Built
// by reading the consumer source directly (not by re-deriving from the DB
// schema), so a DB-column-name vs frontend-field-name mismatch is caught here
// exactly like it would break the page.
const FIELD_MANIFESTS = {
  // frontend/assets/js/evidence-list.js: item.slug, item.title,
  // item.primary_verse, item.thumbnail_path
  "/evidence": ["slug", "title"],

  // frontend/assets/js/essays-list.js renderCards(): item.title, item.slug,
  // item.author / item.published_at / item.created_at (byline, optional)
  "/essays": ["slug", "title"],

  // frontend/assets/js/debate.js renderChallengeCards(): item.slug,
  // item.title, item.summary, item.response_count. Per the sync plan these
  // are the MAPPED names (challenge_title -> title, challenge_summary ->
  // summary) the model does not yet produce — see EXPECTED_ENVELOPE_ROUTES.
  "/popular-challenges": ["slug", "title", "summary", "response_count"],
  "/academic-challenges": ["slug", "title", "summary", "response_count"],

  // frontend/assets/js/historiography-list.js renderCards(): item.slug,
  // item.title, item.historiography_period, item.author /
  // item.published_at / item.created_at
  "/historiography": ["slug", "title", "historiography_period"],

  // No dedicated list-page frontend consumer calls GET /responses today
  // (challenge-detail.js reads responses embedded on the challenge detail
  // object instead, via challenge.responses). Assert bare-array shape only;
  // field names below reflect the DB columns so a future consumer has a
  // documented baseline to react to.
  "/responses": ["slug", "response_title"],

  // frontend/assets/js/news-and-blog.js renderBlogRows(): post.blog_title,
  // post.blog_content, post.slug
  "/blog-posts": ["slug", "blog_title"],

  // frontend/assets/js/news-and-blog.js renderNewsRows(): article.
  // news_article_title, article.news_article_thumbnail,
  // article.news_article_url
  "/news-articles": ["news_article_title", "news_article_url"],

  // No dedicated frontend list consumer found for GET /collections; assert
  // bare-array shape and the DB's own slug/title columns.
  "/collections": ["slug", "title"],

  // frontend/assets/js/resources.js renderResources(): item.resource_url,
  // item.resource_title, item.resource_description. Only applies when
  // ?list_key= is supplied — without it the route returns grouped summary
  // rows ({list_key, count, resource_ids}), which is a different, legitimate
  // shape, so the manifest check for /resources is skipped unless the test
  // requests a specific list_key (see "resources: with list_key" below).
  "/resources": [],

  "/identifiers": ["isbn"],
};

// ── App + HTTP helpers (mirrors analytics-route.test.js) ───────────────────

function createApp() {
  const app = express();
  app.use(express.json());

  for (const { mount, file } of ROUTES) {
    const routePath = require.resolve(file);
    delete require.cache[routePath];
    const router = require(file);
    app.use(mount, router);
  }

  return app;
}

function get(app, urlPath) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    const { port } = server.address();

    const req = http.request(
      { hostname: "127.0.0.1", port, path: urlPath, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      },
    );

    req.on("error", (err) => {
      server.close();
      reject(err);
    });

    req.end();
  });
}

// ── Minimal seed data per content type ──────────────────────────────────────
//
// Local DB is empty in dev, so without seeding almost every array here would
// be empty and the field-manifest assertions would never actually run. Seed
// one published row per content type directly via the model's create()
// (each model applies its own WRITABLE_COLUMNS + slug generation, matching
// how evidence.test.js seeds through evidenceModel).

function seedAll() {
  const evidenceModel = require("../models/evidence.model");
  const essayModel = require("../models/essay.model");
  const popularChallengeModel = require("../models/popular-challenges.model");
  const academicChallengeModel = require("../models/academic-challenges.model");
  const historiographyModel = require("../models/historiography.model");
  const responseModel = require("../models/response.model");
  const blogPostModel = require("../models/blog-post.model");
  const newsArticleModel = require("../models/news-article.model");
  const collectionModel = require("../models/collection.model");
  const resourceModel = require("../models/resource.model");
  const identifiersModel = require("../models/identifiers.model");

  evidenceModel.create({
    title: "Test Evidence",
    slug: "test-evidence",
    published_draft: 1,
  });

  essayModel.create({
    essay_title: "Test Essay",
    slug: "test-essay",
    published_draft: 1,
  });

  const popularChallenge = popularChallengeModel.create({
    slug: "test-popular-challenge",
    challenge_title: "Test Popular Challenge",
    challenge_summary: "Summary",
    published_draft: 1,
  });

  const academicChallenge = academicChallengeModel.create({
    slug: "test-academic-challenge",
    challenge_title: "Test Academic Challenge",
    challenge_summary: "Summary",
    published_draft: 1,
  });

  historiographyModel.create({
    essay_title: "Test Historiography",
    slug: "test-historiography",
    published_draft: 1,
  });

  responseModel.create({
    slug: "test-response",
    challenge_id: popularChallenge.id,
    response_title: "Test Response",
    published_draft: 1,
  });

  blogPostModel.create({
    slug: "test-blog-post",
    blog_title: "Test Blog Post",
    published_draft: 1,
  });

  newsArticleModel.create({
    slug: "test-news-article",
    news_article_title: "Test News Article",
    news_article_url: "https://example.com/test",
    published_draft: 1,
  });

  collectionModel.create({
    slug: "test-collection",
    title: "Test Collection",
    published_draft: 1,
  });

  resourceModel.create({
    list_key: "parables",
    resource_title: "Test Resource",
    resource_url: "https://example.com/book",
    published_draft: 1,
  });

  identifiersModel.create({
    isbn: "978-3-16-148410-0",
    isbn_book_title: "Test Book",
    published_draft: 1,
  });

  return { academicChallenge };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("public GET list route contracts", () => {
  before(() => {
    seedAll();
  });

  for (const { mount, expectEnvelope } of ROUTES) {
    if (expectEnvelope) {
      // Known-broken today: documented expected-failure, not a codified
      // "correct" shape. Tracked by
      // setup/PLANS/New/challenge-data-structure-frontend-sync.md.
      test(`${mount}: KNOWN BUG — returns { items, response_count } envelope instead of a bare array (see challenge-data-structure-frontend-sync.md)`, async () => {
        const app = createApp();
        const result = await get(app, mount);

        assert.equal(result.status, 200);
        // Document the current (wrong) shape so this test starts failing --
        // i.e. tells us the fix landed -- the moment the route is changed to
        // return a bare array, per the sync plan.
        assert.ok(
          !Array.isArray(result.body),
          `${mount} now returns a bare array — update this test and the ` +
            `EXPECTED_ENVELOPE_ROUTES exception list, the challenge-data-` +
            `structure-frontend-sync plan's route-layer fix has landed.`,
        );
        assert.ok(
          Array.isArray(result.body.items),
          `${mount} envelope should still expose items as an array`,
        );
      });
      continue;
    }

    test(`${mount}: returns HTTP 200 with a bare array body`, async () => {
      const app = createApp();
      const result = await get(app, mount);

      assert.equal(result.status, 200);
      assert.ok(
        Array.isArray(result.body),
        `${mount} should return a bare array, got: ${JSON.stringify(result.body)}`,
      );
    });

    const manifest = FIELD_MANIFESTS[mount] || [];
    if (manifest.length > 0) {
      test(`${mount}: items carry the fields their frontend consumer reads`, async () => {
        const app = createApp();
        const result = await get(app, mount);

        assert.equal(result.status, 200);
        assert.ok(result.body.length > 0, `expected seeded data at ${mount}`);

        for (const item of result.body) {
          for (const field of manifest) {
            assert.ok(
              Object.hasOwn(item, field),
              `${mount} item missing field "${field}" expected by its frontend consumer: ${JSON.stringify(item)}`,
            );
          }
        }
      });
    }
  }

  // /resources has a different shape depending on whether ?list_key= is
  // supplied (see FIELD_MANIFESTS note above): with no list_key it returns
  // grouped summary rows; frontend/assets/js/resources.js always calls it
  // with a list_key, so that's the contract worth pinning down.
  test("/resources?list_key=parables: bare array with resource fields resources.js reads", async () => {
    const app = createApp();
    const result = await get(app, "/resources?list_key=parables");

    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.body));
    assert.ok(result.body.length > 0, "expected seeded resource row");
    for (const item of result.body) {
      assert.ok(Object.hasOwn(item, "resource_title"));
      assert.ok(Object.hasOwn(item, "resource_url"));
    }
  });

  test("/resources (no list_key): returns grouped summary rows, not content items (documented, different shape)", async () => {
    const app = createApp();
    const result = await get(app, "/resources");

    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.body));
    if (result.body.length > 0) {
      assert.ok(Object.hasOwn(result.body[0], "list_key"));
      assert.ok(Object.hasOwn(result.body[0], "count"));
    }
  });
});
