// Guide test for setup/ARCHITECTURE/maps.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide. Each exception has a one-line
// reason, and a stale exception fails the test.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/maps.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

/** Replace comments with spaces, so line and column positions stay the same. */
function blankComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, blank);
}

// ── Row 1: both sides fan pins with computePinOffsets ────────────────────────

describe(`${GUIDE} row 1: pins are fanned by computePinOffsets`, () => {
  test("the public renderer imports computePinOffsets from cluster-map-pins.js", () => {
    const rel = "frontend/assets/js/maps/maps-render.js";
    assert.match(
      blankComments(read(rel)),
      /import\s*\{[^}]*\bcomputePinOffsets\b[^}]*\}\s*from\s*["']\.\.\/cluster-logic\/cluster-map-pins\.js["']/,
      `${GUIDE} row 1: ${rel} does not import computePinOffsets from cluster-logic/cluster-map-pins.js. Both sides must fan pins with the one module.`,
    );
  });

  test("the admin editor calls computePinOffsets through the bridge global, without a zoom argument", () => {
    const rel = "admin/assets/js/admin-maps/maps-pins.js";
    const code = blankComments(read(rel));
    assert.match(
      code,
      /window\.AdminMapsClusterPins\.computePinOffsets\(\s*\w+\s*\)/,
      `${GUIDE} row 1: ${rel} does not call window.AdminMapsClusterPins.computePinOffsets(points) with one argument. The editor has no zoom, so the default spacing must apply.`,
    );
  });
});
