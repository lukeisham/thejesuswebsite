// Smoke test for lib/image-display-copy.js.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { createDisplayCopy, DISPLAY_COPY_WIDTH } = require("../lib/image-display-copy");

function makeImage(width, height, format = "jpeg") {
  return sharp({ create: { width, height, channels: 3, background: { r: 90, g: 60, b: 30 } } })
    [format]()
    .toBuffer();
}

describe("createDisplayCopy", () => {
  test("a wide JPEG gives a 720-wide copy with the same ratio", async () => {
    const copy = await createDisplayCopy(await makeImage(1440, 960), "jpg");
    assert.equal(copy.width, DISPLAY_COPY_WIDTH);
    assert.equal(copy.height, 480);
    const meta = await sharp(copy.buffer).metadata();
    assert.equal(meta.width, DISPLAY_COPY_WIDTH);
    assert.equal(meta.format, "jpeg");
  });

  test("a GIF gives null", async () => {
    assert.equal(await createDisplayCopy(await makeImage(1440, 960, "png"), "gif"), null);
  });

  test("an image of 720 px or less gives null", async () => {
    assert.equal(await createDisplayCopy(await makeImage(720, 400), "jpg"), null);
  });

  test("a corrupt buffer gives null and warns", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    assert.equal(await createDisplayCopy(Buffer.from("not an image"), "jpg"), null);
    assert.equal(warn.mock.callCount(), 1);
  });
});
