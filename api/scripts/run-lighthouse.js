// Runs Lighthouse (mobile preset) against one representative page of each page
// type on the deployed site, and saves one JSON report per page in
// api/perf-results/. Opt-in: nothing in `npm test`, deploy.sh or pm2 calls it.
// Run it with `cd api && npm run perf:lighthouse`, then check the results with
// `npm run test:perf` (api/tests/perf/). The workflow
// .github/workflows/performance-check.yml runs both.
//
// Each page gets one warm-up run that is thrown away, then MEASURED_RUNS real
// runs, and the middle run by performance score is saved. The warm-up fills the
// Cloudflare cache, which each deploy purges, so the first visitor to a cold
// page would otherwise make the page fail. The middle run keeps one noisy run
// from deciding the result, and it is still one real run, so its metrics agree
// with each other.
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
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const LIGHTHOUSE_VERSION = "13.5.0";
const SITE_ORIGIN = "https://thejesuswebsite.org";
const RESULTS_DIR = path.resolve(__dirname, "..", "perf-results");
const MEASURED_RUNS = 3;

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
 * Pick the middle run by performance score.
 * @param {number[]} scores - Performance score of each measured run.
 * @returns {number} Index into `scores` of the median run.
 */
function medianIndex(scores) {
  const order = scores.map((score, index) => ({ score, index })).sort((a, b) => a.score - b.score);
  return order[Math.floor(order.length / 2)].index;
}

/**
 * Run Lighthouse once and write its JSON report.
 * @param {{name: string, path: string}} page - Entry of PAGES.
 * @param {string} outputPath - Where Lighthouse writes the report.
 * @returns {boolean} True when the report file exists.
 */
function runLighthouse(page, outputPath) {
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
  return true;
}

/**
 * Warm the page, measure it MEASURED_RUNS times, and save the median report.
 * @param {{name: string, path: string}} page - Entry of PAGES.
 * @param {string} stamp - Timestamp shared by every report of this run.
 * @returns {boolean} True when the median report was saved.
 */
function runPage(page, stamp) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `lighthouse-${page.name}-`));
  try {
    if (!runLighthouse(page, path.join(workDir, "warm-up.json"))) return false;

    const reports = [];
    for (let run = 1; run <= MEASURED_RUNS; run++) {
      const reportPath = path.join(workDir, `run-${run}.json`);
      if (!runLighthouse(page, reportPath)) return false;
      reports.push(reportPath);
    }

    const scores = reports.map((reportPath) => JSON.parse(fs.readFileSync(reportPath, "utf8")).categories.performance.score);
    const median = medianIndex(scores);
    const outputPath = path.join(RESULTS_DIR, `lighthouse-${page.name}-${stamp}.json`);
    fs.copyFileSync(reports[median], outputPath);
    console.log(`Saved ${outputPath} (run ${median + 1} of scores ${scores.join(", ")})`);
    return true;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
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

module.exports = { PAGES, medianIndex };
