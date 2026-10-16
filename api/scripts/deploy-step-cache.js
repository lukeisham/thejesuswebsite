#!/usr/bin/env node
// deploy-step-cache.js — tells deploy.sh whether the inputs of a heavy deploy
// step changed since that step last succeeded on this machine.
//
// deploy.sh calls `check` before a step and runs the step only when the inputs
// changed, then calls `record` after the step succeeds. A step that fails is
// never recorded, so it runs again on the next deploy.
//
// Every `check` saves the hash it computed as <step>.pending, and `record` promotes
// that file to the marker. The marker therefore holds the inputs as they were
// before the step ran. This matters because `npm install` can rewrite
// package-lock.json: a hash taken after the step would never match the
// committed lockfile that the next `git reset --hard` puts back.
//
// The marker is a SHA-256 over the input files plus the Node version, because
// a Node upgrade must rebuild native modules (better-sqlite3, sharp) even when
// package-lock.json is unchanged. Markers live in .deploy-state/ at the repo
// root. Git ignores that folder, and `git reset --hard` in the deploy keeps
// untracked files, so markers survive from one deploy to the next.
//
// A missing input file or a missing or unreadable marker counts as "changed":
// a wrong skip leaves production stale, a wrong run only costs time.
//
// Usage (from deploy.sh):
//   node api/scripts/deploy-step-cache.js check  <step> <file...>   exit 0 = unchanged, 10 = changed
//   node api/scripts/deploy-step-cache.js record <step>
// FORCE_FULL_DEPLOY=1 makes `check` report "changed" for every step.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STATE_DIR = path.resolve(__dirname, "..", "..", ".deploy-state");
const EXIT_UNCHANGED = 0;
const EXIT_CHANGED = 10;
const STEP_NAME = /^[a-z0-9-]+$/;

/**
 * SHA-256 over the Node version and each file's path and bytes, in the given
 * order. Returns null when any file cannot be read.
 *
 * @param {string[]} files
 * @returns {string|null}
 */
function hashInputs(files) {
  const hash = crypto.createHash("sha256");
  hash.update(`node ${process.version}\n`);
  for (const file of files) {
    let bytes;
    try {
      bytes = fs.readFileSync(file);
    } catch (error) {
      console.warn(`[deploy-step-cache] cannot read input ${file}: ${error.code}`);
      return null;
    }
    hash.update(`${file}\n`);
    hash.update(bytes);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function markerPath(stateDir, step) {
  return path.join(stateDir, `${step}.sha256`);
}

function pendingPath(stateDir, step) {
  return path.join(stateDir, `${step}.pending`);
}

function readMarker(stateDir, step) {
  try {
    return fs.readFileSync(markerPath(stateDir, step), "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Also saves the hash as the pending marker that recordStep() promotes after
 * the step succeeds. It saves it even when the inputs are unchanged, because
 * deploy.sh can still run the step for another reason (a new database).
 *
 * @param {string} stateDir
 * @param {string} step
 * @param {string[]} files
 * @returns {boolean} true only when every input reads and matches the marker.
 */
function isUnchanged(stateDir, step, files) {
  const current = hashInputs(files);
  if (current === null) return false;
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(pendingPath(stateDir, step), `${current}\n`);
  return readMarker(stateDir, step) === current;
}

/**
 * Promotes the pending marker that isUnchanged() saved, after the step
 * succeeded. Throws when there is none, because then no `check` ran first.
 *
 * @param {string} stateDir
 * @param {string} step
 */
function recordStep(stateDir, step) {
  const pending = pendingPath(stateDir, step);
  if (!fs.existsSync(pending)) {
    throw new Error(`cannot record step "${step}": no pending hash (run check first)`);
  }
  fs.renameSync(pending, markerPath(stateDir, step));
}

function main(argv, stateDir = STATE_DIR) {
  const [command, step, ...files] = argv;
  const validStep = STEP_NAME.test(step || "");
  if (command === "record" && validStep) {
    recordStep(stateDir, step);
    return 0;
  }
  if (command !== "check" || !validStep || files.length === 0) {
    console.error("Usage: deploy-step-cache.js check <step> <file...> | record <step>");
    return 2;
  }

  const unchanged = isUnchanged(stateDir, step, files);
  if (process.env.FORCE_FULL_DEPLOY === "1") return EXIT_CHANGED;
  return unchanged ? EXIT_UNCHANGED : EXIT_CHANGED;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`[deploy-step-cache] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { hashInputs, isUnchanged, recordStep, main, EXIT_CHANGED, EXIT_UNCHANGED };
