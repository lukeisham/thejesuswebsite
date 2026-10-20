// Guide test for setup/ARCHITECTURE/esv-api.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide. Each exception has a one-line
// reason.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/esv-api.md";
const ESV_SCRIPT = "/assets/js/esv_verse.js";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Repo-relative paths of every file under `dir` with one of `exts`.
function listFiles(dir, exts) {
  const found = [];
  for (const entry of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...listFiles(rel, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) found.push(rel);
  }
  return found;
}

const BROWSER_FILES = [
  ...listFiles("frontend", [".js", ".html"]),
  ...listFiles("admin", [".js", ".html"]),
];
const FRONTEND_HTML = listFiles("frontend", [".html"]);
const FRONTEND_JS = listFiles("frontend", [".js"]);

// ── Row 1: the browser reaches ESV only through getEsvPassage() ───────────────

// The one browser file that may name the ESV proxy path.
const ESV_CLIENT = "frontend/assets/js/api.js";
const ESV_DIRECT = /api\.esv\.org|\/esv(?![\w-])/g;
const ESV_KEY = /ESV_API_KEY/g;

describe(`${GUIDE} row 1: browser reaches ESV only through api.js`, () => {
  test("finds browser files to scan", () => {
    assert.ok(BROWSER_FILES.length > 0, "No .js or .html files found under frontend/ or admin/.");
    assert.ok(BROWSER_FILES.includes(ESV_CLIENT), `${ESV_CLIENT} not found.`);
  });

  test("only api.js names api.esv.org or /esv/", () => {
    const hits = [];
    for (const file of BROWSER_FILES) {
      if (file === ESV_CLIENT) continue;
      const text = read(file);
      for (const m of text.matchAll(ESV_DIRECT)) hits.push(`${file}:${lineOf(text, m.index)}`);
    }
    assert.deepEqual(
      hits,
      [],
      `ESV API call outside getEsvPassage() at ${hits.join(", ")}. ` +
        `Call getEsvPassage() from ${ESV_CLIENT} instead. Rule: ${GUIDE}, Invariants row 1.`
    );
  });

  test("ESV_API_KEY appears in no browser file", () => {
    const hits = [];
    for (const file of BROWSER_FILES) {
      const text = read(file);
      for (const m of text.matchAll(ESV_KEY)) hits.push(`${file}:${lineOf(text, m.index)}`);
    }
    assert.deepEqual(
      hits,
      [],
      `ESV_API_KEY found at ${hits.join(", ")}. The key stays on the server. ` +
        `Rule: ${GUIDE}, Invariants row 1.`
    );
  });
});

// ── Rows 2 and 4: fallback text and an esv.org href in static HTML ────────────

// An opening tag that carries data-esv-ref. Group 1 is the tag name.
const ESV_OPEN_TAG = /<([a-z][a-z0-9-]*)\b[^>]*\bdata-esv-ref\b[^>]*>/gi;

describe(`${GUIDE} rows 2 and 4: static data-esv-ref elements`, () => {
  test("finds frontend HTML to scan", () => {
    assert.ok(FRONTEND_HTML.length > 0, "No .html files found under frontend/.");
    const withRef = FRONTEND_HTML.filter((f) => read(f).includes("data-esv-ref"));
    assert.ok(withRef.length > 0, "No frontend HTML file contains data-esv-ref, so the scan is empty.");
  });

  test("every data-esv-ref element has fallback text", () => {
    const hits = [];
    for (const file of FRONTEND_HTML) {
      const text = read(file);
      for (const m of text.matchAll(ESV_OPEN_TAG)) {
        const rest = text.slice(m.index + m[0].length);
        const close = rest.search(new RegExp(`</${m[1]}\\s*>`, "i"));
        const inner = (close === -1 ? "" : rest.slice(0, close)).replace(/<[^>]*>/g, "").trim();
        if (!inner) hits.push(`${file}:${lineOf(text, m.index)}`);
      }
    }
    assert.deepEqual(
      hits,
      [],
      `Empty data-esv-ref element at ${hits.join(", ")}. An ESV outage leaves a blank gap. ` +
        `Rule: ${GUIDE}, Invariants row 2.`
    );
  });

  test("every citation <a data-esv-ref> has an href to https://www.esv.org/", () => {
    const hits = [];
    for (const file of FRONTEND_HTML) {
      const text = read(file);
      for (const m of text.matchAll(ESV_OPEN_TAG)) {
        if (m[1].toLowerCase() !== "a") continue;
        if (!/\bhref\s*=\s*["']https:\/\/www\.esv\.org\//i.test(m[0])) {
          hits.push(`${file}:${lineOf(text, m.index)}`);
        }
      }
    }
    assert.deepEqual(
      hits,
      [],
      `Citation link without an https://www.esv.org/ href at ${hits.join(", ")}. ` +
        `Rule: ${GUIDE}, Invariants row 4.`
    );
  });
});

// ── Row 3: script-built markup calls enhanceEsvVerses(root) ───────────────────

const ESV_MODULE = "frontend/assets/js/esv_verse.js";
const ESV_IMPORT = /import\s*\{[^}]*\benhanceEsvVerses\b[^}]*\}\s*from\s*["']\.\/esv_verse\.js["']/;

describe(`${GUIDE} row 3: scripts that build data-esv-ref markup call enhanceEsvVerses()`, () => {
  const builders = FRONTEND_JS.filter((f) => f !== ESV_MODULE && read(f).includes("data-esv-ref"));

  test("finds scripts to scan", () => {
    assert.ok(FRONTEND_JS.includes(ESV_MODULE), `${ESV_MODULE} not found.`);
    assert.ok(builders.length > 0, "No frontend script builds data-esv-ref markup, so the scan is empty.");
  });

  for (const file of builders) {
    test(`${file} imports and calls enhanceEsvVerses`, () => {
      const text = read(file);
      assert.ok(
        ESV_IMPORT.test(text) && text.includes("enhanceEsvVerses("),
        `${file} builds data-esv-ref markup but does not both import enhanceEsvVerses ` +
          `from "./esv_verse.js" and call enhanceEsvVerses(root). The verse stays as fallback text. ` +
          `Rule: ${GUIDE}, Invariants row 3.`
      );
    });
  }
});

// ── Row 6: pages with data-esv-ref load esv_verse.js ──────────────────────────

const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

// A dynamic import() is not followed.
// Static `import ... from "x"`, `export ... from "x"` and `import "x"` specifiers.
const IMPORT_SPEC = /(?:\bimport|\bexport)\s*(?:[^"';]*?\bfrom\s*)?["']([^"']+)["']/g;

// The frontend .js files that a page loads through <script src>.
function loadedScripts(html) {
  const scripts = [];
  for (const m of html.matchAll(SCRIPT_SRC)) {
    const rel = `frontend${m[1].split("?")[0]}`;
    if (m[1].startsWith("/") && fs.existsSync(path.join(REPO, rel))) scripts.push(rel);
  }
  return scripts;
}

// loadedScripts() plus every module they reach through relative ES imports,
// each visited once. Only used to find pages that need esv_verse.js: the page
// itself must still load it with <script>, because the builders import it too
// and following imports would make that check pass for every page.
function reachableScripts(html) {
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    for (const m of read(rel).matchAll(IMPORT_SPEC)) {
      if (!m[1].startsWith(".")) continue;
      const target = path.posix.join(path.posix.dirname(rel), m[1].split("?")[0]);
      if (fs.existsSync(path.join(REPO, target))) visit(target);
    }
  };
  for (const rel of loadedScripts(html)) visit(rel);
  return [...seen];
}

describe(`${GUIDE} row 6: the import scan`, () => {
  test("IMPORT_SPEC finds import, export-from and bare import specifiers", () => {
    const sample = `import { a } from "./x.js";\nexport * from './y.js';\nimport "./z.js";`;
    assert.deepEqual([...sample.matchAll(IMPORT_SPEC)].map((m) => m[1]), ["./x.js", "./y.js", "./z.js"]);
  });
});

describe(`${GUIDE} row 6: pages with data-esv-ref load esv_verse.js`, () => {
  const needsScript = FRONTEND_HTML.filter((file) => {
    const html = read(file);
    return html.includes("data-esv-ref") || reachableScripts(html).some((js) => read(js).includes("data-esv-ref"));
  });

  test("finds pages to scan", () => {
    assert.ok(needsScript.length > 0, "No frontend page carries data-esv-ref, so the scan is empty.");
  });

  for (const file of needsScript) {
    test(`${file} loads ${ESV_SCRIPT}`, () => {
      assert.ok(
        loadedScripts(read(file)).includes(`frontend${ESV_SCRIPT}`),
        `${file} carries data-esv-ref, directly or through a script it loads, ` +
          `but has no <script> for ${ESV_SCRIPT}. The fallback text stays forever. ` +
          `Rule: ${GUIDE}, Invariants row 6.`
      );
    });
  }
});
