// AdminEditorUtils tests — uses node:test + node:assert.
// Loads the real admin-editor-utils.js source into a sandboxed VM context
// with a minimal fake DOM, so we exercise the actual implementation rather
// than a hand-copied replica.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const utilsPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-editor-utils.js",
);
const utilsSource = fs.readFileSync(utilsPath, "utf8");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

function makeElement() {
  var classSet = new Set();
  return {
    style: {},
    id: "",
    value: "",
    textContent: "",
    parentNode: null,
    nextSibling: null,
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
    appendChild: function (child) {
      this.children.push(child);
      return child;
    },
    insertBefore: function (child) {
      this.children.push(child);
      return child;
    },
    setAttribute: function () {},
  };
}

/**
 * Build a fresh sandboxed AdminEditorUtils, with a `document.getElementById`
 * that resolves from `elementsById`, and stub AdminInsertImage/AdminMlaSources
 * globals whose calls are recorded on `calls`.
 */
function makeSandbox(elementsById) {
  var warnings = [];
  var calls = { insertImageWire: null, mlaMount: null, figureCaptionsMount: null };

  var fakeDocument = {
    getElementById: function (id) {
      return (elementsById || {})[id] || null;
    },
    createElement: function () {
      return makeElement();
    },
  };

  var AdminInsertImage = {
    wire: function (buttonSelector, textareaSelector) {
      calls.insertImageWire = { buttonSelector, textareaSelector };
    },
  };

  var AdminMlaSources = {
    mount: function (container, opts) {
      calls.mlaMount = { container, opts };
      return { getSelectedIds: function () { return opts.initialSourceIds; } };
    },
  };

  var AdminFigureCaptions = {
    mount: function (container, opts) {
      calls.figureCaptionsMount = { container, opts };
      return { rescan: function () {} };
    },
  };

  var sandbox = {
    window: {},
    document: fakeDocument,
    AdminInsertImage: AdminInsertImage,
    AdminMlaSources: AdminMlaSources,
    AdminFigureCaptions: AdminFigureCaptions,
    console: {
      warn: function (msg) {
        warnings.push(msg);
      },
      error: function () {},
      log: function () {},
    },
  };

  vm.runInNewContext(utilsSource, sandbox);

  return { AdminEditorUtils: sandbox.window.AdminEditorUtils, warnings, calls };
}

// ── parseIdList ───────────────────────────────────────────────────────────

describe("AdminEditorUtils.parseIdList", () => {
  test("parses a comma-separated list", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.deepEqual(Array.from(AdminEditorUtils.parseIdList("1, 3, 7")), [1, 3, 7]);
  });

  test("drops non-numeric entries", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.deepEqual(Array.from(AdminEditorUtils.parseIdList("1, foo, 3")), [1, 3]);
  });

  test("returns undefined for blank input", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.equal(AdminEditorUtils.parseIdList(""), undefined);
    assert.equal(AdminEditorUtils.parseIdList("   "), undefined);
    assert.equal(AdminEditorUtils.parseIdList(undefined), undefined);
  });
});

// ── esc ───────────────────────────────────────────────────────────────────

describe("AdminEditorUtils.esc", () => {
  test("escapes html-significant characters", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.equal(
      AdminEditorUtils.esc(`<a href="x">&Tom</a>`),
      "&lt;a href=&quot;x&quot;&gt;&amp;Tom&lt;/a&gt;",
    );
  });

  test("treats null/undefined as empty string", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.equal(AdminEditorUtils.esc(null), "");
    assert.equal(AdminEditorUtils.esc(undefined), "");
  });

  test("escapes single quotes and converts non-strings without throwing", () => {
    var { AdminEditorUtils } = makeSandbox();
    assert.equal(AdminEditorUtils.esc("it's"), "it&#x27;s");
    assert.equal(AdminEditorUtils.esc(42), "42");
    assert.equal(AdminEditorUtils.esc(0), "0");
  });

  test("output equals the frontend escapeHTML for the same input", async () => {
    var { escapeHTML } = await import(
      path.resolve(__dirname, "..", "..", "frontend", "assets", "js", "utils", "escape-html.js")
    );
    var { AdminEditorUtils } = makeSandbox();
    var samples = [
      `<a href="x">&Tom's</a>`,
      "plain text",
      "",
      null,
      undefined,
      7,
      `"'&<>`,
    ];
    samples.forEach(function (sample) {
      assert.equal(AdminEditorUtils.esc(sample), escapeHTML(sample));
    });
  });
});

// ── clearErrors / validate ───────────────────────────────────────────────

describe("AdminEditorUtils.clearErrors / validate", () => {
  test("validate flags blank required fields and populates messages", () => {
    var { AdminEditorUtils } = makeSandbox();
    var formError = makeElement();
    formError.style.display = "block";
    formError.textContent = "stale error";

    var titleInput = makeElement();
    titleInput.value = "  ";
    var titleErr = makeElement();

    var slugInput = makeElement();
    slugInput.value = "a-slug";
    var slugErr = makeElement();

    var fields = [
      { input: titleInput, errEl: titleErr, label: "Title" },
      { input: slugInput, errEl: slugErr, label: "Slug" },
    ];

    var valid = AdminEditorUtils.validate(formError, fields);

    assert.equal(valid, false);
    assert.equal(formError.style.display, "none");
    assert.equal(formError.textContent, "");
    assert.equal(titleErr.textContent, "Title is required.");
    assert.equal(titleErr.style.display, "block");
    assert.equal(titleInput.classList.contains("admin-input--error"), true);
    assert.equal(slugErr.style.display, "none");
    assert.equal(slugInput.classList.contains("admin-input--error"), false);
  });

  test("validate passes when all required fields are filled", () => {
    var { AdminEditorUtils } = makeSandbox();
    var titleInput = makeElement();
    titleInput.value = "Title";
    var slugInput = makeElement();
    slugInput.value = "slug";

    var fields = [
      { input: titleInput, errEl: makeElement(), label: "Title" },
      { input: slugInput, errEl: makeElement(), label: "Slug" },
    ];

    assert.equal(AdminEditorUtils.validate(null, fields), true);
  });
});

// ── wireInsertImageButton ────────────────────────────────────────────────

describe("AdminEditorUtils.validate slug check", () => {
  function runSlug(value) {
    var { AdminEditorUtils } = makeSandbox();
    var input = makeElement();
    input.value = value;
    var errEl = makeElement();
    var valid = AdminEditorUtils.validate(makeElement(), [
      { input: input, errEl: errEl, label: "Slug", slug: true },
    ]);
    return { valid, message: errEl.textContent };
  }

  test("accepts a lowercase hyphenated slug", () => {
    assert.equal(runSlug("the-historical-jesus").valid, true);
  });

  test("rejects uppercase, spaces and doubled hyphens with a message", () => {
    ["Bad-Slug", "has space", "a--b", "-lead"].forEach(function (value) {
      var result = runSlug(value);
      assert.equal(result.valid, false, value);
      assert.equal(result.message, "Slug must be lowercase letters, numbers, and hyphens.");
    });
  });

  test("a blank slug still reports required", () => {
    assert.equal(runSlug("  ").message, "Slug is required.");
  });

  test("SLUG_PATTERN equals the API pattern in journal-field-validation.js", () => {
    var apiSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "api", "lib", "journal-field-validation.js"),
      "utf8",
    );
    var apiPattern = apiSource.match(/const SLUG_PATTERN = (\/.+\/);/)[1];
    var { AdminEditorUtils } = makeSandbox();
    assert.equal(String(AdminEditorUtils.SLUG_PATTERN), apiPattern);
  });
});

describe("AdminEditorUtils.wireInsertImageButton", () => {
  test("creates a button after the content field and wires AdminInsertImage", () => {
    var contentField = makeElement();
    contentField.parentNode = makeElement();
    var { AdminEditorUtils, calls } = makeSandbox({ "ev-desc": contentField });

    var btn = AdminEditorUtils.wireInsertImageButton("ev-desc");

    assert.notEqual(btn, null);
    assert.equal(btn.id, "insert-image-btn");
    assert.deepEqual(calls.insertImageWire, {
      buttonSelector: "#insert-image-btn",
      textareaSelector: "#ev-desc",
    });
  });

  test("warns and returns null when the content field is missing", () => {
    var { AdminEditorUtils, warnings, calls } = makeSandbox({});

    var btn = AdminEditorUtils.wireInsertImageButton("missing-field");

    assert.equal(btn, null);
    assert.equal(calls.insertImageWire, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /missing-field/);
  });
});

// ── mountMlaPanel (regression guard for the mla_source_id -> id bug) ────────

describe("AdminEditorUtils.mountMlaPanel", () => {
  test("reads link.id, not link.mla_source_id, from the mla_sources fixture", () => {
    var { AdminEditorUtils, calls } = makeSandbox();
    var container = makeElement();

    // Fixture shaped like the API response: each link carries both an `id`
    // (the correct field) and a legacy-looking `mla_source_id` decoy, so a
    // regression back to reading the wrong field would be caught here.
    var mlaSourcesFixture = [
      { id: 11, mla_source_id: 999 },
      { id: 12, mla_source_id: 998 },
    ];

    AdminEditorUtils.mountMlaPanel(container, mlaSourcesFixture);

    assert.deepEqual(Array.from(calls.mlaMount.opts.initialSourceIds), [11, 12]);
  });

  test("passes hintVariant through when provided", () => {
    var { AdminEditorUtils, calls } = makeSandbox();
    AdminEditorUtils.mountMlaPanel(makeElement(), [], { hintVariant: "blog" });
    assert.equal(calls.mlaMount.opts.hintVariant, "blog");
  });

  test("omits hintVariant when not provided", () => {
    var { AdminEditorUtils, calls } = makeSandbox();
    AdminEditorUtils.mountMlaPanel(makeElement(), []);
    assert.equal("hintVariant" in calls.mlaMount.opts, false);
  });
});

// ── mountFigureCaptionsPanel ──────────────────────────────────────────────────

describe("AdminEditorUtils.mountFigureCaptionsPanel", () => {
  test("builds the Images card and mounts the panel against the given textareaId", () => {
    var { AdminEditorUtils, calls } = makeSandbox();
    var container = makeElement();

    AdminEditorUtils.mountFigureCaptionsPanel(container, "essay-content");

    assert.equal(container.children.length, 1, "expected one card appended");
    var card = container.children[0];
    assert.equal(card.className, "admin-form-card");

    var title = card.children.find((c) => c.textContent === "Images");
    assert.notEqual(title, undefined, "expected an Images title element");

    assert.notEqual(calls.figureCaptionsMount, null);
    assert.equal(calls.figureCaptionsMount.opts.textareaId, "essay-content");
  });

  test("returns null and warns when containerEl is missing", () => {
    var { AdminEditorUtils, warnings, calls } = makeSandbox();

    var result = AdminEditorUtils.mountFigureCaptionsPanel(null, "essay-content");

    assert.equal(result, null);
    assert.equal(calls.figureCaptionsMount, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /containerEl is required/);
  });

  test("returns null and warns when AdminFigureCaptions is not loaded", () => {
    var warnings = [];
    var fakeDocument = {
      getElementById: function () { return null; },
      createElement: function () { return makeElement(); },
    };
    var sandbox = {
      window: {},
      document: fakeDocument,
      console: {
        warn: function (msg) { warnings.push(msg); },
        error: function () {},
        log: function () {},
      },
    };
    vm.runInNewContext(utilsSource, sandbox);

    var result = sandbox.window.AdminEditorUtils.mountFigureCaptionsPanel(
      makeElement(),
      "essay-content",
    );

    assert.equal(result, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /AdminFigureCaptions is not loaded/);
  });
});
