// Guide test for setup/ARCHITECTURE/publishing-pipeline.md (the blog registration row, the paged public lists row and the API preload row).
//
// This file does not test behaviour. It reads source files as text and fails
// when a blog post is missing from one of the lists that the guide names.
// Each failure message names the rule, the file and the guide.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/publishing-pipeline.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

// Each entry: the file that holds a list, and the text that registers a blog post in it.
const BLOG_REGISTRATIONS = [
  { file: "api/routes/publish.js", needle: '"blog-posts": blogPostModel' },
  { file: "api/models/drafts.model.js", needle: "table: 'blog_posts'" },
  { file: "api/config/content-pages.js", needle: 'table: "blog_posts"' },
  { file: "api/scripts/generate-sitemap.js", needle: 'table: "blog_posts"' },
  { file: "api/models/search.model.js", needle: 'fts: "blog_posts_fts"' },
  { file: "database/schema.sql", needle: "CREATE TRIGGER blog_posts_fts_au" },
];

describe(`${GUIDE}: a blog post is registered in every list`, () => {
  for (const { file, needle } of BLOG_REGISTRATIONS) {
    test(`${file} registers blog posts`, () => {
      assert.ok(
        read(file).includes(needle),
        `CORE-3, TEST-10: blog registration row: ${file} no longer contains ${needle}. See ${GUIDE}.`,
      );
    });
  }
});

// Each entry: the paged list page script, the api.js helper it calls, and the
// model whose public list it reads.
const PAGED_LISTS = [
  { script: "frontend/assets/js/blog-list.js", helper: "getBlogPosts", model: "api/models/blog-post.model.js" },
  { script: "frontend/assets/js/essays-list.js", helper: "getEssays", model: "api/models/essay.model.js" },
  { script: "frontend/assets/js/historiography-list.js", helper: "getHistoriography", model: "api/models/historiography.model.js" },
];

describe(`${GUIDE}: public lists return list columns and are read page by page`, () => {
  for (const { script, helper, model } of PAGED_LISTS) {
    test(`${script} sends page and limit`, () => {
      const call = new RegExp(`${helper}\\(\\{[^}]*\\bpage\\b[^}]*\\blimit\\b[^}]*\\}\\)`);
      assert.match(
        read(script),
        call,
        `CORE-3, TEST-10: paged lists row: ${script} no longer calls ${helper}({ page, limit }). See ${GUIDE}.`,
      );
    });

    test(`${model} builds the public list from LIST_COLUMNS`, () => {
      assert.match(
        read(model),
        /const itemsSql =[^;]*SELECT \$\{LIST_COLUMNS\} FROM/,
        `CORE-3, TEST-10: paged lists row: the getAllPublished itemsSql in ${model} no longer selects LIST_COLUMNS. See ${GUIDE}.`,
      );
    });
  }
});

// The generated page head preloads the API read of its row at /api/<type>/<slug>.
// The page script fetches the same address through api.js, so the two must
// agree for every content type. A different address makes the browser fetch twice.
const { CONTENT_PAGES } = require("../config/content-pages");

describe(`${GUIDE}: the page head preloads the API read that api.js fetches`, () => {
  test("page-generator.js writes the preload from config.type", () => {
    assert.match(
      read("api/services/page-generator.js"),
      /rel="preload" as="fetch" crossorigin href="\$\{escapeHTML\(`\/api\/\$\{config\.type\}\/\$\{encodeURIComponent\(row\.slug\)\}`\)\}"/,
      `CORE-3, TEST-10: API preload row: page-generator.js no longer writes <link rel="preload" as="fetch" crossorigin href="/api/\${config.type}/<slug>">. See ${GUIDE}.`,
    );
  });

  for (const type of Object.keys(CONTENT_PAGES)) {
    test(`api.js fetches /${type}/<slug> for the ${type} page`, () => {
      assert.ok(
        read("frontend/assets/js/api.js").includes("request(`/" + type + "/${encodeURIComponent(slug)}`)"),
        `CORE-3, TEST-10: API preload row: frontend/assets/js/api.js has no request(\`/${type}/\${encodeURIComponent(slug)}\`). The preload for ${type} pages names an address that no fetch uses, so the browser fetches twice. See ${GUIDE}.`,
      );
    });
  }
});
