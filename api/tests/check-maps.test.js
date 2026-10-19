// Smoke test for api/scripts/check-maps/ — the checker that compares the
// generated maps with AD 30 geography. Each module gets a happy path and a
// failure path, run against the real map configs and base data.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const CHECKER = path.resolve(__dirname, "..", "scripts", "check-maps");
const OVERLAYS = path.resolve(__dirname, "..", "scripts", "generate-maps", "overlays");

const { MAP_CONFIGS } = require("../scripts/generate-maps/map-configs");
const { haversineKm, pxToLonLat, lonLatToPx } = require(`${CHECKER}/geo-units`);
const { buildWaterTest } = require(`${CHECKER}/water-test`);
const { loadReference, findFeature } = require(`${CHECKER}/reference`);
const { parseOverlay } = require(`${CHECKER}/overlay-parser`);
const { checkStretch } = require(`${CHECKER}/check-stretch`);
const { checkFeatures } = require(`${CHECKER}/check-features`);
const { checkOverlays, selectGeoShapes } = require(`${CHECKER}/check-overlays`);
const { loadAncientFeatures } = require("../scripts/generate-maps/geo-overlay");
const { checkNames } = require(`${CHECKER}/check-names`);
const { checkCollisions } = require(`${CHECKER}/check-collisions`);
const { buildReviewSheet } = require(`${CHECKER}/review-sheet`);

const reference = loadReference();
const isWater = buildWaterTest();

function readOverlay(mapKey) {
  return parseOverlay(fs.readFileSync(path.join(OVERLAYS, `${mapKey}.svg`), "utf8"));
}

describe("geo-units", () => {
  test("pixel and degree conversions undo each other", () => {
    const cfg = MAP_CONFIGS.judea;
    const { lon, lat } = pxToLonLat(cfg, 585, 482);
    const back = lonLatToPx(cfg, lon, lat);
    assert.ok(Math.abs(back.x - 585) < 1e-6 && Math.abs(back.y - 482) < 1e-6);
  });

  test("Jerusalem to Bethlehem is about 8 km", () => {
    const km = haversineKm(35.2354, 31.778, 35.2007, 31.704);
    assert.ok(km > 7.5 && km < 9, `got ${km}`);
  });
});

describe("water-test", () => {
  test("the sea and the Sea of Galilee are water, Jerusalem is land", () => {
    assert.equal(isWater(20, 34), true);
    assert.equal(isWater(35.59, 32.82), true);
    assert.equal(isWater(35.2354, 31.778), false);
  });
});

describe("reference", () => {
  test("a label matches its place, including the short form of a long name", () => {
    assert.deepEqual(findFeature(reference.features, "MOUNT OF OLIVES").names, ["Mount of Olives"]);
    assert.deepEqual(findFeature(reference.features, "Antonia").names, ["Antonia Fortress"]);
  });

  test("an unknown label has no match", () => {
    assert.equal(findFeature(reference.features, "Atlantis"), undefined);
  });
});

describe("overlay-parser", () => {
  test("reads the place names that the Jerusalem overlay draws", () => {
    const { texts } = readOverlay("jerusalem");
    assert.ok(texts.some((t) => t.text === "Golgotha"));
  });

  test("finds no text in a file that has none", () => {
    assert.deepEqual(parseOverlay("<g></g>"), { texts: [] });
  });
});

describe("check-stretch", () => {
  test("the Jerusalem map keeps true proportions", () => {
    assert.deepEqual(checkStretch("jerusalem", MAP_CONFIGS.jerusalem), []);
  });

  test("a viewBox with the wrong shape is reported", () => {
    const squashed = { ...MAP_CONFIGS.levant, viewBox: { x: 0, y: 0, width: 900, height: 1000 } };
    const [finding] = checkStretch("levant", squashed);
    assert.equal(finding.severity, "error");
    assert.match(finding.message, /wider/);
  });
});

describe("check-features", () => {
  const withLabel = (x, y) => ({ ...MAP_CONFIGS.levant, hills: [], labels: [{ text: "SAMARIA", x, y, cls: "region-label" }] });

  test("a label at its AD 30 position passes", () => {
    const findings = checkFeatures("levant", withLabel(487, 594), reference.features, isWater);
    assert.deepEqual(findings, []);
  });

  test("a label out in the sea is reported", () => {
    const findings = checkFeatures("levant", withLabel(400, 600), reference.features, isWater);
    assert.ok(findings.some((f) => f.severity === "error" && /water/.test(f.message)));
  });
});

describe("check-overlays", () => {
  const features = loadAncientFeatures();

  test("the roads, boundaries and lake that the generator draws match the reference", () => {
    for (const mapKey of ["judea", "galilee", "levant", "roman-empire"]) {
      const shapes = selectGeoShapes(mapKey, features);
      const findings = checkOverlays(mapKey, MAP_CONFIGS[mapKey], reference, shapes, isWater);
      const errors = findings.filter((f) => f.severity === "error");
      assert.deepEqual(errors, [], `${mapKey}: ${errors.map((f) => f.message).join(" | ")}`);
    }
  });

  test("a road drawn in the sea and a lake in the wrong place are reported", () => {
    const shapes = {
      roads: [[{ lon: 34.2, lat: 32.4 }, { lon: 34.3, lat: 31.6 }]],
      boundaries: [],
      lakes: [{ lon: 35.6, lat: 33.28 }],
    };
    const findings = checkOverlays("galilee", MAP_CONFIGS.galilee, reference, shapes, isWater);
    assert.ok(findings.some((f) => f.check === "road" && /water/.test(f.message)));
    assert.ok(findings.some((f) => f.check === "lake" && f.severity === "error"));
  });

  test("a map with no shapes gives only warnings", () => {
    const empty = { roads: [], boundaries: [], lakes: [] };
    const findings = checkOverlays("judea", MAP_CONFIGS.judea, reference, empty, isWater);
    assert.ok(findings.every((f) => f.severity === "warn"));
  });
});

describe("check-names", () => {
  test("a name from after AD 30 is reported", () => {
    const findings = checkNames([{ map: "levant", text: "Aelia Capitolina" }], reference);
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /AD 130/);
  });

  test("two spellings of one name are reported, one spelling is not", () => {
    const split = [{ map: "a", text: "JUDEA" }, { map: "b", text: "JUDAEA" }];
    assert.equal(checkNames(split, { ...reference, anachronisms: [] }).length, 1);
    assert.equal(checkNames([split[0]], reference).length, 0);
  });
});

describe("check-collisions", () => {
  const text = (x, y, label) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="10">${label}</text>`;
  const viewBox = { width: 400, height: 400 };

  test("labels far apart pass", () => {
    assert.deepEqual(checkCollisions("t", text(100, 100, "Alpha") + text(300, 300, "Beta"), viewBox), []);
  });

  test("overlapping labels and a label on the frame are reported", () => {
    const overlap = checkCollisions("t", text(100, 100, "Alpha") + text(105, 102, "Beta"), viewBox);
    assert.equal(overlap.length, 1);
    const edge = checkCollisions("t", text(5, 100, "Edge"), viewBox);
    assert.match(edge[0].message, /frame/);
  });
});

describe("review-sheet", () => {
  test("builds a page that escapes finding text", () => {
    const html = buildReviewSheet(
      [{
        mapKey: "judea",
        title: "Judea",
        svg: "<svg></svg>",
        cfg: MAP_CONFIGS.judea,
        findings: [{ map: "judea", check: "name", severity: "error", message: "<script>x</script>" }],
      }],
      reference,
    );
    assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
    assert.match(html, /class="ref-layer"/);
  });
});
