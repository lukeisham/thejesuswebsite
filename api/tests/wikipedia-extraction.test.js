// Integration test for the Wikipedia extractor (setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/
// extract.js). Unlike extract.test.js (an in-process unit test with a hand-built fake DOM),
// this test runs extract.js in a genuinely separate `node` subprocess against a full sample
// Wikipedia page HTML fixture, mirroring how rank_engine.py's harvest_one() invokes the real
// extractor (write the article HTML, spawn a fresh process, read a JSON result off stdout) —
// see rank_engine.py's `subprocess.run([...], capture_output=True, text=True)` + `json.loads`.
//
// extract.js is a browser-only script with no DOM library available in Node, and this project
// takes no new dependency on jsdom (SR-2). The runner script spawned below embeds a small,
// purpose-built HTML parser + selector engine covering only the selector forms extract.js
// actually calls (tag/#id/.class/[attr]/[attr^=], comma lists, descendant combinators) — enough
// to parse a real Wikipedia-shaped HTML document, not a hand-assembled element graph.
//
// Uses Node built-in test runner (node:test + node:assert/strict), matching the existing suite
// convention.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const EXTRACT_JS_PATH = path.join(
  __dirname, "..", "..", "setup", "SKILLS", "!TheJesusWebsite-Wikipedia", "scripts", "extract.js",
);

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Raising of Lazarus - Wikipedia</title></head>
<body>
<div id="mw-content-text"><div class="mw-parser-output">
<div id="mw-indicator-good-article"><span title="This is a good article. Click here for more information."></span></div>
<p>The <b>raising of Lazarus</b> is a miracle attributed to Jesus in the Gospel of John 11:1-44,
in which Jesus restores Lazarus of Bethany to life days after his death. Some scholars argue this
episode is theological rather than historical, while others contend it preserves an early
tradition. John Dominic Crossan places the episode among the Gospel's symbolic material.</p>
<p>Archaeological excavation near Bethany uncovered an ossuary inscription that some connect to
the Lazarus tradition, and the Israel Antiquities Authority has documented similar first-century
tombs in the area.</p>
<div class="thumb tright"><img src="lazarus.jpg" alt="Painting of the raising of Lazarus"/>
<div class="thumbcaption">A location map of first-century Bethany showing the tomb site</div></div>
<blockquote>"Lazarus, come forth."</blockquote>
<p>The account is preserved in Codex Sinaiticus and in a fragmentary papyrus.</p>
<p>Second Temple Judaism practice around burial customs, including Jewish law on mourning, is
discussed by commentators alongside the Pharisees' views on resurrection.</p>
</div></div>
<div id="mw-normal-catlinks"><ul><li><a href="/wiki/Category:Miracles_of_Jesus">Miracles of Jesus</a></li></ul></div>
<div class="references"><ol class="references">
<li>Journal of Biblical Literature, doi.org/10.1234/jbl.example</li>
<li>Smith, J. <i>A History of Bethany</i>. Oxford University Press. ISBN 978-0-19-000000-0.</li>
<li>Brown, R. <i>The Gospel According to John</i>. Anchor Bible Commentary.</li>
</ol></div>
</body>
</html>`;

/** Reads extract.js source, writes a temp HTML fixture, spawns a fresh `node` process that parses
 * the HTML into a fake DOM and evaluates extract.js against it, and returns the parsed JSON result
 * — the same shape rank_engine.py's harvest_one() expects from `json.loads(r.stdout)`. */
function harvestInSubprocess(html) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-extract-"));
  const htmlPath = path.join(tmpDir, "sample.html");
  fs.writeFileSync(htmlPath, html, "utf8");
  try {
    const result = spawnSync(process.execPath, [RUNNER_SCRIPT_PATH, EXTRACT_JS_PATH, htmlPath], {
      encoding: "utf8",
      timeout: 15000,
    });
    if (result.status !== 0) {
      throw new Error(`extractor subprocess failed (exit ${result.status}):\n${result.stderr}`);
    }
    return JSON.parse(result.stdout);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// The runner is written to a temp file (not passed via -e) so it can require nothing external
// and still be long enough to hold a real, if small, selector engine.
const RUNNER_SCRIPT_PATH = (() => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wiki-extract-runner-")), "runner.js");
  fs.writeFileSync(p, RUNNER_SOURCE(), "utf8");
  return p;
})();

function RUNNER_SOURCE() {
  return `
const fs = require("node:fs");
const vm = require("node:vm");

const [, , extractJsPath, htmlPath] = process.argv;
const extractSource = fs.readFileSync(extractJsPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");

const VOID_TAGS = new Set(["br","img","hr","meta","link","input","area","base","col","embed","source","track","wbr"]);
const SKIP_TEXT_TAGS = new Set(["script", "style"]);

function parseAttrs(str) {
  const attrs = {};
  const re = /([a-zA-Z0-9:_-]+)(?:\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+)))?/g;
  let m;
  while ((m = re.exec(str))) {
    const name = m[1].toLowerCase();
    const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : "";
    attrs[name] = value;
  }
  return attrs;
}

function parseHTML(source) {
  const root = { tagName: "#root", attrs: {}, children: [], parentElement: null };
  const stack = [root];
  const tagRe = /<!--[\\s\\S]*?-->|<(\\/)?([a-zA-Z][a-zA-Z0-9]*)((?:\\s+[^<>]*?)?)\\s*(\\/)?>/g;
  let lastIndex = 0;
  let match;
  function top() { return stack[stack.length - 1]; }
  function pushText(str) {
    if (!str || SKIP_TEXT_TAGS.has(top().tagName)) return;
    top().children.push({ tagName: "#text", text: str, attrs: {}, children: [], parentElement: top() });
  }
  while ((match = tagRe.exec(source))) {
    pushText(source.slice(lastIndex, match.index));
    lastIndex = tagRe.lastIndex;
    if (match[0].startsWith("<!--")) continue;
    const closing = match[1] === "/";
    const tagName = match[2].toLowerCase();
    if (tagName === "!doctype" || tagName === "!DOCTYPE") continue;
    const attrStr = match[3] || "";
    const selfClose = Boolean(match[4]) || VOID_TAGS.has(tagName);
    if (closing) {
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tagName === tagName) { stack.length = j; break; }
      }
      continue;
    }
    const el = { tagName, attrs: parseAttrs(attrStr), children: [], parentElement: top() };
    top().children.push(el);
    if (!selfClose) stack.push(el);
  }
  pushText(source.slice(lastIndex));
  return root;
}

function textOf(node) {
  if (node.tagName === "#text") return node.text;
  if (SKIP_TEXT_TAGS.has(node.tagName)) return "";
  return node.children.map(textOf).join("");
}

function getAttribute(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attrs, name) ? node.attrs[name] : null;
}

function parseToken(token) {
  const m = token.match(/^([a-zA-Z0-9]+)?((?:[.#][\\w-]+|\\[[^\\]]+\\])*)$/);
  if (!m) throw new Error("Unsupported selector token: " + token);
  const spec = { tag: m[1] ? m[1].toLowerCase() : null, id: null, classes: [], attrs: [] };
  const partRe = /[.#][\\w-]+|\\[[^\\]]+\\]/g;
  let pm;
  while ((pm = partRe.exec(m[2] || ""))) {
    const part = pm[0];
    if (part[0] === ".") spec.classes.push(part.slice(1));
    else if (part[0] === "#") spec.id = part.slice(1);
    else {
      const inner = part.slice(1, -1);
      const am = inner.match(/^([\\w-]+)(?:([\\^$*]?=)"?([^"]*)"?)?$/);
      spec.attrs.push({ name: am[1], op: am[2] || null, value: am[3] || null });
    }
  }
  return spec;
}

function nodeMatchesSpec(node, spec) {
  if (node.tagName === "#text" || node.tagName === "#root") return false;
  if (spec.tag && node.tagName !== spec.tag) return false;
  if (spec.id && getAttribute(node, "id") !== spec.id) return false;
  if (spec.classes.length) {
    const classList = (getAttribute(node, "class") || "").split(/\\s+/).filter(Boolean);
    if (!spec.classes.every((c) => classList.includes(c))) return false;
  }
  for (const a of spec.attrs) {
    const val = getAttribute(node, a.name);
    if (val === null) return false;
    if (a.op === "^=" && !val.startsWith(a.value)) return false;
    if (a.op === "=" && val !== a.value) return false;
  }
  return true;
}

function allDescendants(node) {
  const out = [];
  (function walk(n) {
    for (const c of n.children) {
      if (c.tagName !== "#text") { out.push(c); walk(c); }
    }
  })(node);
  return out;
}

function queryAllCompound(root, compound) {
  const tokens = compound.trim().split(/\\s+/).map(parseToken);
  let matches = allDescendants(root).filter((n) => nodeMatchesSpec(n, tokens[tokens.length - 1]));
  for (let i = tokens.length - 2; i >= 0; i--) {
    matches = matches.filter((n) => {
      let p = n.parentElement;
      while (p && p.tagName !== "#root") {
        if (nodeMatchesSpec(p, tokens[i])) return true;
        p = p.parentElement;
      }
      return false;
    });
  }
  return matches;
}

function querySelectorAllRaw(root, selector) {
  const seen = new Set();
  const out = [];
  for (const part of selector.split(",").map((s) => s.trim())) {
    for (const n of queryAllCompound(root, part)) {
      if (!seen.has(n)) { seen.add(n); out.push(n); }
    }
  }
  return out;
}

function wrap(node) {
  if (node.__wrapped) return node.__wrapped;
  const w = {
    get textContent() { return textOf(node); },
    get innerText() { return textOf(node); },
    getAttribute(name) { return getAttribute(node, name); },
    closest(selector) {
      let n = node;
      const spec = parseToken(selector.trim());
      while (n && n.tagName !== "#root") {
        if (nodeMatchesSpec(n, spec)) return wrap(n);
        n = n.parentElement;
      }
      return null;
    },
    querySelector(selector) {
      const all = querySelectorAllRaw(node, selector);
      return all.length ? wrap(all[0]) : null;
    },
    querySelectorAll(selector) {
      return querySelectorAllRaw(node, selector).map(wrap);
    },
  };
  node.__wrapped = w;
  return w;
}

const root = parseHTML(html);
const titleNode = querySelectorAllRaw(root, "title")[0];
const bodyNode = querySelectorAllRaw(root, "body")[0] || root;

const document = {
  title: titleNode ? textOf(titleNode) : "",
  body: wrap(bodyNode),
  querySelector: (sel) => { const all = querySelectorAllRaw(root, sel); return all.length ? wrap(all[0]) : null; },
  querySelectorAll: (sel) => querySelectorAllRaw(root, sel).map(wrap),
};

const context = vm.createContext({ document, window: {} });
const output = vm.runInContext(extractSource, context);
process.stdout.write(JSON.stringify(output));
`;
}

test("extractor subprocess returns valid JSON with the expected signal shape", () => {
  const signals = harvestInSubprocess(SAMPLE_HTML);

  // Full output shape — every default-path signal must be present and correctly typed.
  assert.equal(typeof signals.title, "string");
  assert.equal(typeof signals.verseCount, "number");
  assert.equal(typeof signals.refCount, "number");
  assert.equal(typeof signals.journalCount, "number");
  assert.equal(typeof signals.bookCount, "number");
  assert.equal(typeof signals.commentaryCount, "number");
  assert.equal(typeof signals.archSiteHit, "boolean");
  assert.equal(typeof signals.manuscriptCount, "number");
  assert.equal(["zero", "niche", "supported", "wellsourced"].includes(signals.refQualityTier), true);
  assert.equal(typeof signals.hasCitationNeeded, "boolean");
  assert.equal(typeof signals.mapsAndDiagramsCount, "number");
  assert.equal(typeof signals.hasPictureNarrow, "boolean");
  assert.equal(typeof signals.hasPictureWide, "boolean");
  assert.equal(typeof signals.hasDiagramOrMap, "boolean");
  assert.equal(typeof signals.primarySourceQuoteCount, "number");
  assert.equal(typeof signals.gnosticSourceHit, "boolean");
  assert.equal(typeof signals.wikiQualityHit, "boolean");
  assert.equal(typeof signals.ancientHistorianCount, "number");
  assert.equal(typeof signals.anteNiceneCount, "number");
  assert.equal(typeof signals.jewishContextHits, "number");
  assert.equal(typeof signals.otherReligionHit, "boolean");
  for (const flag of ["isPassion", "isMiracle", "isParable", "isLocation", "isTeaching", "isBibleBook"]) {
    assert.equal(typeof signals[flag], "boolean", `${flag} should be boolean`);
  }

  // Genuinely deleted / retired fields never reappear on the default path.
  for (const key of [
    "historicalContextHit", "passionCriticismHits", "narrativeHeading", "interpHeading",
    "balancedDebateHits", "criticalScholarCount", "jesusSeminarCount", "mythicistCount",
    "contOTNT", "superCrit", "miracleCriticismHits",
  ]) {
    assert.equal(key in signals, false, `"${key}" should be absent by default`);
  }
});

test("extractor subprocess picks up real signal counts from the sample article", () => {
  const signals = harvestInSubprocess(SAMPLE_HTML);

  assert.equal(signals.title, "Raising of Lazarus");
  assert.equal(signals.verseCount, 1); // "John 11:1-44"
  assert.equal(signals.refCount, 3);
  assert.equal(signals.journalCount, 1);
  assert.equal(signals.bookCount, 1);
  assert.equal(signals.commentaryCount, 1);
  assert.equal(signals.archSiteHit, true); // "Archaeological excavation", "ossuary", "IAA"
  assert.equal(signals.manuscriptCount, 1); // "Codex Sinaiticus"
  assert.equal(signals.refQualityTier, "niche"); // 3 refs
  assert.equal(signals.hasCitationNeeded, false);
  assert.equal(signals.mapsAndDiagramsCount, 1); // "location map" caption
  assert.equal(signals.hasDiagramOrMap, true);
  assert.equal(signals.hasPictureWide, true); // in-body <img>
  assert.equal(signals.hasPictureNarrow, true); // not infobox/gallery-scoped
  assert.equal(signals.primarySourceQuoteCount, 1); // one <blockquote>
  assert.equal(signals.wikiQualityHit, true); // good-article indicator
  assert.equal(signals.jewishContextHits > 0, true); // Second Temple Judaism, Pharisees, Jewish law
  assert.equal(signals.isMiracle, true);
  assert.equal(signals.isPassion, false);
});
