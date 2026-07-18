// Maps editor subtitle lifecycle tests — verifies the topbar subtitle defaults
// to "Select a map" (not "Loading…") and resets when returning to the gallery.
//
// Run with: node --test admin/tests/maps-subtitle.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── HTML default text ───────────────────────────────────────────────────────

describe("maps.html default subtitle", () => {
  test('default text is "Select a map" not "Loading…"', () => {
    const htmlPath = path.resolve(
      __dirname,
      "..",
      "diagrams",
      "maps.html",
    );
    const html = fs.readFileSync(htmlPath, "utf8");

    // The span must exist with the correct default
    assert.ok(
      html.includes('id="map-editor-title"'),
      "HTML missing #map-editor-title element",
    );

    // Must contain the new default text
    assert.ok(
      html.includes("Select a map"),
      'Expected default text "Select a map" in maps.html',
    );

    // Must NOT contain the old "Loading…" text
    assert.ok(
      !html.includes("Loading…"),
      'Old "Loading…" text still present in maps.html',
    );
  });
});

// ── Gallery.show() resets the subtitle ──────────────────────────────────────

describe("Gallery.show() resets subtitle", () => {
  test('resets #map-editor-title to "Select a map"', () => {
    // Simulate the title element state
    let titleText = "Some Map Name";

    const sandbox = {
      window: {
        AdminMapsGallery: {},
        AdminMapsStaged: { hasChanges: () => false },
        AdminMapsPins: { closeEditPanel: () => {} },
        AdminMapsRegions: { getMaps: () => [] },
      },
      document: {
        createElement: function (tag) {
          var el = {
            setAttribute: function () {},
            addEventListener: function () {},
            appendChild: function () {},
            style: {},
            className: "",
            type: "button",
            hidden: false,
          };
          if (tag === "img") el.src = "";
          return el;
        },
        getElementById: function (id) {
          if (id === "map-editor-title") {
            var el = { textContent: "" };
            Object.defineProperty(el, "textContent", {
              get: function () { return titleText; },
              set: function (v) { titleText = v; },
              configurable: true,
            });
            return el;
          }
          if (id === "maps-gallery") return { hidden: false };
          if (id === "maps-gallery-grid") return { innerHTML: "", appendChild: function () {} };
          if (id === "maps-back-btn") return null;
          return { hidden: false };
        },
        querySelector: function () { return { hidden: false }; },
      },
    };

    // Load maps-gallery.js
    const galleryPath = path.resolve(
      __dirname,
      "..",
      "assets",
      "js",
      "admin-maps",
      "maps-gallery.js",
    );
    const gallerySource = fs.readFileSync(galleryPath, "utf8");
    vm.runInNewContext(gallerySource, sandbox);

    // Initialize
    sandbox.window.AdminMapsGallery.init();
    sandbox.window.AdminMapsGallery.render();

    // Call show() — should reset the subtitle
    sandbox.window.AdminMapsGallery.show();

    assert.equal(
      titleText,
      "Select a map",
      `Expected subtitle "Select a map", got "${titleText}"`,
    );
  });
});

console.log("\nDone.");
