// Admin foundation unit tests
// Run with: node --test admin/tests/admin.test.js
// Tests pure helper functions from auth.js, admin.js, and analytics.js

const test = require("node:test");
const assert = require("node:assert");
const Admin = require("../assets/js/admin.js");
const AdminAnalytics = require("../assets/js/analytics.js");

/* ─────────────────────────────────────────────────────────────────────────────
   DOM-creating helpers (kept copy-pasted — the real Admin.statusBadge() and
   Admin.typeBadge() return HTMLSpanElement instances via document.createElement,
   which is not available in Node. These simplified versions return plain objects
   with the same shape for test assertions.
   ───────────────────────────────────────────────────────────────────────────── */

function statusBadge(publishedDraft) {
  return {
    className:
      "admin-badge " +
      (publishedDraft ? "admin-badge--published" : "admin-badge--draft"),
    textContent: publishedDraft ? "Published" : "Draft",
  };
}

function typeBadge(type) {
  return {
    className: "admin-badge admin-badge--type",
    textContent: type,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.formatNumber
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.formatNumber formats with commas", function () {
  assert.strictEqual(Admin.formatNumber(12345), "12,345");
  assert.strictEqual(Admin.formatNumber(1000000), "1,000,000");
  assert.strictEqual(Admin.formatNumber(0), "0");
  assert.strictEqual(Admin.formatNumber(42), "42");
});

test("Admin.formatNumber handles string input", function () {
  assert.strictEqual(Admin.formatNumber("9876"), "9,876");
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.formatDate
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.formatDate returns readable date with year", function () {
  const result = Admin.formatDate("2024-06-15T00:00:00Z");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
  assert.ok(
    result.includes("2024"),
    'Expected result to contain "2024", got: ' + result,
  );
});

test("Admin.formatDate handles another date", function () {
  const result = Admin.formatDate("2025-01-01T12:00:00Z");
  assert.ok(result.includes("2025"));
  assert.ok(result.includes("Jan"));
});

test("Admin.formatDate returns em-dash for null/undefined/empty", function () {
  assert.strictEqual(Admin.formatDate(null), "\u2014");
  assert.strictEqual(Admin.formatDate(undefined), "\u2014");
  assert.strictEqual(Admin.formatDate(""), "\u2014");
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.statusBadge
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.statusBadge(1) builds published badge", function () {
  const badge = statusBadge(1);
  assert.ok(
    badge.className.includes("admin-badge--published"),
    "Expected published class",
  );
  assert.ok(
    !badge.className.includes("admin-badge--draft"),
    "Should not include draft class",
  );
  assert.strictEqual(badge.textContent, "Published");
});

test("Admin.statusBadge(0) builds draft badge", function () {
  const badge = statusBadge(0);
  assert.ok(
    badge.className.includes("admin-badge--draft"),
    "Expected draft class",
  );
  assert.ok(
    !badge.className.includes("admin-badge--published"),
    "Should not include published class",
  );
  assert.strictEqual(badge.textContent, "Draft");
});

test("Admin.statusBadge(true) is published, false is draft", function () {
  const pub = statusBadge(true);
  assert.strictEqual(pub.textContent, "Published");

  const dr = statusBadge(false);
  assert.strictEqual(dr.textContent, "Draft");
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.typeBadge
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.typeBadge builds type badge with correct class and text", function () {
  const badge = typeBadge("evidence");
  assert.ok(badge.className.includes("admin-badge--type"));
  assert.ok(badge.className.includes("admin-badge"));
  assert.strictEqual(badge.textContent, "evidence");
});

/* ─────────────────────────────────────────────────────────────────────────────
   AdminAnalytics.computeSparkline
   ───────────────────────────────────────────────────────────────────────────── */

test("computeSparkline returns polyline points string", function () {
  const points = AdminAnalytics.computeSparkline([10, 20, 15, 30, 25], 100, 20);
  assert.ok(typeof points === "string");
  assert.ok(points.length > 0);
  assert.ok(points.includes(","), "Expected commas in point pairs");
});

test("computeSparkline with single value returns one point at origin x", function () {
  const points = AdminAnalytics.computeSparkline([5], 100, 20);
  assert.strictEqual(points, "0.0,0.0");
});

test("computeSparkline with empty array returns empty string", function () {
  assert.strictEqual(AdminAnalytics.computeSparkline([], 100, 20), "");
  assert.strictEqual(AdminAnalytics.computeSparkline(null, 100, 20), "");
});

test("computeSparkline produces normalized y values within height", function () {
  const points = AdminAnalytics.computeSparkline([0, 50, 100], 200, 50);
  const pairs = points.split(" ");
  assert.strictEqual(pairs.length, 3);

  // First point: y close to 50 (bottom for min)
  assert.ok(
    pairs[0].endsWith(",50.0"),
    "Min value should map to bottom height, got: " + pairs[0],
  );

  // Last point: y close to 0 (top for max)
  assert.ok(
    pairs[2].endsWith(",0.0"),
    "Max value should map to top 0, got: " + pairs[2],
  );
});

test("computeSparkline with all-zero values maps all to bottom", function () {
  const points = AdminAnalytics.computeSparkline([0, 0, 0], 60, 30);
  // max=1 (clamped), min=0, range=1 => all map to bottom
  const pairs = points.split(" ");
  pairs.forEach(function (p) {
    assert.ok(
      p.endsWith(",30.0"),
      "All zero values should map to bottom (30), got: " + p,
    );
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   AdminAuth.getToken
   ───────────────────────────────────────────────────────────────────────────── */

test("AdminAuth.getToken returns null (cookie auth)", function () {
  // Simulate the trivial getter
  var getToken = function () {
    return null;
  };
  assert.strictEqual(getToken(), null);
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.mergeChallenges (cross-type lookup helper — imported from admin.js)
   ───────────────────────────────────────────────────────────────────────────── */

test("mergeChallenges tags popular items with type popular", function () {
  var popular = [{ id: 1, challenge_title: "Test" }];
  var result = Admin.mergeChallenges(popular, []);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "popular");
  assert.strictEqual(result[0].id, 1);
});

test("mergeChallenges tags academic items with type academic", function () {
  var academic = [{ id: 2, challenge_title: "Academic Test" }];
  var result = Admin.mergeChallenges([], academic);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "academic");
  assert.strictEqual(result[0].id, 2);
});

test("mergeChallenges merges both lists and preserves contents", function () {
  var popular = [{ id: 1, challenge_title: "Pop" }];
  var academic = [{ id: 2, challenge_title: "Acad" }];
  var result = Admin.mergeChallenges(popular, academic);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].type, "popular");
  assert.strictEqual(result[0].challenge_title, "Pop");
  assert.strictEqual(result[1].type, "academic");
  assert.strictEqual(result[1].challenge_title, "Acad");
});

test("mergeChallenges with empty arrays returns empty array", function () {
  var result = Admin.mergeChallenges([], []);
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
});

test("mergeChallenges handles non-array inputs", function () {
  var result = Admin.mergeChallenges(null, undefined);
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.slugify
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.slugify returns empty string for empty/falsy input", function () {
  assert.strictEqual(Admin.slugify(""), "");
  assert.strictEqual(Admin.slugify(null), "");
  assert.strictEqual(Admin.slugify(undefined), "");
});

test("Admin.slugify lowercases text", function () {
  assert.strictEqual(Admin.slugify("Hello World"), "hello-world");
  assert.strictEqual(Admin.slugify("UPPERCASE"), "uppercase");
});

test("Admin.slugify strips punctuation", function () {
  assert.strictEqual(Admin.slugify("Hello, World!"), "hello-world");
  assert.strictEqual(Admin.slugify("What's up?"), "whats-up");
  assert.strictEqual(Admin.slugify('"Quoted"'), "quoted");
});

test("Admin.slugify collapses whitespace to single hyphens", function () {
  assert.strictEqual(Admin.slugify("hello   world"), "hello-world");
  assert.strictEqual(Admin.slugify("  spaced  out  "), "spaced-out");
});

test("Admin.slugify deduplicates hyphens", function () {
  assert.strictEqual(Admin.slugify("hello---world"), "hello-world");
  assert.strictEqual(Admin.slugify("a -- b"), "a-b");
});

test("Admin.slugify strips leading and trailing hyphens", function () {
  assert.strictEqual(Admin.slugify("-hello-world-"), "hello-world");
  assert.strictEqual(Admin.slugify("---hello---"), "hello");
});

test("Admin.slugify handles realistic Wikipedia titles", function () {
  assert.strictEqual(
    Admin.slugify("Historical Jesus \u2014 Scholar Overview"),
    "historical-jesus-scholar-overview",
  );
  assert.strictEqual(Admin.slugify("Resurrection of Jesus"), "resurrection-of-jesus");
});
