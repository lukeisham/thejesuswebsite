// AdminEraUtils tests — node:test + node:assert + vm.
// Loads the real admin-era-utils.js. The parity test reads the era keys from
// database/schema.sql and the public renderers' own conversions, so a new era
// or a drifted copy fails here.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

let eraToKebab;

before(() => {
  const sandbox = { window: {} };
  vm.runInNewContext(read("admin", "assets", "js", "admin-era-utils.js"), sandbox);
  eraToKebab = sandbox.window.AdminEraUtils.eraToKebab;
});

/** Pull a named function out of a public ES module so the test can run it. */
function extractFunction(source, name) {
  const match = source.match(new RegExp("function " + name + "\\(era\\)\\s*\\{[^}]+\\}"));
  assert.ok(match, name + " not found in its public module");
  const sandbox = {};
  vm.runInNewContext("var fn = " + match[0], sandbox);
  return sandbox.fn;
}

describe("AdminEraUtils.eraToKebab", () => {
  test("converts CamelCase and keeps an existing hyphen", () => {
    assert.equal(eraToKebab("GalileeMinistry"), "galilee-ministry");
    assert.equal(eraToKebab("Post-Passion"), "post-passion");
    assert.equal(eraToKebab("Life"), "life");
  });

  test("splits a run of capitals before a word", () => {
    assert.equal(eraToKebab("OTVerses"), "ot-verses");
  });

  test("empty string stays empty", () => {
    assert.equal(eraToKebab(""), "");
  });

  test("matches the public timeline and maps conversions for every schema era", () => {
    const schema = read("database", "schema.sql");
    const list = schema.match(/timeline_era\s+TEXT CHECK \(timeline_era IN \(([^)]*)\)/);
    assert.ok(list, "timeline_era CHECK list not found in schema.sql");
    const eras = [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.ok(eras.length >= 8);

    const publicTimeline = extractFunction(
      read("frontend", "assets", "js", "timeline", "timeline-render.js"),
      "eraKebab",
    );
    const publicMaps = extractFunction(
      read("frontend", "assets", "js", "maps", "maps-render.js"),
      "eraToKebab",
    );
    for (const era of eras) {
      assert.equal(eraToKebab(era), publicTimeline(era), "timeline-render.js differs for " + era);
      assert.equal(eraToKebab(era), publicMaps(era), "maps-render.js differs for " + era);
    }
  });
});
