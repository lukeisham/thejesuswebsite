// Generator smoke test — runs the SVG generator against a single map config and
// asserts the output is a well-formed SVG with the expected structural elements.
// Uses node:test + node:assert, consistent with the existing test suite.

process.env.DB_PATH = ":memory:"; // not used, but suppress db config side effects

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const GENERATOR_PATH = path.resolve(
  __dirname,
  "..",
  "scripts",
  "generate-maps",
  "index.js",
);

const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "assets",
  "images",
  "maps",
);

describe("generate-maps smoke test", () => {
  test("generator produces a well-formed SVG for galilee", () => {
    const outPath = path.join(OUTPUT_DIR, "galilee.svg");

    // Remove existing output so we can verify it was created fresh
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    // Run the generator for a single map
    const result = execSync(`node "${GENERATOR_PATH}" galilee`, {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      timeout: 15000,
    });

    assert.ok(
      result.includes("galilee"),
      "Generator output should mention the map key",
    );
    assert.ok(
      fs.existsSync(outPath),
      "Generator should produce galilee.svg",
    );

    const svg = fs.readFileSync(outPath, "utf8");

    // Must be an SVG
    assert.ok(
      svg.includes("<svg"),
      "Output should contain <svg> tag",
    );
    assert.ok(
      svg.includes("</svg>"),
      "Output should close with </svg>",
    );
    assert.ok(
      svg.includes('xmlns="http://www.w3.org/2000/svg"'),
      "Output should have the SVG namespace",
    );

    // Must have a viewBox
    assert.ok(
      svg.includes("viewBox="),
      "Output should have a viewBox attribute",
    );

    // Must have water layers (lakes: Sea of Galilee)
    assert.ok(
      svg.includes("#C9D4D8") || svg.includes("#9FB0B6"),
      "Output should include water colours for lakes",
    );

    // Must have land fill
    assert.ok(
      svg.includes("#F1EDE4"),
      "Output should include parchment land colour",
    );

    // Must have frame
    assert.ok(
      svg.includes("#5C4E3D"),
      "Output should include the frame stroke colour",
    );

    // Must have a cartouche
    assert.ok(
      svg.includes("Galilee"),
      "Output should include the cartouche title",
    );

    // Must have a compass rose
    assert.ok(
      svg.includes("N</text>"),
      "Output should include compass N",
    );

    // Size check — well under 200 KB
    const sizeKB = Buffer.byteLength(svg, "utf8") / 1024;
    assert.ok(sizeKB < 200, `SVG should be under 200 KB (got ${sizeKB.toFixed(1)} KB)`);
  });

  test("generator rejects an unknown map key", () => {
    let threw = false;
    try {
      execSync(`node "${GENERATOR_PATH}" atlantis`, {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf8",
        timeout: 10000,
        stdio: "pipe",
      });
    } catch (e) {
      threw = true;
      assert.ok(
        e.stderr.includes("Unknown map key") || e.stdout.includes("Unknown map key") || e.status !== 0,
        "Generator should error on unknown map key",
      );
    }
    assert.ok(threw, "Generator should throw/exit for unknown map key");
  });

  test("all five canonical maps can be generated", () => {
    // Remove all outputs first
    const keys = ["roman-empire", "levant", "judea", "galilee", "jerusalem"];
    for (const key of keys) {
      const outPath = path.join(OUTPUT_DIR, `${key}.svg`);
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }

    // Run without arguments to generate all
    const result = execSync(`node "${GENERATOR_PATH}"`, {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      timeout: 30000,
    });

    for (const key of keys) {
      const outPath = path.join(OUTPUT_DIR, `${key}.svg`);
      assert.ok(
        fs.existsSync(outPath),
        `Generator should produce ${key}.svg`,
      );
      const svg = fs.readFileSync(outPath, "utf8");
      assert.ok(
        svg.startsWith("<svg"),
        `${key}.svg should start with <svg>`,
      );
      assert.ok(
        svg.endsWith("</svg>\n") || svg.endsWith("</svg>"),
        `${key}.svg should end with </svg>`,
      );
      const sizeKB = Buffer.byteLength(svg, "utf8") / 1024;
      assert.ok(
        sizeKB < 200,
        `${key}.svg (${sizeKB.toFixed(1)} KB) should be under 200 KB`,
      );
    }

    assert.ok(
      result.includes("Done"),
      "Generator should print 'Done' after generating all maps",
    );
  });
});
