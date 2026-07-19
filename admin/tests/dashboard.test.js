// Admin dashboard unit tests — uses node:test + node:assert.
// Exercises the pure TYPE_LABELS map and contentItemUrl() helper extracted
// from admin/index.html's inline script into admin/assets/js/dashboard.js.
// The DOM-bound fetch/filter wiring is validated manually via browser
// testing (see setup/TESTS/admin_tests.md).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dashboardPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "dashboard.js",
);
const dashboardSource = fs.readFileSync(dashboardPath, "utf8");

function makeSandbox() {
  const listeners = {};
  const sandbox = {
    window: {},
    document: {
      addEventListener: function (type, handler) {
        listeners[type] = handler;
      },
      getElementById: function () {
        return null;
      },
      createElement: function () {
        return {
          className: "",
          style: {},
          setAttribute: function () {},
          appendChild: function () {},
          addEventListener: function () {},
        };
      },
    },
    console: { error: function () {} },
  };
  sandbox.window.document = sandbox.document;
  return sandbox;
}

const sandbox = makeSandbox();
vm.runInNewContext(dashboardSource, sandbox);
const Dashboard = sandbox.window.AdminDashboard;

describe("dashboard: TYPE_LABELS", function () {
  test("maps every known content type to a human label", function () {
    assert.equal(Dashboard.TYPE_LABELS.evidence, "Evidence");
    assert.equal(Dashboard.TYPE_LABELS.essays, "Essay");
    assert.equal(Dashboard.TYPE_LABELS.responses, "Response");
    assert.equal(Dashboard.TYPE_LABELS.historiography, "Historiography");
    assert.equal(Dashboard.TYPE_LABELS["blog-posts"], "Blog Post");
    assert.equal(Dashboard.TYPE_LABELS.collections, "Collection");
    assert.equal(Dashboard.TYPE_LABELS.resources, "Resource");
    assert.equal(
      Dashboard.TYPE_LABELS["popular-challenges"],
      "Popular Challenge",
    );
    assert.equal(
      Dashboard.TYPE_LABELS["academic-challenges"],
      "Academic Challenge",
    );
  });

  test("has no label for unknown types (caller falls back to raw type)", function () {
    assert.equal(Dashboard.TYPE_LABELS.unknown, undefined);
  });
});

describe("dashboard: contentItemUrl", function () {
  test("builds edit URLs for standard content types", function () {
    assert.equal(
      Dashboard.contentItemUrl({ type: "evidence", id: 5 }),
      "evidence/edit-[id].html?id=5",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "essays", id: 7 }),
      "essays/edit-[id].html?id=7",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "responses", id: 3 }),
      "debate/edit-[id].html?id=3",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "historiography", id: 9 }),
      "historiography/edit-[id].html?id=9",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "blog-posts", id: 2 }),
      "blog/edit-[id].html?id=2",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "popular-challenges", id: 4 }),
      "debate/popular-challenges/edit-[id].html?id=4",
    );
    assert.equal(
      Dashboard.contentItemUrl({ type: "academic-challenges", id: 6 }),
      "debate/academic-challenges/edit-[id].html?id=6",
    );
  });

  test("collections always link to the collections index", function () {
    assert.equal(
      Dashboard.contentItemUrl({ type: "collections", id: 1 }),
      "collections/index.html",
    );
  });

  test("resources link to their list_key page", function () {
    assert.equal(
      Dashboard.contentItemUrl({ type: "resources", list_key: "parables" }),
      "resources/parables.html",
    );
  });

  test("resources with a missing list_key fall back to an empty slug", function () {
    assert.equal(
      Dashboard.contentItemUrl({ type: "resources" }),
      "resources/.html",
    );
  });

  test("unknown types return a harmless placeholder link", function () {
    assert.equal(Dashboard.contentItemUrl({ type: "mystery", id: 1 }), "#");
  });
});
