// Runs Lighthouse (mobile preset) against one representative page of each page
// type on the deployed site, and saves one JSON report per page in
// api/perf-results/. Opt-in: nothing in `npm test`, deploy.sh or pm2 calls it.
// Run it with `cd api && npm run perf:lighthouse`, then check the results with
// `npm run test:perf` (api/tests/perf/). The workflow
// .github/workflows/performance-check.yml runs both.
//
// PAGES is read by api/tests/perf/guide-performance-and-caching.test.js to find
// each page's newest report, and api/tests/performance-budget.test.js makes
// sure that the "Pages covered" table in the performance guide lists the same
// pages. Add or remove a page here and in that table together. A report file
// is named lighthouse-<name>-<timestamp>.json, so keep each name free of a
// timestamp-like tail and unique as a whole word.
//
// Lighthouse is fetched by npx at run time and is not a dependency of this
// repo (SR-2). The version is pinned so that a new release cannot change the
// scores between two runs. The limits it is checked against are in
// setup/ARCHITECTURE/performance-and-caching.md.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const LIGHTHOUSE_VERSION = "13.5.0";
const SITE_ORIGIN = "https://thejesuswebsite.org";
const RESULTS_DIR = path.resolve(__dirname, "..", "perf-results");

// One page for each page type. A detail page is chosen by slug, so the test
// treats an error status as a failure (a removed slug must not pass quietly).
const PAGES = [
  { name: "home", path: "/" },
  { name: "list", path: "/news-and-blog/news/" },
  { name: "detail", path: "/contextual-essays/census-of-quirinius" },
  { name: "evidence", path: "/evidence/the-logos" },
  { name: "timeline", path: "/evidence/timeline/" },
  { name: "arbor", path: "/evidence/arbor.html" },
  { name: "maps", path: "/evidence/maps/galilee.html" },
  { name: "debate", path: "/debate/" },
  { name: "resources", path: "/resources/" },
];

// --no-sandbox: the GitHub runner cannot start Chrome's sandbox. Only our own
// site is loaded, so the weaker isolation is acceptable.
const CHROME_FLAGS = "--headless=new --no-sandbox";

/**
 * Run Lighthouse on one page and save its JSON report.
 * @param {{name: string, path: string}} page - Entry of PAGES.
 * @param {string} stamp - Timestamp shared by every report of this run.
 * @returns {boolean} True when the report file exists.
 */
function runPage(page, stamp) {
  const outputPath = path.join(RESULTS_DIR, `lighthouse-${page.name}-${stamp}.json`);
  const run = spawnSync(
    "npx",
    [
      "--yes",
      `lighthouse@${LIGHTHOUSE_VERSION}`,
      SITE_ORIGIN + page.path,
      "--output=json",
      `--output-path=${outputPath}`,
      `--chrome-flags=${CHROME_FLAGS}`,
      "--quiet",
    ],
    { stdio: "inherit" }
  );
  if (run.status !== 0 || !fs.existsSync(outputPath)) {
    console.error(`Lighthouse did not produce a report for ${page.name} ${page.path} (exit ${run.status}).`);
    return false;
  }
  console.log(`Saved ${outputPath}`);
  return true;
}

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  // Every page runs even after a failure, so one run shows all the broken pages.
  const failed = PAGES.filter((page) => !runPage(page, stamp));
  if (failed.length > 0) {
    console.error(`Lighthouse failed for: ${failed.map((page) => page.name).join(", ")}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { PAGES };
