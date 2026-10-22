// Guide test for setup/ARCHITECTURE/security.md.
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
const GUIDE = "setup/ARCHITECTURE/security.md";
const NGINX_HTTP = "deploy/nginx-http.conf";
const NGINX_SITE = "deploy/nginx.conf";
const SECURITY_HEADERS = "api/middleware/security-headers.js";
const MCP_SERVER = "mcp-server/server.js";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(REPO, relPath));
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Repo-relative paths of every file under `dir` that ends with one of `exts`.
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

// The nginx files explain their rules in comments that name the directives the
// tests look for. A comment is blanked so that it never matches, and the line
// numbers stay the same.
function withoutHashComments(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");
}

// ── Row 1: the two page policies are equal ────────────────────────────────────

const POLICY_PATTERN = /"(default-src [^"]*)"/;

describe(`${GUIDE} row 1: nginx and the API send the same policy`, () => {
  test("both files hold a policy string", () => {
    assert.match(read(NGINX_HTTP), POLICY_PATTERN, `${NGINX_HTTP} has no policy string. Rule: ${GUIDE}, row 1.`);
    assert.match(read(SECURITY_HEADERS), POLICY_PATTERN, `${SECURITY_HEADERS} has no policy string. Rule: ${GUIDE}, row 1.`);
  });

  test("the policy strings are equal", () => {
    const nginxPolicy = read(NGINX_HTTP).match(POLICY_PATTERN)?.[1];
    const apiPolicy = read(SECURITY_HEADERS).match(POLICY_PATTERN)?.[1];
    assert.equal(
      nginxPolicy,
      apiPolicy,
      `${NGINX_HTTP} and ${SECURITY_HEADERS} send different policies. Edit both together. Rule: ${GUIDE}, row 1.`,
    );
  });
});

// ── Row 2: inline scripts only in listed pages ────────────────────────────────

// Pages that already carried an inline script when the rule was added. The list
// only shrinks: move the script into a .js file and remove the page from here.
const INLINE_SCRIPT_REASON = "page predates this rule";
const INLINE_SCRIPT_PAGES = [
  "admin/analytics.html",
  "admin/auth/login.html",
  "admin/auth/register.html",
  "admin/blog/edit-[id].html",
  "admin/blog/index.html",
  "admin/blog/new.html",
  "admin/collections/index.html",
  "admin/debate/academic-challenges/edit-[id].html",
  "admin/debate/academic-challenges/index.html",
  "admin/debate/academic-challenges/new.html",
  "admin/debate/edit-[id].html",
  "admin/debate/index.html",
  "admin/debate/new.html",
  "admin/debate/popular-challenges/edit-[id].html",
  "admin/debate/popular-challenges/index.html",
  "admin/debate/popular-challenges/new.html",
  "admin/diagrams/arbor.html",
  "admin/diagrams/maps.html",
  "admin/diagrams/timeline.html",
  "admin/essays/edit-[id].html",
  "admin/essays/index.html",
  "admin/essays/new.html",
  "admin/evidence/bulk.html",
  "admin/evidence/edit-[id].html",
  "admin/evidence/index.html",
  "admin/evidence/new.html",
  "admin/historiography/edit-[id].html",
  "admin/historiography/index.html",
  "admin/historiography/new.html",
  "admin/news/index.html",
  "admin/resources/index.html",
  "admin/settings/index.html",
  "admin/wikipedia/index.html",
  "frontend/evidence/maps/[map_key].html",
  "frontend/evidence/maps/galilee.html",
  "frontend/evidence/maps/galilee/zoom-galilee.html",
  "frontend/evidence/maps/index.html",
  "frontend/evidence/maps/jerusalem.html",
  "frontend/evidence/maps/jerusalem/zoom-jerusalem.html",
  "frontend/evidence/maps/judea.html",
  "frontend/evidence/maps/judea/zoom-judea.html",
  "frontend/evidence/maps/levant.html",
  "frontend/evidence/maps/levant/zoom-levant.html",
  "frontend/evidence/maps/roman-empire.html",
  "frontend/evidence/maps/roman-empire/zoom-roman-empire.html",
];

const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const RUNNABLE_TYPES = ["module", "text/javascript", "application/javascript"];

// Line numbers of the executable inline scripts in `html`. A script with `src`,
// an empty body, or a data type (application/ld+json, application/json) never runs.
function inlineScriptLines(html) {
  const lines = [];
  for (const match of html.matchAll(SCRIPT_TAG)) {
    const [, attrs, body] = match;
    if (/\bsrc\s*=/i.test(attrs) || !body.trim()) continue;
    const type = attrs.match(/\btype\s*=\s*"([^"]*)"/i)?.[1].trim().toLowerCase();
    if (type !== undefined && !RUNNABLE_TYPES.includes(type)) continue;
    lines.push(lineOf(html, match.index));
  }
  return lines;
}

const HTML_PAGES = [...listFiles("frontend", [".html"]), ...listFiles("admin", [".html"])];

describe(`${GUIDE} row 2: inline scripts only in listed pages`, () => {
  test("finds pages to scan", () => {
    assert.ok(HTML_PAGES.length > 0, "No .html files found under frontend/ or admin/.");
  });

  test("no page outside INLINE_SCRIPT_PAGES has an executable inline script", () => {
    const hits = [];
    for (const file of HTML_PAGES) {
      if (INLINE_SCRIPT_PAGES.includes(file)) continue;
      for (const line of inlineScriptLines(read(file))) hits.push(`${file}:${line}`);
    }
    assert.deepEqual(
      hits,
      [],
      `Inline script in a page that is not on INLINE_SCRIPT_PAGES: ${hits.join(", ")}. ` +
        `Move it into a .js file and load it with <script src>. Rule: ${GUIDE}, row 2.`,
    );
  });

  test(`every listed page exists (${INLINE_SCRIPT_REASON})`, () => {
    const missing = INLINE_SCRIPT_PAGES.filter((file) => !exists(file));
    assert.deepEqual(
      missing,
      [],
      `INLINE_SCRIPT_PAGES names a file that no longer exists: ${missing.join(", ")}. Remove it. Rule: ${GUIDE}, row 2.`,
    );
  });

  test("every listed page still has an inline script", () => {
    const stale = INLINE_SCRIPT_PAGES.filter(
      (file) => exists(file) && inlineScriptLines(read(file)).length === 0,
    );
    assert.deepEqual(
      stale,
      [],
      `These pages no longer have an inline script. Remove them from INLINE_SCRIPT_PAGES so the list shrinks: ${stale.join(", ")}. Rule: ${GUIDE}, row 2.`,
    );
  });
});

// ── Row 7: the MCP process is reachable only through nginx ────────────────────

// The text of `location /mcp { ... }` with comments removed, and the line where it starts.
function mcpLocation() {
  const text = withoutHashComments(read(NGINX_SITE));
  const start = text.indexOf("location /mcp {");
  if (start === -1) return null;
  const end = text.indexOf("}", start);
  return { block: text.slice(start, end), line: lineOf(text, start) };
}

describe(`${GUIDE} row 7: the MCP process is reachable only through nginx`, () => {
  test("mcp-server/server.js binds 127.0.0.1", () => {
    const text = read(MCP_SERVER);
    assert.match(text, /const HOST = "127\.0\.0\.1";/, `${MCP_SERVER} does not set HOST to 127.0.0.1. Rule: ${GUIDE}, row 7.`);
    assert.match(text, /\.listen\(PORT, HOST[,)]/, `${MCP_SERVER} calls listen() without HOST. Rule: ${GUIDE}, row 7.`);
  });

  test("location /mcp proxies to the loopback address and keeps its limits", () => {
    const location = mcpLocation();
    assert.ok(location, `${NGINX_SITE} has no "location /mcp {" block. Rule: ${GUIDE}, row 7.`);
    for (const directive of [
      "proxy_pass http://127.0.0.1:3100",
      "limit_req ",
      "limit_conn ",
      "client_max_body_size",
      "access_log",
    ]) {
      assert.ok(
        location.block.includes(directive),
        `${NGINX_SITE}:${location.line} location /mcp lacks "${directive}". Rule: ${GUIDE}, row 7.`,
      );
    }
  });
});

// ── Row 8: agents get the bare domain, and www redirects keep the method ──────

const AGENT_FACING_FILES = [
  "README.md",
  "mcp-server/README.md",
  "mcp-server/.env.example",
  "frontend/llms.txt",
  "frontend/.well-known/llms.txt",
];

describe(`${GUIDE} row 8: agents get the bare domain`, () => {
  test("no agent-facing file names the www origin", () => {
    const hits = [];
    for (const file of AGENT_FACING_FILES) {
      const text = read(file);
      for (const match of text.matchAll(/www\.thejesuswebsite\.org/g)) {
        hits.push(`${file}:${lineOf(text, match.index)}`);
      }
    }
    assert.deepEqual(
      hits,
      [],
      `These files name www.thejesuswebsite.org: ${hits.join(", ")}. Use https://thejesuswebsite.org. Rule: ${GUIDE}, row 8.`,
    );
  });

  test("the two llms.txt copies are identical", () => {
    assert.equal(
      read("frontend/llms.txt"),
      read("frontend/.well-known/llms.txt"),
      `frontend/llms.txt and frontend/.well-known/llms.txt differ. Rule: ${GUIDE}, row 8.`,
    );
  });

  test("the redirects to the bare domain use 308", () => {
    const text = withoutHashComments(read(NGINX_SITE));
    const redirects = [...text.matchAll(/return (\d{3}) https:\/\/thejesuswebsite\.org\$request_uri;/g)];
    assert.ok(redirects.length >= 2, `${NGINX_SITE} has fewer than two redirects to the bare domain. Rule: ${GUIDE}, row 8.`);
    for (const match of redirects) {
      assert.equal(
        match[1],
        "308",
        `${NGINX_SITE}:${lineOf(text, match.index)} redirects with ${match[1]}, which turns a POST into a GET. Use 308. Rule: ${GUIDE}, row 8.`,
      );
    }
  });
});
