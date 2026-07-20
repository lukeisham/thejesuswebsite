// AdminEditorScaffold tests — uses node:test + node:assert.
// Loads the real admin-editor-scaffold.js source into a sandboxed VM context
// with mocked Admin.api.*/AdminAuth/Admin.publishItem/unpublishItem, so we
// exercise the actual implementation rather than a hand-copied replica.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const scaffoldPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-editor-scaffold.js",
);
const scaffoldSource = fs.readFileSync(scaffoldPath, "utf8");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

function makeElement() {
  var handlers = {};
  return {
    innerHTML: "",
    style: {},
    textContent: "",
    disabled: false,
    _handlers: handlers,
    addEventListener: function (type, fn) {
      handlers[type] = handlers[type] || [];
      handlers[type].push(fn);
    },
    click: function () {
      (handlers.click || []).forEach(function (fn) {
        fn({});
      });
    },
  };
}

function makeDocument() {
  var handlers = {};
  return {
    addEventListener: function (type, fn) {
      handlers[type] = handlers[type] || [];
      handlers[type].push(fn);
    },
    dispatchKeydown: function (e) {
      (handlers.keydown || []).forEach(function (fn) {
        fn(e);
      });
    },
  };
}

/**
 * Build a fresh sandboxed AdminEditorScaffold with mockable Admin.* calls.
 * `overrides` can replace any of adminApi/{get,put,del}, requireSession,
 * publishItem, unpublishItem, locationSearch, confirmResult.
 */
function makeSandbox(overrides) {
  overrides = overrides || {};
  var warnings = [];
  var calls = { get: [], put: [], del: [], publish: [], unpublish: [] };

  var apiGet =
    overrides.get ||
    (async function (url) {
      calls.get.push(url);
      return { title: "x", published_draft: 0 };
    });
  var apiPut =
    overrides.put ||
    (async function (url, body) {
      calls.put.push({ url, body });
      return {};
    });
  var apiDel =
    overrides.del ||
    (async function (url) {
      calls.del.push(url);
      return {};
    });

  var fakeDocument = makeDocument();
  var fakeWindow = {
    location: {
      search:
        overrides.locationSearch !== undefined
          ? overrides.locationSearch
          : "?id=5",
      href: "",
    },
  };

  var sandbox = {
    window: fakeWindow,
    document: fakeDocument,
    URLSearchParams: URLSearchParams,
    AdminAuth: {
      requireSession:
        overrides.requireSession || (async function () { return true; }),
    },
    Admin: {
      api: { get: apiGet, put: apiPut, del: apiDel },
      publishItem: overrides.publishItem || (async function (type, id) {
        calls.publish.push({ type, id });
      }),
      unpublishItem: overrides.unpublishItem || (async function (type, id) {
        calls.unpublish.push({ type, id });
      }),
    },
    confirm: function () {
      return overrides.confirmResult !== undefined
        ? overrides.confirmResult
        : true;
    },
    console: {
      warn: function (msg) {
        warnings.push(msg);
      },
      error: function () {},
    },
  };

  vm.runInNewContext(scaffoldSource, sandbox);

  return {
    AdminEditorScaffold: sandbox.window.AdminEditorScaffold,
    calls,
    warnings,
    fakeWindow,
    fakeDocument,
  };
}

// ── initializeEditor ─────────────────────────────────────────────────────

describe("AdminEditorScaffold.initializeEditor", () => {
  test("calls the right load endpoint with the id from the query string", async () => {
    var main = makeElement();
    var { AdminEditorScaffold, calls } = makeSandbox({
      locationSearch: "?id=42",
    });

    var loadedData = null;
    await AdminEditorScaffold.initializeEditor({
      main: main,
      apiPath: "/evidence/admin/",
      entityLabel: "evidence",
      onDataLoaded: function (data) {
        loadedData = data;
      },
    });

    assert.deepEqual(calls.get, ["/evidence/admin/42"]);
    assert.notEqual(loadedData, null);
    assert.equal(main.innerHTML, "");
  });

  test("surfaces load errors via the main element, not silently", async () => {
    var main = makeElement();
    var { AdminEditorScaffold } = makeSandbox({
      get: async function () {
        throw new Error("network down");
      },
    });

    await AdminEditorScaffold.initializeEditor({
      main: main,
      apiPath: "/evidence/admin/",
      entityLabel: "evidence",
      onDataLoaded: function () {
        assert.fail("onDataLoaded should not be called on load failure");
      },
    });

    assert.match(main.innerHTML, /Failed to load evidence: network down/);
  });

  test("shows an 'Unable to verify session' error when auth fails", async () => {
    var main = makeElement();
    var { AdminEditorScaffold } = makeSandbox({
      requireSession: async () => false,
    });

    await AdminEditorScaffold.initializeEditor({
      main: main,
      apiPath: "/evidence/admin/",
      entityLabel: "evidence",
      onDataLoaded: function () {
        assert.fail("onDataLoaded should not be called when session check fails");
      },
    });

    assert.match(main.innerHTML, /Unable to verify session/);
  });

  test("shows a not-found error, capitalized, when the record is missing", async () => {
    var main = makeElement();
    var { AdminEditorScaffold } = makeSandbox({
      get: async function () {
        return null;
      },
    });

    await AdminEditorScaffold.initializeEditor({
      main: main,
      apiPath: "/blog-posts/admin/",
      entityLabel: "blog post",
      onDataLoaded: function () {
        assert.fail("onDataLoaded should not be called when record is missing");
      },
    });

    assert.match(main.innerHTML, /Blog post not found/);
  });

  test("shows a no-id error when the id query param is missing", async () => {
    var main = makeElement();
    var { AdminEditorScaffold } = makeSandbox({ locationSearch: "" });

    await AdminEditorScaffold.initializeEditor({
      main: main,
      apiPath: "/evidence/admin/",
      entityLabel: "evidence",
      onDataLoaded: function () {
        assert.fail("onDataLoaded should not be called with no id");
      },
    });

    assert.match(main.innerHTML, /No evidence ID specified/);
  });
});

// ── wireFormHandlers ──────────────────────────────────────────────────────

describe("AdminEditorScaffold.wireFormHandlers", () => {
  function baseConfig(overrides) {
    var callOrder = [];
    var data = { published_draft: 0 };
    var config = {
      formError: makeElement(),
      submitStatus: makeElement(),
      saveBtn: makeElement(),
      publishBtn: makeElement(),
      validateForm: function () {
        callOrder.push("validateForm");
        return true;
      },
      buildPayload: function () {
        callOrder.push("buildPayload");
        return { title: "x" };
      },
      putPath: "/evidence/5",
      publishType: "evidence",
      recordId: 5,
      data: data,
    };
    Object.assign(config, overrides || {});
    config._callOrder = callOrder;
    config._data = data;
    return config;
  }

  test("save: calls validateForm then buildPayload, in that order, before PUT", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox();
    var config = baseConfig();
    AdminEditorScaffold.wireFormHandlers(config);

    config.saveBtn.click();
    // allow the async click handler to run
    await new Promise((r) => setTimeout(r, 0));

    assert.deepEqual(config._callOrder, ["validateForm", "buildPayload"]);
    assert.equal(calls.put.length, 1);
    assert.equal(calls.put[0].url, "/evidence/5");
    assert.equal(config.submitStatus.innerHTML.includes("Saved successfully"), true);
  });

  test("save: aborts before buildPayload/PUT when validateForm returns false", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox();
    var config = baseConfig({
      validateForm: function () {
        return false;
      },
    });
    AdminEditorScaffold.wireFormHandlers(config);

    config.saveBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(calls.put.length, 0);
  });

  test("save: shows a form error on failure and re-enables buttons", async () => {
    var { AdminEditorScaffold } = makeSandbox({
      put: async function () {
        throw new Error("save boom");
      },
    });
    var config = baseConfig();
    AdminEditorScaffold.wireFormHandlers(config);

    config.saveBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(config.formError.textContent, "Failed to save: save boom");
    assert.equal(config.formError.style.display, "block");
    assert.equal(config.saveBtn.disabled, false);
    assert.equal(config.publishBtn.disabled, false);
  });

  test("publish: does NOT call validateForm, saves then toggles publish state", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox();
    var validateFormCalled = false;
    var config = baseConfig({
      validateForm: function () {
        validateFormCalled = true;
        return true;
      },
    });
    AdminEditorScaffold.wireFormHandlers(config);

    config.publishBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(validateFormCalled, false);
    assert.equal(calls.put.length, 1);
    assert.equal(calls.publish.length, 1);
    assert.deepEqual(calls.publish[0], { type: "evidence", id: 5 });
    assert.equal(config._data.published_draft, 1);
    assert.equal(config.publishBtn.textContent, "Unpublish");
  });

  test("publish: unpublishes when already published", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox();
    var config = baseConfig({ data: { published_draft: 1 } });
    AdminEditorScaffold.wireFormHandlers(config);

    config.publishBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(calls.unpublish.length, 1);
    assert.equal(config.data.published_draft, 0);
    assert.equal(config.publishBtn.textContent, "Publish");
  });

  test("publish: stops before publish/unpublish if the pre-publish save fails", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox({
      put: async function () {
        throw new Error("pre-publish save boom");
      },
    });
    var config = baseConfig();
    AdminEditorScaffold.wireFormHandlers(config);

    config.publishBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(calls.publish.length, 0);
    assert.equal(calls.unpublish.length, 0);
    assert.equal(
      config.formError.textContent,
      "Failed to save before publish: pre-publish save boom",
    );
  });

  test("Ctrl+Enter triggers the save button", async () => {
    var { AdminEditorScaffold, fakeDocument } = makeSandbox();
    var config = baseConfig();
    var saveClicked = false;
    config.saveBtn.click = function () {
      saveClicked = true;
    };
    AdminEditorScaffold.wireFormHandlers(config);

    fakeDocument.dispatchKeydown({
      ctrlKey: true,
      key: "Enter",
      preventDefault: function () {},
    });

    assert.equal(saveClicked, true);
  });

  test("delete: confirms, deletes, and redirects on success", async () => {
    var { AdminEditorScaffold, calls, fakeWindow } = makeSandbox({
      confirmResult: true,
    });
    var deleteBtn = makeElement();
    var config = baseConfig({
      delete: {
        btn: deleteBtn,
        path: "/evidence/5",
        confirmMessage: "Are you sure?",
        idleLabel: "Delete Evidence",
        redirectHref: "index.html",
      },
    });
    AdminEditorScaffold.wireFormHandlers(config);

    deleteBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.deepEqual(calls.del, ["/evidence/5"]);
    assert.equal(fakeWindow.location.href, "index.html");
  });

  test("delete: does nothing when the user cancels the confirm dialog", async () => {
    var { AdminEditorScaffold, calls } = makeSandbox({ confirmResult: false });
    var deleteBtn = makeElement();
    var config = baseConfig({
      delete: {
        btn: deleteBtn,
        path: "/evidence/5",
        confirmMessage: "Are you sure?",
        idleLabel: "Delete Evidence",
      },
    });
    AdminEditorScaffold.wireFormHandlers(config);

    deleteBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    assert.deepEqual(calls.del, []);
  });

  test("warns and does nothing when required config is missing", () => {
    var { AdminEditorScaffold, warnings } = makeSandbox();
    AdminEditorScaffold.wireFormHandlers({ formError: makeElement() });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /missing required config keys/);
  });
});
