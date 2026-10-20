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

// Model functions that read analytics rows but are not human statistics.
const HUMAN_EXEMPT = {
  getRecent: "a raw list of recent rows for the admin, bots included on purpose",
  getBotStats: "reports bot and human counts side by side, so it must read bot rows",
};
// Exports that run no SELECT, so they are not human statistics.
const NON_QUERY_HELPERS = {
  record: "inserts one view",
  pruneOlderThan: "deletes expired rows",
};
// Known limits of this smoke scan: a SELECT whose WHERE is built by a ternary
// is covered only through the variable it assigns, and a query split across a
// `.get(` inside another expression is read as one scope.
const MODEL = "api/models/analytics.model.js";
const QUERY_END = /\.(?:get|all|run)\(/g;

// Top-level `function`, `async function` and `const name = (...) =>` blocks of
// a module: name -> {text, start}.
function topLevelFunctions(text) {
  const found = {};
  const declaration = /^(?:(?:async )?function (\w+)\(|const (\w+) = (?:async )?(?:\([^)]*\)|\w+) =>)/gm;
  for (const m of text.matchAll(declaration)) {
    const name = m[1] ?? m[2];
    const end = text.indexOf("\n}", m.index);
    found[name] = { text: text.slice(m.index, end === -1 ? text.length : end + 2), start: m.index };
  }
  return found;
}

// One entry per SELECT: the text from the previous query's end (or the
// function start) up to the .get/.all/.run call that runs it, so a ${HUMAN}
// in a neighbouring query does not cover this one.
function selectScopes(fnText) {
  const ends = [...fnText.matchAll(QUERY_END)].map((m) => m.index);
  const scopes = [];
  let from = 0;
  for (const end of ends) {
    const scope = fnText.slice(from, end);
    if (/\bSELECT\b/.test(scope)) scopes.push({ scope, offset: from });
    from = end;
  }
  return scopes;
}

// A scope is covered when ${HUMAN} appears in it, or in the definition of a
// local variable (such as a shared WHERE clause) that the scope interpolates.
function scopeUsesHuman(fnText, { scope, offset }) {
  if (scope.includes("${HUMAN}")) return true;
  for (const m of scope.matchAll(/\$\{(\w+)\}/g)) {
    const definition = fnText.slice(0, offset + scope.length).match(
      new RegExp(`(?:const|let)\\s+${m[1]}\\s*=[^;]*;`),
    );
    if (definition && definition[0].includes("${HUMAN}")) return true;
  }
  return false;
}

describe(`${GUIDE} bots row: human statistics share one predicate`, () => {
  const text = read(MODEL);
  const functions = topLevelFunctions(text);

  test("analytics.model.js defines HUMAN", () => {
    assert.ok(/^const HUMAN = /m.test(text), `${MODEL} does not define HUMAN. Rule: ${GUIDE}, Invariants (bots row).`);
  });

  test("every export is scanned or listed as a non-query helper", () => {
    const exported = text.match(/module\.exports\s*=\s*\{([^}]*)\}/)?.[1].split(",").map((n) => n.trim()).filter(Boolean) ?? [];
    assert.ok(exported.length > 0, `${MODEL} module.exports not found, so the scan is empty.`);
    const unknown = exported.filter((n) => !functions[n] && !(n in NON_QUERY_HELPERS));
    assert.deepEqual(
      unknown,
      [],
      `${MODEL} exports ${unknown.join(", ")}, which the scan cannot read as a function. ` +
        `Declare it as a top-level function or list it in NON_QUERY_HELPERS. Rule: ${GUIDE}, Invariants (bots row).`
    );
  });

  test("every exemption names a function that still exists", () => {
    const missing = Object.keys(HUMAN_EXEMPT).filter((name) => !functions[name]);
    assert.deepEqual(
      missing,
      [],
      `${MODEL} no longer defines ${missing.join(", ")}. Remove it from HUMAN_EXEMPT. Rule: ${GUIDE}, Invariants (bots row).`
    );
  });

  test("every human-statistic query contains ${HUMAN}", () => {
    const hits = [];
    let selects = 0;
    for (const [name, fn] of Object.entries(functions)) {
      if (name in HUMAN_EXEMPT) continue;
      for (const scope of selectScopes(fn.text)) {
        selects++;
        if (!scopeUsesHuman(fn.text, scope)) {
          hits.push(`${MODEL}:${lineOf(text, fn.start + scope.offset)} (${name})`);
        }
      }
    }
    assert.ok(selects > 0, `${MODEL} has no SELECT outside HUMAN_EXEMPT, so the scan is empty.`);
    assert.deepEqual(
      hits,
      [],
      `Query without \${HUMAN} at ${hits.join(", ")}. Bots would be counted as visitors. ` +
        `Rule: ${GUIDE}, Invariants (bots row).`
    );
  });
});

// ── Row 4: one public write route, every read route behind requireAuth ────────

const ROUTE = "api/routes/analytics.js";
const ROUTE_START = /router\.(get|post|put|patch|delete)\(/g;

// Splits the call that opens at `open` into its top-level arguments, skipping
// strings, template literals and comments, so a handler written as an arrow
// function or as `function` ends at its own closing parenthesis.
function callArguments(text, open) {
  const args = [];
  let depth = 0;
  let argStart = open + 1;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
    } else if (c === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i);
      if (i === -1) break;
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i) + 1;
    } else if ("([{".includes(c)) {
      depth++;
    } else if (")]}".includes(c)) {
      depth--;
      if (depth === 0) {
        args.push(text.slice(argStart, i));
        return args;
      }
    } else if (c === "," && depth === 1) {
      args.push(text.slice(argStart, i));
      argStart = i + 1;
    }
  }
  return args;
}

// Route declarations: method, path, the middleware arguments between the path
// and the handler (the last argument), and the line.
function parseRoutes(text) {
  return [...text.matchAll(ROUTE_START)].map((m) => {
    const [pathArg, ...rest] = callArguments(text, m.index + m[0].length - 1);
    return {
      method: m[1],
      pathName: pathArg.trim().slice(1, -1),
      middleware: rest.slice(0, -1).join(","),
      line: lineOf(text, m.index),
    };
  });
}

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
  const routes = parseRoutes(text);

  test("the scan reads function handlers and single-quoted paths", () => {
    const sample = `router.get('/a', async function (req, res) { x(); });\nrouter.get("/b", requireAuth, (req, res) => {});`;
    const parsed = parseRoutes(sample);
    assert.deepEqual(
      parsed.map((r) => [r.pathName, r.middleware.includes("requireAuth")]),
      [["/a", false], ["/b", true]],
    );
  });

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
