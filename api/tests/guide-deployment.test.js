// Guide test for setup/ARCHITECTURE/deployment.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/deployment.md";
const WORKFLOW = ".github/workflows/deploy.yml";
const DEPLOY_SH = "deploy.sh";
const WEBHOOK = "api/routes/deploy-webhook.js";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Both files explain their rules in comments, and those comments name the very
// patterns the tests look for. A comment line is blanked so that it never matches,
// and the line numbers stay the same.
function withoutHashComments(text) {
  return text
    .split("\n")
    .map((line) => (/^\s*#/.test(line) ? "" : line))
    .join("\n");
}

// Names of the workflow steps, in file order. The four below are the steps
// that the guide's order rule is about.
const STEP_WEBHOOK = "Deploy via webhook";
const STEP_HEALTH = "Check restart and health";
const STEP_PURGE = "Purge Cloudflare cache";
const STEP_WARM = "Warm Cloudflare cache";

function stepNames(workflowText) {
  return [...workflowText.matchAll(/^\s*-\s*name:\s*(.+?)\s*$/gm)].map((m) => m[1]);
}

// ── Row 3: the webhook leaves the restart to a detached pm2-apply ─────────────

describe(`${GUIDE} row 3: the webhook runs deploy.sh with SKIP_RESTART=1`, () => {
  test(`${WEBHOOK} sets SKIP_RESTART=1 for deploy.sh and starts scripts/pm2-apply.js`, () => {
    const text = read(WEBHOOK);
    assert.match(
      text,
      /SKIP_RESTART=1[^"'`]*\.\/deploy\.sh/,
      `${WEBHOOK} must run ./deploy.sh with SKIP_RESTART=1. A pm2 restart inside deploy.sh kills the process that serves the webhook. Rule: ${GUIDE}, Invariants row 3.`
    );
    assert.ok(
      text.includes("scripts/pm2-apply.js"),
      `${WEBHOOK} must start scripts/pm2-apply.js after it replies. Rule: ${GUIDE}, Invariants row 3.`
    );
  });

  test(`${DEPLOY_SH} skips its restart step when SKIP_RESTART is 1`, () => {
    const text = withoutHashComments(read(DEPLOY_SH));
    assert.match(
      text,
      /"\$\{SKIP_RESTART:-\}"\s*=\s*"1"/,
      `${DEPLOY_SH} no longer tests SKIP_RESTART. The webhook would restart pm2 inside deploy.sh. Rule: ${GUIDE}, Invariants row 3.`
    );
  });
});

// ── Row 4: the stamp comes before the nginx reload, the warm-up comes last ────

describe(`${GUIDE} row 4: deploy order`, () => {
  test(`${DEPLOY_SH} stamps the assets before it reloads nginx`, () => {
    const text = withoutHashComments(read(DEPLOY_SH));
    const stamp = text.indexOf("npm run version-assets");
    const reload = text.indexOf("nginx -s reload");
    assert.ok(stamp >= 0, `${DEPLOY_SH} has no "npm run version-assets" step. Rule: ${GUIDE}, Invariants row 4.`);
    assert.ok(reload >= 0, `${DEPLOY_SH} has no "nginx -s reload" step. Rule: ${GUIDE}, Invariants row 4.`);
    assert.ok(
      stamp < reload,
      `${DEPLOY_SH}:${lineOf(text, stamp)} stamps the assets after the nginx reload at line ${lineOf(text, reload)}. Rule: ${GUIDE}, Invariants row 4.`
    );
  });

  test(`${WORKFLOW} runs the webhook, the health check, the purge and the warm-up in that order, and the warm-up is last`, () => {
    const names = stepNames(read(WORKFLOW));
    const at = (name) => names.findIndex((n) => n.includes(name));
    assert.ok(
      at(STEP_WEBHOOK) >= 0 && at(STEP_HEALTH) >= 0 && at(STEP_PURGE) >= 0 && at(STEP_WARM) >= 0,
      `${WORKFLOW} must have the steps "${STEP_WEBHOOK}", "${STEP_HEALTH}", "${STEP_PURGE}" and "${STEP_WARM}". Found: ${names.join(" | ")}. If you renamed a step, update this test and ${GUIDE}.`
    );
    assert.ok(
      at(STEP_WEBHOOK) < at(STEP_HEALTH) && at(STEP_HEALTH) < at(STEP_PURGE) && at(STEP_PURGE) < at(STEP_WARM),
      `${WORKFLOW} must run "${STEP_WEBHOOK}", "${STEP_HEALTH}", "${STEP_PURGE}", then "${STEP_WARM}". Found: ${names.join(" | ")}. Rule: ${GUIDE}, Invariants row 4.`
    );
    assert.equal(
      at(STEP_WARM),
      names.length - 1,
      `${WORKFLOW}: "${STEP_WARM}" must be the last step. It only reads. Any step after the purge that can change the origin would run after the purge. Rule: ${GUIDE}, Invariants row 4.`
    );
  });
});

// ── Row 5: a failed purge turns the job red ───────────────────────────────────

describe(`${GUIDE} row 5: no continue-on-error in the workflow`, () => {
  test(`${WORKFLOW} has no continue-on-error`, () => {
    const text = withoutHashComments(read(WORKFLOW));
    const hit = text.match(/continue-on-error/);
    assert.equal(
      hit,
      null,
      `${WORKFLOW}:${hit ? lineOf(text, hit.index) : 0} sets continue-on-error. A failed purge, restart or health check must turn the job red. Rule: ${GUIDE}, Invariants row 5.`
    );
  });
});

// ── Row 12: the purge lists HTML only, and covers every section ───────────────

// Top-level entries of frontend/ that the purge lists need not name. A new
// folder or page file that is in neither list fails the test below.
const PURGE_FOLDER_EXCEPTIONS = {
  assets: "JS and CSS URLs change every deploy and a replaced image gets a new filename, so nothing there goes stale.",
  tests: "Not served by nginx.",
};
const PURGE_FILE_EXCEPTIONS = {
  "404.html": "An error page. The Cloudflare Cache Rule keeps only status 200 for a day.",
};
const ORIGIN_HOST = "thejesuswebsite.org";

/** The text of the purge step: from its name line to the next step. */
function purgeStepText() {
  const text = withoutHashComments(read(WORKFLOW));
  const start = text.indexOf(`name: ${STEP_PURGE}`);
  const end = text.indexOf("- name:", start + 1);
  return { text: text.slice(start, end === -1 ? undefined : end), start: lineOf(text, start) };
}

describe(`${GUIDE} row 12: the purge lists HTML only`, () => {
  test(`the "${STEP_PURGE}" step never purges everything and never lists /assets/`, () => {
    const { text, start } = purgeStepText();
    assert.ok(text.length > 0, `${WORKFLOW} has no "${STEP_PURGE}" step.`);
    assert.doesNotMatch(
      text,
      /purge_everything/,
      `${WORKFLOW}:${start} purges everything. That empties the JS, CSS and image copies that never go stale. Rule: ${GUIDE}, Invariants row 12.`
    );
    assert.doesNotMatch(
      text,
      /\/assets\//,
      `${WORKFLOW}:${start} lists /assets/. Those files never go stale, so a purge only makes the next visitor wait. Rule: ${GUIDE}, Invariants row 12.`
    );
    assert.match(text, /"files"/, `${WORKFLOW}:${start} has no purge by "files". Rule: ${GUIDE}, Invariants row 12.`);
    assert.match(text, /"prefixes"/, `${WORKFLOW}:${start} has no purge by "prefixes". Rule: ${GUIDE}, Invariants row 12.`);
  });

  test("every top-level folder and page file of frontend/ is purged or named as an exception", () => {
    const { text, start } = purgeStepText();
    const entries = fs.readdirSync(path.join(REPO, "frontend"), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name in PURGE_FOLDER_EXCEPTIONS) continue;
        assert.ok(
          text.includes(`"${ORIGIN_HOST}/${entry.name}/"`),
          `${WORKFLOW}:${start} does not purge the prefix ${ORIGIN_HOST}/${entry.name}/. Its pages keep their old HTML at the edge for a day after a deploy. Add the prefix, or name the folder in PURGE_FOLDER_EXCEPTIONS with a reason. Rule: ${GUIDE}, Invariants row 12.`
        );
      } else if (/\.(html|txt|xml)$/.test(entry.name)) {
        if (entry.name in PURGE_FILE_EXCEPTIONS) continue;
        const url = entry.name === "index.html" ? `https://${ORIGIN_HOST}/` : `https://${ORIGIN_HOST}/${entry.name}`;
        assert.ok(
          text.includes(`"${url}"`),
          `${WORKFLOW}:${start} does not purge ${url}. It keeps its old HTML at the edge for a day after a deploy. Add the URL, or name the file in PURGE_FILE_EXCEPTIONS with a reason. Rule: ${GUIDE}, Invariants row 12.`
        );
      }
    }
  });

  test("every purge exception names an entry that still exists", () => {
    for (const name of Object.keys(PURGE_FOLDER_EXCEPTIONS)) {
      assert.ok(fs.existsSync(path.join(REPO, "frontend", name)), `PURGE_FOLDER_EXCEPTIONS names frontend/${name}, which is missing. Remove the exception.`);
    }
    for (const name of Object.keys(PURGE_FILE_EXCEPTIONS)) {
      assert.ok(fs.existsSync(path.join(REPO, "frontend", name)), `PURGE_FILE_EXCEPTIONS names frontend/${name}, which is missing. Remove the exception.`);
    }
  });
});

// ── Row 8: one deploy at a time ───────────────────────────────────────────────

describe(`${GUIDE} row 8: one deploy at a time`, () => {
  test(`${WORKFLOW} has a deploy concurrency group that never cancels a running deploy`, () => {
    const text = withoutHashComments(read(WORKFLOW));
    assert.match(
      text,
      /concurrency:\s*\n\s*group:\s*deploy\s*\n\s*cancel-in-progress:\s*false/,
      `${WORKFLOW} must declare "concurrency" with group "deploy" and cancel-in-progress false. Rule: ${GUIDE}, Invariants row 8.`
    );
  });

  test(`${WEBHOOK} answers 409 while a deploy runs`, () => {
    const text = read(WEBHOOK);
    assert.match(
      text,
      /status\(409\)/,
      `${WEBHOOK} no longer sends a 409. Two deploys could run together. Rule: ${GUIDE}, Invariants row 8.`
    );
  });
});

// ── Row 10: a claude/** branch is promoted to main and then deployed ──────────

const PROMOTE_WORKFLOW = ".github/workflows/promote-claude-branch.yml";

describe(`${GUIDE} row 10: claude branch promotion`, () => {
  test(`${PROMOTE_WORKFLOW} runs on claude/** pushes and starts deploy.yml by dispatch`, () => {
    const text = withoutHashComments(read(PROMOTE_WORKFLOW));
    assert.match(
      text,
      /branches:\s*\[\s*'claude\/\*\*'\s*\]/,
      `${PROMOTE_WORKFLOW} must trigger on pushes to claude/**. Rule: ${GUIDE}, Invariants row 10.`
    );
    assert.match(
      text,
      /gh workflow run deploy\.yml --ref main/,
      `${PROMOTE_WORKFLOW} must start deploy.yml with "gh workflow run". A push made with the workflow token never triggers deploy.yml. Rule: ${GUIDE}, Invariants row 10.`
    );
  });

  test(`${PROMOTE_WORKFLOW} runs the api tests and the admin/frontend tests before Push main`, () => {
    const text = withoutHashComments(read(PROMOTE_WORKFLOW));
    const api = text.indexOf("name: Run api tests");
    const frontend = text.indexOf("name: Run admin and frontend tests");
    const push = text.indexOf("name: Push main");
    assert.ok(
      api !== -1 && frontend !== -1 && push !== -1,
      `${PROMOTE_WORKFLOW} must have the steps "Run api tests", "Run admin and frontend tests" and "Push main". Rule: ${GUIDE}, Invariants row 10.`
    );
    assert.ok(
      api < push && frontend < push,
      `${PROMOTE_WORKFLOW} line ${lineOf(text, push)}: "Push main" must come after both test steps, or a red test reaches main. Rule: ${GUIDE}, Invariants row 10.`
    );
    const stepText = text.slice(frontend, push);
    assert.match(
      stepText,
      /if: steps\.merge\.outputs\.changed == 'true'/,
      `${PROMOTE_WORKFLOW} line ${lineOf(text, frontend)}: the admin/frontend step must keep its changed == 'true' condition. Rule: ${GUIDE}, Invariants row 10.`
    );
    assert.match(
      stepText,
      /set -euo pipefail/,
      `${PROMOTE_WORKFLOW} line ${lineOf(text, frontend)}: the admin/frontend step must keep "set -euo pipefail", or a failing node --test behind the pipe is ignored. Rule: ${GUIDE}, Invariants row 10.`
    );
    assert.match(
      stepText,
      /find admin frontend -name '\*\.test\.js'.*\n?.*xargs -0 node --test/,
      `${PROMOTE_WORKFLOW} line ${lineOf(text, frontend)}: the admin/frontend step must run every *.test.js with node --test. Rule: ${GUIDE}, Invariants row 10.`
    );
  });

  test(`scripts/send-to-main.sh pushes to a claude/ branch that the promote workflow listens to`, () => {
    const text = withoutHashComments(read("scripts/send-to-main.sh"));
    assert.match(
      text,
      /claude\/send-/,
      `scripts/send-to-main.sh must push to a claude/ branch. ${PROMOTE_WORKFLOW} only runs for claude/**. Rule: ${GUIDE}, Invariants row 10.`
    );
  });

  test(`${WORKFLOW} keeps its workflow_dispatch trigger`, () => {
    const text = withoutHashComments(read(WORKFLOW));
    assert.match(
      text,
      /workflow_dispatch:/,
      `${WORKFLOW} lost workflow_dispatch. ${PROMOTE_WORKFLOW} can no longer start a deploy. Rule: ${GUIDE}, Invariants row 10.`
    );
  });
});

// ── Row 11: the sync-to-home skill leads the manual pull ──────────────────────

const SYNC_SKILL = "setup/SKILLS/!SyncToHome/SKILL.md";
const SYNC_SKILL_LINK = ".claude/skills/sync-to-home";

describe(`${GUIDE} row 11: sync-to-home skill`, () => {
  test(`${SYNC_SKILL} names both scripts and the project folder`, () => {
    const text = read(SYNC_SKILL);
    for (const needle of [
      "scripts/send-to-main.sh",
      "scripts/pull-from-github.sh",
      "cd /Users/lukeishammacbookair/Developer/thejesuswebsite",
      "git check-ignore -v",
      "set -o noclobber",
      "setup/ISSUES/issues.md",
      "files ~~ issue ~~ rule ~~ plan",
    ]) {
      assert.ok(
        text.includes(needle),
        `${SYNC_SKILL} must contain "${needle}". Luke copies these steps into Terminal. Rule: ${GUIDE}, Invariants row 11.`
      );
    }
  });

  test(`${SYNC_SKILL_LINK} points at the skill folder`, () => {
    assert.ok(
      fs.existsSync(path.join(REPO, SYNC_SKILL_LINK, "SKILL.md")),
      `${SYNC_SKILL_LINK} does not lead to a SKILL.md. The cloud session cannot find the skill. Rule: ${GUIDE}, Invariants row 11.`
    );
  });

  test("the scripts that the skill names exist", () => {
    for (const script of ["scripts/send-to-main.sh", "scripts/pull-from-github.sh"]) {
      assert.ok(fs.existsSync(path.join(REPO, script)), `${script} is missing. ${SYNC_SKILL} tells Luke to run it. Rule: ${GUIDE}, Invariants row 11.`);
    }
  });
});
