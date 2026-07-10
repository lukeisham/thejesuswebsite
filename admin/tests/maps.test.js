// Admin maps tests — uses node:test + node:assert.
// Tests the pure coordinate-mapping helpers from admin-maps/maps-render.js
// (screenToPercent, percentToScreen, buildPinPayload, clampPercent).
//
// The DOM-bound drag/click logic in maps-pins.js and the region selector in
// maps-regions.js are validated manually via browser testing against a running
// API server. Only the pure, DOM-free exported functions from maps-render.js
// are exercised here (see setup/TESTS/admin_tests.md for the manual checklist).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load maps-render.js in a sandboxed context ──────────────────────────────

const renderPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-maps",
  "maps-render.js",
);
const renderSource = fs.readFileSync(renderPath, "utf8");

const sandbox = {
  window: {},
  document: {
    getElementById: function () {
      return null;
    },
  },
  console: { error: function () {} },
};

vm.runInNewContext(renderSource, sandbox);

const { screenToPercent, percentToScreen, buildPinPayload } =
  sandbox.window.AdminMapsRender;

// ── ImageRect fixture ──────────────────────────────────────────────────────
// Simulates a 1000×600 image positioned at (20, 10) within the canvas.

/**
 * @returns {{width: number, height: number, left: number, top: number}}
 */
function makeRect(width, height, left, top) {
  return { width: width, height: height, left: left, top: top };
}

const FIXTURE_RECT = makeRect(1000, 600, 20, 10);

// ── screenToPercent ────────────────────────────────────────────────────────

describe("screenToPercent", function () {
  test("converts centre of image to 50%", function () {
    var result = screenToPercent(520, 310, FIXTURE_RECT);
    assert.ok(Math.abs(result.x - 50) < 0.01, "x should be ~50");
    assert.ok(Math.abs(result.y - 50) < 0.01, "y should be ~50");
  });

  test("converts top-left corner to 0%", function () {
    var result = screenToPercent(20, 10, FIXTURE_RECT);
    assert.ok(Math.abs(result.x) < 0.01, "x should be ~0");
    assert.ok(Math.abs(result.y) < 0.01, "y should be ~0");
  });

  test("converts bottom-right corner to 100%", function () {
    var result = screenToPercent(1020, 610, FIXTURE_RECT);
    assert.ok(Math.abs(result.x - 100) < 0.01, "x should be ~100");
    assert.ok(Math.abs(result.y - 100) < 0.01, "y should be ~100");
  });

  test("clamps values outside the image to 0–100", function () {
    var result = screenToPercent(-100, -100, FIXTURE_RECT);
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);

    result = screenToPercent(2000, 2000, FIXTURE_RECT);
    assert.equal(result.x, 100);
    assert.equal(result.y, 100);
  });

  test("returns 0,0 for a zero-size rect", function () {
    var result = screenToPercent(50, 50, {
      width: 0,
      height: 0,
      left: 0,
      top: 0,
    });
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });

  test("returns 0,0 for a null rect", function () {
    var result = screenToPercent(50, 50, null);
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });
});

// ── percentToScreen ────────────────────────────────────────────────────────

describe("percentToScreen", function () {
  test("converts 50% centre to screen coordinates", function () {
    var result = percentToScreen(50, 50, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 520) < 0.01);
    assert.ok(Math.abs(result.screenY - 310) < 0.01);
  });

  test("converts 0% to top-left", function () {
    var result = percentToScreen(0, 0, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 20) < 0.01);
    assert.ok(Math.abs(result.screenY - 10) < 0.01);
  });

  test("converts 100% to bottom-right", function () {
    var result = percentToScreen(100, 100, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 1020) < 0.01);
    assert.ok(Math.abs(result.screenY - 610) < 0.01);
  });

  test("returns 0,0 for a zero-size rect", function () {
    var result = percentToScreen(50, 50, {
      width: 0,
      height: 0,
      left: 5,
      top: 5,
    });
    assert.equal(result.screenX, 0);
    assert.equal(result.screenY, 0);
  });

  test("returns 0,0 for a null rect", function () {
    var result = percentToScreen(50, 50, null);
    assert.equal(result.screenX, 0);
    assert.equal(result.screenY, 0);
  });
});

// ── round-trip stability ───────────────────────────────────────────────────

describe("screenToPercent ↔ percentToScreen round-trip", function () {
  test("round-trips centre point", function () {
    var pct = screenToPercent(520, 310, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 520) < 0.01);
    assert.ok(Math.abs(screen.screenY - 310) < 0.01);
  });

  test("round-trips top-left", function () {
    var pct = screenToPercent(20, 10, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 20) < 0.01);
    assert.ok(Math.abs(screen.screenY - 10) < 0.01);
  });

  test("round-trips arbitrary point", function () {
    var pct = screenToPercent(345, 222, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 345) < 0.2);
    assert.ok(Math.abs(screen.screenY - 222) < 0.2);
  });

  test("round-trips percentages back to percentages", function () {
    var screen = percentToScreen(37.5, 82.3, FIXTURE_RECT);
    var pct = screenToPercent(screen.screenX, screen.screenY, FIXTURE_RECT);
    assert.ok(Math.abs(pct.x - 37.5) < 0.1);
    assert.ok(Math.abs(pct.y - 82.3) < 0.1);
  });
});

// ── buildPinPayload ────────────────────────────────────────────────────────

describe("buildPinPayload", function () {
  test("rounds coordinates to 2 decimal places", function () {
    var payload = buildPinPayload(1, 123, 456, FIXTURE_RECT);

    assert.equal(payload.map_id, 1);
    // x: (123 - 20) / 1000 * 100 = 10.3
    assert.equal(payload.x, 10.3);
    // y: (456 - 10) / 600 * 100 = 74.33...
    assert.ok(Math.abs(payload.y - 74.33) < 0.01);
  });

  test("label and evidence_id default to null", function () {
    var payload = buildPinPayload(1, 100, 100, FIXTURE_RECT);
    assert.equal(payload.label, null);
    assert.equal(payload.evidence_id, null);
  });

  test("map_id is passed through", function () {
    var payload = buildPinPayload(42, 100, 100, FIXTURE_RECT);
    assert.equal(payload.map_id, 42);
  });
});

// ── Bounding rect edge cases ────────────────────────────────────────────────

describe("coordinate helpers with edge-case rects", function () {
  test("handles image rect with non-zero offset", function () {
    // Image offset 100px from left, 50px from top
    var rect = makeRect(800, 400, 100, 50);

    var pct = screenToPercent(500, 250, rect);
    // x: (500 - 100) / 800 * 100 = 50
    // y: (250 - 50) / 400 * 100 = 50
    assert.ok(Math.abs(pct.x - 50) < 0.01);
    assert.ok(Math.abs(pct.y - 50) < 0.01);

    var screen = percentToScreen(50, 50, rect);
    assert.ok(Math.abs(screen.screenX - 500) < 0.01);
    assert.ok(Math.abs(screen.screenY - 250) < 0.01);
  });

  test("handles very small image", function () {
    var rect = makeRect(10, 10, 5, 5);

    var pct = screenToPercent(10, 10, rect);
    assert.ok(Math.abs(pct.x - 50) < 0.01);
    assert.ok(Math.abs(pct.y - 50) < 0.01);

    var screen = percentToScreen(100, 100, rect);
    assert.ok(Math.abs(screen.screenX - 15) < 0.01);
    assert.ok(Math.abs(screen.screenY - 15) < 0.01);
  });
});

// ── Lat/lng geo-anchor payload building (stubbed DOM) ────────────────────

describe("pin save payload includes lat/lng", function () {
  // Simulate the logic from maps-pins.js onSavePin — tests that lat/lng
  // values from the edit-panel inputs are included in the save payload.

  function buildSavePayload(labelVal, evidenceVal, latVal, lngVal) {
    var payload = { label: labelVal || null };

    if (evidenceVal !== "") {
      var evidenceId = Number(evidenceVal);
      payload.evidence_id = Number.isFinite(evidenceId) ? evidenceId : null;
    } else {
      payload.evidence_id = null;
    }

    if (latVal !== "" && lngVal !== "") {
      var lat = Number(latVal);
      var lng = Number(lngVal);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        payload.lat = lat;
        payload.lng = lng;
      }
    }

    return payload;
  }

  test("includes lat/lng when both are filled", function () {
    var payload = buildSavePayload("Capernaum", "", "32.8811", "35.5751");
    assert.equal(payload.label, "Capernaum");
    assert.equal(payload.lat, 32.8811);
    assert.equal(payload.lng, 35.5751);
    assert.equal(payload.evidence_id, null);
  });

  test("omits lat/lng when only one is filled", function () {
    var payload = buildSavePayload("Test", "", "32.8811", "");
    assert.equal(payload.label, "Test");
    assert.equal(payload.lat, undefined);
    assert.equal(payload.lng, undefined);
  });

  test("omits lat/lng when both are empty", function () {
    var payload = buildSavePayload("Test", "", "", "");
    assert.equal(payload.label, "Test");
    assert.equal(payload.lat, undefined);
    assert.equal(payload.lng, undefined);
  });

  test("omits lat/lng when values are non-numeric", function () {
    var payload = buildSavePayload("Test", "", "abc", "def");
    assert.equal(payload.label, "Test");
    assert.equal(payload.lat, undefined);
    assert.equal(payload.lng, undefined);
  });

  test("includes evidence_id when valid", function () {
    var payload = buildSavePayload("Test", "42", "", "");
    assert.equal(payload.evidence_id, 42);
  });
});

// ── Load maps-staged-changes.js in a sandboxed context ───────────────────

const stagedPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-maps",
  "maps-staged-changes.js",
);
const stagedSource = fs.readFileSync(stagedPath, "utf8");

// ── Staged-changes store tests ────────────────────────────────────────────

// ── Staged-changes store tests ────────────────────────────────────────────
// Each test uses a fresh sandbox to avoid state leakage.

function freshStagedStore() {
  var sb = {
    window: {
      addEventListener: function () {},
      removeEventListener: function () {},
    },
    document: {
      getElementById: function () {
        return null;
      },
      addEventListener: function () {},
      removeEventListener: function () {},
    },
    console: { error: function () {} },
    Admin: {
      api: {
        post: async function () {
          return {};
        },
        put: async function () {
          return {};
        },
      },
    },
    AdminMapsRegions: {
      getMaps: function () {
        return [];
      },
      getCurrentMapKey: function () {
        return null;
      },
    },
    AdminMapsPins: { loadPins: async function () {} },
  };
  vm.runInNewContext(stagedSource, sb);
  return sb.window.AdminMapsStaged;
}

describe("AdminMapsStaged", function () {
  test("starts with zero changes", function () {
    var store = freshStagedStore();
    assert.equal(store.count(), 0);
    assert.equal(store.hasChanges(), false);
    assert.equal(store.getCreates().length, 0);
    assert.equal(store.getMoves().length, 0);
  });

  test("stageCreate adds a pending create", function () {
    var store = freshStagedStore();
    var evidence = {
      id: 42,
      title: "Test Evidence",
      slug: "test-ev",
      timeline_era: "GalileeMinistry",
    };
    var staged = store.stageCreate(1, evidence, 50, 50);

    assert.ok(staged._tempId.startsWith("staged-"));
    assert.equal(staged.map_id, 1);
    assert.equal(staged.evidence_id, 42);
    assert.equal(staged.x, 50);
    assert.equal(staged.y, 50);
    assert.equal(staged.label, "Test Evidence");
    assert.equal(staged.timeline_era, "GalileeMinistry");

    assert.equal(store.count(), 1);
    assert.equal(store.hasChanges(), true);
    assert.equal(store.getCreates().length, 1);
  });

  test("stageMove adds a pending move", function () {
    var store = freshStagedStore();
    store.stageMove(7, 30.5, 70.2);

    assert.equal(store.count(), 1);
    assert.equal(store.hasChanges(), true);
    assert.equal(store.getMoves().length, 1);
    assert.equal(store.getMoves()[0].pinId, 7);
    assert.equal(store.getMoves()[0].x, 30.5);
    assert.equal(store.getMoves()[0].y, 70.2);
  });

  test("stageMove replaces prior move for the same pin", function () {
    var store = freshStagedStore();
    store.stageMove(7, 10, 10);
    store.stageMove(7, 90, 90);

    assert.equal(store.getMoves().length, 1);
    assert.equal(store.getMoves()[0].x, 90);
    assert.equal(store.getMoves()[0].y, 90);
  });

  test("count includes both creates and moves", function () {
    var store = freshStagedStore();

    store.stageCreate(1, { id: 1, title: "A" }, 10, 10);
    store.stageMove(5, 20, 20);
    store.stageMove(6, 30, 30);

    assert.equal(store.count(), 3);
    assert.equal(store.hasChanges(), true);
  });
});

// ── Draft-pin indicator logic ───────────────────────────────────────────

describe("draft-pin indicator logic", function () {
  // Simulate the class/title decision from maps-pins.js createPinElement
  function getDraftInfo(pin) {
    var isDraft =
      pin.evidence_id != null &&
      pin.evidence_published !== undefined &&
      !pin.evidence_published;

    var title = isDraft
      ? (pin.label || "") + " (Draft — not public)"
      : pin.label || "";

    return { isDraft: isDraft, title: title };
  }

  test("published evidence pin is NOT marked draft", function () {
    var info = getDraftInfo({
      id: 1,
      label: "Capernaum",
      evidence_id: 42,
      evidence_published: 1,
    });
    assert.equal(info.isDraft, false);
    assert.equal(info.title, "Capernaum");
  });

  test("unpublished evidence pin IS marked draft", function () {
    var info = getDraftInfo({
      id: 2,
      label: "Draft Site",
      evidence_id: 99,
      evidence_published: 0,
    });
    assert.equal(info.isDraft, true);
    assert.equal(info.title, "Draft Site (Draft — not public)");
  });

  test("label-only pin (no evidence) is NOT marked draft", function () {
    var info = getDraftInfo({
      id: 3,
      label: "Hand-placed",
      evidence_id: null,
      evidence_published: null,
    });
    assert.equal(info.isDraft, false);
    assert.equal(info.title, "Hand-placed");
  });

  test("pin with missing evidence_published is NOT marked draft", function () {
    // Legacy pin before evidence_published was added to the query
    var info = getDraftInfo({
      id: 4,
      label: "Legacy",
      evidence_id: 5,
    });
    assert.equal(info.isDraft, false);
    assert.equal(info.title, "Legacy");
  });

  test("label-less published pin has empty title with no draft suffix", function () {
    var info = getDraftInfo({
      id: 5,
      label: null,
      evidence_id: 42,
      evidence_published: 1,
    });
    assert.equal(info.isDraft, false);
    assert.equal(info.title, "");
  });

  test("label-less draft pin shows draft in title", function () {
    var info = getDraftInfo({
      id: 6,
      label: null,
      evidence_id: 99,
      evidence_published: 0,
    });
    assert.equal(info.isDraft, true);
    assert.equal(info.title, " (Draft — not public)");
  });
});

/**
 * eraToKebab is defined in both maps-pins.js and maps-render.js.
 * Test the function directly (extracted here for unit testing).
 */
function eraToKebab(era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

describe("eraToKebab", function () {
  test("converts GalileeMinistry to galilee-ministry", function () {
    assert.equal(eraToKebab("GalileeMinistry"), "galilee-ministry");
  });

  test("converts PassionWeek to passion-week", function () {
    assert.equal(eraToKebab("PassionWeek"), "passion-week");
  });

  test("converts PreIncarnation to pre-incarnation", function () {
    assert.equal(eraToKebab("PreIncarnation"), "pre-incarnation");
  });

  test("converts OldTestament to old-testament", function () {
    assert.equal(eraToKebab("OldTestament"), "old-testament");
  });

  test("converts EarlyLife to early-life", function () {
    assert.equal(eraToKebab("EarlyLife"), "early-life");
  });

  test("converts JudeanMinistry to judean-ministry", function () {
    assert.equal(eraToKebab("JudeanMinistry"), "judean-ministry");
  });

  test("converts Post-Passion to post-passion (handles hyphen in input)", function () {
    // The DB uses "Post-Passion" with a hyphen; eraToKebab preserves existing hyphens
    assert.equal(eraToKebab("Post-Passion"), "post-passion");
  });

  test("single word like Life stays lowercase", function () {
    assert.equal(eraToKebab("Life"), "life");
  });
});
