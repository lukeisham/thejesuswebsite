// Admin arbor real-page-load smoke test.
//
// The rest of the admin-arbor suite loads each module into its own isolated
// vm sandbox (one module per test file/describe block), which is exactly why
// a prior regression shipped undetected: two file pairs declared the same
// top-level `let`/`const` name (VALID_TYPES, dragState). Classic <script>
// tags share one global lexical scope, so the second declaration in each
// pair threw a fatal parse-time SyntaxError that silently killed that whole
// file in production — but every isolated per-module test kept passing,
// because no single sandbox ever loaded two colliding files together.
//
// This test instead loads every admin-arbor/*.js file into ONE shared vm
// context, in the exact order admin/diagrams/arbor.html includes them, so a
// future cross-file collision fails here instead of only in production.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const arborDir = path.resolve(__dirname, "..", "assets", "js", "admin-arbor");
const arborHtmlPath = path.resolve(__dirname, "..", "diagrams", "arbor.html");

/**
 * Extract the admin-arbor/*.js filenames from arbor.html's <script> tags,
 * in document order, so this test tracks the page's real include list
 * instead of a hand-maintained duplicate of it.
 */
function arborScriptFilenames() {
  const html = fs.readFileSync(arborHtmlPath, "utf8");
  const re = /<script[^>]*src="\.\.\/assets\/js\/admin-arbor\/([a-z0-9-]+\.js)(?:\?[^"]*)?"/g;
  const files = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    files.push(match[1]);
  }
  return files;
}

function makeSandbox() {
  function makeElementStub() {
    return {
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      removeEventListener() {},
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    };
  }

  const documentStub = {
    createElementNS: () => makeElementStub(),
    createElement: () => makeElementStub(),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    body: makeElementStub(),
  };

  const windowStub = {
    document: documentStub,
    showToast: () => {},
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener() {},
    removeEventListener() {},
  };

  const sandbox = { window: windowStub, document: documentStub, console };
  vm.createContext(sandbox);
  return sandbox;
}

test("every admin-arbor/*.js file loads together, in page order, without a thrown error", () => {
  const files = arborScriptFilenames();
  assert.ok(files.length >= 7, "expected arbor.html to include at least 7 admin-arbor scripts");

  const sandbox = makeSandbox();

  for (const filename of files) {
    const filePath = path.join(arborDir, filename);
    const source = fs.readFileSync(filePath, "utf8");
    assert.doesNotThrow(() => {
      vm.runInContext(source, sandbox, { filename: filePath });
    }, `${filename} threw while loading alongside the other arbor scripts (likely a cross-file top-level identifier collision)`);
  }
});

test("every AdminArborX module is defined on window after a real page-order load", () => {
  const files = arborScriptFilenames();
  const sandbox = makeSandbox();

  for (const filename of files) {
    const filePath = path.join(arborDir, filename);
    vm.runInContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: filePath });
  }

  const expectedModules = [
    "AdminArborGeometry",
    "AdminArborCanvas",
    "AdminArborNodes",
    "AdminArborEdges",
    "AdminArborPen",
    "AdminArborConnectMenu",
    "AdminArborEdgeMenu",
    "AdminArborEdgeReroute",
  ];

  for (const name of expectedModules) {
    assert.ok(
      sandbox.window[name],
      `window.${name} should be defined after loading all arbor scripts together`,
    );
  }

  assert.equal(typeof sandbox.window.AdminArborConnectMenu.open, "function");
  assert.equal(typeof sandbox.window.AdminArborEdgeReroute.enter, "function");
});

test("no two admin-arbor/*.js files declare the same top-level var/let/const/function name", () => {
  const files = fs.readdirSync(arborDir).filter((f) => f.endsWith(".js"));
  const topLevelDeclRe = /^(?:var|let|const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;
  const declaredBy = new Map();

  for (const filename of files) {
    const source = fs.readFileSync(path.join(arborDir, filename), "utf8");
    for (const line of source.split("\n")) {
      const match = topLevelDeclRe.exec(line);
      if (!match) continue;
      const name = match[1];
      if (!declaredBy.has(name)) declaredBy.set(name, []);
      declaredBy.get(name).push(filename);
    }
  }

  const collisions = [...declaredBy.entries()].filter(([, owners]) => owners.length > 1);
  assert.deepEqual(
    collisions,
    [],
    `top-level identifier(s) declared in more than one file: ${JSON.stringify(collisions)}`,
  );
});
