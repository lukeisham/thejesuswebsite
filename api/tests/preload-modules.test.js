// Smoke test for api/scripts/preload-modules.js. It builds a small frontend/
// in a temporary folder, so it reads and writes nothing in the real repo.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PRELOAD_PAGES, findModuleClosure, injectPreloads, run } = require("../scripts/preload-modules");

let root;
let frontend;

function write(relPath, text) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, "utf8");
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

// detail.html sits in a folder that PRELOAD_PAGES names, so it gets the block.
// other.html has the same module script and no entry matches it.
const PAGE = '<html>\n<head>\n    <title>T</title>\n</head>\n<body>\n<script type="module" src="/assets/js/main.js" defer></script>\n</body>\n</html>\n';

// main.js imports a.js and b.js, and a.js imports b.js again. The b.js import
// in a.js carries a version stamp, as it does after version-assets.js ran.
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "preload-modules-"));
  frontend = path.join(root, "frontend");
  write("frontend/assets/js/main.js", 'import { a } from "./utils/a.js";\nimport { b } from "./utils/b.js";\n');
  write("frontend/assets/js/utils/a.js", 'import { b } from "./b.js?v=abc1234";\nexport const a = b;\n');
  write("frontend/assets/js/utils/b.js", "export const b = 1;\n");
  write("frontend/contextual-essays/detail.html", PAGE);
  write("frontend/other.html", PAGE);
  write("frontend/contextual-essays/plain.html", "<html>\n<head>\n</head>\n<body></body>\n</html>\n");
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("preload-modules", () => {
  test("findModuleClosure lists each file of the import chain once, entry first", () => {
    assert.deepEqual(findModuleClosure("/assets/js/main.js", frontend), [
      "/assets/js/main.js",
      "/assets/js/utils/a.js",
      "/assets/js/utils/b.js",
    ]);
  });

  test("findModuleClosure names the importer when an imported file is missing", () => {
    write("frontend/assets/js/utils/a.js", 'import { c } from "./gone.js";\n');
    assert.throws(() => findModuleClosure("/assets/js/main.js", frontend), /\/assets\/js\/utils\/a\.js refers to \/assets\/js\/utils\/gone\.js/);
  });

  test("run writes one block before </head> into a named page, and a second run changes nothing", () => {
    const first = run(root);
    assert.equal(first.written, 1);

    const page = read("frontend/contextual-essays/detail.html");
    assert.equal(page.match(/<!-- modulepreload -->/g).length, 1);
    assert.equal(page.match(/<link rel="modulepreload"/g).length, 3);
    assert.ok(page.indexOf("<!-- /modulepreload -->") < page.indexOf("</head>"));

    const second = run(root);
    assert.equal(second.written, 0);
    assert.equal(read("frontend/contextual-essays/detail.html"), page);
  });

  test("a page that no entry names is left as it was, and loses an old block", () => {
    const before = read("frontend/other.html");
    run(root);
    assert.equal(read("frontend/other.html"), before);

    write("frontend/other.html", injectPreloads(PAGE, ["/assets/js/main.js"]));
    assert.ok(read("frontend/other.html").includes("<!-- modulepreload -->"));
    run(root);
    assert.equal(read("frontend/other.html"), PAGE);
  });

  test("a named page with no module script is left as it was", () => {
    const before = read("frontend/contextual-essays/plain.html");
    run(root);
    assert.equal(read("frontend/contextual-essays/plain.html"), before);
  });

  test("PRELOAD_PAGES names the detail pages, and not the evidence, list or timeline pages", () => {
    const named = (page) => PRELOAD_PAGES.some((rule) => rule.test.test(page));
    assert.ok(named("frontend/news-and-blog/blog/[slug].html"));
    assert.ok(named("frontend/debate/popular-challenges/my-slug.html"));
    assert.ok(!named("frontend/news-and-blog/blog/index.html"));
    assert.ok(!named("frontend/evidence/[slug].html"));
    assert.ok(!named("frontend/evidence/timeline/index.html"));
  });

  test("injectPreloads replaces an older block, and writes none for an empty list", () => {
    const old = injectPreloads("<head>\n</head>", ["/assets/js/old.js"]);
    const fresh = injectPreloads(old, ["/assets/js/new.js"]);
    assert.ok(fresh.includes("/assets/js/new.js") && !fresh.includes("/assets/js/old.js"));
    assert.equal(injectPreloads(old, []), "<head>\n</head>");
  });
});
