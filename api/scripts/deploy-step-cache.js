#!/usr/bin/env node
// deploy-step-cache.js — tells deploy.sh whether the inputs of a heavy deploy
// step changed since that step last succeeded on this machine.
//
// deploy.sh calls `check` before a step and runs the step only when the inputs
// changed, then calls `record` after the step succeeds. A step that fails is
// never recorded, so it runs again on the next deploy.
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
//   node api/scripts/deploy-step-cache.js record <step> <file...>
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

/**
 * @param {string} stateDir
 * @param {string} step
 * @param {string[]} files
 * @returns {boolean} true only when every input reads and matches the marker.
 */
function isUnchanged(stateDir, step, files) {
  const current = hashInputs(files);
  if (current === null) return false;
  try {
    return fs.readFileSync(markerPath(stateDir, step), "utf8").trim() === current;
  } catch {
    return false;
  }
}

/**
 * Writes the marker for a step that just succeeded.
 *
 * @param {string} stateDir
 * @param {string} step
 * @param {string[]} files
 */
function recordStep(stateDir, step, files) {
  const current = hashInputs(files);
  if (current === null) {
    throw new Error(`cannot record step "${step}": an input file is unreadable`);
  }
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(markerPath(stateDir, step), `${current}\n`);
}

function main(argv) {
  const [command, step, ...files] = argv;
  if (!["check", "record"].includes(command) || !STEP_NAME.test(step || "") || files.length === 0) {
    console.error("Usage: deploy-step-cache.js check|record <step> <file...>");
    return 2;
  }

  if (command === "record") {
    recordStep(STATE_DIR, step, files);
    return 0;
  }

  if (process.env.FORCE_FULL_DEPLOY === "1") return EXIT_CHANGED;
  return isUnchanged(STATE_DIR, step, files) ? EXIT_UNCHANGED : EXIT_CHANGED;
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
