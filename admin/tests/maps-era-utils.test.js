// maps-era-utils.test.js — Tests for the shared era-utils helper and
// staged-changes pure-logic functions. Uses node:test + node:assert with
// vm sandboxing to load the browser-targeted modules.
//
// Tested functions:
//   - AdminMapsEraUtils.eraToKebab(era)
//   - AdminMapsStaged.stageCreate / .stageMove / .getCreates / .getMoves
//     / .count / .hasChanges

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Shared sandbox for browser-targeted modules ─────────────────────────────

function createSandbox() {
  return {
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    document: {
      getElementById: () => null,
    },
    console: { error: () => {} },
    Admin: {
      api: {
        get: async () => [],
        post: async (url, payload) => payload,
        put: async (url, payload) => payload,
        del: async () => {},
      },
    },
    // MutationObserver stub for _updateUI
    MutationObserver: function () {
      return { observe: () => {} };
    },
  };
}

// ── Load maps-era-utils.js ──────────────────────────────────────────────────

const eraUtilsPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-maps",
  "maps-era-utils.js",
);
const eraUtilsSource = fs.readFileSync(eraUtilsPath, "utf8");

// ── Load maps-staged-changes.js ─────────────────────────────────────────────

const stagedPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-maps",
  "maps-staged-changes.js",
);
const stagedSource = fs.readFileSync(stagedPath, "utf8");

// ═══════════════════════════════════════════════════════════════════════════
// eraToKebab
// ═══════════════════════════════════════════════════════════════════════════

describe("AdminMapsEraUtils.eraToKebab", () => {
  let eraToKebab;

  beforeEach(() => {
    const sandbox = createSandbox();
    vm.runInNewContext(eraUtilsSource, sandbox);
    eraToKebab = sandbox.window.AdminMapsEraUtils.eraToKebab;
  });

  test("converts simple CamelCase", () => {
    assert.equal(eraToKebab("EarlyLife"), "early-life");
  });

  test("converts multi-word CamelCase", () => {
    assert.equal(eraToKebab("GalileeMinistry"), "galilee-ministry");
  });

  test("converts consecutive capitals (e.g. OTVerses)", () => {
    assert.equal(eraToKebab("OTVerses"), "ot-verses");
  });

  test("converts PassionWeek → passion-week", () => {
    assert.equal(eraToKebab("PassionWeek"), "passion-week");
  });

  test("converts PostPassion → post-passion", () => {
    assert.equal(eraToKebab("PostPassion"), "post-passion");
  });

  test("converts PreIncarnation → pre-incarnation", () => {
    assert.equal(eraToKebab("PreIncarnation"), "pre-incarnation");
  });

  test("converts OldTestament → old-testament", () => {
    assert.equal(eraToKebab("OldTestament"), "old-testament");
  });

  test("converts JudeanMinistry → judean-ministry", () => {
    assert.equal(eraToKebab("JudeanMinistry"), "judean-ministry");
  });

  test("returns already-lowercase string as lowercase", () => {
    assert.equal(eraToKebab("galilee"), "galilee");
  });

  test("handles empty string", () => {
    assert.equal(eraToKebab(""), "");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AdminMapsStaged — pure staged-changes logic
// ═══════════════════════════════════════════════════════════════════════════

describe("AdminMapsStaged", () => {
  let Staged;

  beforeEach(() => {
    const sandbox = createSandbox();
    vm.runInNewContext(eraUtilsSource, sandbox);
    vm.runInNewContext(stagedSource, sandbox);
    Staged = sandbox.window.AdminMapsStaged;
  });

  describe("stageCreate", () => {
    test("adds a staged create and returns the object", () => {
      const evidence = { id: 1, title: "Test Evidence", timeline_era: null };
      const staged = Staged.stageCreate(1, evidence, 50, 75);
      assert.ok(staged._tempId.startsWith("staged-"));
      assert.equal(staged.map_id, 1);
      assert.equal(staged.evidence_id, 1);
      assert.equal(staged.evidence_title, "Test Evidence");
      assert.equal(staged.x, 50);
      assert.equal(staged.y, 75);
      assert.equal(staged.label, "Test Evidence");
      assert.equal(Staged.count(), 1);
    });

    test("increments tempId counter", () => {
      const ev = { id: 2, title: "B", timeline_era: null };
      const a = Staged.stageCreate(
        1,
        { id: 1, title: "A", timeline_era: null },
        0,
        0,
      );
      const b = Staged.stageCreate(2, ev, 10, 20);
      assert.notEqual(a._tempId, b._tempId);
      assert.equal(Staged.count(), 2);
    });

    test("rounds coordinates to 2 decimal places", () => {
      const staged = Staged.stageCreate(
        1,
        { id: 1, title: "X", timeline_era: null },
        33.336,
        66.664,
      );
      assert.equal(staged.x, 33.34);
      assert.equal(staged.y, 66.66);
    });
  });

  describe("getCreates / getMoves", () => {
    test("getCreates returns a copy, not the internal array", () => {
      const creates = Staged.getCreates();
      creates.push({});
      assert.equal(Staged.count(), 0);
    });

    test("getMoves returns a copy", () => {
      const moves = Staged.getMoves();
      moves.push({ pinId: 99, x: 0, y: 0 });
      assert.equal(Staged.count(), 0);
    });
  });

  describe("stageMove", () => {
    test("adds a staged move", () => {
      Staged.stageMove(42, 10, 20);
      assert.equal(Staged.count(), 1);
      const moves = Staged.getMoves();
      assert.equal(moves.length, 1);
      assert.equal(moves[0].pinId, 42);
      assert.equal(moves[0].x, 10);
      assert.equal(moves[0].y, 20);
    });

    test("replaces prior staged move for the same pin", () => {
      Staged.stageMove(42, 10, 20);
      Staged.stageMove(42, 90, 80);
      assert.equal(Staged.count(), 1);
      const moves = Staged.getMoves();
      assert.equal(moves[0].x, 90);
      assert.equal(moves[0].y, 80);
    });
  });

  describe("hasChanges / count", () => {
    test("hasChanges returns false when empty", () => {
      assert.equal(Staged.hasChanges(), false);
    });

    test("hasChanges returns true after stageCreate", () => {
      Staged.stageCreate(1, { id: 1, title: "T", timeline_era: null }, 0, 0);
      assert.equal(Staged.hasChanges(), true);
    });

    test("count includes both creates and moves", () => {
      Staged.stageCreate(1, { id: 1, title: "T", timeline_era: null }, 0, 0);
      Staged.stageMove(42, 10, 20);
      Staged.stageMove(43, 30, 40);
      assert.equal(Staged.count(), 3);
    });
  });
});
