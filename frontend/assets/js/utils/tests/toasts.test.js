// toasts.js tests — node:test against the real toasts.js and dom.js sources,
// loaded into a VM with a hand-built fake DOM (TEST-8). ESM import/export
// statements are rewritten so both files run as one script.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readSource(name) {
  return fs.readFileSync(path.resolve(__dirname, "..", name), "utf8");
}

const source =
  readSource("dom.js").replace(/export (function|const) /g, "$1 ") +
  readSource("toasts.js")
    .replace(/^import .*$/m, "")
    .replace(/export function /g, "function ");

function makeElement(tag) {
  const listeners = {};
  const el = {
    tagName: tag,
    className: "",
    textContent: "",
    _attrs: {},
    _children: [],
    classList: { add() {}, contains() { return false; } },
    dataset: {},
    parentNode: null,
    setAttribute(name, value) { el._attrs[name] = String(value); },
    getAttribute(name) { return el._attrs[name] ?? null; },
    appendChild(child) { el._children.push(child); child.parentNode = el; return child; },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { return listeners.click?.(); },
    querySelector() { return { appendChild() {} }; },
  };
  return el;
}

function find(el, className) {
  if (el.className?.split(" ").includes(className)) return el;
  for (const child of el._children ?? []) {
    const hit = find(child, className);
    if (hit) return hit;
  }
  return null;
}

function makeSandbox({ writeText, noClipboard = false } = {}) {
  const body = makeElement("body");
  const warnings = [];
  const sandbox = {
    document: {
      body,
      createElement: makeElement,
      createElementNS: makeElement,
      createTextNode: (text) => ({ nodeType: 3, textContent: text, _children: [] }),
    },
    navigator: noClipboard ? {} : { clipboard: { writeText: writeText ?? (async () => {}) } },
    requestAnimationFrame() {},
    setTimeout() {},
    console: { warn: (...args) => warnings.push(args) },
  };
  vm.runInNewContext(source + "\nthis.showToast = showToast;", sandbox);
  return { sandbox, body, warnings };
}

// The click handler does not return its promise, so wait for pending microtasks.
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const toastsOf = (body) => body._children[0]._children;

describe("toasts: details and Copy", () => {
  test("an error toast with details renders them and a labelled Copy button", () => {
    const { sandbox, body } = makeSandbox();
    sandbox.showToast("Could not save", "error", { details: "E-PERSIST-001" });
    const [toast] = toastsOf(body);
    assert.equal(find(toast, "toast__details").textContent, "E-PERSIST-001");
    const copy = find(toast, "toast__copy");
    assert.equal(copy.tagName, "button");
    assert.equal(copy.getAttribute("type"), "button");
    assert.match(copy.getAttribute("aria-label"), /copy/i);
  });

  test("Copy writes the message and details to the clipboard", async () => {
    const written = [];
    const { sandbox, body } = makeSandbox({ writeText: async (t) => { written.push(t); } });
    sandbox.showToast("Could not save", "error", { details: "E-PERSIST-001" });
    const copy = find(toastsOf(body)[0], "toast__copy");
    copy.click();
    await flushPromises();
    assert.deepEqual(written, ["Could not save\n\nE-PERSIST-001"]);
    assert.equal(copy.textContent, "Copied");
    assert.equal(copy.getAttribute("aria-label"), "Copied to clipboard");
  });

  test("a failed clipboard write warns and keeps the label", async () => {
    const { sandbox, body, warnings } = makeSandbox({
      writeText: async () => { throw new Error("denied"); },
    });
    sandbox.showToast("Could not save", "error", { details: "x" });
    const copy = find(toastsOf(body)[0], "toast__copy");
    copy.click();
    await flushPromises();
    assert.equal(warnings.length, 1);
    assert.equal(copy.textContent, "Copy");
  });

  test("no clipboard API warns once and keeps the label", async () => {
    const { sandbox, body, warnings } = makeSandbox({ noClipboard: true });
    sandbox.showToast("Could not save", "error", { details: "x" });
    const copy = find(toastsOf(body)[0], "toast__copy");
    copy.click();
    await flushPromises();
    assert.equal(warnings.length, 1);
    assert.equal(copy.textContent, "Copy");
  });

  test("guard: no Copy button without details, or on a non-error variant", () => {
    const { sandbox, body } = makeSandbox();
    sandbox.showToast("Plain failure", "error");
    sandbox.showToast("Saved", "success", { details: "ignored" });
    for (const toast of toastsOf(body)) {
      assert.equal(find(toast, "toast__copy"), null);
      assert.equal(find(toast, "toast__details"), null);
    }
  });
});
