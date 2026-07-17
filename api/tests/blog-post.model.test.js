// Blog post model tests — covers create+read round-trip of blog_thumbnail
// and confirms mla_sources are attached in getDetailBySlug.
//
// Run:  node api/tests/blog-post.model.test.js
// Requires the dev database to be accessible via api/config.js.

const model = require("../models/blog-post.model");

let createdId = null;
let createdSlug = null;

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("PASS:", message);
  }
}

// ── Create with blog_thumbnail ──

const testData = {
  blog_title: "Test Post — blog_thumbnail round-trip",
  slug: "test-blog-thumbnail",
  blog_content: "Test content with [mla:1] inline citation.",
  blog_thumbnail: "/assets/images/test-thumb.webp",
  published_draft: 0,
};

const created = model.create(testData);
createdId = created.id;
createdSlug = created.slug;

assert(
  created.blog_thumbnail === testData.blog_thumbnail,
  "create() persists blog_thumbnail",
);
assert(typeof createdId === "number" && createdId > 0, "create() returns an id");

// ── Read back (by id) ──

const byId = model.getById(createdId);
assert(byId !== undefined, "getById() returns the created row");
assert(
  byId.blog_thumbnail === testData.blog_thumbnail,
  "getById() returns blog_thumbnail",
);

// ── Read admin detail (by id) ──

const adminDetail = model.getAdminById(createdId);
assert(adminDetail !== undefined, "getAdminById() returns detail");
assert(
  adminDetail.blog_thumbnail === testData.blog_thumbnail,
  "getAdminById() includes blog_thumbnail",
);
assert(
  Array.isArray(adminDetail.mla_sources),
  "getAdminById() includes mla_sources array",
);

// ── Publish and read public detail (by slug) ──

model.update(createdId, { published_draft: 1 });
const publicDetail = model.getDetailBySlug(createdSlug);
assert(publicDetail !== undefined, "getDetailBySlug() returns published post");
assert(
  Array.isArray(publicDetail.mla_sources),
  "getDetailBySlug() includes mla_sources array",
);
assert(
  publicDetail.blog_thumbnail === testData.blog_thumbnail,
  "getDetailBySlug() includes blog_thumbnail",
);

// ── Update blog_thumbnail ──

const updated = model.update(createdId, {
  blog_thumbnail: "/assets/images/updated-thumb.webp",
});
assert(
  updated.blog_thumbnail === "/assets/images/updated-thumb.webp",
  "update() persists changed blog_thumbnail",
);

// ── Cleanup ──

model.remove(createdId);
const gone = model.getById(createdId);
assert(gone === undefined, "remove() deletes the test row");

console.log("\nDone.");
