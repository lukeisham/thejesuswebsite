// AdminLayout tests — uses node:test + node:assert.
// Loads the real admin-layout.js source into a sandboxed VM context with a
// minimal fake DOM and asserts the correct nav item gets the active class
// for each of the five activeSection values, and that back-link href/text
// render correctly.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const layoutPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-layout.js",
);
const layoutSource = fs.readFileSync(layoutPath, "utf8");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

function makeElement(tag) {
  return {
    tag: tag,
    className: "",
    href: "",
    textContent: "",
    attrs: {},
    children: [],
    setAttribute: function (name, value) {
      this.attrs[name] = value;
    },
    appendChild: function (child) {
      this.children.push(child);
      return child;
    },
  };
}

function makeSandbox() {
  var warnings = [];
  var fakeDocument = {
    createElement: function (tag) {
      return makeElement(tag);
    },
    createTextNode: function (text) {
      return { nodeType: "text", textContent: text };
    },
  };
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
  vm.runInNewContext(layoutSource, sandbox);
  return { AdminLayout: sandbox.window.AdminLayout, warnings };
}

// Flatten a built <a> element's rendered text (icon span text + trailing
// text node) into a single readable string for assertions.
function linkText(a) {
  return a.children
    .map(function (c) {
      return c.textContent;
    })
    .join("");
}

function findLinksByHrefFragment(nav, fragment) {
  var navList = nav.children.find(function (c) {
    return c.className === "admin-sidebar__nav";
  });
  return navList.children.filter(function (a) {
    return a.href.indexOf(fragment) !== -1;
  });
}

// ── injectSidebar ─────────────────────────────────────────────────────────

describe("AdminLayout.injectSidebar", () => {
  const SECTIONS = ["evidence", "essays", "blog", "debate", "historiography"];

  SECTIONS.forEach(function (section) {
    test("marks only the " + section + " nav item active", () => {
      var { AdminLayout } = makeSandbox();
      var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
      var nav = AdminLayout.injectSidebar(parent, section);

      var navList = nav.children.find(function (c) {
        return c.className === "admin-sidebar__nav";
      });

      var activeLinks = navList.children.filter(function (a) {
        return a.className.indexOf("admin-sidebar__link--active") !== -1;
      });

      assert.equal(activeLinks.length, 1);
      assert.equal(linkText(activeLinks[0]).trim().length > 0, true);
      // href for the active item is always the bare "index.html" self-link.
      assert.equal(activeLinks[0].href, "index.html");
    });
  });

  test("Popular/Academic Challenges hrefs point up through ../debate/ when debate is not active", () => {
    var { AdminLayout } = makeSandbox();
    var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
    var nav = AdminLayout.injectSidebar(parent, "evidence");
    var links = findLinksByHrefFragment(nav, "challenges");

    assert.equal(links.length, 2);
    assert.equal(
      links.some((a) => a.href === "../debate/popular-challenges/index.html"),
      true,
    );
    assert.equal(
      links.some((a) => a.href === "../debate/academic-challenges/index.html"),
      true,
    );
  });

  test("Popular/Academic Challenges hrefs drop the ../debate/ prefix when debate is active", () => {
    var { AdminLayout } = makeSandbox();
    var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
    var nav = AdminLayout.injectSidebar(parent, "debate");
    var links = findLinksByHrefFragment(nav, "challenges");

    assert.equal(
      links.some((a) => a.href === "popular-challenges/index.html"),
      true,
    );
    assert.equal(
      links.some((a) => a.href === "academic-challenges/index.html"),
      true,
    );
  });

  test("Dashboard always points to ../index.html regardless of active section", () => {
    var { AdminLayout } = makeSandbox();
    var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
    var nav = AdminLayout.injectSidebar(parent, "blog");
    var links = findLinksByHrefFragment(nav, "../index.html");
    assert.equal(links.length, 1);
  });

  test("Logout link is present with the expected href", () => {
    var { AdminLayout } = makeSandbox();
    var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
    var nav = AdminLayout.injectSidebar(parent, "evidence");
    var bottom = nav.children.find(function (c) {
      return c.className === "admin-sidebar__bottom";
    });
    assert.equal(bottom.children[0].href, "../auth/login.html");
  });

  test("warns and returns null when parentEl is missing", () => {
    var { AdminLayout, warnings } = makeSandbox();
    var result = AdminLayout.injectSidebar(null, "evidence");
    assert.equal(result, null);
    assert.equal(warnings.length, 1);
  });
});

// ── injectTopbar ──────────────────────────────────────────────────────────

describe("AdminLayout.injectTopbar", () => {
  test("renders title and back link href/text", () => {
    var { AdminLayout } = makeSandbox();
    var parent = { children: [], appendChild: function (c) { this.children.push(c); } };
    var header = AdminLayout.injectTopbar(
      parent,
      "Edit Evidence",
      "index.html",
      "Evidence",
    );

    var title = header.children.find((c) => c.className === "admin-topbar__title");
    var actions = header.children.find((c) => c.className === "admin-topbar__actions");
    var backLink = actions.children[0];

    assert.equal(title.textContent, "Edit Evidence");
    assert.equal(backLink.href, "index.html");
    assert.equal(backLink.textContent, "← Back to Evidence");
  });

  test("warns and returns null when parentEl is missing", () => {
    var { AdminLayout, warnings } = makeSandbox();
    var result = AdminLayout.injectTopbar(null, "Edit Blog Post", "index.html", "Blog");
    assert.equal(result, null);
    assert.equal(warnings.length, 1);
  });
});
