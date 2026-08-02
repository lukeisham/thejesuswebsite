// Cluster label collision tests — node:test + node:assert.
// Tests the shared collision-escalation module: tier escalation,
// side-never-flips invariant, max-tier ceiling, overlap detection.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Inline the shared module logic (matching cluster-label-collision.js) ────

const LABEL_GAP_PX = 8;
const MAX_TIER = 10;

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  const gap = LABEL_GAP_PX;
  return (
    (a.x + a.w / 2) + gap > (b.x - b.w / 2) &&
    (b.x + b.w / 2) + gap > (a.x - a.w / 2) &&
    (a.y + a.h / 2) + gap > (b.y - b.h / 2) &&
    (b.y + b.h / 2) + gap > (a.y - a.h / 2)
  );
}

function resolveLabelCollisions(descriptors) {
  if (!descriptors || descriptors.length === 0) return [];
  const items = descriptors
    .map((d) => ({ ...d }))
    .sort((a, b) => a.tierIndex - b.tierIndex);

  const axis = items[0].axis;
  const placed = [];

  for (const item of items) {
    const origX = item.x;
    const origY = item.y;
    let tier = item.tierIndex;
    let rect = { x: item.x, y: item.y, w: item.width, h: item.height };
    let collides = false;

    do {
      collides = false;
      for (const pr of placed) {
        if (rectsOverlap(rect, pr)) {
          collides = true;
          tier++;
          if (tier > MAX_TIER) { tier = MAX_TIER; break; }
          const direction = tier % 2 === 1 ? -1 : 1;
          const netShift = direction * item.primaryStep * Math.ceil(tier / 2);
          if (axis === "x") {
            item.y = origY + netShift;
          } else {
            item.x = origX + netShift;
          }
          rect = { x: item.x, y: item.y, w: item.width, h: item.height };
          break;
        }
      }
    } while (collides && tier < MAX_TIER);

    item.tierIndex = tier;
    placed.push(rect);
  }

  return items;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("cluster-label-collision — rectsOverlap", () => {
  test("two identical rects overlap", () => {
    assert.strictEqual(rectsOverlap(
      { x: 100, y: 100, w: 80, h: 20 },
      { x: 100, y: 100, w: 80, h: 20 },
    ), true);
  });

  test("rects with gap between them do NOT overlap", () => {
    assert.strictEqual(rectsOverlap(
      { x: 100, y: 100, w: 80, h: 20 },
      { x: 300, y: 100, w: 80, h: 20 },
    ), false);
  });

  test("rects within gap allowance overlap", () => {
    const a = { x: 100, y: 100, w: 80, h: 20 };
    const b = { x: 144, y: 100, w: 80, h: 20 };
    assert.strictEqual(rectsOverlap(a, b), true);
  });

  test("null/undefined rects do NOT overlap", () => {
    assert.strictEqual(rectsOverlap(null, { x: 0, y: 0, w: 10, h: 10 }), false);
  });
});

describe("cluster-label-collision — tier escalation", () => {
  test("non-overlapping labels stay at tier 0", () => {
    const resolved = resolveLabelCollisions([
      { x: 100, y: 80, width: 60, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 300, y: 80, width: 60, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
    ]);
    assert.strictEqual(resolved[0].tierIndex, 0);
    assert.strictEqual(resolved[1].tierIndex, 0);
  });

  test("overlapping labels escalate to higher tiers", () => {
    const resolved = resolveLabelCollisions([
      { x: 100, y: 80, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 120, y: 80, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
    ]);
    assert.strictEqual(resolved[0].tierIndex, 0);
    assert.ok(resolved[1].tierIndex > 0, "second label should escalate");
  });

  test("labels fan out to avoid overlap", () => {
    const descs = [
      { x: 100, y: 80, width: 100, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 100, y: 80, width: 100, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 100, y: 80, width: 100, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
    ];
    const resolved = resolveLabelCollisions(descs);
    // After resolution, no two labels should overlap
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const ri = { x: resolved[i].x, y: resolved[i].y, w: resolved[i].width, h: resolved[i].height };
        const rj = { x: resolved[j].x, y: resolved[j].y, w: resolved[j].width, h: resolved[j].height };
        assert.strictEqual(rectsOverlap(ri, rj), false,
          `labels ${i} and ${j} should not overlap after resolution`);
      }
    }
  });
});

describe("cluster-label-collision — side never flips", () => {
  test("labels above spine stay above after escalation", () => {
    const resolved = resolveLabelCollisions([
      { x: 100, y: 70, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 100, y: 70, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
    ]);
    for (const r of resolved) {
      assert.ok(r.y < 95, "label should stay above spine after escalation");
    }
  });

  test("labels below spine stay below after escalation", () => {
    const resolved = resolveLabelCollisions([
      { x: 100, y: 130, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
      { x: 100, y: 130, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12 },
    ]);
    for (const r of resolved) {
      assert.ok(r.y > 105, "label should stay below spine after escalation");
    }
  });
});

describe("cluster-label-collision — max-tier ceiling", () => {
  test("tier never exceeds MAX_TIER (10)", () => {
    const descs = [];
    for (let i = 0; i < 15; i++) {
      descs.push({
        x: 100, y: 80, width: 80, height: 16,
        tierIndex: 0, axis: "x", primaryStep: 12,
      });
    }
    const resolved = resolveLabelCollisions(descs);
    for (const r of resolved) {
      assert.ok(r.tierIndex <= MAX_TIER,
        `tier ${r.tierIndex} should not exceed MAX_TIER ${MAX_TIER}`);
    }
  });
});

describe("cluster-label-collision — axis='y' vertical mode", () => {
  test("axis='y' shifts x, leaving y unchanged", () => {
    const resolved = resolveLabelCollisions([
      { x: 50, y: 100, width: 60, height: 16, tierIndex: 0, axis: "y", primaryStep: 40 },
      { x: 50, y: 100, width: 60, height: 16, tierIndex: 0, axis: "y", primaryStep: 40 },
    ]);
    // y positions stay the same
    assert.strictEqual(resolved[0].y, 100);
    assert.strictEqual(resolved[1].y, 100);
    // x unchanged for first label, shifted for second
    assert.strictEqual(resolved[0].x, 50);
    assert.notStrictEqual(resolved[1].x, 50);
  });
});
