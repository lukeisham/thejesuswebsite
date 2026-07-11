// Sandbox test for Admin.Credentials — verifies the credential-management
// module loads, exports init(), and calls refresh() without throwing.
// init() calls refresh() internally but doesn't await it, so tests use a
// short settled-promise tick to let the async chain complete.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readModule(relPath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
}

const combinedSource = [
  "{ " + readModule("assets/js/admin-http.js") + "\n}",
  "{ " + readModule("assets/js/admin.js") + "\n}",
  "{ " + readModule("assets/js/passkey.js") + "\n}",
  "{ " + readModule("assets/js/admin-credentials.js") + "\n}",
].join("\n");

function freshSandbox() {
  return {
    window: {},
    document: {
      getElementById: () => null,
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: "",
        textContent: "",
        children: [],
        appendChild(child) {
          this.children.push(child);
          return child;
        },
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
      }),
    },
    console: { error() {} },
    navigator: { credentials: null },
  };
}

function loadModules(sb) {
  sb.window.AdminHttp = {
    request: async () => ({ status: 200, json: async () => [] }),
  };
  vm.runInNewContext(combinedSource, sb);
}

// init() calls async refresh() without awaiting — wait a tick for the chain
async function waitForRefresh() {
  await new Promise((r) => setTimeout(r, 20));
}

describe("Admin.Credentials sandbox", () => {
  test("all modules load and Credentials.init is callable", () => {
    const sb = freshSandbox();
    loadModules(sb);

    assert.ok(sb.window.AdminHttp, "AdminHttp");
    assert.ok(sb.window.Admin, "Admin");
    assert.ok(sb.window.Admin.api, "Admin.api");
    assert.ok(sb.window.Passkey, "Passkey");
    assert.ok(sb.window.Passkey.base64urlToBuffer, "Passkey helper");
    assert.ok(sb.window.Admin.Credentials, "Admin.Credentials");
    assert.equal(typeof sb.window.Admin.Credentials.init, "function");
  });

  test("Cred.init renders empty state when no credentials exist", async () => {
    const sb = freshSandbox();
    loadModules(sb);

    sb.window.Admin.api.get = async (url) => {
      assert.equal(url, "/passkey/credentials");
      return [];
    };

    const container = sb.document.createElement("section");
    sb.window.Admin.Credentials.init(container);
    await waitForRefresh();

    assert.ok(
      container.children.length >= 5,
      `got ${container.children.length} children`,
    );
    assert.equal(container.children[0].textContent, "Passkeys");
    assert.equal(container.children[2].textContent, "Add a Passkey");
    assert.equal(
      container.children[4].textContent,
      "No passkeys registered. Add one to get started.",
    );
  });

  test("Cred.init renders credential list with data", async () => {
    const sb = freshSandbox();
    loadModules(sb);

    sb.window.Admin.api.get = async () => [
      {
        id: 1,
        credential_id: "abcdef1234567890abcdef1234567890",
        last_used_at: "2026-07-10T12:00:00Z",
      },
    ];

    const container = sb.document.createElement("section");
    sb.window.Admin.Credentials.init(container);
    await waitForRefresh();

    const list = container.children.find((c) => c.tagName === "UL");
    assert.ok(list, "should render credential list");
    assert.ok(list.children.length >= 1, "should have at least one row");

    const emptyTexts = container.children
      .map((c) => c.textContent)
      .filter((t) => t.includes("No passkeys registered"));
    assert.equal(emptyTexts.length, 0);
  });

  test("Cred.init shows error when API fails", async () => {
    const sb = freshSandbox();
    loadModules(sb);

    sb.window.Admin.api.get = async () => {
      throw new Error("Network error");
    };

    const container = sb.document.createElement("section");
    sb.window.Admin.Credentials.init(container);
    await waitForRefresh();

    assert.equal(container.children[0].className, "admin-error");
    assert.ok(
      container.children[0].textContent.includes("Failed to load passkeys"),
    );
  });

  test("remove button always present on credential rows", async () => {
    const sb = freshSandbox();
    loadModules(sb);

    sb.window.Admin.api.get = async () => [
      { id: 1, credential_id: "only-one-key", last_used_at: null },
    ];

    const container = sb.document.createElement("section");
    sb.window.Admin.Credentials.init(container);
    await waitForRefresh();

    const list = container.children.find((c) => c.tagName === "UL");
    assert.ok(list, "should have list");
    const row = list.children[0];

    // Find the Remove button — always rendered regardless of credential count
    let found = false;
    for (const c of row.children) {
      if (c.tagName === "BUTTON" && c.textContent === "Remove") {
        found = true;
        break;
      }
    }
    assert.ok(found, "Remove button exists on credential row");
  });
});
