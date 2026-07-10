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

const {
  projectPoint,
  clipSegmentToBBox,
  clipLineToBBox,
  clipPolygonToBBox,
  clipGeometryToBBox,
} = require("../scripts/generate-maps/project");
const { MAP_CONFIGS } = require("../scripts/generate-maps/map-configs");

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

describe("projectPoint bounds", () => {
  const bbox = { lon_min: 34.9, lat_min: 32.2, lon_max: 36.0, lat_max: 33.5 };
  const viewBox = { x: 0, y: 0, width: 900, height: 1000 };

  test("corners of the bbox map to corners of the viewBox", () => {
    const topLeft = projectPoint(bbox.lon_min, bbox.lat_max, bbox, viewBox);
    assert.deepEqual(topLeft, { x: 0, y: 0 });

    const bottomRight = projectPoint(bbox.lon_max, bbox.lat_min, bbox, viewBox);
    assert.deepEqual(bottomRight, { x: 900, y: 1000 });
  });

  test("center of the bbox maps to center of the viewBox", () => {
    const lonMid = (bbox.lon_min + bbox.lon_max) / 2;
    const latMid = (bbox.lat_min + bbox.lat_max) / 2;
    const center = projectPoint(lonMid, latMid, bbox, viewBox);
    assert.equal(center.x, 450);
    assert.equal(center.y, 500);
  });

  test("throws on a zero-range bbox", () => {
    assert.throws(() => {
      projectPoint(35, 32, { lon_min: 35, lat_min: 32, lon_max: 35, lat_max: 33 }, viewBox);
    });
  });
});

describe("bbox clipping", () => {
  const bbox = { lon_min: 0, lat_min: 0, lon_max: 10, lat_max: 10 };

  test("clipSegmentToBBox keeps a segment fully inside the box", () => {
    const clipped = clipSegmentToBBox([2, 2], [8, 8], bbox);
    assert.deepEqual(clipped, [[2, 2], [8, 8]]);
  });

  test("clipSegmentToBBox drops a segment fully outside the box", () => {
    const clipped = clipSegmentToBBox([20, 20], [30, 30], bbox);
    assert.equal(clipped, null);
  });

  test("clipSegmentToBBox truncates a segment crossing the boundary", () => {
    const clipped = clipSegmentToBBox([5, 5], [15, 5], bbox);
    assert.deepEqual(clipped, [[5, 5], [10, 5]]);
  });

  test("clipLineToBBox splits a line that exits and re-enters the box", () => {
    // Passes through the box, leaves, then comes back in.
    const line = [[-5, 5], [5, 5], [15, 5], [15, 15], [5, 5], [5, -5]];
    const segments = clipLineToBBox(line, bbox);
    assert.ok(segments.length >= 2, "should produce multiple disjoint segments");
    for (const seg of segments) {
      for (const [x, y] of seg) {
        assert.ok(x >= bbox.lon_min && x <= bbox.lon_max);
        assert.ok(y >= bbox.lat_min && y <= bbox.lat_max);
      }
    }
  });

  test("clipPolygonToBBox clips a triangle overhanging one edge", () => {
    // Triangle with one vertex outside the box (x=15) — clip should close
    // the shape against the right edge (x=10) rather than dropping it.
    const ring = [[2, 2], [15, 2], [2, 8]];
    const clipped = clipPolygonToBBox(ring, bbox);
    assert.ok(clipped.length >= 3, "clipped ring should still be a polygon");
    for (const [x, y] of clipped) {
      assert.ok(x >= bbox.lon_min - 1e-9 && x <= bbox.lon_max + 1e-9);
      assert.ok(y >= bbox.lat_min - 1e-9 && y <= bbox.lat_max + 1e-9);
    }
  });

  test("clipPolygonToBBox drops a ring entirely outside the box", () => {
    const ring = [[20, 20], [30, 20], [20, 30]];
    const clipped = clipPolygonToBBox(ring, bbox);
    assert.equal(clipped.length, 0);
  });

  test("clipGeometryToBBox returns null for geometry entirely outside the box", () => {
    const clipped = clipGeometryToBBox(
      { type: "LineString", coordinates: [[20, 20], [30, 30]] },
      bbox,
    );
    assert.equal(clipped, null);
  });

  test("clipGeometryToBBox splits a MultiLineString-producing LineString into pieces", () => {
    const clipped = clipGeometryToBBox(
      { type: "LineString", coordinates: [[-5, 5], [5, 5], [15, 5], [15, 15], [5, 5], [5, -5]] },
      bbox,
    );
    assert.ok(clipped);
    assert.equal(clipped.type, "MultiLineString");
  });
});

describe("generated SVG coordinate bounds", () => {
  test("no polygon/polyline coordinate falls outside viewBox + clip margin", () => {
    execSync(`node "${GENERATOR_PATH}"`, {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      timeout: 30000,
    });

    // Matches CLIP_MARGIN_FRACTION in index.js, plus slack for label/hill
    // decorations that are placed by hand rather than projected.
    const MARGIN_FRACTION = 0.1;

    for (const [mapKey, cfg] of Object.entries(MAP_CONFIGS)) {
      const svgPath = path.join(OUTPUT_DIR, `${mapKey}.svg`);
      const svg = fs.readFileSync(svgPath, "utf8");
      const vb = cfg.viewBox;
      const xMin = vb.x - vb.width * MARGIN_FRACTION;
      const xMax = vb.x + vb.width * (1 + MARGIN_FRACTION);
      const yMin = vb.y - vb.height * MARGIN_FRACTION;
      const yMax = vb.y + vb.height * (1 + MARGIN_FRACTION);

      const pointsAttrs = [...svg.matchAll(/points="([^"]+)"/g)].map((m) => m[1]);
      let checked = 0;
      for (const attr of pointsAttrs) {
        for (const pair of attr.split(" ")) {
          const [x, y] = pair.split(",").map(Number);
          assert.ok(
            x >= xMin && x <= xMax && y >= yMin && y <= yMax,
            `${mapKey}.svg has a coordinate (${x},${y}) far outside viewBox ` +
              `(${vb.width}x${vb.height} + ${MARGIN_FRACTION * 100}% margin)`,
          );
          checked++;
        }
      }
      assert.ok(checked > 0, `${mapKey}.svg should have projected geometry to check`);
    }
  });
});
