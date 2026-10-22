// Shared by api/tests/performance-budget.test.js (always runs) and
// api/tests/perf/guide-performance-and-caching.test.js (opt-in, runs only when
// result files exist). The limits live in the guide's "Performance budget"
// table and nowhere else, so the guide and the check cannot drift apart.

const fs = require("fs");
const path = require("path");

const GUIDE_PATH = path.resolve(__dirname, "..", "..", "..", "setup", "ARCHITECTURE", "performance-and-caching.md");

// One budget row looks like: | `lcp` | Largest Contentful Paint (ms) | at most 2500 |
const BUDGET_ROW = /^\|\s*`(\w+)`\s*\|[^|]*\|\s*at (least|most) ([\d.]+)\s*\|/;

/**
 * Read the budget table from the performance guide.
 * @param {string} [guideText] - Guide text. Defaults to the guide on disk.
 * @returns {Object<string, {bound: "min"|"max", limit: number}>} Limit per metric key.
 */
function parseBudget(guideText = fs.readFileSync(GUIDE_PATH, "utf8")) {
  const budget = {};
  for (const line of guideText.split("\n")) {
    const match = BUDGET_ROW.exec(line);
    if (match) budget[match[1]] = { bound: match[2] === "least" ? "min" : "max", limit: Number(match[3]) };
  }
  return budget;
}

// One page row looks like: | `home` | `/` | Home page |
const PAGE_ROW = /^\|\s*`([a-z]+)`\s*\|\s*`([^`]+)`\s*\|/;

/**
 * Read the "Pages covered" table from the performance guide.
 * @param {string} [guideText] - Guide text. Defaults to the guide on disk.
 * @returns {{name: string, path: string}[]} The pages, in table order.
 */
function parsePages(guideText = fs.readFileSync(GUIDE_PATH, "utf8")) {
  return guideText
    .split("\n")
    .map((line) => PAGE_ROW.exec(line))
    .filter(Boolean)
    .map((match) => ({ name: match[1], path: match[2] }));
}

/**
 * Pull the budget metrics out of a Lighthouse JSON report.
 * @param {object} report - Parsed `lighthouse --output=json` file.
 * @returns {Object<string, number|undefined>} Metrics by budget key.
 */
function metricsFromLighthouse(report) {
  const score = report.categories?.performance?.score;
  return {
    score: score === undefined || score === null ? undefined : Math.round(score * 100),
    lcp: report.audits?.["largest-contentful-paint"]?.numericValue,
    cls: report.audits?.["cumulative-layout-shift"]?.numericValue,
    tbt: report.audits?.["total-blocking-time"]?.numericValue,
  };
}

/**
 * Find a Lighthouse report that did not measure a real page. A slug that was
 * removed gives an error page that Lighthouse scores like any other, so the
 * budget alone would pass it.
 * @param {object} report - Parsed `lighthouse --output=json` file.
 * @returns {string[]} One sentence per problem. Empty when the page loaded.
 */
function lighthousePageProblems(report) {
  const problems = [];
  if (report.runtimeError) problems.push(`Lighthouse reported an error: ${report.runtimeError.code}`);
  if (report.audits?.["http-status-code"]?.score === 0) {
    problems.push(`the page returned an error status (${report.audits["http-status-code"].displayValue})`);
  }
  return problems;
}

/**
 * Pull the budget metrics out of a WebPageTest JSON result. WebPageTest gives
 * no performance score, so `score` is absent and the check skips it.
 * @param {object} result - Parsed WebPageTest result JSON.
 * @returns {Object<string, number|undefined>} Metrics by budget key.
 */
function metricsFromWebPageTest(result) {
  const view = result.data?.median?.firstView ?? {};
  return {
    lcp: view.LargestContentfulPaint,
    cls: view.CumulativeLayoutShift,
    tbt: view.TotalBlockingTime,
  };
}

/**
 * Compare measured metrics with the budget.
 * @param {Object<string, {bound: "min"|"max", limit: number}>} budget - From parseBudget().
 * @param {Object<string, number|undefined>} metrics - From one of the metricsFrom* functions.
 * @param {string[]} [skipKeys] - Budget keys that this tool cannot measure.
 * @returns {string[]} One sentence per broken limit. Empty when all limits hold.
 */
function findViolations(budget, metrics, skipKeys = []) {
  const violations = [];
  for (const [key, { bound, limit }] of Object.entries(budget)) {
    if (skipKeys.includes(key)) continue;
    const value = metrics[key];
    if (typeof value !== "number") {
      violations.push(`${key}: the result has no value for it`);
    } else if (bound === "max" && value > limit) {
      violations.push(`${key}: ${value} is more than the limit of ${limit}`);
    } else if (bound === "min" && value < limit) {
      violations.push(`${key}: ${value} is less than the limit of ${limit}`);
    }
  }
  return violations;
}

module.exports = {
  GUIDE_PATH,
  parseBudget,
  parsePages,
  metricsFromLighthouse,
  lighthousePageProblems,
  metricsFromWebPageTest,
  findViolations,
};
