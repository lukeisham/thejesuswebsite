// Guide test for setup/ARCHITECTURE/arbor.md.
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
const GUIDE = "setup/ARCHITECTURE/arbor.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

/** Replace comments with spaces, so line and column positions stay the same. */
function blankComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, blank);
}

// ── Row 1: both callers pass edge.waypoints to computeEdgePath ───────────────

describe(`${GUIDE} row 1: both arbor callers pass edge.waypoints`, () => {
  const CALLERS = [
    "frontend/assets/js/arbor/arbor-render.js",
    "admin/assets/js/admin-arbor/arbor-edges.js",
  ];

  for (const rel of CALLERS) {
    test(`${rel} passes edge.waypoints to computeEdgePath`, () => {
      const code = blankComments(read(rel));
      assert.match(
        code,
        /computeEdgePath\([^)]*\bedge\.waypoints\b/,
        `${GUIDE} row 1: ${rel} does not pass edge.waypoints to computeEdgePath(). A present waypoints array replaces the computed parallel-edge offset, so the edge would take another route here than on the other side.`,
      );
    });
  }
});
