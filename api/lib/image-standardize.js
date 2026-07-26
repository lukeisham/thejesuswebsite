// Image upload standardisation — resizes every accepted image down to a
// 1440 x 960 bounding box (2x the frontend's 720x480 standard display box,
// see Style Guide §8) and bakes in EXIF rotation, so stored files stay
// sharp on retina displays without shipping camera-resolution originals.
//
// Sharp is optional at runtime (SR-2/JS-2), matching routes/uploads.js's
// existing convention: if it's missing or a resize throws, the caller gets
// the original buffer back untouched rather than a failed upload.

let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

const TARGET_WIDTH = 1440;
const TARGET_HEIGHT = 960;

/**
 * Standardise an uploaded image buffer to the site's storage bounding box.
 *
 * - Bakes in EXIF orientation via `.rotate()` *before* resizing, so a phone
 *   portrait is never stored sideways and reported dimensions are correct.
 * - Resizes to fit inside 1440x960 without upscaling smaller originals
 *   (SR-3): a 400x300 upload stays 400x300 on disk and renders softly at
 *   standard display size via CSS, rather than storing invented pixels.
 * - Re-encodes in the same format the file was sniffed as, except GIF
 *   (re-encoding drops animation) — GIFs are returned untouched.
 * - Any Sharp failure is swallowed: `console.warn` + the original buffer
 *   comes back with `standardized: false`, so an upload never fails over
 *   this step (JS-2), mirroring the thumbnail-generation precedent on the
 *   same route.
 *
 * @param {Buffer} buffer - Raw image bytes (already magic-byte sniffed).
 * @param {"jpg"|"png"|"gif"|"webp"} ext - Sniffed extension.
 * @returns {Promise<{buffer: Buffer, width: number|null, height: number|null, standardized: boolean}>}
 */
async function standardizeImage(buffer, ext) {
  if (!sharp) {
    return { buffer, width: null, height: null, standardized: false };
  }

  if (ext === "gif") {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        buffer,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        standardized: false,
      };
    } catch (err) {
      console.warn("Image standardisation (gif metadata) failed:", err.message);
      return { buffer, width: null, height: null, standardized: false };
    }
  }

  try {
    let pipeline = sharp(buffer)
      .rotate()
      .resize({
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      });

    if (ext === "jpg" || ext === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    } else if (ext === "png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (ext === "webp") {
      pipeline = pipeline.webp({ quality: 82 });
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height, standardized: true };
  } catch (err) {
    console.warn("Image standardisation failed:", err.message);
    return { buffer, width: null, height: null, standardized: false };
  }
}

module.exports = { standardizeImage };
