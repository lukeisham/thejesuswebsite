// Test helper: loads the real cluster-logic bridges and admin classic scripts
// in a vm sandbox, without a DOM library (TEST-8) and without a copy of any
// module (TEST-9).
//
// The canonical modules under frontend/assets/js/ are ES modules, and the
// bridges in admin/assets/js/cluster-logic-bridge/ import them with absolute
// browser paths ("/assets/js/..."). node:vm cannot run import/export syntax,
// so each file is rewritten to a function body: imports become lookups in
// this loader, exports become the function's return value. A canonical module
// is loaded once, so a bridge export and the canonical export are the same
// value and a test can compare them with ===.
//
// Used by admin/tests/cluster-logic-bridges.test.js,
// admin/tests/admin-timeline.test.js, admin-timeline-node-drag.test.js,
// admin-timeline-node-bounds.test.js and maps.test.js. The guide
// setup/ARCHITECTURE/node-cluster-logic.md says why bridges must stay pure.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ADMIN_JS = path.resolve(__dirname, "..", "..", "assets", "js");
const FRONTEND_DIR = path.resolve(__dirname, "..", "..", "..", "frontend");
const BRIDGE_DIR = path.join(ADMIN_JS, "cluster-logic-bridge");

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(?:async\s+)?(?:const|let|var|function)\s+(\w+)/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]*)\};?[ \t]*$/gm;

/** @type {Map<string, Object>} */
const moduleCache = new Map();

/**
 * Resolve an import specifier the way the browser does.
 *
 * @param {string} specifier - "/assets/js/..." (site root) or "./x.js" (relative)
 * @param {string} fromFile - absolute path of the importing file
 * @returns {string} absolute path on disk
 */
function resolveSpecifier(specifier, fromFile) {
  if (specifier.startsWith("/")) return path.join(FRONTEND_DIR, specifier);
  return path.resolve(path.dirname(fromFile), specifier);
}

/**
 * Rewrite ES module source to a function body that returns its exports.
 *
 * @param {string} source - module source text
 * @returns {string} function body that uses `__import` and returns `{ ...exports }`
 */
function toFunctionBody(source) {
  const exported = [];
  let body = source.replace(IMPORT_RE, (_, names, specifier) => {
    const list = names
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .join(", ");
    return `const { ${list} } = __import(${JSON.stringify(specifier)});`;
  });
  body = body.replace(EXPORT_LIST_RE, (_, names) => {
    names
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .forEach((n) => exported.push(n));
    return "";
  });
  body = body.replace(EXPORT_DECL_RE, (match, name) => {
    exported.push(name);
    return match.replace(/^export\s+/, "");
  });
  const returned = exported.map((n) => `${n}: ${n}`).join(", ");
  return `${body}\nreturn { ${returned} };`;
}

/**
 * Run a rewritten module file and return its exports.
 *
 * @param {string} absPath - absolute path of the module
 * @param {Object} windowObj - object the file sees as `window`
 * @returns {Object} the module's exports
 */
function runModule(absPath, windowObj) {
  const source = fs.readFileSync(absPath, "utf8");
  const importer = (specifier) => loadModule(resolveSpecifier(specifier, absPath));
  const factory = vm.runInNewContext(
    `(function (__import, window) {\n${toFunctionBody(source)}\n})`,
    { console },
    { filename: absPath },
  );
  return factory(importer, windowObj);
}

/**
 * Load a canonical module once and return its exports.
 *
 * @param {string} absPath - absolute path of the module
 * @returns {Object} the module's exports (the same object on every call)
 */
function loadModule(absPath) {
  if (!moduleCache.has(absPath)) moduleCache.set(absPath, runModule(absPath, {}));
  return moduleCache.get(absPath);
}

/**
 * Load a canonical module by its site path, for example
 * "/assets/js/cluster-logic/cluster-density.js".
 *
 * @param {string} sitePath
 * @returns {Object} the module's exports
 */
function loadCanonical(sitePath) {
  return loadModule(resolveSpecifier(sitePath, FRONTEND_DIR));
}

/**
 * Run one bridge file and return the `window` object it filled in.
 *
 * @param {string} bridgeFile - file name in admin/assets/js/cluster-logic-bridge/
 * @returns {Object} the sandbox `window`, holding the bridge's window.Admin* global
 */
function loadBridge(bridgeFile) {
  const win = {};
  runModule(path.join(BRIDGE_DIR, bridgeFile), win);
  return win;
}

/**
 * Run an admin classic script (the `window.Admin* = ...` style) in a sandbox.
 *
 * @param {string} adminJsPath - path under admin/assets/js/, for example
 *   "admin-timeline/timeline-node-bounds.js"
 * @param {Object} win - the sandbox `window`; globals the script reads must be on it
 * @param {Object} [extra] - more sandbox globals, for example a fake `document`
 * @returns {Object} the same `win`, after the script ran
 */
function runClassicScript(adminJsPath, win, extra = {}) {
  const absPath = path.join(ADMIN_JS, adminJsPath);
  const source = fs.readFileSync(absPath, "utf8");
  vm.runInNewContext(source, { window: win, console, ...extra }, { filename: absPath });
  return win;
}

module.exports = {
  BRIDGE_DIR,
  loadBridge,
  loadCanonical,
  runClassicScript,
};
