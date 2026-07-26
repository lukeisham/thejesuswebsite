// Image standardiser tests — verifies standardizeImage() resizes oversized
// images to fit the 1440x960 storage bounding box, never enlarges small
// originals, leaves GIFs untouched, bakes in EXIF rotation, and degrades
// safely (never throws) on a corrupt buffer.
// Uses node:test + node:assert.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { standardizeImage } = require("../lib/image-standardize");

async function makeJpeg(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 60, b: 200 } },
  })
    .jpeg()
    .toBuffer();
}

describe("standardizeImage", () => {
  test("a 1600x1200 JPEG resizes to 1280x960 (inside fit)", async () => {
    const original = await makeJpeg(1600, 1200);
    const result = await standardizeImage(original, "jpg");

    assert.equal(result.standardized, true);
    assert.equal(result.width, 1280);
    assert.equal(result.height, 960);

    const onDisk = await sharp(result.buffer).metadata();
    assert.equal(onDisk.width, 1280);
    assert.equal(onDisk.height, 960);
  });

  test("a 300x200 image is returned unenlarged", async () => {
    const original = await makeJpeg(300, 200);
    const result = await standardizeImage(original, "jpg");

    assert.equal(result.standardized, true);
    assert.equal(result.width, 300);
    assert.equal(result.height, 200);
  });

  test("a GIF buffer comes back byte-identical", async () => {
    // Minimal GIF89a header — standardizeImage must not attempt to
    // re-encode it (animation would be dropped), regardless of whether
    // sharp can even decode this particular buffer.
    const gifBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    ]);
    const result = await standardizeImage(gifBuffer, "gif");

    assert.equal(result.standardized, false);
    assert.ok(result.buffer.equals(gifBuffer));
  });

  test("an EXIF-rotated portrait reports post-rotation dimensions", async () => {
    // Build a 1200x800 landscape image, then tag it with EXIF orientation 6
    // (rotate 90deg CW) — a real camera-portrait scenario where the stored
    // pixels are landscape but the intended display orientation is portrait.
    const landscape = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 200, b: 10 } },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await standardizeImage(landscape, "jpg");

    assert.equal(result.standardized, true);
    // .rotate() bakes in the EXIF orientation before resize, so the
    // post-rotation intrinsic size is portrait (800 wide x 1200 tall),
    // fit inside 1440x960 -> scaled down to 640x960.
    assert.equal(result.width, 640);
    assert.equal(result.height, 960);
  });

  test("a corrupt buffer returns the original with standardized: false and does not throw", async () => {
    const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03]);

    const result = await standardizeImage(corrupt, "jpg");

    assert.equal(result.standardized, false);
    assert.ok(result.buffer.equals(corrupt));
  });
});
