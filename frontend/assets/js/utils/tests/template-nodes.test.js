// template-nodes.js tests — real source in a VM with a fake document (TEST-8).
// The ESM `export` is stripped so the source runs in the VM.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs
  .readFileSync(path.resolve(__dirname, "..", "template-nodes.js"), "utf8")
  .replace(/export function (\w+)/g, "function $1");

function load(nodesById) {
  const warnings = [];
  const context = {
    document: { getElementById: (id) => nodesById[id] ?? null },
    console: { warn: (message) => warnings.push(message) },
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.requireNode = requireNode;`, context);
  return { requireNode: context.requireNode, warnings };
}

describe("requireNode", () => {
  test("returns the node and stays quiet when the template ships it", () => {
    const node = { id: "essay-title" };
    const { requireNode, warnings } = load({ "essay-title": node });

    assert.equal(requireNode("essay-title", "essay-detail"), node);
    assert.deepEqual(warnings, []);
  });

  test("warns with the page and node id and returns null when missing", () => {
    const { requireNode, warnings } = load({});

    assert.equal(requireNode("essay-title", "essay-detail"), null);
    assert.deepEqual(warnings, [
      "essay-detail: template node #essay-title is missing",
    ]);
  });
});
