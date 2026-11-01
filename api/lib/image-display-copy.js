// Display copy of an uploaded picture, 720 px wide, so small screens download a
// smaller file than the 1440 px storage copy.
//
// Called by routes/uploads.js (every upload) and scripts/backfill-evidence-images.js
// (existing rows). frontend/assets/js/evidence-detail.js repeats DISPLAY_COPY_WIDTH
// as the `720w` descriptor of the primary picture's srcset: change one, change both.
//
// Sharp is optional at runtime (SR-2/JS-2), as in image-standardize.js: on any
// failure the caller gets null and the page falls back to the storage copy.

let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

const DISPLAY_COPY_WIDTH = 720;

/**
 * Resize an already standardised image to the display width.
 *
 * Returns null for a GIF (re-encoding drops animation), for an image that is
 * already 720 px wide or less (a copy would add nothing), and when Sharp fails.
 *
 * @param {Buffer} buffer - Standardised image bytes (EXIF rotation already applied).
 * @param {"jpg"|"png"|"gif"|"webp"} ext - Sniffed extension; the copy keeps the format.
 * @returns {Promise<{buffer: Buffer, width: number, height: number}|null>}
 */
async function createDisplayCopy(buffer, ext) {
  if (!sharp || ext === "gif") return null;

  try {
    const { width } = await sharp(buffer).metadata();
    if (!width || width <= DISPLAY_COPY_WIDTH) return null;

    let pipeline = sharp(buffer).resize({ width: DISPLAY_COPY_WIDTH, withoutEnlargement: true });
    if (ext === "jpg") pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    else if (ext === "png") pipeline = pipeline.png({ compressionLevel: 9 });
    else if (ext === "webp") pipeline = pipeline.webp({ quality: 82 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch (err) {
    console.warn("Display copy generation failed:", err.message);
    return null;
  }
}

module.exports = { createDisplayCopy, DISPLAY_COPY_WIDTH };
