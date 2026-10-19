// Guide test for setup/ARCHITECTURE/Website_guide.md ("Admin editors reuse public code through bridges").
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
const GUIDE = "setup/ARCHITECTURE/Website_guide.md";
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
    for (const m of code.matchAll(/window\.(Admin\w+)\s*=\s*(\{[^}]*\}|\w+)\s*;/g)) {
      const names = m[2].startsWith("{")
        ? m[2].replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      map[m[1]] = { file: rel, names };
    }
  }
  return map;
}

// ── Bridge rule: a bridge is a pure re-export ───────────────────────────────────────

describe(`${GUIDE} bridge rule (pure re-export): bridges are pure re-exports`, () => {
  test("finds the bridge files", () => {
    assert.ok(bridgeFiles.length >= 3, `Expected 3 bridges in ${BRIDGE_DIR}.`);
  });

  for (const file of bridgeFiles) {
    test(`${file} holds only imports and window.Admin* assignments`, () => {
      const rel = `${BRIDGE_DIR}/${file}`;
      const code = blankComments(read(rel))
        .replace(/^import\s*\{[^}]*\}\s*from\s*"\/assets\/js\/[^"]+";?/gm, "")
        .trim();
      const allowed = /^(?:window\.Admin\w+\s*=\s*(\{\s*\w+\s*(,\s*\w+\s*)*,?\s*\}|\w+)\s*;\s*)+$/;
      assert.ok(
        allowed.test(code),
        `${GUIDE} bridge rule (pure re-export): ${rel} holds more than imports from /assets/js/ and ` +
          `"window.Admin… = { names }" assignments. A bridge re-exports and holds no logic. ` +
          `Found: ${code.slice(0, 120)}`,
      );
    });
  }
});

// ── Bridge rule: every cluster-logic module is pure ───────────────────────────────

describe(`${GUIDE} bridge rule (pure modules): cluster-logic modules use no document or window`, () => {
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
        `${GUIDE} bridge rule (pure modules): ${rel}:${m ? lineOf(code, m.index) : 0} uses ${m && m[1]}. A cluster-logic module takes data in and returns data.`,
      );
    });
  }
});

// ── Bridge rules: load order and exports that readers rely on ─────────────────

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

describe(`${GUIDE} bridge rule (load order): a bridge loads before the script that reads it`, () => {
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
            `${GUIDE} bridge rule (load order): ${page} loads ${src} before ${info.file}, ` +
              `but ${src} reads window.${name}. Scripts run in document order.`,
          );
        });
      }
    });
  }
});

describe(`${GUIDE} bridge rule (exports): readers use only what a bridge exports`, () => {
  test("every bridge file publishes at least one global", () => {
    const files = new Set(Object.values(globals).map((g) => g.file));
    for (const file of bridgeFiles) {
      assert.ok(
        files.has(`${BRIDGE_DIR}/${file}`),
        `No window.Admin* assignment found in ${BRIDGE_DIR}/${file}.`,
      );
    }
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
            `${GUIDE} bridge rule (exports): ${rel}:${lineOf(code, at)} reads window.${name}.${prop}, ` +
              `but ${info.file} does not export ${prop}.`,
          );
        }
      }
    });
  }
});
