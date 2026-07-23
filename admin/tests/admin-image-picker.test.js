// AdminImagePicker tests — uses node:test + node:assert.
// Loads the real admin-image-picker.js source into a sandboxed VM context
// with a minimal fake DOM (same style as admin-form-builder.test.js), so we
// exercise the actual implementation — in particular the opt-in caption
// field — rather than a hand-copied replica.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const pickerPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-image-picker.js",
);
const pickerSource = fs.readFileSync(pickerPath, "utf8");

// ── Minimal fake DOM with an id registry and an Element constructor ────────
// (admin-image-picker.js guards its mount with `container instanceof
// Element`, so elements must actually inherit from a fake Element.)

function makeDocument() {
  var registry = {};

  function Element() {}

  function makeElement(tag) {
    var classSet = new Set();
    var el = Object.create(Element.prototype);
    Object.assign(el, {
      tag: tag,
      type: tag === "input" ? "text" : undefined,
      className: "",
      style: {},
      value: "",
      hidden: false,
      disabled: false,
      textContent: "",
      placeholder: "",
      src: "",
      attrs: {},
      children: [],
      _listeners: {},
      classList: {
        add: function () {},
        remove: function () {},
        contains: function () {
          return classSet.has(arguments[0]);
        },
      },
      appendChild: function (c) {
        this.children.push(c);
        return c;
      },
      setAttribute: function (name, v) {
        this.attrs[name] = v;
      },
      getAttribute: function (name) {
        return this.attrs[name];
      },
      addEventListener: function (type, handler) {
        (this._listeners[type] = this._listeners[type] || []).push(handler);
      },
      fireEvent: function (type) {
        (this._listeners[type] || []).forEach(function (h) {
          h();
        });
      },
    });
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
    Element: Element,
  };
}

function makeContainer(fakeDocument) {
  // The container passed to mount() must itself be an instanceof the fake
  // Element — real callers always pass a DOM element.
  return fakeDocument.createElement("div");
}

function makeSandbox() {
  var fakeDocument = makeDocument();
  var sandbox = {
    window: {},
    document: fakeDocument,
    Element: fakeDocument.Element,
    Admin: { uploadImage: async function () { return {}; } },
    console: { warn: function () {}, error: function () {} },
  };
  vm.runInNewContext(pickerSource, sandbox);
  return {
    AdminImagePicker: sandbox.window.AdminImagePicker,
    document: fakeDocument,
  };
}

function findByType(root, type) {
  return root.children.find(function (c) {
    return c.type === type || c.tag === "select";
  });
}

function findCaptionInput(root) {
  // Caption group is the last appended admin-form-group when present, and
  // the alt group is the second-to-last.
  var groups = root.children.filter(function (c) {
    return c.className === "admin-form-group";
  });
  var captionGroup = groups[1];
  if (!captionGroup) return null;
  return captionGroup.children.find(function (c) {
    return c.tag === "input";
  });
}

// ── Default (thumbnail) shape — captionField absent ────────────────────────

describe("AdminImagePicker: default shape (no captionField option)", () => {
  test("no caption input is rendered", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    AdminImagePicker.mount(container, {});
    var root = container.children[0];
    assert.equal(findCaptionInput(root), null);
  });

  test("getValue() returns exactly { image_path, alt, thumb_path } — no caption key", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    var picker = AdminImagePicker.mount(container, {
      initialPath: "/a.webp",
      initialAlt: "An image",
    });
    var value = picker.getValue();
    assert.deepEqual(Object.keys(value).sort(), ["alt", "image_path", "thumb_path"]);
    assert.equal(value.image_path, "/a.webp");
    assert.equal(value.alt, "An image");
  });
});

// ── Opt-in caption field ────────────────────────────────────────────────────

describe("AdminImagePicker: captionField: true", () => {
  test("caption input is present, seeded from initialCaption", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    AdminImagePicker.mount(container, {
      captionField: true,
      initialCaption: "A river at dusk",
    });
    var root = container.children[0];
    var captionInput = findCaptionInput(root);
    assert.notEqual(captionInput, null);
    assert.equal(captionInput.value, "A river at dusk");
  });

  test("getValue().caption round-trips typed input", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    var picker = AdminImagePicker.mount(container, { captionField: true });
    var root = container.children[0];
    var captionInput = findCaptionInput(root);

    captionInput.value = "New caption";
    captionInput.fireEvent("input");

    assert.equal(picker.getValue().caption, "New caption");
  });

  test("setValue(path, alt, thumb, caption) populates the caption field", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    var picker = AdminImagePicker.mount(container, { captionField: true });

    picker.setValue("/b.webp", "Alt text", "/thumb.webp", "Set caption");

    assert.equal(picker.getValue().caption, "Set caption");
  });

  test("Remove clears the caption", () => {
    var { AdminImagePicker, document } = makeSandbox();
    var container = makeContainer(document);
    var picker = AdminImagePicker.mount(container, {
      captionField: true,
      initialPath: "/a.webp",
      initialCaption: "Will be cleared",
    });
    var root = container.children[0];
    var removeBtn = root.children.find(function (c) {
      return c.tag === "button" && c.textContent === "Remove";
    });

    removeBtn.fireEvent("click");

    assert.equal(picker.getValue().caption, "");
  });
});
