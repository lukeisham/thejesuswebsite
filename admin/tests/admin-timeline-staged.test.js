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
  // ── Save button count ──────────────────────────────────────────────────────

  describe("save button count", function () {
    test("shows the number of staged changes as soon as a node is dropped", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.2);
      assert.equal(ctx.mockBtn.textContent, "Save Changes (1)");
      ctx.Staged.stageOffset(2, -0.1, 0.0);
      assert.equal(ctx.mockBtn.textContent, "Save Changes (2)");
    });

    test("moving the same node again does not raise the count", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.2);
      ctx.Staged.stageOffset(1, 0.3, 0.1);
      assert.equal(ctx.mockBtn.textContent, "Save Changes (1)");
    });

    test("clear returns the button to its plain text", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.2);
      ctx.Staged.clear();
      assert.equal(ctx.mockBtn.textContent, "Save Changes");
    });
  });

  // ── pendingCount & hasChanges ──────────────────────────────────────────────

  describe("pendingCount", function () {
    test("returns 0 when no changes are staged", function () {
      var ctx = loadStaged();
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("counts one item per staged node", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      ctx.Staged.stageOffset(2, 0.2, 0.2);
      assert.equal(ctx.Staged.pendingCount(), 2);
    });
  });

  describe("hasChanges", function () {
    test("returns false when no changes are staged", function () {
      var ctx = loadStaged();
      assert.equal(ctx.Staged.hasChanges(), false);
    });

    test("returns true when pendingCount > 0", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      assert.equal(ctx.Staged.hasChanges(), true);
    });

    test("returns false after clear", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      ctx.Staged.clear();
      assert.equal(ctx.Staged.hasChanges(), false);
    });
  });

  // ── save ───────────────────────────────────────────────────────────────────

  describe("save", function () {
    test("removes successfully persisted offsets", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* all succeed */
        },
      });
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      ctx.Staged.stageOffset(2, 0.2, 0.2);

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 0);
      assert.equal(ctx.Staged._offsets.length, 0);
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("keeps failed items and reports them", async function () {
      // ID 2 always fails, others succeed
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 2) throw new Error("Simulated failure");
        },
      });
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      ctx.Staged.stageOffset(2, 0.2, 0.2);
      ctx.Staged.stageOffset(3, 0.3, 0.3);

      var result = await ctx.Staged.save();

      assert.equal(result.failed.length, 1);
      assert.equal(result.failed[0].id, 2);
      assert.equal(ctx.Staged._offsets.length, 1);
      assert.equal(ctx.Staged._offsets[0].id, 2);
      assert.equal(ctx.Staged.pendingCount(), 1);
      assert.equal(ctx.Staged.hasChanges(), true);
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
      ctx.Staged.stageOffset(1, 0.1, 0.1);

      // Button starts enabled
      assert.equal(ctx.mockBtn.disabled, false);

      var savePromise = ctx.Staged.save();

      // Button is disabled during save
      assert.equal(ctx.mockBtn.disabled, true);

      await savePromise;

      // Button disabled after save (nothing left to save)
      assert.equal(ctx.mockBtn.disabled, true);
    });

    test("button starts disabled and is enabled again by the next staged change", async function () {
      var ctx = loadStaged({
        saveEvent: async function () {
          /* succeed */
        },
      });
      assert.equal(ctx.mockBtn.disabled, true);
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      await ctx.Staged.save();
      assert.equal(ctx.mockBtn.disabled, true);

      ctx.Staged.stageOffset(1, 0.2, 0.2);

      assert.equal(ctx.mockBtn.disabled, false);
      assert.equal(ctx.mockBtn.textContent, "Save Changes (1)");
    });

    test("button is disabled again when the last staged change is cleared", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      assert.equal(ctx.mockBtn.disabled, false);

      ctx.Staged.clear();

      assert.equal(ctx.mockBtn.disabled, true);
    });

    test("button shows remaining count after partial failure", async function () {
      var ctx = loadStaged({
        saveEvent: async function (id) {
          if (id === 2) throw new Error("Failed");
        },
      });
      ctx.Staged.stageOffset(1, 0.1, 0.1);
      ctx.Staged.stageOffset(2, 0.2, 0.2);

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
      ctx.Staged.stageOffset(1, 0.1, 0.1);

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

      Staged.stageOffset(1, 0.1, 0.1);
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

      Staged.stageOffset(1, 0.1, 0.1);
      await Staged.save();

      assert.equal(eventsCalls.count, 0);
    });

    test("clear empties the staged offsets", function () {
      var ctx = loadStaged();
      ctx.Staged.stageOffset(1, 0.1, 0.1);

      ctx.Staged.clear();

      assert.equal(ctx.Staged._offsets.length, 0);
      assert.equal(ctx.Staged.pendingCount(), 0);
    });

    test("forwards timeline_offset_x and timeline_offset_y in saveEvent payload", async function () {
      var savedPayloads = [];
      var ctx = loadStaged({
        saveEvent: async function (id, data) {
          savedPayloads.push({ id: id, data: data });
        },
      });
      ctx.Staged.stageOffset(42, 0.25, -0.15);

      await ctx.Staged.save();

      assert.equal(savedPayloads.length, 1);
      assert.equal(savedPayloads[0].id, 42);
      assert.equal(savedPayloads[0].data.timeline_offset_x, 0.25);
      assert.equal(savedPayloads[0].data.timeline_offset_y, -0.15);
    });

    test("forwards explicit null offsets", async function () {
      var savedPayloads = [];
      var ctx = loadStaged({
        saveEvent: async function (id, data) {
          savedPayloads.push({ id: id, data: data });
        },
      });
      ctx.Staged.stageOffset(99, null, null);

      await ctx.Staged.save();

      assert.equal(savedPayloads.length, 1);
      assert.equal(savedPayloads[0].data.timeline_offset_x, null);
      assert.equal(savedPayloads[0].data.timeline_offset_y, null);
    });
  });
});
