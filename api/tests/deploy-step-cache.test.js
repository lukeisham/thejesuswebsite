// Smoke tests for scripts/deploy-step-cache.js — the check/record pair that
// deploy.sh uses to skip heavy steps whose inputs did not change. Every test
// works in its own temp folder, never in the real .deploy-state/.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  isUnchanged,
  recordStep,
  main,
  EXIT_CHANGED,
} = require("../scripts/deploy-step-cache");

describe("deploy-step-cache", () => {
  let dir;
  let stateDir;
  let input;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-step-cache-"));
    stateDir = path.join(dir, "state");
    input = path.join(dir, "package-lock.json");
    fs.writeFileSync(input, '{"lockfileVersion":3}');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.FORCE_FULL_DEPLOY;
  });

  test("a step with no marker yet counts as changed", () => {
    assert.equal(isUnchanged(stateDir, "api-npm", [input]), false);
  });

  test("record then check reports unchanged", () => {
    recordStep(stateDir, "api-npm", [input]);
    assert.equal(isUnchanged(stateDir, "api-npm", [input]), true);
  });

  test("one changed byte in an input counts as changed", () => {
    recordStep(stateDir, "api-npm", [input]);
    fs.writeFileSync(input, '{"lockfileVersion":4}');
    assert.equal(isUnchanged(stateDir, "api-npm", [input]), false);
  });

  test("a missing input file counts as changed, and cannot be recorded", () => {
    recordStep(stateDir, "api-npm", [input]);
    fs.rmSync(input);
    assert.equal(isUnchanged(stateDir, "api-npm", [input]), false);
    assert.throws(() => recordStep(stateDir, "api-npm", [input]), /unreadable/);
  });

  test("FORCE_FULL_DEPLOY=1 makes check report changed", () => {
    process.env.FORCE_FULL_DEPLOY = "1";
    assert.equal(main(["check", "api-npm", input]), EXIT_CHANGED);
  });

  test("a bad step name is a usage error", () => {
    assert.equal(main(["check", "../escape", input]), 2);
  });
});
