// dom.js tests — uses node:test + node:assert.
// Loads the real dom.js source into a sandboxed VM context with a minimal
// fake DOM, per TEST-8. The ESM `export` statements are rewritten to plain
// declarations so they run in the VM.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.resolve(__dirname, "..", "dom.js");
const sourceText = fs.readFileSync(sourcePath, "utf8");

const transformedSource = sourceText
  .replace(/export function (\w+)/g, "function $1")
  .replace(/export const (\w+)/g, "const $1");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

function makeElement(tag) {
  const attrs = {};
  const classSet = new Set();
  const children = [];
  return {
    tagName: tag,
    _attrs: attrs,
    _children: children,
    textContent: "",
    className: "",
    classList: {
      add: function () {
        for (let i = 0; i < arguments.length; i++) classSet.add(arguments[i]);
      },
    },
    dataset: {},
    setAttribute: function (name, value) {
      attrs[name] = String(value);
    },
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    hasAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    appendChild: function (child) {
      children.push(child);
      return child;
    },
    addEventListener: function () {},
  };
}

function makeSandbox() {
  const sandbox = {
    document: {
      createElement: function (tag) {
        return makeElement(tag);
      },
      createTextNode: function (text) {
        return { nodeType: 3, textContent: text };
      },
    },
  };
  vm.runInNewContext(transformedSource, sandbox);
  return sandbox;
}

// ── createElement ────────────────────────────────────────────────────────

describe("dom: createElement", () => {
  test("module loads and exports createElement", () => {
    const { createElement } = makeSandbox();
    assert.equal(typeof createElement, "function");
  });

  test("textContent attr sets the element's actual text content, not a DOM attribute", () => {
    const { createElement } = makeSandbox();
    const h3 = createElement("h3", { textContent: "Passion Week" });
    assert.equal(h3.textContent, "Passion Week");
    assert.equal(h3.hasAttribute("textContent"), false);
  });

  test("className, style, and other attrs are still applied", () => {
    const { createElement } = makeSandbox();
    const el = createElement("div", {
      className: "timeline-era-heading tier-0",
      style: "left:8px;top:8px",
    });
    assert.equal(el.className, "timeline-era-heading tier-0");
    assert.equal(el.getAttribute("style"), "left:8px;top:8px");
  });

  test("string children are appended as text nodes", () => {
    const { createElement } = makeSandbox();
    const el = createElement("span", {}, ["hello"]);
    assert.equal(el._children.length, 1);
    assert.equal(el._children[0].textContent, "hello");
  });

  test("invalid tag throws", () => {
    const { createElement } = makeSandbox();
    assert.throws(() => createElement(""), /tag must be a non-empty string/);
  });
});
