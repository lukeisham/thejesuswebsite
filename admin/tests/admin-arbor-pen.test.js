// Admin arbor pen tests — uses node:test + node:assert.
// Exercises the arbor-pen module (admin-arbor/arbor-pen.js): chip finding,
// removal, creation, rendering, and drop handling with stubbed globals.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load dependencies ────────────────────────────────────────────────────────

const geometryPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-geometry.js",
);
const geometrySource = fs.readFileSync(geometryPath, "utf8");

const penPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-pen.js",
);
const penSource = fs.readFileSync(penPath, "utf8");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

/**
 * Factory to create isolated fake DOM elements that record state changes.
 */
function makeElement() {
  const classSet = new Set();
  const element = {
    id: "",
    className: "",
    textContent: "",
    style: {},
    hidden: false,
    parentNode: null,
    children: [],
    classList: {
      add: function (c) {
        classSet.add(c);
      },
      remove: function (c) {
        classSet.delete(c);
      },
      contains: function (c) {
        return classSet.has(c);
      },
      toString: function () {
        return Array.from(classSet).join(" ");
      },
    },
    appendChild: function (child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    insertBefore: function (child) {
      this.children.unshift(child);
      child.parentNode = this;
      return child;
    },
    setAttribute: function (name, value) {
      this[`_attr_${name}`] = value;
    },
    getAttribute: function (name) {
      return this[`_attr_${name}`] || null;
    },
    removeAttribute: function (name) {
      delete this[`_attr_${name}`];
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    querySelectorAll: function () {
      return [];
    },
    focus: function () {},
  };

  // Define innerHTML as a getter/setter to handle clearing
  Object.defineProperty(element, "innerHTML", {
    get: function () {
      return "";
    },
    set: function (value) {
      if (value === "") {
        this.children = [];
      }
    },
  });

  return element;
}

/**
 * Build a fresh sandboxed AdminArborPen with isolated state.
 * Returns { AdminArborPen, elementsById, calls }
 */
function makeSandbox() {
  const elementsById = {};
  const calls = {
    addNodeToCanvas: [],
    createParentEdge: [],
    connectMenuOpen: [],
  };

  const fakeDocument = {
    getElementById: function (id) {
      if (!elementsById[id]) {
        elementsById[id] = makeElement();
        elementsById[id].id = id;
      }
      return elementsById[id];
    },
    createElement: function (tag) {
      return makeElement();
    },
    body: makeElement(),
    querySelectorAll: function () {
      return [];
    },
  };

  const sandbox = {
    window: {
      AdminArborGeometry: null, // Will be set by geometry source
      AdminArborCanvas: {
        getTransform: function () {
          return { x: 0, y: 0, scale: 1 };
        },
        clientToDiagram: function (clientX, clientY) {
          return { x: clientX, y: clientY };
        },
      },
      AdminArborNodes: {
        getNodeAtDiagramPosition: function () {
          return null;
        },
        addNodeToCanvas: function (evidence, diagX, diagY, parentId) {
          calls.addNodeToCanvas.push({ evidence, diagX, diagY, parentId });
        },
        createParentEdge: function (parentId, evidenceId, type, data) {
          calls.createParentEdge.push({ parentId, evidenceId, type, data });
        },
      },
      AdminArborConnectMenu: {
        open: function (x, y) {
          calls.connectMenuOpen.push({ x, y });
          return Promise.resolve("supports");
        },
      },
    },
    document: fakeDocument,
    Admin: {
      api: {
        get: async function (url) {
          if (url === "/arbor/admin/unplaced") {
            return [];
          }
          throw new Error("Unexpected API call: " + url);
        },
      },
    },
    console: {
      warn: function () {},
      error: function () {},
      log: function () {},
    },
  };

  // Load arbor-geometry.js first
  vm.runInNewContext(geometrySource, sandbox);

  // Then load arbor-pen.js
  vm.runInNewContext(penSource, sandbox);

  return {
    AdminArborPen: sandbox.window.AdminArborPen,
    elementsById,
    calls,
    sandbox,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("AdminArborPen.findChip", () => {
  test("returns the chip when found", async () => {
    const { AdminArborPen, sandbox } = makeSandbox();
    AdminArborPen.init();

    sandbox.Admin.api.get = async function () {
      return [
        { id: 1, title: "Evidence 1", published_draft: 1 },
        { id: 2, title: "Evidence 2", published_draft: 0 },
      ];
    };

    await AdminArborPen.loadChips();

    const found = AdminArborPen.findChip(2);
    assert.ok(found);
    assert.equal(found.id, 2);
    assert.equal(found.title, "Evidence 2");
  });

  test("returns undefined for a non-existent id", async () => {
    const { AdminArborPen, sandbox } = makeSandbox();
    AdminArborPen.init();

    sandbox.Admin.api.get = async function () {
      return [{ id: 1, title: "Evidence 1", published_draft: 1 }];
    };

    await AdminArborPen.loadChips();

    const found = AdminArborPen.findChip(9999);
    assert.equal(found, undefined);
  });
});

describe("AdminArborPen.renderChips", () => {
  test("hides chip list and shows empty state when no chips", () => {
    const { AdminArborPen, elementsById } = makeSandbox();
    AdminArborPen.init();

    elementsById["arbor-pen-list"].hidden = false;
    elementsById["arbor-pen-empty"].hidden = true;

    AdminArborPen.renderChips();

    assert.equal(elementsById["arbor-pen-list"].hidden, true);
    assert.equal(elementsById["arbor-pen-empty"].hidden, false);
  });

  test("shows chip list and hides empty state when chips present", () => {
    const { AdminArborPen, elementsById, sandbox } = makeSandbox();
    AdminArborPen.init();

    // Manually set up chips by calling an internal method
    // We need to trigger the rendering with actual chip data
    // Let's patch Admin.api.get to return mock data
    sandbox.Admin.api.get = async function () {
      return [
        { id: 1, title: "Evidence 1", published_draft: 1 },
        { id: 2, title: "Evidence 2", published_draft: 0 },
      ];
    };

    // Now call loadChips which will set up chips and call renderChips
    return AdminArborPen.loadChips().then(() => {
      assert.equal(elementsById["arbor-pen-list"].hidden, false);
      assert.equal(elementsById["arbor-pen-empty"].hidden, true);
      assert.ok(elementsById["arbor-pen-list"].children.length > 0);
    });
  });
});

describe("AdminArborPen.createChipElement", () => {
  test("creates a button with correct classes, draggable attribute, and title", () => {
    const { AdminArborPen } = makeSandbox();

    const evidence = {
      id: 42,
      title: "Test Evidence",
      published_draft: 1,
    };

    const chip = AdminArborPen.createChipElement(evidence);

    assert.equal(chip.className, "admin-arbor-pen__chip");
    assert.equal(chip.getAttribute("draggable"), "true");
    assert.equal(chip.getAttribute("data-evidence-id"), "42");
    assert.equal(chip.children.length, 2); // title span + badge span

    const titleSpan = chip.children[0];
    const badge = chip.children[1];

    assert.equal(titleSpan.className, "admin-arbor-pen__chip-title");
    assert.equal(titleSpan.textContent, "Test Evidence");

    assert.ok(badge.className.includes("admin-arbor-pen__badge"));
    assert.ok(badge.className.includes("admin-arbor-pen__badge--published"));
    assert.equal(badge.textContent, "Published");
  });

  test("shows 'Draft' badge for unpublished evidence", () => {
    const { AdminArborPen } = makeSandbox();

    const evidence = {
      id: 43,
      title: "Draft Evidence",
      published_draft: 0,
    };

    const chip = AdminArborPen.createChipElement(evidence);
    const badge = chip.children[1];

    assert.ok(badge.className.includes("admin-arbor-pen__badge--draft"));
    assert.equal(badge.textContent, "Draft");
  });

  test("handles missing title with '(untitled)' placeholder", () => {
    const { AdminArborPen } = makeSandbox();

    const evidence = { id: 44, title: null, published_draft: 1 };

    const chip = AdminArborPen.createChipElement(evidence);
    const titleSpan = chip.children[0];

    assert.equal(titleSpan.textContent, "(untitled)");
  });
});

describe("AdminArborPen.removeChip", () => {
  test("removes a chip and leaves others intact by filtering internal state", () => {
    const { AdminArborPen, elementsById, sandbox } = makeSandbox();
    AdminArborPen.init();

    // Mock API to return 3 chips
    sandbox.Admin.api.get = async function () {
      return [
        { id: 1, title: "Evidence 1", published_draft: 1 },
        { id: 2, title: "Evidence 2", published_draft: 1 },
        { id: 3, title: "Evidence 3", published_draft: 1 },
      ];
    };

    return AdminArborPen.loadChips().then(() => {
      // After load, should have 3 chip elements rendered
      const initialChildCount = elementsById["arbor-pen-list"].children.length;
      assert.equal(initialChildCount, 3);

      // Now remove chip 2 — this filters the internal chips array and calls renderChips
      AdminArborPen.removeChip(2);

      // After removal, the list should have 2 children
      const afterRemovalCount = elementsById["arbor-pen-list"].children.length;
      assert.equal(afterRemovalCount, 2);

      // Verify the remaining chips are 1 and 3 by checking titles
      const remainingTitles = elementsById["arbor-pen-list"].children.map((chip) => {
        const titleSpan = chip.children[0];
        return titleSpan.textContent;
      });
      assert.deepEqual(remainingTitles, ["Evidence 1", "Evidence 3"]);
    });
  });
});

describe("AdminArborPen.handleDrop", () => {
  test("calls addNodeToCanvas with converted diagram coordinates", async () => {
    const { AdminArborPen, sandbox, calls } = makeSandbox();
    AdminArborPen.init();

    // Set up a single chip
    sandbox.Admin.api.get = async function () {
      return [{ id: 42, title: "Test", published_draft: 1 }];
    };

    await AdminArborPen.loadChips();

    // Now simulate a drop at screen coordinates (100, 200)
    // The canvas will convert to diagram coordinates (100, 200) due to our identity transform
    await AdminArborPen.handleDrop(100, 200, 42);

    // Should have called addNodeToCanvas once
    assert.equal(calls.addNodeToCanvas.length, 1);
    const call = calls.addNodeToCanvas[0];
    assert.equal(call.evidence.id, 42);
    assert.equal(call.diagX, 100);
    assert.equal(call.diagY, 200);
    assert.equal(call.parentId, null);
  });

  test("does nothing when chip is not found", async () => {
    const { AdminArborPen, calls } = makeSandbox();
    AdminArborPen.init();

    // Try to drop a non-existent chip
    await AdminArborPen.handleDrop(100, 200, 9999);

    // Should not have called addNodeToCanvas
    assert.equal(calls.addNodeToCanvas.length, 0);
  });

  test("opens connect menu and creates edge when dropped on existing node", async () => {
    const { AdminArborPen, sandbox, calls } = makeSandbox();
    AdminArborPen.init();

    // Set up a chip
    sandbox.Admin.api.get = async function () {
      return [{ id: 42, title: "New Evidence", published_draft: 1 }];
    };

    // Set up a fake parent node
    const parentNode = {
      id: 99,
      arbor_x: 100,
      arbor_y: 100,
    };

    sandbox.window.AdminArborNodes.getNodeAtDiagramPosition = function () {
      return parentNode;
    };

    await AdminArborPen.loadChips();

    // Drop the chip onto the parent node
    await AdminArborPen.handleDrop(150, 150, 42);

    // Should have called addNodeToCanvas
    assert.equal(calls.addNodeToCanvas.length, 1);

    // Should have opened the connect menu
    assert.equal(calls.connectMenuOpen.length, 1);

    // Should have created a parent edge (because the mock returns "supports")
    assert.equal(calls.createParentEdge.length, 1);
    const edgeCall = calls.createParentEdge[0];
    assert.equal(edgeCall.parentId, 99);
    assert.equal(edgeCall.evidenceId, 42);
    assert.equal(edgeCall.type, "supports");
  });
});
