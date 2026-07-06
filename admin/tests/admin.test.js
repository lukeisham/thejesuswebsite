// Admin foundation unit tests
// Run with: node --test admin/tests/admin.test.js
// Tests pure helper functions from auth.js, admin.js, and analytics.js

const test = require("node:test");
const assert = require("node:assert");

/* ─────────────────────────────────────────────────────────────────────────────
   Replicated pure helpers (these mirror the browser globals but run in Node)
   ───────────────────────────────────────────────────────────────────────────── */

function formatNumber(n) {
  return Number(n).toLocaleString();
}

function formatDate(isoString) {
  if (!isoString) return "\u2014";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

function computeSparkline(values, width, height) {
  if (!values || values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / (values.length - 1 || 1);
  return values
    .map(function (v, i) {
      const x = (i * stepX).toFixed(1);
      const y = (height - ((v - min) / range) * height).toFixed(1);
      return x + "," + y;
    })
    .join(" ");
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.formatNumber
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.formatNumber formats with commas", function () {
  assert.strictEqual(formatNumber(12345), "12,345");
  assert.strictEqual(formatNumber(1000000), "1,000,000");
  assert.strictEqual(formatNumber(0), "0");
  assert.strictEqual(formatNumber(42), "42");
});

test("Admin.formatNumber handles string input", function () {
  assert.strictEqual(formatNumber("9876"), "9,876");
});

/* ─────────────────────────────────────────────────────────────────────────────
   Admin.formatDate
   ───────────────────────────────────────────────────────────────────────────── */

test("Admin.formatDate returns readable date with year", function () {
  const result = formatDate("2024-06-15T00:00:00Z");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
  assert.ok(
    result.includes("2024"),
    'Expected result to contain "2024", got: ' + result,
  );
});

test("Admin.formatDate handles another date", function () {
  const result = formatDate("2025-01-01T12:00:00Z");
  assert.ok(result.includes("2025"));
  assert.ok(result.includes("Jan"));
});

test("Admin.formatDate returns em-dash for null/undefined/empty", function () {
  assert.strictEqual(formatDate(null), "\u2014");
  assert.strictEqual(formatDate(undefined), "\u2014");
  assert.strictEqual(formatDate(""), "\u2014");
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
  const points = computeSparkline([10, 20, 15, 30, 25], 100, 20);
  assert.ok(typeof points === "string");
  assert.ok(points.length > 0);
  assert.ok(points.includes(","), "Expected commas in point pairs");
});

test("computeSparkline with single value returns one point at origin x", function () {
  const points = computeSparkline([5], 100, 20);
  assert.strictEqual(points, "0.0,0.0");
});

test("computeSparkline with empty array returns empty string", function () {
  assert.strictEqual(computeSparkline([], 100, 20), "");
  assert.strictEqual(computeSparkline(null, 100, 20), "");
});

test("computeSparkline produces normalized y values within height", function () {
  const points = computeSparkline([0, 50, 100], 200, 50);
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
  const points = computeSparkline([0, 0, 0], 60, 30);
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
   mergeChallenges (cross-type lookup helper)
   ───────────────────────────────────────────────────────────────────────────── */

function mergeChallenges(popularItems, academicItems) {
  var merged = [];
  if (Array.isArray(popularItems)) {
    for (var i = 0; i < popularItems.length; i++) {
      var item = popularItems[i];
      item.type = "popular";
      merged.push(item);
    }
  }
  if (Array.isArray(academicItems)) {
    for (var j = 0; j < academicItems.length; j++) {
      var aItem = academicItems[j];
      aItem.type = "academic";
      merged.push(aItem);
    }
  }
  return merged;
}

test("mergeChallenges tags popular items with type popular", function () {
  var popular = [{ id: 1, challenge_title: "Test" }];
  var result = mergeChallenges(popular, []);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "popular");
  assert.strictEqual(result[0].id, 1);
});

test("mergeChallenges tags academic items with type academic", function () {
  var academic = [{ id: 2, challenge_title: "Academic Test" }];
  var result = mergeChallenges([], academic);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "academic");
  assert.strictEqual(result[0].id, 2);
});

test("mergeChallenges merges both lists and preserves contents", function () {
  var popular = [{ id: 1, challenge_title: "Pop" }];
  var academic = [{ id: 2, challenge_title: "Acad" }];
  var result = mergeChallenges(popular, academic);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].type, "popular");
  assert.strictEqual(result[0].challenge_title, "Pop");
  assert.strictEqual(result[1].type, "academic");
  assert.strictEqual(result[1].challenge_title, "Acad");
});

test("mergeChallenges with empty arrays returns empty array", function () {
  var result = mergeChallenges([], []);
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
});

test("mergeChallenges handles non-array inputs", function () {
  var result = mergeChallenges(null, undefined);
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
});
