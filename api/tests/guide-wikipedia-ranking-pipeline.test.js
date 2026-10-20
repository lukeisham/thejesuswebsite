// Guide test for setup/ARCHITECTURE/wikipedia-ranking-pipeline.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/wikipedia-ranking-pipeline.md";
const ALGO = "Wikipedia algorithm";
const LIVE_HEAD_FILE = "paragraph-head.json";
const WRITER = `${ALGO}/scripts/train_paragraph_head.py`;
const EXPERIMENT_TRAINER = `${ALGO}/scripts/train_agreement_head.py`;
const EXPERIMENT_PREFIX = "paragraph-head-twoclass-";

// Files that may name PARAGRAPH_HEAD_PATH, and why. Every other Python file in
// the algorithm folder that names it fails the test.
const MAY_NAME_HEAD_PATH = {
  [`${ALGO}/classifier/config.py`]: "defines the path",
  [`${ALGO}/classifier/paragraph_head.py`]: "loads the head for scoring_rule=\"head\"",
  [`${ALGO}/scripts/build_audit_sample.py`]: "reads the head to sample paragraphs; never writes it",
  [WRITER]: "the one script that writes the live head",
};

// Files that may hold the quoted file name "paragraph-head.json". Prose in a
// docstring is not quoted, so it never matches.
const MAY_QUOTE_HEAD_FILE = {
  [`${ALGO}/classifier/config.py`]: "defines the path",
};

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Python files under the algorithm folder that the head code can live in.
// The virtual environments and the sidecar are not part of the training code.
function pythonFiles() {
  const found = [];
  const skip = new Set([".venv", ".venv-classifier", "__pycache__", "vector-sidecar", "node_modules"]);
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".py")) found.push(rel);
    }
  }
  walk(ALGO);
  return found;
}

describe(`${GUIDE}: exceptions name files that exist`, () => {
  test("every file in an exception list is still in the repo", () => {
    for (const file of [...Object.keys(MAY_NAME_HEAD_PATH), ...Object.keys(MAY_QUOTE_HEAD_FILE)]) {
      assert.ok(
        fs.existsSync(path.join(REPO, file)),
        `${file} is in an exception list of this test but does not exist. Remove or rename the entry. Rule: ${GUIDE}, Invariants (live head).`
      );
    }
  });
});

describe(`${GUIDE}: only ${WRITER} writes ${LIVE_HEAD_FILE}`, () => {
  test("no other Python file names PARAGRAPH_HEAD_PATH", () => {
    for (const file of pythonFiles()) {
      if (file in MAY_NAME_HEAD_PATH) continue;
      const text = read(file);
      const at = text.indexOf("PARAGRAPH_HEAD_PATH");
      assert.equal(
        at,
        -1,
        `${file}:${lineOf(text, at)} names PARAGRAPH_HEAD_PATH. Only ${WRITER} writes the head that scoring_rule="head" loads. Write experiment output to another file. Rule: ${GUIDE}, Invariants (live head).`
      );
    }
  });

  test(`no other Python file quotes the file name "${LIVE_HEAD_FILE}"`, () => {
    const quoted = new RegExp(`["']${LIVE_HEAD_FILE.replace(".", "\\.")}["']`);
    for (const file of pythonFiles()) {
      if (file in MAY_QUOTE_HEAD_FILE) continue;
      const text = read(file);
      const hit = text.match(quoted);
      assert.equal(
        hit,
        null,
        `${file}:${hit ? lineOf(text, hit.index) : 0} quotes "${LIVE_HEAD_FILE}". A second path to the live head lets a script overwrite it with no logged decision. Rule: ${GUIDE}, Invariants (live head).`
      );
    }
  });

  test(`${EXPERIMENT_TRAINER} writes only files that start with ${EXPERIMENT_PREFIX}`, () => {
    const text = read(EXPERIMENT_TRAINER);
    assert.ok(
      text.includes(EXPERIMENT_PREFIX),
      `${EXPERIMENT_TRAINER} no longer builds output names that start with "${EXPERIMENT_PREFIX}". Rule: ${GUIDE}, Invariants (live head).`
    );
  });
});
