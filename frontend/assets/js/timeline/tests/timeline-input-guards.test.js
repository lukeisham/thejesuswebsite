// Imports the real timeline-input-guards.js, the functions that the dot
// keydown and tooltip handlers in timeline-interactions.js call.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-input-guards.js");

let isActivationKey;
let isMousePointer;

before(async () => {
  ({ isActivationKey, isMousePointer } = await import(pathToFileURL(MODULE).href));
});

describe("timeline input guards: activation key", () => {
  test("Enter activates", () => assert.equal(isActivationKey("Enter"), true));
  test("Space activates", () => assert.equal(isActivationKey(" "), true));
  test("other keys do not", () => {
    assert.equal(isActivationKey("x"), false);
    assert.equal(isActivationKey("Tab"), false);
    assert.equal(isActivationKey(undefined), false);
  });
});

describe("timeline input guards: tooltip pointer", () => {
  test("a mouse shows the tooltip", () =>
    assert.equal(isMousePointer({ pointerType: "mouse" }), true));
  test("touch and pen do not", () => {
    assert.equal(isMousePointer({ pointerType: "touch" }), false);
    assert.equal(isMousePointer({ pointerType: "pen" }), false);
  });
  test("a compatibility mouse event has no pointerType", () =>
    assert.equal(isMousePointer({}), false));
});
