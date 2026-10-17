// AdminFootnotesPanel tests — uses node:test + node:assert.
// Loads the real admin-footnotes-panel.js into a VM context with a minimal fake
// DOM (TEST-8): elements keep children, a dataset, and click listeners, which is
// all the panel uses.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "assets", "js", "admin-footnotes-panel.js"),
  "utf8",
);

function makeElement(tag) {
  var listeners = {};
  var el = {
    tag: tag,
    className: "",
    dataset: {},
    attrs: {},
    listeners: listeners,
    children: [],
    value: "",
    disabled: false,
    focused: false,
    parent: null,
    appendChild: function (child) {
      child.parent = this;
      this.children.push(child);
      return child;
    },
    setAttribute: function (name, value) {
      this.attrs[name] = value;
    },
    addEventListener: function (type, fn) {
      listeners[type] = fn;
    },
    focus: function () {
      this.focused = true;
    },
    // Bubbles like a real click: the listener on an ancestor sees the original target.
    click: function () {
      var target = this;
      for (var node = this; node; node = node.parent) {
        if (node.listeners.click) node.listeners.click({ target: target });
      }
    },
  };
  var text = "";
  Object.defineProperty(el, "textContent", {
    get: function () {
      return text;
    },
    set: function (v) {
      text = v;
      if (v === "") this.children = [];
    },
  });
  return el;
}

function makeSandbox() {
  var warnings = [];
  var sandbox = {
    window: {},
    document: { createElement: makeElement },
    console: { warn: function (msg) { warnings.push(msg); } },
  };
  vm.runInNewContext(source, sandbox);
  return { AdminFootnotesPanel: sandbox.window.AdminFootnotesPanel, warnings: warnings };
}

// The panel root is the first child of the container: [hint, list, addBtn].
function parts(container) {
  var root = container.children[0];
  return { list: root.children[1], addBtn: root.children[2] };
}

function rowTexts(list) {
  return list.children.map(function (li) {
    return li.children[1].value;
  });
}

function rowMarkers(list) {
  return list.children.map(function (li) {
    return li.children[0].textContent;
  });
}

function buttonFor(li, action) {
  return li.children[2].children.find(function (b) {
    return b.dataset.action === action;
  });
}

describe("AdminFootnotesPanel.mount", () => {
  test("shows saved footnotes in order with [fn:N] markers", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    AdminFootnotesPanel.mount(container, [{ content: "A" }, { content: "B" }]);
    var { list } = parts(container);
    assert.deepEqual(rowTexts(list), ["A", "B"]);
    assert.deepEqual(rowMarkers(list), ["[fn:1]", "[fn:2]"]);
  });

  test("Add appends an empty row and focuses it", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    AdminFootnotesPanel.mount(container, [{ content: "A" }]);
    var { list, addBtn } = parts(container);
    addBtn.click();
    assert.deepEqual(rowTexts(list), ["A", ""]);
    assert.equal(list.children[1].children[1].focused, true);
  });

  test("Remove, Up and Down change the order and the numbers, and keep typed text", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    AdminFootnotesPanel.mount(container, [{ content: "A" }, { content: "B" }, { content: "C" }]);
    var { list } = parts(container);

    list.children[0].children[1].value = "A edited";
    buttonFor(list.children[0], "down").click();
    assert.deepEqual(rowTexts(list), ["B", "A edited", "C"]);

    buttonFor(list.children[2], "up").click();
    assert.deepEqual(rowTexts(list), ["B", "C", "A edited"]);

    buttonFor(list.children[0], "remove").click();
    assert.deepEqual(rowTexts(list), ["C", "A edited"]);
    assert.deepEqual(rowMarkers(list), ["[fn:1]", "[fn:2]"]);
  });

  test("the first Up and the last Down buttons are disabled", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    AdminFootnotesPanel.mount(container, [{ content: "A" }, { content: "B" }]);
    var { list } = parts(container);
    assert.equal(buttonFor(list.children[0], "up").disabled, true);
    assert.equal(buttonFor(list.children[1], "down").disabled, true);
    assert.equal(buttonFor(list.children[0], "down").disabled, false);
  });

  test("getFootnotes returns trimmed non-blank rows in order", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    var panel = AdminFootnotesPanel.mount(container, [
      { content: "A" },
      { content: "B" },
    ]);
    var { list, addBtn } = parts(container);
    addBtn.click();
    list.children[1].children[1].value = "  B changed  ";
    list.children[2].children[1].value = "   ";
    // JSON round-trip: the panel runs in a VM context, so its arrays have another prototype.
    assert.deepEqual(JSON.parse(JSON.stringify(panel.getFootnotes())), [
      { content: "A" },
      { content: "B changed" },
    ]);
  });

  test("rows carry the 1000-character limit", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var container = makeElement("div");
    AdminFootnotesPanel.mount(container, [{ content: "A" }]);
    assert.equal(parts(container).list.children[0].children[1].maxLength, 1000);
  });

  test("a missing container warns and returns null", () => {
    var { AdminFootnotesPanel, warnings } = makeSandbox();
    assert.equal(AdminFootnotesPanel.mount(null, []), null);
    assert.equal(warnings.length, 1);
  });
});

describe("AdminFootnotesPanel.mountCard", () => {
  test("adds a titled card to the sidebar and mounts the panel in it", () => {
    var { AdminFootnotesPanel } = makeSandbox();
    var sidebar = makeElement("div");
    var panel = AdminFootnotesPanel.mountCard(sidebar, [{ content: "A" }]);
    var card = sidebar.children[0];
    assert.equal(card.className, "admin-form-card afn-card");
    assert.equal(card.children[0].textContent, "Footnotes");
    assert.deepEqual(JSON.parse(JSON.stringify(panel.getFootnotes())), [{ content: "A" }]);
  });
});
