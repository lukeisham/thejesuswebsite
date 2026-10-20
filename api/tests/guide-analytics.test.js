// Guide test for setup/ARCHITECTURE/analytics.md.
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
const GUIDE = "setup/ARCHITECTURE/analytics.md";

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

// ── Row 1: the frontend records a view only through api.js ────────────────────

// The one frontend file that may name the analytics path.
const ANALYTICS_CLIENT = "frontend/assets/js/api.js";
const FRONTEND_JS = listFiles("frontend", [".js"]).filter((f) => !f.includes("/tests/"));
const ANALYTICS_PATH = /["'`]\/analytics\b/g;

describe(`${GUIDE} row 1: the frontend names /analytics only in api.js`, () => {
  test("finds frontend scripts to scan", () => {
    assert.ok(FRONTEND_JS.includes(ANALYTICS_CLIENT), `${ANALYTICS_CLIENT} not found.`);
    assert.ok(
      read(ANALYTICS_CLIENT).includes("/analytics"),
      `${ANALYTICS_CLIENT} no longer names /analytics, so the scan is empty.`
    );
  });

  test("no other frontend script names the analytics path", () => {
    const hits = [];
    for (const file of FRONTEND_JS) {
      if (file === ANALYTICS_CLIENT) continue;
      const text = read(file);
      for (const m of text.matchAll(ANALYTICS_PATH)) hits.push(`${file}:${lineOf(text, m.index)}`);
    }
    assert.deepEqual(
      hits,
      [],
      `Analytics endpoint named outside recordPageView() at ${hits.join(", ")}. ` +
        `Call recordPageView() from ${ANALYTICS_CLIENT} instead. Rule: ${GUIDE}, Invariants row 1.`
    );
  });
});

// ── Row 4: one public write route, every read route behind requireAuth ────────

const ROUTE = "api/routes/analytics.js";
// A route declaration, up to the arrow function that starts its handler.
const ROUTE_DECL = /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"([^]*?)=>/g;

describe(`${GUIDE} row 4: analytics route gates`, () => {
  const text = read(ROUTE);
  const routes = [...text.matchAll(ROUTE_DECL)].map((m) => ({
    method: m[1],
    pathName: m[2],
    middleware: m[3],
    line: lineOf(text, m.index),
  }));

  test("finds routes to scan", () => {
    assert.ok(routes.some((r) => r.method === "post"), `No POST route found in ${ROUTE}.`);
    assert.ok(routes.some((r) => r.method === "get"), `No GET route found in ${ROUTE}.`);
  });

  test("the only POST route is rate limited and public", () => {
    const writes = routes.filter((r) => r.method !== "get");
    assert.equal(
      writes.length,
      1,
      `${ROUTE} has ${writes.length} write routes. Rule: ${GUIDE}, Invariants row 4.`
    );
    assert.ok(
      writes[0].method === "post" && writes[0].middleware.includes("analyticsPostLimit"),
      `${ROUTE}:${writes[0].line} write route has no analyticsPostLimit. Rule: ${GUIDE}, Invariants row 4.`
    );
  });

  test("every GET route mounts requireAuth", () => {
    const hits = routes
      .filter((r) => r.method === "get" && !r.middleware.includes("requireAuth"))
      .map((r) => `${ROUTE}:${r.line} (GET ${r.pathName})`);
    assert.deepEqual(
      hits,
      [],
      `GET route without requireAuth at ${hits.join(", ")}. Visitor data would be public. ` +
        `Rule: ${GUIDE}, Invariants row 4.`
    );
  });
});
