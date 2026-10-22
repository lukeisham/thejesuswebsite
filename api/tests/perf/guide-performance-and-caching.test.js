// Guide test for the "Performance budget" table in
// setup/ARCHITECTURE/performance-and-caching.md.
//
// This file sits in tests/perf/, so `npm test` (tests/*.test.js) never runs it.
// Run it with `npm run test:perf` after `npm run perf:lighthouse`, or save
// WebPageTest JSON results as api/perf-results/webpagetest-<page>-<date>.json.
// For each page in PAGES (scripts/run-lighthouse.js) it checks the newest result
// of each tool against the limits in the guide. A page with no result skips and
// says how to make one.
//
// The manual workflow .github/workflows/performance-check.yml runs the same two
// commands, so a broken limit fails the run and GitHub sends an email.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  parseBudget,
  metricsFromLighthouse,
  lighthousePageProblems,
  metricsFromWebPageTest,
  findViolations,
} = require("../helpers/performance-budget");
const { PAGES } = require("../../scripts/run-lighthouse");

const GUIDE = "setup/ARCHITECTURE/performance-and-caching.md";
const RESULTS_DIR = path.resolve(__dirname, "..", "..", "perf-results");
const HOW_TO_RUN =
  "Run `cd api && npm run perf:lighthouse` first, or save a WebPageTest JSON result as api/perf-results/webpagetest-<page>-<date>.json.";

// Each tool is told apart by its file name prefix. WebPageTest has no
// performance score, so its results skip that budget row.
const TOOLS = [
  {
    name: "Lighthouse",
    prefix: "lighthouse",
    problems: lighthousePageProblems,
    read: metricsFromLighthouse,
    skipKeys: [],
  },
  {
    name: "WebPageTest",
    prefix: "webpagetest",
    problems: () => [],
    read: metricsFromWebPageTest,
    skipKeys: ["score"],
  },
];

/** The newest file named <prefix>-<page>-<year>...json in the results folder, or null. */
function newestResult(prefix, pageName) {
  if (!fs.existsSync(RESULTS_DIR)) return null;
  const pattern = new RegExp(`^${prefix}-${pageName}-\\d{4}-.*\\.json$`);
  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, time: fs.statSync(path.join(RESULTS_DIR, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  return files.length ? files[0].name : null;
}

describe(`${GUIDE} performance budget: saved results match the guide`, () => {
  const budget = parseBudget();

  for (const tool of TOOLS) {
    for (const page of PAGES) {
      const resultFile = newestResult(tool.prefix, page.name);

      test(`${tool.name} result for ${page.name} (${page.path}) is inside every limit`, (t) => {
        if (!resultFile) {
          t.skip(`No ${tool.name} result for ${page.name} in api/perf-results/. ${HOW_TO_RUN}`);
          return;
        }
        const result = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, resultFile), "utf8"));
        const problems = [...tool.problems(result), ...findViolations(budget, tool.read(result), tool.skipKeys)];
        assert.deepEqual(
          problems,
          [],
          `${tool.name} result api/perf-results/${resultFile} (${page.path}) breaks the budget in ${GUIDE}, section "Performance budget":\n  ${problems.join("\n  ")}`
        );
      });
    }
  }
});
