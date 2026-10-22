// Guide test for setup/ARCHITECTURE/dependencies.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file, and the guide.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/dependencies.md";
const DEPLOY_SH = "deploy.sh";

// The walk skips folders that hold no npm package of this site: installed
// packages, git data, and the Python tooling that deploy.sh never installs.
const SKIPPED_DIRS = new Set(["node_modules", ".git", "Wikipedia algorithm"]);

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

// Folders (relative to the repo root) that hold a package.json.
function findPackageFolders(dir = REPO) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) {
      found.push(...findPackageFolders(full));
    } else if (entry.isFile() && entry.name === "package.json") {
      found.push(path.relative(REPO, dir));
    }
  }
  return found.sort();
}

// Names of the ranges that differ between package.json and the root entry of
// its lock. Both objects are parsed JSON, so the failure path needs no file.
function findLockDrift(packageJson, lockJson) {
  const wanted = packageJson.dependencies ?? {};
  const locked = lockJson.packages?.[""]?.dependencies ?? {};
  const names = new Set([...Object.keys(wanted), ...Object.keys(locked)]);
  return [...names].filter((name) => wanted[name] !== locked[name]);
}

const packageFolders = findPackageFolders();

// ── Row 1: the lock root entry matches package.json ───────────────────────────

describe(`${GUIDE} row 1: package-lock.json matches package.json`, () => {
  test("finds the npm folders to scan", () => {
    assert.ok(packageFolders.length > 0, "No package.json found. The folder walk is broken.");
  });

  test("findLockDrift names a range that differs", () => {
    const drift = findLockDrift(
      { dependencies: { express: "^4.20.0" } },
      { packages: { "": { dependencies: { express: "^4.19.2" } } } }
    );
    assert.deepEqual(drift, ["express"]);
  });

  for (const folder of packageFolders) {
    test(`${folder}/package-lock.json lists the same ranges as ${folder}/package.json`, () => {
      const lockPath = `${folder}/package-lock.json`;
      assert.ok(
        fs.existsSync(path.join(REPO, lockPath)),
        `${lockPath} is missing. Commit the lock next to package.json. Rule: ${GUIDE}, Invariants row 1.`
      );
      const drift = findLockDrift(JSON.parse(read(`${folder}/package.json`)), JSON.parse(read(lockPath)));
      assert.deepEqual(
        drift,
        [],
        `${folder}/package.json and ${lockPath} disagree on: ${drift.join(", ")}. ` +
          `Run npm install in ${folder} and commit the lock. Rule: ${GUIDE}, Invariants row 1.`
      );
    });
  }
});

// ── Row 2: deploy.sh installs every npm folder ────────────────────────────────

describe(`${GUIDE} row 2: deploy.sh installs every package.json folder`, () => {
  const deploy = read(DEPLOY_SH);

  // deploy.sh names each folder once, as NAME_DIR="$PROJECT_DIR/<folder>".
  const variableOf = (folder) => {
    const match = deploy.match(new RegExp(`^(\\w+_DIR)="\\$PROJECT_DIR/${folder}"`, "m"));
    return match?.[1];
  };

  for (const folder of packageFolders) {
    test(`${DEPLOY_SH} has an install_dependencies call for ${folder}`, () => {
      const variable = variableOf(folder);
      assert.ok(
        variable,
        `${DEPLOY_SH} defines no *_DIR variable for ${folder}. Add one, then an install_dependencies call. Rule: ${GUIDE}, Invariants row 2.`
      );
      const call = new RegExp(`^install_dependencies\\s+\\S+\\s+"\\$${variable}"`, "m");
      assert.match(
        deploy,
        call,
        `${DEPLOY_SH} never calls install_dependencies for ${folder} ("$${variable}"). ` +
          `The server then lacks its packages. Rule: ${GUIDE}, Invariants row 2.`
      );
    });
  }
});
