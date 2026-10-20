// AdminIdentifiers row-link tests — node:test + node:assert.
// Runs the real admin-identifiers.js in a vm sandbox with a hand-built fake
// DOM (TEST-8). The behaviour under test is that a stored external_url only
// becomes a link when it is http(s) (JS-6, HTML-6).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "assets", "js", "admin-identifiers.js"),
  "utf8",
);

function makeElement(tag) {
  return {
    tagName: tag,
    dataset: {},
    children: [],
    textContent: "",
    className: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
  };
}

function loadBuildRow() {
  const sandbox = {
    window: {},
    document: {
      createElement: makeElement,
      addEventListener() {},
    },
    Admin: { statusBadge: () => makeElement("span") },
    URL,
    console,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.buildRow;
}

function urlCell(item) {
  const row = loadBuildRow()(item);
  return row.children[2];
}

describe("AdminIdentifiers.buildRow external_url", () => {
  test("an https URL becomes a new-tab link", () => {
    const cell = urlCell({ id: 1, title: "t", external_url: "https://example.org/a" });
    const link = cell.children[0];
    assert.equal(link.tagName, "a");
    assert.equal(link.href, "https://example.org/a");
    assert.equal(link.rel, "noopener noreferrer");
  });

  test("a javascript: URL is shown as plain text, not a link", () => {
    const cell = urlCell({ id: 2, title: "t", external_url: "javascript:alert(1)" });
    assert.equal(cell.children.length, 0);
    assert.equal(cell.textContent, "javascript:alert(1)");
  });

  test("an empty URL shows the em dash", () => {
    const cell = urlCell({ id: 3, title: "t", external_url: "" });
    assert.equal(cell.children.length, 0);
    assert.equal(cell.textContent, "—");
  });
});
