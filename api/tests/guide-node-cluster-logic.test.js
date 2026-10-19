// Guide test for setup/ARCHITECTURE/node-cluster-logic.md.
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
const GUIDE = "setup/ARCHITECTURE/node-cluster-logic.md";
const BRIDGE_DIR = "admin/assets/js/cluster-logic-bridge";

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

const bridgeFiles = fs
  .readdirSync(path.join(REPO, BRIDGE_DIR))
  .filter((f) => f.endsWith("-bridge.js"));

/** window global -> { file, names } for each bridge. `names` is null for a bare function. */
function bridgeGlobals() {
  const map = {};
  for (const file of bridgeFiles) {
    const rel = `${BRIDGE_DIR}/${file}`;
    const code = blankComments(read(rel));
    const m = /window\.(Admin\w+)\s*=\s*(\{[^}]*\}|\w+)\s*;/.exec(code);
    if (!m) continue;
    const names = m[2].startsWith("{")
      ? m[2].replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    map[m[1]] = { file: rel, names };
  }
  return map;
}

// ── Row 1: a bridge is a pure re-export ───────────────────────────────────────

describe(`${GUIDE} row 1: bridges are pure re-exports`, () => {
  test("finds the bridge files", () => {
    assert.ok(bridgeFiles.length >= 7, `Expected 7 bridges in ${BRIDGE_DIR}.`);
  });

  for (const file of bridgeFiles) {
    test(`${file} holds only imports and one window.Admin* assignment`, () => {
      const rel = `${BRIDGE_DIR}/${file}`;
      const code = blankComments(read(rel))
        .replace(/^import\s*\{[^}]*\}\s*from\s*"\/assets\/js\/[^"]+";?/gm, "")
        .trim();
      const allowed = /^window\.Admin\w+\s*=\s*(\{\s*\w+\s*(,\s*\w+\s*)*,?\s*\}|\w+)\s*;$/;
      assert.ok(
        allowed.test(code),
        `${GUIDE} row 1: ${rel} holds more than imports from /assets/js/ and one ` +
          `"window.Admin… = { names }" assignment. A bridge re-exports and holds no logic. ` +
          `Found: ${code.slice(0, 120)}`,
      );
    });
  }
});

// ── Row 2: both timelines place labels with one module ───────────────────────

describe(`${GUIDE} row 2: labels are placed by cluster-label-layout.js`, () => {
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
          `${GUIDE} row 2: ${rel} does not use ${name} from ${LAYOUT}. Both timelines must place labels with it.`,
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
      `${GUIDE} row 2: ${LAYOUT}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. The layout takes numbers in and returns numbers.`,
    );
  });
});

// ── Row 3: the admin shim equals the frontend geometry ───────────────────────

describe(`${GUIDE} row 3: admin geometry equals frontend geometry`, () => {
  const FRONTEND = "frontend/assets/js/timeline/timeline-geometry.js";
  const ADMIN = "admin/assets/js/admin-timeline/timeline-geometry.js";

  function numberAfter(relPath, pattern) {
    const m = pattern.exec(blankComments(read(relPath)));
    assert.ok(m, `${GUIDE} row 3: ${relPath} has no value matching ${pattern}.`);
    return Number(m[1]);
  }

  test("BASE_PX_PER_PERIOD agrees", () => {
    assert.equal(
      numberAfter(ADMIN, /BASE_PX_PER_PERIOD:\s*(\d+)/),
      numberAfter(FRONTEND, /export const BASE_PX_PER_PERIOD\s*=\s*(\d+)/),
      `${GUIDE} row 3: ${ADMIN} BASE_PX_PER_PERIOD differs from ${FRONTEND}.`,
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
      assert.ok(m, `${GUIDE} row 3: api/models/evidence.model.js has no clamp for timeline_offset_${axis}.`);
      const limit = numberAfter(OFFSETS, new RegExp(`export const OFFSET_LIMIT_${upper}\\s*=\\s*([\\d.]+)`));
      assert.equal(
        [Number(m[1]), Number(m[2])].join(","),
        [-limit, limit].join(","),
        `${GUIDE} row 3: the API clamp for timeline_offset_${axis} differs from OFFSET_LIMIT_${upper} in ${OFFSETS}.`,
      );
    }
  });

  test("the admin axis is as tall as the public dot field", () => {
    const axis = blankComments(read("admin/assets/js/admin-timeline/timeline-axis.js"));
    assert.match(
      axis,
      /style\.minHeight\s*=\s*CANVAS_HEIGHT_PX/,
      `${GUIDE} row 3: admin/assets/js/admin-timeline/timeline-axis.js must size the axis with CANVAS_HEIGHT_PX, ` +
        "so a dot at a given percentage sits at the same pixel height as on the public page.",
    );
  });

  test("CANVAS_HEIGHT_PX equals TIMELINE_CANVAS_HEIGHT_PX", () => {
    assert.equal(
      numberAfter(ADMIN, /CANVAS_HEIGHT_PX:\s*(\d+)/),
      numberAfter(FRONTEND, /export const TIMELINE_CANVAS_HEIGHT_PX\s*=\s*(\d+)/),
      `${GUIDE} row 3: ${ADMIN} CANVAS_HEIGHT_PX differs from ${FRONTEND}.`,
    );
  });
});

// ── Row 4: no bare canvas-height literal ─────────────────────────────────────

// Files that convert offsets. They must read the geometry constant.
const OFFSET_FILES = [
  "frontend/assets/js/timeline/timeline-render.js",
  "admin/assets/js/admin-timeline/timeline-events.js",
  "admin/assets/js/admin-timeline/timeline-node-drag.js",
];

// File -> reason, for a file that may hold a bare 280.
const BARE_280_EXCEPTIONS = {};

describe(`${GUIDE} row 4: offset code uses the geometry constants`, () => {
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
        `${GUIDE} row 4: ${rel}:${m ? lineOf(code, m.index) : 0} repeats "50 + y / 2". ` +
          `Call crossAxisToTopPercent() from frontend/assets/js/cluster-logic/timeline-offsets.js.`,
      );
    });

    test(`${rel} has no bare 280`, () => {
      assert.ok(exists(rel), `${GUIDE} row 4: ${rel} does not exist. Update OFFSET_FILES.`);
      if (BARE_280_EXCEPTIONS[rel]) return;
      const code = blankComments(read(rel));
      const m = /(?<![\w.])280(?![\w.])/.exec(code);
      assert.equal(
        m,
        null,
        `${GUIDE} row 4: ${rel}:${m ? lineOf(code, m.index) : 0} holds a bare 280. ` +
          `Use TIMELINE_CANVAS_HEIGHT_PX (frontend) or AdminTimelineGeometry.CANVAS_HEIGHT_PX (admin).`,
      );
    });
  }
});

// ── Row 8: the era heading band matches in the editor and on the public page ──

describe(`${GUIDE} row 8: era heading band tokens and lanes agree`, () => {
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
    assert.ok(m, `${GUIDE} row 8: ${relPath} does not define ${token}.`);
    return m[1].trim();
  }

  for (const token of TOKENS) {
    test(`${token} is the same in both token files`, () => {
      assert.equal(
        tokenValue(ADMIN_TOKENS, token),
        tokenValue(FRONTEND_TOKENS, token),
        `${GUIDE} row 8: ${token} differs between ${FRONTEND_TOKENS} and ${ADMIN_TOKENS}.`,
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
      assert.ok(m, `${GUIDE} row 8: ${rel} has no "N * var(--timeline-heading-lane-height)" lane count.`);
      assert.equal(
        Number(m[1]),
        lanes,
        `${GUIDE} row 8: ${rel} stacks ${m[1]} lanes, but ERA_BAND_LANES is ${lanes}.`,
      );
    }
  });
});

// ── Row 9: zoom stacks are public only, and the spacing matches the CSS ──────

describe(`${GUIDE} row 9: zoom stacks`, () => {
  const STACKS = "frontend/assets/js/cluster-logic/timeline-zoom-stacks.js";

  test("the stacks module is pure: it uses no document or window", () => {
    const code = blankStrings(blankComments(read(STACKS)));
    const m = /\b(document|window)\b/.exec(code);
    assert.equal(
      m,
      null,
      `${GUIDE} row 9: ${STACKS}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. The module takes numbers in and returns numbers.`,
    );
  });

  test("no admin file uses the stacks: the editor always shows exact positions", () => {
    for (const rel of jsFilesUnder("admin/assets/js")) {
      const code = blankComments(read(rel));
      assert.doesNotMatch(
        code,
        /timeline-zoom-stacks|computeZoomStacks/,
        `${GUIDE} row 9: ${rel} uses the zoom stacks. An admin must drag exact dots, so only the public timeline stacks.`,
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
    assert.ok(css, `${GUIDE} row 9: --timeline-stack-spacing is missing in variables.css.`);
    assert.equal(
      Number(css[1]) * 16,
      px,
      `${GUIDE} row 9: --timeline-stack-spacing (${css[1]}rem) differs from STACK_SPACING_PX (${px}px) in ${STACKS}.`,
    );
  });
});

// ── Row 10: every cluster-logic module is pure ───────────────────────────────

describe(`${GUIDE} row 10: cluster-logic modules use no document or window`, () => {
  const files = jsFilesUnder("frontend/assets/js/cluster-logic");

  test("finds the modules", () => {
    assert.ok(files.length >= 8, "Expected the cluster-logic modules.");
  });

  for (const rel of files) {
    test(`${rel} uses no document or window`, () => {
      const code = blankStrings(blankComments(read(rel)));
      const m = /\b(document|window)\b/.exec(code);
      assert.equal(
        m,
        null,
        `${GUIDE} row 10: ${rel}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. A cluster-logic module takes data in and returns data.`,
      );
    });
  }
});

// ── Row 11: the era-page snapshot carries both offsets ───────────────────────

describe(`${GUIDE} row 11: the era-page snapshot carries the offsets`, () => {
  const EMBED = "api/scripts/embed-initial-data.js";

  test("queryTimelineForEra selects both offset columns", () => {
    const code = read(EMBED);
    const at = code.indexOf("function queryTimelineForEra");
    assert.ok(at >= 0, `${GUIDE} row 11: ${EMBED} has no queryTimelineForEra.`);
    const select = /SELECT[\s\S]*?FROM/.exec(code.slice(at));
    assert.ok(select, `${GUIDE} row 11: ${EMBED}:${lineOf(code, at)} has no SELECT in queryTimelineForEra.`);
    for (const col of ["timeline_offset_x", "timeline_offset_y"]) {
      assert.match(
        select[0],
        new RegExp(`\\b${col}\\b`),
        `${GUIDE} row 11: ${EMBED}:${lineOf(code, at)} leaves ${col} out of the snapshot SELECT.`,
      );
    }
  });
});

// ── Rows 5 and 6: load order and exports that readers rely on ─────────────────

const globals = bridgeGlobals();
const adminScripts = jsFilesUnder("admin/assets/js").filter(
  (rel) => !rel.startsWith(`${BRIDGE_DIR}/`),
);

/** Script paths in a page, in document order, as repo-relative paths. */
function scriptsInPage(pageRel) {
  const html = read(pageRel);
  const out = [];
  for (const m of html.matchAll(/<script[^>]*?\ssrc="([^"]+)"/g)) {
    out.push(path.posix.normalize(path.posix.join(path.posix.dirname(pageRel), m[1])));
  }
  return out;
}

// Page -> bridge global -> reason, for a reader that may load before its bridge.
const LOAD_ORDER_EXCEPTIONS = {};

describe(`${GUIDE} row 5: a bridge loads before the script that reads it`, () => {
  const pages = fs
    .readdirSync(path.join(REPO, "admin/diagrams"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `admin/diagrams/${f}`);

  test("every exception names a page that exists", () => {
    for (const rel of Object.keys(LOAD_ORDER_EXCEPTIONS)) {
      assert.ok(exists(rel), `LOAD_ORDER_EXCEPTIONS lists ${rel}, but it does not exist. Remove it.`);
    }
  });

  for (const page of pages) {
    test(`${page}: bridges come first`, () => {
      const scripts = scriptsInPage(page);
      for (const [name, info] of Object.entries(globals)) {
        const bridgeAt = scripts.indexOf(info.file);
        if (bridgeAt === -1) continue;
        scripts.forEach((src, readerAt) => {
          if (src === info.file || !adminScripts.includes(src)) return;
          if (!new RegExp(`\\b${name}\\b`).test(blankComments(read(src)))) return;
          if ((LOAD_ORDER_EXCEPTIONS[page] || {})[name]) return;
          assert.ok(
            bridgeAt < readerAt,
            `${GUIDE} row 5: ${page} loads ${src} before ${info.file}, ` +
              `but ${src} reads window.${name}. Scripts run in document order.`,
          );
        });
      }
    });
  }
});

describe(`${GUIDE} row 6: readers use only what a bridge exports`, () => {
  test("every bridge global was found", () => {
    assert.equal(Object.keys(globals).length, bridgeFiles.length);
  });

  for (const [name, info] of Object.entries(globals)) {
    if (!info.names) continue;
    test(`${name}: each property that a script reads is exported`, () => {
      for (const rel of adminScripts) {
        const code = blankStrings(blankComments(read(rel)));
        const read_ = [];

        // window.Name.prop
        for (const m of code.matchAll(new RegExp(`window\\.${name}\\.(\\w+)`, "g"))) {
          read_.push({ prop: m[1], at: m.index });
        }
        // const { a, b } = window.Name
        for (const m of code.matchAll(new RegExp(`\\{([^}]*)\\}\\s*=\\s*window\\.${name}\\b`, "g"))) {
          for (const prop of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
            read_.push({ prop, at: m.index });
          }
        }
        // const alias = window.Name; alias.prop
        for (const a of code.matchAll(new RegExp(`(?:const|let|var)\\s+(\\w+)\\s*=\\s*window\\.${name}\\s*;`, "g"))) {
          for (const m of code.matchAll(new RegExp(`\\b${a[1]}\\.(\\w+)`, "g"))) {
            read_.push({ prop: m[1], at: m.index });
          }
        }

        for (const { prop, at } of read_) {
          assert.ok(
            info.names.includes(prop),
            `${GUIDE} row 6: ${rel}:${lineOf(code, at)} reads window.${name}.${prop}, ` +
              `but ${info.file} does not export ${prop}.`,
          );
        }
      }
    });
  }
});
