// Regression test: every admin diagram editor page must include both
// admin.js and admin-http.js *before* its module scripts so that
// window.Admin exists when the map/timeline/arbor modules initialise.
//
// This prevents bugs like the production breakage where maps.html shipped
// without admin.js, causing "ReferenceError: Admin is not defined" and a
// permanently stuck "Loading map…" state.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DIAGRAM_DIR = path.join(__dirname, "..", "diagrams");

/**
 * All diagram editor pages that must load the core admin scripts.
 */
const PAGES = ["timeline.html", "arbor.html", "maps.html"];

/**
 * The two core scripts that every diagram editor page must include via a
 * deferred `<script>` tag.
 */
const REQUIRED_SCRIPTS = [
  "../assets/js/admin.js",
  "../assets/js/admin-http.js",
];

/**
 * Module-script directories — any script src that starts with one of these
 * prefixes is considered a module script. The core scripts must appear
 * *before* any module script.
 */
const MODULE_DIRS = [
  "../assets/js/admin-maps/",
  "../assets/js/admin-timeline/",
  "../assets/js/admin-arbor/",
];

/**
 * Extract all `src` values from `<script defer src="…">` tags in an HTML
 * string, preserving their source order.
 */
function scriptSources(html) {
  const re = /<script\s+defer\s+src="([^"]+)"[^>]*>/gi;
  const sources = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    sources.push(m[1]);
  }
  return sources;
}

describe("Diagram page script includes", () => {
  for (const page of PAGES) {
    describe(page, () => {
      const html = fs.readFileSync(path.join(DIAGRAM_DIR, page), "utf-8");
      const sources = scriptSources(html);

      test("includes admin.js and admin-http.js", () => {
        for (const required of REQUIRED_SCRIPTS) {
          assert.ok(
            sources.includes(required),
            `expected ${page} to include ${required}`,
          );
        }
      });

      test("core scripts appear before any module script", () => {
        // Find the highest index of any core script.
        const coreIndices = REQUIRED_SCRIPTS
          .map((s) => sources.indexOf(s))
          .filter((i) => i !== -1);
        const lastCoreIdx = coreIndices.length > 0 ? Math.max(...coreIndices) : -1;

        // Find the lowest index of any module script.
        const moduleIndices = sources
          .map((src, idx) =>
            MODULE_DIRS.some((dir) => src.startsWith(dir)) ? idx : -1,
          )
          .filter((i) => i !== -1);
        const firstModuleIdx =
          moduleIndices.length > 0 ? Math.min(...moduleIndices) : Infinity;

        if (lastCoreIdx === -1) {
          // No core scripts at all — the "includes" test above will fail.
          // Don't make this test noisy on top of that.
          return;
        }

        assert.ok(
          lastCoreIdx < firstModuleIdx,
          `core scripts must load before module scripts in ${page}, ` +
            `but last core script is at index ${lastCoreIdx} and first ` +
            `module script is at index ${firstModuleIdx}`,
        );
      });
    });
  }
});
