// Guide test for setup/ARCHITECTURE/timeline.md.
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
const GUIDE = "setup/ARCHITECTURE/timeline.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(REPO, relPath));
}

/** Every file below `relDir` whose name ends with `.js`, as repo-relative paths. */
function jsFilesUnder(relDir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests" || entry.name === "node_modules") continue;
      out.push(...jsFilesUnder(rel));
    } else if (entry.name.endsWith(".js")) {
      out.push(rel);
    }
  }
  return out;
}

/** Replace comments with spaces, so line and column positions stay the same. */
function blankComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, blank);
}

/** Replace the inside of string literals with spaces, so text in a message is not read as code. */
function blankStrings(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, blank);
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// ── Row 1: both timelines place labels with one module ───────────────────────

describe(`${GUIDE} row 1: labels are placed by cluster-label-layout.js`, () => {
  const LAYOUT = "frontend/assets/js/cluster-logic/cluster-label-layout.js";
  const CALLERS = [
    "frontend/assets/js/timeline/timeline-render.js",
    "admin/assets/js/admin-timeline/timeline-events.js",
  ];

  for (const rel of CALLERS) {
    test(`${rel} calls layoutLabelsBesideNodes and computeLeaderLine`, () => {
      const code = blankComments(read(rel));
      for (const name of ["layoutLabelsBesideNodes", "computeLeaderLine"]) {
        assert.match(
          code,
          new RegExp(`\\b${name}\\b`),
          `${GUIDE} row 1: ${rel} does not use ${name} from ${LAYOUT}. Both timelines must place labels with it.`,
        );
      }
    });
  }

  test("the layout module is pure: it uses no document or window", () => {
    const code = blankStrings(blankComments(read(LAYOUT)));
    const m = /\b(document|window)\b/.exec(code);
    assert.equal(
      m,
      null,
      `${GUIDE} row 1: ${LAYOUT}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. The layout takes numbers in and returns numbers.`,
    );
  });
});

// ── Row 2: the admin shim equals the frontend geometry ───────────────────────

describe(`${GUIDE} row 2: admin geometry equals frontend geometry`, () => {
  const FRONTEND = "frontend/assets/js/timeline/timeline-geometry.js";
  const ADMIN = "admin/assets/js/admin-timeline/timeline-geometry.js";

  function numberAfter(relPath, pattern) {
    const m = pattern.exec(blankComments(read(relPath)));
    assert.ok(m, `${GUIDE} row 2: ${relPath} has no value matching ${pattern}.`);
    return Number(m[1]);
  }

  test("BASE_PX_PER_PERIOD agrees", () => {
    assert.equal(
      numberAfter(ADMIN, /BASE_PX_PER_PERIOD:\s*(\d+)/),
      numberAfter(FRONTEND, /export const BASE_PX_PER_PERIOD\s*=\s*(\d+)/),
      `${GUIDE} row 2: ${ADMIN} BASE_PX_PER_PERIOD differs from ${FRONTEND}.`,
    );
  });

  test("the API clamps stored offsets to the canonical limits", () => {
    const OFFSETS = "frontend/assets/js/cluster-logic/timeline-offsets.js";
    const model = blankComments(read("api/models/evidence.model.js"));
    for (const axis of ["x", "y"]) {
      const upper = axis.toUpperCase();
      const m = new RegExp(
        `Math\\.max\\(\\s*(-?[\\d.]+)\\s*,\\s*Math\\.min\\(\\s*([\\d.]+)\\s*,\\s*row\\.timeline_offset_${axis}`,
      ).exec(model);
      assert.ok(m, `${GUIDE} row 2: api/models/evidence.model.js has no clamp for timeline_offset_${axis}.`);
      const limit = numberAfter(OFFSETS, new RegExp(`export const OFFSET_LIMIT_${upper}\\s*=\\s*([\\d.]+)`));
      assert.equal(
        [Number(m[1]), Number(m[2])].join(","),
        [-limit, limit].join(","),
        `${GUIDE} row 2: the API clamp for timeline_offset_${axis} differs from OFFSET_LIMIT_${upper} in ${OFFSETS}.`,
      );
    }
  });

  test("the admin axis is as tall as the public dot field", () => {
    const axis = blankComments(read("admin/assets/js/admin-timeline/timeline-axis.js"));
    assert.match(
      axis,
      /style\.minHeight\s*=\s*CANVAS_HEIGHT_PX/,
      `${GUIDE} row 2: admin/assets/js/admin-timeline/timeline-axis.js must size the axis with CANVAS_HEIGHT_PX, ` +
        "so a dot at a given percentage sits at the same pixel height as on the public page.",
    );
  });

  test("CANVAS_HEIGHT_PX equals TIMELINE_CANVAS_HEIGHT_PX", () => {
    assert.equal(
      numberAfter(ADMIN, /CANVAS_HEIGHT_PX:\s*(\d+)/),
      numberAfter(FRONTEND, /export const TIMELINE_CANVAS_HEIGHT_PX\s*=\s*(\d+)/),
      `${GUIDE} row 2: ${ADMIN} CANVAS_HEIGHT_PX differs from ${FRONTEND}.`,
    );
  });
});

// ── Row 3: no bare canvas-height literal ─────────────────────────────────────

// Files that convert offsets. They must read the geometry constant.
const OFFSET_FILES = [
  "frontend/assets/js/timeline/timeline-render.js",
  "admin/assets/js/admin-timeline/timeline-events.js",
  "admin/assets/js/admin-timeline/timeline-node-drag.js",
];

// File -> reason, for a file that may hold a bare 280.
const BARE_280_EXCEPTIONS = {};

describe(`${GUIDE} row 3: offset code uses the geometry constants`, () => {
  test("every exception names a file that exists", () => {
    for (const rel of Object.keys(BARE_280_EXCEPTIONS)) {
      assert.ok(exists(rel), `BARE_280_EXCEPTIONS lists ${rel}, but it does not exist. Remove it.`);
    }
  });

  for (const rel of OFFSET_FILES) {
    test(`${rel} does not repeat the top-percentage formula`, () => {
      const code = blankComments(read(rel));
      const m = /\b50\s*\+\s*[\w.]+\s*\/\s*2\b/.exec(code);
      assert.equal(
        m,
        null,
        `${GUIDE} row 3: ${rel}:${m ? lineOf(code, m.index) : 0} repeats "50 + y / 2". ` +
          `Call crossAxisToTopPercent() from frontend/assets/js/cluster-logic/timeline-offsets.js.`,
      );
    });

    test(`${rel} has no bare 280`, () => {
      assert.ok(exists(rel), `${GUIDE} row 3: ${rel} does not exist. Update OFFSET_FILES.`);
      if (BARE_280_EXCEPTIONS[rel]) return;
      const code = blankComments(read(rel));
      const m = /(?<![\w.])280(?![\w.])/.exec(code);
      assert.equal(
        m,
        null,
        `${GUIDE} row 3: ${rel}:${m ? lineOf(code, m.index) : 0} holds a bare 280. ` +
          `Use TIMELINE_CANVAS_HEIGHT_PX (frontend) or AdminTimelineGeometry.CANVAS_HEIGHT_PX (admin).`,
      );
    });
  }
});

// ── Row 4: the era heading band matches in the editor and on the public page ──

describe(`${GUIDE} row 4: era heading band tokens and lanes agree`, () => {
  const FRONTEND_TOKENS = "frontend/assets/css/base/variables.css";
  const ADMIN_TOKENS = "admin/assets/css/admin-diagrams/timeline-tokens.css";
  const TOKENS = [
    "--timeline-heading-font-size",
    "--timeline-heading-lane-height",
    "--timeline-heading-bar-height",
    "--timeline-heading-band-height",
  ];

  function tokenValue(relPath, token) {
    const m = new RegExp(`${token}:\\s*([^;]+);`).exec(blankComments(read(relPath)));
    assert.ok(m, `${GUIDE} row 4: ${relPath} does not define ${token}.`);
    return m[1].trim();
  }

  for (const token of TOKENS) {
    test(`${token} is the same in both token files`, () => {
      assert.equal(
        tokenValue(ADMIN_TOKENS, token),
        tokenValue(FRONTEND_TOKENS, token),
        `${GUIDE} row 4: ${token} differs between ${FRONTEND_TOKENS} and ${ADMIN_TOKENS}.`,
      );
    });
  }

  test("both heading stylesheets stack as many lanes as ERA_BAND_LANES", () => {
    const placement = blankComments(
      read("frontend/assets/js/timeline/timeline-era-heading-placement.js"),
    );
    const lanes = Number(/export const ERA_BAND_LANES\s*=\s*(\d+)/.exec(placement)[1]);
    for (const rel of [
      "frontend/assets/css/components/timeline-era-headings.css",
      "admin/assets/css/admin-diagrams/timeline-era-headings.css",
    ]) {
      const css = blankComments(read(rel));
      const m = /(\d+)\s*\*\s*var\(--timeline-heading-lane-height\)/.exec(css);
      assert.ok(m, `${GUIDE} row 4: ${rel} has no "N * var(--timeline-heading-lane-height)" lane count.`);
      assert.equal(
        Number(m[1]),
        lanes,
        `${GUIDE} row 4: ${rel} stacks ${m[1]} lanes, but ERA_BAND_LANES is ${lanes}.`,
      );
    }
  });
});

// ── Row 5: zoom stacks are public only, and the spacing matches the CSS ──────

describe(`${GUIDE} row 5: zoom stacks`, () => {
  const STACKS = "frontend/assets/js/cluster-logic/timeline-zoom-stacks.js";

  test("the stacks module is pure: it uses no document or window", () => {
    const code = blankStrings(blankComments(read(STACKS)));
    const m = /\b(document|window)\b/.exec(code);
    assert.equal(
      m,
      null,
      `${GUIDE} row 5: ${STACKS}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. The module takes numbers in and returns numbers.`,
    );
  });

  test("no admin file uses the stacks: the editor always shows exact positions", () => {
    for (const rel of jsFilesUnder("admin/assets/js")) {
      const code = blankComments(read(rel));
      assert.doesNotMatch(
        code,
        /timeline-zoom-stacks|computeZoomStacks/,
        `${GUIDE} row 5: ${rel} uses the zoom stacks. An admin must drag exact dots, so only the public timeline stacks.`,
      );
    }
  });

  test("STACK_SPACING_PX equals --timeline-stack-spacing", () => {
    const px = Number(
      /export const STACK_SPACING_PX\s*=\s*(\d+)/.exec(blankComments(read(STACKS)))[1],
    );
    const css = /--timeline-stack-spacing:\s*([\d.]+)rem/.exec(
      blankComments(read("frontend/assets/css/base/variables.css")),
    );
    assert.ok(css, `${GUIDE} row 5: --timeline-stack-spacing is missing in variables.css.`);
    assert.equal(
      Number(css[1]) * 16,
      px,
      `${GUIDE} row 5: --timeline-stack-spacing (${css[1]}rem) differs from STACK_SPACING_PX (${px}px) in ${STACKS}.`,
    );
  });
});

// ── Row 6: the era-page snapshot carries both offsets ───────────────────────

describe(`${GUIDE} row 6: the era-page snapshot carries the offsets`, () => {
  const EMBED = "api/scripts/embed-initial-data.js";

  test("queryTimelineForEra selects both offset columns", () => {
    const code = read(EMBED);
    const at = code.indexOf("function queryTimelineForEra");
    assert.ok(at >= 0, `${GUIDE} row 6: ${EMBED} has no queryTimelineForEra.`);
    const select = /SELECT[\s\S]*?FROM/.exec(code.slice(at));
    assert.ok(select, `${GUIDE} row 6: ${EMBED}:${lineOf(code, at)} has no SELECT in queryTimelineForEra.`);
    for (const col of ["timeline_offset_x", "timeline_offset_y"]) {
      assert.match(
        select[0],
        new RegExp(`\\b${col}\\b`),
        `${GUIDE} row 6: ${EMBED}:${lineOf(code, at)} leaves ${col} out of the snapshot SELECT.`,
      );
    }
  });
});

// ── Row 7: admin era dividers sit at slot edges, and the spine is in the world ──

describe(`${GUIDE} row 7: era dividers and spine in the editor`, () => {
  const AXIS = "admin/assets/js/admin-timeline/timeline-axis.js";
  const CANVAS_CSS = "admin/assets/css/admin-diagrams/timeline-canvas.css";

  test("eraStartX returns a slot edge, not a slot centre", () => {
    const code = blankComments(read(AXIS));
    const m = /Axis\.eraStartX\s*=\s*function[\s\S]*?\n\};/.exec(code);
    assert.ok(m, `${GUIDE} row 7: ${AXIS} has no Axis.eraStartX.`);
    assert.doesNotMatch(
      m[0],
      /periodToX/,
      `${GUIDE} row 7: ${AXIS}:${lineOf(code, m.index)} eraStartX calls periodToX, which returns the slot centre. A divider must sit at the slot edge, like the era bars and the public era markers.`,
    );
  });

  test("the editor canvas draws no spine of its own", () => {
    const css = blankComments(read(CANVAS_CSS));
    const m = /\.admin-timeline-canvas\s*::after/.exec(css);
    assert.equal(
      m,
      null,
      `${GUIDE} row 7: ${CANVAS_CSS}:${m ? lineOf(css, m.index) : 0} draws a spine on the canvas. It does not move with the zoom. The axis line inside .admin-timeline-world is the only spine.`,
    );
  });
});
