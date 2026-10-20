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

// ── Consent row: main.js records a view only behind the consent check ─────────

const MAIN = "frontend/assets/js/main.js";
const CONSENT_WRAPPER = "recordPageViewIfAllowed";

// Source text of a top-level `function name(...) { ... }` (ends at the first
// line that starts with `}`), or null when it is absent.
function functionBody(text, name) {
  const start = text.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\b`, "m"));
  if (start === -1) return null;
  const end = text.indexOf("\n}", start);
  return text.slice(start, end === -1 ? text.length : end + 2);
}

describe(`${GUIDE} consent row: a declined visitor is not recorded`, () => {
  const text = read(MAIN);

  test("recordPageViewIfAllowed checks getConsent()", () => {
    const body = functionBody(text, CONSENT_WRAPPER);
    assert.ok(body, `${MAIN} no longer defines ${CONSENT_WRAPPER}(). Rule: ${GUIDE}, Invariants (consent row).`);
    assert.ok(
      body.includes("getConsent()"),
      `${MAIN}:${lineOf(text, text.indexOf(body))} ${CONSENT_WRAPPER}() does not call getConsent(). ` +
        `Declined visitors would be recorded. Rule: ${GUIDE}, Invariants (consent row).`
    );
  });

  test("every recordPageView( call in main.js is inside recordPageViewIfAllowed", () => {
    const body = functionBody(text, CONSENT_WRAPPER) ?? "";
    const bodyStart = text.indexOf(body);
    const hits = [];
    for (const m of text.matchAll(/\brecordPageView\(/g)) {
      const inside = body && m.index >= bodyStart && m.index < bodyStart + body.length;
      if (!inside) hits.push(`${MAIN}:${lineOf(text, m.index)}`);
    }
    assert.deepEqual(
      hits,
      [],
      `recordPageView() called outside ${CONSENT_WRAPPER}() at ${hits.join(", ")}. ` +
        `Rule: ${GUIDE}, Invariants (consent row).`
    );
  });

  test("no other frontend script calls recordPageView(", () => {
    const hits = [];
    for (const file of FRONTEND_JS) {
      if (file === ANALYTICS_CLIENT || file === MAIN) continue;
      const t = read(file);
      for (const m of t.matchAll(/\brecordPageView\(/g)) hits.push(`${file}:${lineOf(t, m.index)}`);
    }
    assert.deepEqual(
      hits,
      [],
      `recordPageView() called at ${hits.join(", ")}, bypassing the consent check in ${MAIN}. ` +
        `Rule: ${GUIDE}, Invariants (consent row).`
    );
  });
});

// ── Retention row: server.js starts the pruning ───────────────────────────────

describe(`${GUIDE} retention row: pruning starts with the server`, () => {
  test("server.js calls startAnalyticsPruning(", () => {
    const text = read("api/server.js");
    assert.ok(
      /\bstartAnalyticsPruning\(/.test(text),
      `api/server.js does not call startAnalyticsPruning(). The analytics table would grow without bound. ` +
        `Rule: ${GUIDE}, Invariants (retention row).`
    );
  });
});

// ── Bots row: the model defines the one HUMAN predicate ───────────────────────

describe(`${GUIDE} bots row: human statistics share one predicate`, () => {
  test("analytics.model.js defines HUMAN and uses it in queries", () => {
    const file = "api/models/analytics.model.js";
    const text = read(file);
    assert.ok(/^const HUMAN = /m.test(text), `${file} does not define HUMAN. Rule: ${GUIDE}, Invariants (bots row).`);
    assert.ok(
      text.includes("${HUMAN}"),
      `${file} never interpolates \${HUMAN}, so bots are counted as visitors. Rule: ${GUIDE}, Invariants (bots row).`
    );
  });
});

// ── Row 4: one public write route, every read route behind requireAuth ────────

const ROUTE = "api/routes/analytics.js";
// A route declaration, up to the arrow function that starts its handler.
const ROUTE_DECL = /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"([^]*?)=>/g;

describe(`${GUIDE} row 5: no IP value is stored`, () => {
  test("the model and the route name no ip_hash and create no hash", () => {
    for (const file of ["api/models/analytics.model.js", "api/routes/analytics.js"]) {
      const text = read(file);
      for (const banned of ["ip_hash", "createHash"]) {
        const index = text.indexOf(banned);
        assert.equal(
          index,
          -1,
          `${file}:${lineOf(text, index)} names "${banned}". ${GUIDE} row 5: no IP address, raw or hashed, reaches the database.`,
        );
      }
    }
  });
});

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
