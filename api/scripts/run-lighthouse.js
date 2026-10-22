// Runs Lighthouse (mobile preset) against the deployed site and saves the JSON
// report in api/perf-results/. Opt-in: nothing in `npm test`, deploy.sh or
// pm2 calls it. Run it with `cd api && npm run perf:lighthouse`, then check the
// result with `npm run test:perf` (api/tests/perf/). The workflow
// .github/workflows/performance-check.yml runs both.
//
// Lighthouse is fetched by npx at run time and is not a dependency of this
// repo (SR-2). The version is pinned so that a new release cannot change the
// scores between two runs. The limits it is checked against are in
// setup/ARCHITECTURE/performance-and-caching.md.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const LIGHTHOUSE_VERSION = "13.5.0";
const SITE_URL = "https://thejesuswebsite.org/";
const RESULTS_DIR = path.resolve(__dirname, "..", "perf-results");

// --no-sandbox: the GitHub runner cannot start Chrome's sandbox. Only our own
// site is loaded, so the weaker isolation is acceptable.
const CHROME_FLAGS = "--headless=new --no-sandbox";

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(RESULTS_DIR, `lighthouse-${stamp}.json`);

  const run = spawnSync(
    "npx",
    [
      "--yes",
      `lighthouse@${LIGHTHOUSE_VERSION}`,
      SITE_URL,
      "--output=json",
      `--output-path=${outputPath}`,
      `--chrome-flags=${CHROME_FLAGS}`,
      "--quiet",
    ],
    { stdio: "inherit" }
  );

  if (run.status !== 0 || !fs.existsSync(outputPath)) {
    console.error(`Lighthouse did not produce ${outputPath} (exit ${run.status}).`);
    process.exit(1);
  }
  console.log(`Saved ${outputPath}`);
}

if (require.main === module) main();
