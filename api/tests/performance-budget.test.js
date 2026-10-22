// Smoke test for api/tests/helpers/performance-budget.js. It runs in `npm test`
// and needs no Lighthouse result: it proves that the guide's budget table
// parses and that the comparison can pass and fail, so the opt-in check in
// api/tests/perf/ is not reading a broken table.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBudget,
  metricsFromLighthouse,
  metricsFromWebPageTest,
  findViolations,
} = require("./helpers/performance-budget");

const GUIDE_PATH = "setup/ARCHITECTURE/performance-and-caching.md";

function lighthouseReport({ score, lcp, cls, tbt }) {
  return {
    categories: { performance: { score } },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "cumulative-layout-shift": { numericValue: cls },
      "total-blocking-time": { numericValue: tbt },
    },
  };
}

describe("performance budget helper", () => {
  const budget = parseBudget();

  test(`${GUIDE_PATH} budget table has the four metrics`, () => {
    assert.deepEqual(Object.keys(budget).sort(), ["cls", "lcp", "score", "tbt"]);
    assert.equal(budget.score.bound, "min");
    assert.equal(budget.lcp.bound, "max");
  });

  test("a result inside every limit has no violations", () => {
    const report = lighthouseReport({ score: 0.95, lcp: 1800, cls: 0.02, tbt: 90 });
    assert.deepEqual(findViolations(budget, metricsFromLighthouse(report)), []);
  });

  test("a result outside a limit names the metric", () => {
    const report = lighthouseReport({ score: 0.7, lcp: 4000, cls: 0.02, tbt: 90 });
    const violations = findViolations(budget, metricsFromLighthouse(report));
    assert.equal(violations.length, 2);
    assert.ok(violations.some((line) => line.startsWith("score:")));
    assert.ok(violations.some((line) => line.startsWith("lcp:")));
  });

  test("a WebPageTest result skips the score and reads the first view", () => {
    const result = { data: { median: { firstView: { LargestContentfulPaint: 3000, CumulativeLayoutShift: 0.01, TotalBlockingTime: 50 } } } };
    const violations = findViolations(budget, metricsFromWebPageTest(result), ["score"]);
    assert.deepEqual(violations.map((line) => line.split(":")[0]), ["lcp"]);
  });

  test("a result with a missing metric is a violation, not a pass", () => {
    const violations = findViolations(budget, metricsFromLighthouse({ audits: {} }));
    assert.equal(violations.length, 4);
  });
});
