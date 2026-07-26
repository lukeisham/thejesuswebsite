// Resource-sections grouping tests — verifies groupIntoSections()/
// buildRenderPlan() turn a flat list of resource rows (items + subheadings)
// into sections with numbering restarted per section.
// Uses node:test + node:assert.
//
// The real functions live in a frontend ES module and are loaded via
// dynamic import() so tests always run against the live implementation
// (see Issues.md #110/#128 for the anti-pattern this avoids: a hand-copied
// "synced copy" that keeps passing after the real implementation changes).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH = "../../frontend/assets/js/resources.js";

function item(id, title) {
  return { id, item_type: "item", resource_title: title };
}

function heading(id, title) {
  return { id, item_type: "subheading", resource_title: title };
}

describe("groupIntoSections", () => {
  test("items before the first subheading form a leading, unlabelled section", async () => {
    const { groupIntoSections } = await import(MODULE_PATH);
    const rows = [item(1, "A"), item(2, "B"), heading(3, "Heading"), item(4, "C")];
    const sections = groupIntoSections(rows);

    assert.equal(sections.length, 2);
    assert.equal(sections[0].heading, null);
    assert.deepStrictEqual(sections[0].items.map((i) => i.id), [1, 2]);
    assert.equal(sections[1].heading.id, 3);
    assert.deepStrictEqual(sections[1].items.map((i) => i.id), [4]);
  });

  test("consecutive subheadings collapse — an empty heading never gets a section", async () => {
    const { groupIntoSections } = await import(MODULE_PATH);
    const rows = [heading(1, "First"), heading(2, "Second"), item(3, "A")];
    const sections = groupIntoSections(rows);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading.id, 2);
    assert.deepStrictEqual(sections[0].items.map((i) => i.id), [3]);
  });

  test("a trailing subheading with no items after it is dropped", async () => {
    const { groupIntoSections } = await import(MODULE_PATH);
    const rows = [item(1, "A"), heading(2, "Trailing")];
    const sections = groupIntoSections(rows);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading, null);
    assert.deepStrictEqual(sections[0].items.map((i) => i.id), [1]);
  });

  test("no subheadings at all produces a single leading section", async () => {
    const { groupIntoSections } = await import(MODULE_PATH);
    const rows = [item(1, "A"), item(2, "B")];
    const sections = groupIntoSections(rows);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading, null);
    assert.equal(sections[0].items.length, 2);
  });

  test("empty input produces no sections", async () => {
    const { groupIntoSections } = await import(MODULE_PATH);
    assert.deepStrictEqual(groupIntoSections([]), []);
  });
});

describe("buildRenderPlan", () => {
  test("ordinals restart at 1 in each section", async () => {
    const { buildRenderPlan } = await import(MODULE_PATH);
    const rows = [item(1, "A"), item(2, "B"), heading(3, "Heading"), item(4, "C"), item(5, "D")];
    const plan = buildRenderPlan(rows);

    const itemEntries = plan.filter((e) => e.type === "item");
    assert.deepStrictEqual(
      itemEntries.map((e) => [e.item.id, e.ordinal]),
      [
        [1, 1],
        [2, 2],
        [4, 1],
        [5, 2],
      ],
    );
  });

  test("emits one heading entry per section, including a null heading for the leading section", async () => {
    const { buildRenderPlan } = await import(MODULE_PATH);
    const rows = [item(1, "A"), heading(2, "Heading"), item(3, "B")];
    const plan = buildRenderPlan(rows);

    const headingEntries = plan.filter((e) => e.type === "heading");
    assert.equal(headingEntries.length, 2);
    assert.equal(headingEntries[0].heading, null);
    assert.equal(headingEntries[1].heading.id, 2);
  });

  test("subheadings are never numbered — no heading entry carries an ordinal", async () => {
    const { buildRenderPlan } = await import(MODULE_PATH);
    const rows = [item(1, "A"), heading(2, "Heading"), item(3, "B")];
    const plan = buildRenderPlan(rows);

    plan
      .filter((e) => e.type === "heading")
      .forEach((e) => assert.equal("ordinal" in e, false));
  });
});
