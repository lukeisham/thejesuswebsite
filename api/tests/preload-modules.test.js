// Smoke test for api/scripts/preload-modules.js. It builds a small frontend/
// in a temporary folder, so it reads and writes nothing in the real repo.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { findModuleClosure, injectPreloads, run } = require("../scripts/preload-modules");

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

// main.js imports a.js and b.js, and a.js imports b.js again. The b.js import
// in a.js carries a version stamp, as it does after version-assets.js ran.
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "preload-modules-"));
  frontend = path.join(root, "frontend");
  write("frontend/assets/js/main.js", 'import { a } from "./utils/a.js";\nimport { b } from "./utils/b.js";\n');
  write("frontend/assets/js/utils/a.js", 'import { b } from "./b.js?v=abc1234";\nexport const a = b;\n');
  write("frontend/assets/js/utils/b.js", "export const b = 1;\n");
  write(
    "frontend/page.html",
    '<html>\n<head>\n    <title>T</title>\n</head>\n<body>\n<script type="module" src="/assets/js/main.js" defer></script>\n</body>\n</html>\n'
  );
  write("frontend/plain.html", "<html>\n<head>\n</head>\n<body></body>\n</html>\n");
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

  test("run writes one block before </head>, and a second run changes nothing", () => {
    const first = run(root);
    assert.equal(first.written, 1);

    const page = read("frontend/page.html");
    assert.equal(page.match(/<!-- modulepreload -->/g).length, 1);
    assert.equal(page.match(/<link rel="modulepreload"/g).length, 3);
    assert.ok(page.indexOf("<!-- /modulepreload -->") < page.indexOf("</head>"));

    const second = run(root);
    assert.equal(second.written, 0);
    assert.equal(read("frontend/page.html"), page);
  });

  test("a page with no module script is left as it was", () => {
    const before = read("frontend/plain.html");
    run(root);
    assert.equal(read("frontend/plain.html"), before);
  });

  test("injectPreloads replaces an older block, and writes none for an empty list", () => {
    const old = injectPreloads("<head>\n</head>", ["/assets/js/old.js"]);
    const fresh = injectPreloads(old, ["/assets/js/new.js"]);
    assert.ok(fresh.includes("/assets/js/new.js") && !fresh.includes("/assets/js/old.js"));
    assert.equal(injectPreloads(old, []), "<head>\n</head>");
  });
});
