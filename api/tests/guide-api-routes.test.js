// Guide test for setup/ARCHITECTURE/api-routes.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide. Each exception has a one-line reason.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/api-routes.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function listJs(relDir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listJs(rel));
    else if (entry.name.endsWith(".js")) out.push(rel);
  }
  return out;
}

// ── Row 1: routes run no SQL ──────────────────────────────────────────────────

const ROUTE_SQL = /require\(\s*["']\.\.\/config["']\s*\)|\.prepare\(|\.exec\(/g;

describe(`${GUIDE} row 1: routes run no SQL`, () => {
  const routeFiles = listJs("api/routes");

  test("finds route files to scan", () => {
    assert.ok(routeFiles.length > 0, "No route files found in api/routes.");
  });

  for (const file of routeFiles) {
    test(`${file} runs no SQL`, () => {
      const text = read(file);
      const hits = [...text.matchAll(ROUTE_SQL)].map((m) => `${file}:${lineOf(text, m.index)}`);
      assert.deepEqual(
        hits,
        [],
        `SQL access found at ${hits.join(", ")}. Move the query into api/models/. ` +
          `Rule: ${GUIDE}, Invariants row 1.`
      );
    });
  }
});

// ── Row 2: write routes pass requireAuth ──────────────────────────────────────

const WRITE_ROUTE = /router\.(post|put|patch|delete)\(\s*(["'`])([^"'`]*)\2([\s\S]*?)(?=\(\s*req\b|async\s*\(\s*req\b)/g;

// Public writes, keyed `<file> <METHOD> <path>`, each with the reason.
const PUBLIC_WRITES = {
  "analytics.js POST /": "Public page-view beacon, rate-limited (analytics.md row 4).",
  "auth.js POST /logout": "Ends the caller's own session.",
  "deploy-webhook.js POST /": "Called by GitHub; refuses every request without DEPLOY_WEBHOOK_SECRET.",
  "passkey.js POST /register/options": "Gated by requireSetupToken before any credential exists.",
  "passkey.js POST /register/verify": "Gated by requireSetupToken before any credential exists.",
  "passkey.js POST /login/options": "The sign-in itself.",
  "passkey.js POST /login/verify": "The sign-in itself.",
  "wikipedia.js POST /signal-check": "Public read-only scoring, rate-limited.",
};

describe(`${GUIDE} row 2: write routes require auth`, () => {
  const routeFiles = listJs("api/routes");
  const seen = new Set();

  for (const file of routeFiles) {
    const base = path.basename(file);
    const text = read(file);
    for (const m of text.matchAll(WRITE_ROUTE)) {
      const key = `${base} ${m[1].toUpperCase()} ${m[3]}`;
      seen.add(key);
      if (PUBLIC_WRITES[key]) continue;
      test(`${key} passes requireAuth`, () => {
        assert.match(
          m[4],
          /\b(requireAuth|auth)\b/,
          `${file}:${lineOf(text, m.index)} has a write route without requireAuth. ` +
            `Rule: ${GUIDE}, Invariants row 2.`
        );
      });
    }
  }

  test("every PUBLIC_WRITES key matches a real route", () => {
    const stale = Object.keys(PUBLIC_WRITES).filter((k) => !seen.has(k));
    assert.deepEqual(
      stale,
      [],
      `PUBLIC_WRITES lists routes that do not exist: ${stale.join(", ")}. Remove the stale exception.`
    );
  });
});

// ── Row 3: reads name their columns ───────────────────────────────────────────

// A select-list star. Does not match COUNT(*).
const SELECT_STAR = /(?:SELECT|,)\s*(?:\w+\.)?\*\s*(?:,|FROM\b)/gi;

// Files whose table is chosen at run time, so the columns differ per table.
const RUNTIME_TABLE_QUERIES = {
  "api/models/relations/child-rows.js": "Child table comes from a whitelist at run time (SQL-4).",
  "api/models/relations/junctions.js": "Junction table comes from a whitelist at run time (SQL-4).",
  "api/services/page-generator.js": "Content table comes from api/config/content-pages.js at run time.",
};
const RUNTIME_QUERY = /SELECT\s+\*\s+FROM\s+\$\{/i;

describe(`${GUIDE} row 3: reads name their columns`, () => {
  const files = [...listJs("api/models"), ...listJs("api/services")];

  test("every exception names a file that exists", () => {
    for (const file of Object.keys(RUNTIME_TABLE_QUERIES)) {
      assert.ok(files.includes(file), `RUNTIME_TABLE_QUERIES lists ${file}, but it does not exist. Remove it.`);
    }
  });

  for (const file of files) {
    test(`${file} has no select-list star`, () => {
      const text = read(file);
      const hits = [];
      for (const m of text.matchAll(SELECT_STAR)) {
        const rest = text.slice(m.index, m.index + 80);
        if (RUNTIME_TABLE_QUERIES[file] && RUNTIME_QUERY.test(rest)) continue;
        hits.push(`${file}:${lineOf(text, m.index)}`);
      }
      assert.deepEqual(
        hits,
        [],
        `Select-list star found at ${hits.join(", ")}. Name the columns (ALL_COLUMNS). ` +
          `Rule: ${GUIDE}, Invariants row 3.`
      );
    });
  }
});
