// AdminTimelineStaged tests — node:test + node:assert + vm.
// Each test creates a fresh sandbox so internal state does not leak.
//
// Mocks: UpdateRecord.saveEvent, AdminTimelineEvents.loadEvents,
//        showToast, document.getElementById.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const stagedPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-staged-changes.js",
);
const stagedSource = fs.readFileSync(stagedPath, "utf8");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a fresh sandbox with all required mocks.
 * @param {{ saveEvent?: Function }} opts
 */
function createSandbox(opts) {
  opts = opts || {};

  var mockBtn = {
    disabled: false,
    textContent: "Save Changes",
  };

  // Track calls for assertions
  var calls = {
    saveEvent: [],
    loadEvents: 0,
    refresh: 0,
    showToast: [],
  };

  var sandbox = {
    window: {},
    document: {
      getElementById: function (id) {
        if (id === "timeline-save-btn") return mockBtn;
        return null;
      },
    },
    // Mock UpdateRecord
    UpdateRecord: {
      saveEvent:
        opts.saveEvent ||
        async function () {
          calls.saveEvent.push(Array.prototype.slice.call(arguments));
        },
    },
    // Mocks for post-save refresh
    AdminTimelineEvents: {
      loadEvents: async function () {
        calls.loadEvents++;
      },
    },
    AdminTimelineHoldingPen: {
      refresh: async function () {
        calls.refresh++;
      },
    },
    showToast:
      opts.showToast ||
      function (msg, level) {
        calls.showToast.push({ msg: msg, level: level });
      },
    console: { error: function () {} },
  };

  return { sandbox: sandbox, calls: calls, mockBtn: mockBtn };
}

/**
 * Build a fresh staged-changes instance and return it plus helpers.
 */
function loadStaged(opts) {
  var s = createSandbox(opts);
  vm.runInNewContext(stagedSource, s.sandbox);
  return {
    Staged: s.sandbox.window.AdminTimelineStaged,
    calls: s.calls,
    mockBtn: s.mockBtn,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("AdminTimelineStaged", function () {
  // ── Stage helpers ──────────────────────────────────────────────────────────

  describe("stagePlacement", function () {
    test("adds a pending placement to _placements", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      assert.equal(ctx.Staged._placements.length, 1);
      assert.equal(ctx.Staged._placements[0].id, 1);
      assert.equal(ctx.Staged._placements[0].timeline_period, "LifeBaptism");
      assert.equal(ctx.Staged._placements[0].timeline_era, "Life");
    });

    test("accumulates multiple placements", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "PassionPalmSunday", "PassionWeek");
      assert.equal(ctx.Staged._placements.length, 2);
      assert.equal(ctx.Staged._placements[0].id, 1);
      assert.equal(ctx.Staged._placements[1].id, 2);
    });

    test("does not affect _moves or _unassigns", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      assert.equal(ctx.Staged._moves.length, 0);
      assert.equal(ctx.Staged._unassigns.length, 0);
    });
  });

  // ── stageMove ──────────────────────────────────────────────────────────────

  describe("stageMove", function () {
    test("adds a pending move to _moves", function () {
      var ctx = loadStaged();
      ctx.Staged.stageMove(10, "PassionFridayDeath");
      assert.equal(ctx.Staged._moves.length, 1);
      assert.equal(ctx.Staged._moves[0].id, 10);
      assert.equal(ctx.Staged._moves[0].timeline_period, "PassionFridayDeath");
    });

    test("accumulates moves for different ids", function () {
      var ctx = loadStaged();
      ctx.Staged.stageMove(10, "EarlyLifeBirth");
      ctx.Staged.stageMove(20, "Ascension");
      assert.equal(ctx.Staged._moves.length, 2);
    });

    test("replaces prior move for same id", function () {
      var ctx = loadStaged();
      ctx.Staged.stageMove(10, "EarlyLifeBirth");
      ctx.Staged.stageMove(10, "LifeTradie");
      assert.equal(ctx.Staged._moves.length, 1);
      assert.equal(ctx.Staged._moves[0].timeline_period, "LifeTradie");
    });

    test("does not affect _placements or _unassigns", function () {
      var ctx = loadStaged();
      ctx.Staged.stageMove(10, "LifeBaptism");
      assert.equal(ctx.Staged._placements.length, 0);
      assert.equal(ctx.Staged._unassigns.length, 0);
    });
  });

  // ── stageUnassign ──────────────────────────────────────────────────────────

  describe("stageUnassign", function () {
    test("adds a pending unassignment to _unassigns", function () {
      var ctx = loadStaged();
      ctx.Staged.stageUnassign(99);
      assert.equal(ctx.Staged._unassigns.length, 1);
      assert.equal(ctx.Staged._unassigns[0].id, 99);
    });

    test("accumulates multiple unassignments", function () {
      var ctx = loadStaged();
      ctx.Staged.stageUnassign(1);
      ctx.Staged.stageUnassign(2);
      ctx.Staged.stageUnassign(3);
      assert.equal(ctx.Staged._unassigns.length, 3);
    });

    test("does not affect _placements or _moves", function () {
      var ctx = loadStaged();
      ctx.Staged.stageUnassign(1);
      assert.equal(ctx.Staged._placements.length, 0);
      assert.equal(ctx.Staged._moves.length, 0);
    });
  });

  // ── pendingCount & hasChanges ──────────────────────────────────────────────

  describe("pendingCount", function () {
    test("returns 0 when no changes are staged", function () {
      var ctx = loadStaged();
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("reflects placements", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "OldTestament", "OldTestament");
      assert.equal(ctx.Staged.pendingCount(), 2);
    });

    test("reflects moves", function () {
      var ctx = loadStaged();
      ctx.Staged.stageMove(10, "PassionFridayDeath");
      ctx.Staged.stageMove(20, "Ascension");
      assert.equal(ctx.Staged.pendingCount(), 2);
    });

    test("reflects unassignments", function () {
      var ctx = loadStaged();
      ctx.Staged.stageUnassign(1);
      ctx.Staged.stageUnassign(2);
      ctx.Staged.stageUnassign(3);
      assert.equal(ctx.Staged.pendingCount(), 3);
    });

    test("reflects all three collections combined", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stageMove(10, "Ascension");
      ctx.Staged.stageUnassign(99);
      // 1 placement + 1 move + 1 unassign = 3
      assert.equal(ctx.Staged.pendingCount(), 3);
    });
  });

  describe("hasChanges", function () {
    test("returns false when no changes are staged", function () {
      var ctx = loadStaged();
      assert.equal(ctx.Staged.hasChanges(), false);
    });

    test("returns true when pendingCount > 0", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      assert.equal(ctx.Staged.hasChanges(), true);
    });

    test("returns false after all collections are cleared", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.clear();
      assert.equal(ctx.Staged.hasChanges(), false);
    });
  });

  // ── save ───────────────────────────────────────────────────────────────────

  describe("save", function () {
    test("removes successfully persisted placements", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* all succeed */
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "Ascension", "Post-Passion");

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 0);
      assert.equal(ctx.Staged._placements.length, 0);
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("removes successfully persisted moves", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* all succeed */
        },
      });
      ctx.Staged.stageMove(10, "LifeBaptism");
      ctx.Staged.stageMove(20, "Ascension");

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 0);
      assert.equal(ctx.Staged._moves.length, 0);
    });

    test("removes successfully persisted unassignments", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* all succeed */
        },
      });
      ctx.Staged.stageUnassign(1);
      ctx.Staged.stageUnassign(2);

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 0);
      assert.equal(ctx.Staged._unassigns.length, 0);
    });

    test("keeps failed items and reports them", async function () {
      // ID 2 always fails, others succeed
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 2) throw new Error("Simulated failure");
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "PassionPalmSunday", "PassionWeek");
      ctx.Staged.stagePlacement(3, "Ascension", "Post-Passion");

      var result = await ctx.Staged.save();

      // 2 is the only failure
      assert.equal(result.failed.length, 1);
      assert.equal(result.failed[0].id, 2);

      // 1 and 3 should be removed; 2 remains
      assert.equal(ctx.Staged._placements.length, 1);
      assert.equal(ctx.Staged._placements[0].id, 2);
      assert.equal(ctx.Staged.pendingCount(), 1);
      assert.equal(ctx.Staged.hasChanges(), true);
    });

    test("keeps failed moves while removing successful ones", async function () {
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 20) throw new Error("Move failed");
        },
      });
      ctx.Staged.stageMove(10, "EarlyLifeBirth");
      ctx.Staged.stageMove(20, "Ascension");

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 1);
      assert.equal(ctx.Staged._moves.length, 1);
      assert.equal(ctx.Staged._moves[0].id, 20);
    });

    test("mixed collections — partial failure across types", async function () {
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 2 || id === 20) throw new Error("Partial failure");
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "GalileeCallingTwelve", "GalileeMinistry");
      ctx.Staged.stageMove(10, "Ascension");
      ctx.Staged.stageMove(20, "PassionFridayDeath");
      ctx.Staged.stageUnassign(99);

      var result = await ctx.Staged.save();

      // 2 placements, 2 moves, 1 unassign → 2 failed (id 2 and 20)
      assert.equal(result.failed.length, 2);

      // Remaining: placement #2, move #20
      assert.equal(ctx.Staged.pendingCount(), 2);
      assert.equal(ctx.Staged._placements.length, 1);
      assert.equal(ctx.Staged._moves.length, 1);
      assert.equal(ctx.Staged._unassigns.length, 0);
    });

    test("returns early when nothing is staged", async function () {
      var ctx = loadStaged();
      var result = await ctx.Staged.save();
      assert.equal(result.failed.length, 0);
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("disables save button while saving and restores after", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* succeed */
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");

      // Button starts enabled
      assert.equal(ctx.mockBtn.disabled, false);

      var savePromise = ctx.Staged.save();

      // Button is disabled during save
      assert.equal(ctx.mockBtn.disabled, true);

      await savePromise;

      // Button disabled after save (nothing left to save)
      assert.equal(ctx.mockBtn.disabled, true);
    });

    test("button shows remaining count after partial failure", async function () {
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 2) throw new Error("Failed");
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stagePlacement(2, "PassionPalmSunday", "PassionWeek");

      await ctx.Staged.save();

      // Button should show remaining count since one failed
      assert.equal(ctx.mockBtn.disabled, false);
      assert.ok(ctx.mockBtn.textContent.indexOf("1 remaining") !== -1);
    });

    test("calls showToast on failures", async function () {
      var toastCalls = [];
      var ctx = loadStaged({
        saveEvent: async function () {
          throw new Error("Boom");
        },
        showToast: function (msg, level) {
          toastCalls.push({ msg: msg, level: level });
        },
      });
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");

      await ctx.Staged.save();

      assert.equal(toastCalls.length, 1);
      assert.equal(toastCalls[0].level, "error");
      assert.ok(toastCalls[0].msg.indexOf("Failed to save") !== -1);
    });

    test("calls AdminTimelineEvents.loadEvents after full success", async function () {
      var eventsCalls = { count: 0 };
      var s = createSandbox({
        saveEvent: async function () {
          /* succeed */
        },
      });
      s.sandbox.AdminTimelineEvents.loadEvents = async function () {
        eventsCalls.count++;
      };
      s.sandbox.AdminTimelineHoldingPen.refresh = async function () {};
      vm.runInNewContext(stagedSource, s.sandbox);
      var Staged = s.sandbox.window.AdminTimelineStaged;

      Staged.stagePlacement(1, "LifeBaptism", "Life");
      await Staged.save();

      assert.equal(eventsCalls.count, 1);
    });

    test("does NOT call AdminTimelineEvents.loadEvents when there are failures", async function () {
      var eventsCalls = { count: 0 };
      var s = createSandbox({
        saveEvent: async function () {
          throw new Error("Fail");
        },
      });
      s.sandbox.AdminTimelineEvents.loadEvents = async function () {
        eventsCalls.count++;
      };
      vm.runInNewContext(stagedSource, s.sandbox);
      var Staged = s.sandbox.window.AdminTimelineStaged;

      Staged.stagePlacement(1, "LifeBaptism", "Life");
      await Staged.save();

      assert.equal(eventsCalls.count, 0);
    });

    test("clear empties all three collections", function () {
      var ctx = loadStaged();
      ctx.Staged.stagePlacement(1, "LifeBaptism", "Life");
      ctx.Staged.stageMove(10, "Ascension");
      ctx.Staged.stageUnassign(99);

      ctx.Staged.clear();

      assert.equal(ctx.Staged._placements.length, 0);
      assert.equal(ctx.Staged._moves.length, 0);
      assert.equal(ctx.Staged._unassigns.length, 0);
      assert.equal(ctx.Staged.pendingCount(), 0);
    });
  });
});
