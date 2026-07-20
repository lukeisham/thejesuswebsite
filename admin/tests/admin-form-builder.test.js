// AdminFormBuilder tests — uses node:test + node:assert.
// Loads the real admin-form-builder.js source into a sandboxed VM context
// with a minimal fake DOM (backed by a getElementById registry so
// getFieldValue/setFieldValue can round-trip against elements the builder
// creates), so we exercise the actual implementation rather than a
// hand-copied replica.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const builderPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-form-builder.js",
);
const builderSource = fs.readFileSync(builderPath, "utf8");

// ── Minimal fake DOM with an id registry ─────────────────────────────────

function makeDocument() {
  var registry = {};

  function makeElement(tag) {
    var classSet = new Set();
    var el = {
      tag: tag,
      type: tag === "input" ? "text" : undefined,
      className: "",
      style: {},
      value: "",
      checked: false,
      textContent: "",
      placeholder: "",
      rows: undefined,
      selected: false,
      attrs: {},
      children: [],
      classList: {
        add: function (c) {
          classSet.add(c);
        },
        remove: function (c) {
          classSet.delete(c);
        },
        contains: function (c) {
          return classSet.has(c);
        },
      },
      appendChild: function (c) {
        this.children.push(c);
        return c;
      },
      setAttribute: function (name, v) {
        this.attrs[name] = v;
      },
    };
    Object.defineProperty(el, "id", {
      get: function () {
        return this._id || "";
      },
      set: function (v) {
        this._id = v;
        registry[v] = el;
      },
    });
    return el;
  }

  return {
    createElement: makeElement,
    getElementById: function (id) {
      return registry[id] || null;
    },
  };
}

function makeSandbox() {
  var warnings = [];
  var fakeDocument = makeDocument();
  var sandbox = {
    window: {},
    document: fakeDocument,
    console: {
      warn: function (msg) {
        warnings.push(msg);
      },
      error: function () {},
    },
  };
  vm.runInNewContext(builderSource, sandbox);
  return {
    AdminFormBuilder: sandbox.window.AdminFormBuilder,
    warnings,
    document: fakeDocument,
  };
}

function makeContainer() {
  return {
    children: [],
    appendChild: function (c) {
      this.children.push(c);
      return c;
    },
  };
}

// ── addField ──────────────────────────────────────────────────────────────

describe("AdminFormBuilder.addField", () => {
  test("returns a real element wrapping an input with the expected id/label/type", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();

    var div = AdminFormBuilder.addField(container, {
      id: "essay-doi",
      label: "DOI / Citation",
      type: "text",
      placeholder: "e.g. 10.1234/example",
      hint: "Digital Object Identifier.",
      value: "10.1/abc",
    });

    assert.notEqual(div, null);
    assert.equal(container.children[0], div);

    var label = div.children.find((c) => c.tag === "label");
    var input = div.children.find((c) => c.tag === "input");

    assert.equal(label.attrs["for"], "essay-doi");
    assert.equal(label.innerHTML, "DOI / Citation");
    assert.equal(input.id, "essay-doi");
    assert.equal(input.type, "text");
    assert.equal(input.value, "10.1/abc");
    assert.equal(input.placeholder, "e.g. 10.1234/example");
  });

  test("maps type url/date/number correctly and defaults to text", () => {
    var { AdminFormBuilder } = makeSandbox();
    ["url", "date", "number", "anything-else"].forEach((type, i) => {
      var container = makeContainer();
      var div = AdminFormBuilder.addField(container, { id: "f" + i, label: "L", type: type });
      var input = div.children.find((c) => c.tag === "input");
      var expected = type === "url" || type === "date" || type === "number" ? type : "text";
      assert.equal(input.type, expected);
    });
  });

  test("renders the required asterisk in the label when required:true", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    var div = AdminFormBuilder.addField(container, {
      id: "essay-title",
      label: "Title",
      required: true,
    });
    var label = div.children.find((c) => c.tag === "label");
    assert.match(label.innerHTML, /Title.*\*/);
  });

  test("warns and returns null when id is missing", () => {
    var { AdminFormBuilder, warnings } = makeSandbox();
    var result = AdminFormBuilder.addField(makeContainer(), { label: "No id" });
    assert.equal(result, null);
    assert.equal(warnings.length, 1);
  });
});

// ── addTextarea ───────────────────────────────────────────────────────────

describe("AdminFormBuilder.addTextarea", () => {
  test("returns a real element wrapping a textarea with expected id/rows/value", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    var div = AdminFormBuilder.addTextarea(container, {
      id: "essay-content",
      label: "Essay Content",
      value: "hello world",
    });
    var textarea = div.children.find((c) => c.tag === "textarea");
    assert.equal(textarea.id, "essay-content");
    assert.equal(textarea.rows, 20);
    assert.equal(textarea.value, "hello world");
  });

  test("respects a custom rows value", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    var div = AdminFormBuilder.addTextarea(container, { id: "ev-desc", label: "Description", rows: 10 });
    var textarea = div.children.find((c) => c.tag === "textarea");
    assert.equal(textarea.rows, 10);
  });
});

// ── addSelectField ────────────────────────────────────────────────────────

describe("AdminFormBuilder.addSelectField", () => {
  test("returns a real element wrapping a select with options and the correct selection", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    var div = AdminFormBuilder.addSelectField(container, {
      id: "ev-gospel-cat",
      label: "Gospel Category",
      options: [
        { value: "", label: "— None —" },
        { value: "theme", label: "Theme" },
        { value: "events", label: "Events" },
      ],
      selected: "events",
    });

    var select = div.children.find((c) => c.tag === "select");
    assert.equal(select.id, "ev-gospel-cat");
    assert.equal(select.children.length, 3);
    var selectedOption = select.children.find((o) => o.selected);
    assert.equal(selectedOption.value, "events");
    assert.equal(selectedOption.textContent, "Events");
  });
});

// ── getFieldValue / setFieldValue round-trip ────────────────────────────

describe("AdminFormBuilder.getFieldValue / setFieldValue", () => {
  test("round-trips a text field", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    AdminFormBuilder.addField(container, { id: "blog-title", label: "Title" });

    AdminFormBuilder.setFieldValue("blog-title", "New Title");
    assert.equal(AdminFormBuilder.getFieldValue("blog-title"), "New Title");
  });

  test("round-trips a textarea field", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    AdminFormBuilder.addTextarea(container, { id: "blog-content", label: "Content" });

    AdminFormBuilder.setFieldValue("blog-content", "Body text");
    assert.equal(AdminFormBuilder.getFieldValue("blog-content"), "Body text");
  });

  test("round-trips a select field", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    AdminFormBuilder.addSelectField(container, {
      id: "ev-era",
      label: "Era",
      options: [
        { value: "", label: "— None —" },
        { value: "Life", label: "Life" },
      ],
    });

    AdminFormBuilder.setFieldValue("ev-era", "Life");
    assert.equal(AdminFormBuilder.getFieldValue("ev-era"), "Life");
  });

  test("getFieldValue reads checked for checkboxes", () => {
    var { AdminFormBuilder, document } = makeSandbox();
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "essay-two-column";
    checkbox.checked = false;

    AdminFormBuilder.setFieldValue("essay-two-column", true);
    assert.equal(checkbox.checked, true);
    assert.equal(AdminFormBuilder.getFieldValue("essay-two-column"), true);
  });

  test("warns and returns undefined/no-ops for a missing field id", () => {
    var { AdminFormBuilder, warnings } = makeSandbox();
    assert.equal(AdminFormBuilder.getFieldValue("nope"), undefined);
    AdminFormBuilder.setFieldValue("nope", "x"); // should not throw
    assert.equal(warnings.length, 2);
  });
});

// ── clearFieldErrors ──────────────────────────────────────────────────────

describe("AdminFormBuilder.clearFieldErrors", () => {
  test("hides/clears the error hint and removes the error class from each field", () => {
    var { AdminFormBuilder } = makeSandbox();
    var container = makeContainer();
    var div = AdminFormBuilder.addField(container, { id: "essay-title", label: "Title" });
    var input = div.children.find((c) => c.tag === "input");
    var errEl = div.children.find((c) => c.id === "essay-title-error");

    input.classList.add("admin-input--error");
    errEl.style.display = "block";
    errEl.textContent = "Title is required.";

    AdminFormBuilder.clearFieldErrors(["essay-title"]);

    assert.equal(input.classList.contains("admin-input--error"), false);
    assert.equal(errEl.style.display, "none");
    assert.equal(errEl.textContent, "");
  });
});
