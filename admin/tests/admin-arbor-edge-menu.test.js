// Admin arbor edge action-menu tests — uses node:test + node:assert.
// Exercises the pure clampMenuPosition helper in
// admin-arbor/arbor-edge-menu.js (mirrors the connect-menu clamp tests in
// admin-arbor.test.js). The DOM-bound open/close/keyboard wiring is
// validated manually via browser testing (see setup/TESTS/admin_tests.md).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const menuPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-edge-menu.js",
);
const menuSource = fs.readFileSync(menuPath, "utf8");

const sandbox = {
  window: {},
  document: {
    createElement: function () {
      return {
        className: "",
        setAttribute: function () {},
        appendChild: function () {},
        addEventListener: function () {},
        classList: { add: function () {}, remove: function () {} },
      };
    },
    body: { appendChild: function () {} },
    addEventListener: function () {},
  },
  console: { error: function () {} },
};

vm.runInNewContext(menuSource, sandbox);
const EdgeMenu = sandbox.window.AdminArborEdgeMenu;

describe("arbor edge menu: clampMenuPosition", function () {
  test("positions menu at cursor when within viewport", function () {
    const result = EdgeMenu._clampMenuPosition(200, 300, 160, 88, 1024, 768);
    assert.equal(result.left, 200);
    assert.equal(result.top, 300);
  });

  test("clamps right edge when overflow", function () {
    const result = EdgeMenu._clampMenuPosition(950, 300, 160, 88, 1024, 768);
    assert.equal(result.left, 1024 - 160 - 8);
  });

  test("clamps bottom edge when overflow", function () {
    const result = EdgeMenu._clampMenuPosition(200, 700, 160, 88, 1024, 768);
    assert.equal(result.top, 768 - 88 - 8);
  });

  test("clamps negative left/top", function () {
    const result = EdgeMenu._clampMenuPosition(-10, -10, 160, 88, 1024, 768);
    assert.equal(result.left, 8);
    assert.equal(result.top, 8);
  });
});
