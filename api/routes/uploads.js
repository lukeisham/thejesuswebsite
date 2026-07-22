// Image upload route — the single boundary where untrusted file bytes enter
// the system. Uses base64 JSON + magic-byte sniffing rather than multer (SR-2).
// Mounted BEFORE the global 1 MB body limit so we can set our own 8 MB limit
// (base64 inflates payload size ~33 %).

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const requireAuth = require("../middleware/auth");
const { safeMkdir, safeWriteFile } = require("../lib/io-guard");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

// Sharp is optional at runtime (SR-2/JS-2): if it's missing or a resize
// throws, the upload still succeeds with the full-size image and
// thumb_path is null — never fail an upload over a thumbnail.
let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

const THUMBNAIL_WIDTH = 80;

const router = express.Router();

// This route needs its own 8 MB limit; the global limit on the rest of the app
// stays at 1 MB. In server.js this router is mounted *before* the global parser.
router.use(express.json({ limit: "8mb" }));

// ── Magic byte whitelist ──────────────────────────────────────────────────────
// Each entry maps leading hex bytes to a standard extension.
// The client-supplied filename and Content-Type are never trusted for extension
// derivation; only the sniffed magic bytes decide the extension.

const MAGIC = [
  { bytes: Buffer.from([0xff, 0xd8, 0xff]), ext: "jpg" },
  { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ext: "png" },
  { bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]), ext: "gif" },
];

// WEBP: "RIFF" at offset 0 + "WEBP" at offset 8
const RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]); // "RIFF"
const WEBP = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP"

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function sniffExtension(buffer) {
  for (const entry of MAGIC) {
    if (buffer.length >= entry.bytes.length && buffer.slice(0, entry.bytes.length).equals(entry.bytes)) {
      return entry.ext;
    }
  }
  // WEBP: first four bytes = RIFF, bytes 8-11 = WEBP
  if (buffer.length >= 12 && buffer.slice(0, 4).equals(RIFF) && buffer.slice(8, 12).equals(WEBP)) {
    return "webp";
  }
  return null;
}

// POST /uploads — accepts { filename, data } where data is base64-encoded bytes.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { filename, data } = req.body || {};

    if (!data || typeof data !== "string") {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { field: "data" });
    }

    // Decode base64
    let buffer;
    try {
      buffer = Buffer.from(data, "base64");
      // Guard against base64 decoding producing an empty buffer from garbage input
      if (buffer.length === 0 && data.length > 0) {
        throw new Error("Empty decode");
      }
    } catch {
      return sendError(res, ERRORS.INVALID_BASE64, { field: "data" });
    }

    // Size guard (after decode — base64 is ~33% larger than raw)
    if (buffer.length > MAX_FILE_BYTES) {
      return sendError(res, ERRORS.FILE_TOO_LARGE, { maxBytes: MAX_FILE_BYTES });
    }

    // Sniff magic bytes to determine extension
    const ext = sniffExtension(buffer);
    if (!ext) {
      return sendError(res, ERRORS.UNSUPPORTED_FILE_TYPE, {
        allowed: ["jpg", "png", "gif", "webp"],
      });
    }

    // Build destination path: public/uploads/<yyyy>/<mm>/<uuid>.<ext>
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uuid = crypto.randomUUID();
    const destName = `${uuid}.${ext}`;

    const uploadsRoot = path.join(__dirname, "..", "..", "public", "uploads");
    const destDir = path.join(uploadsRoot, year, month);
    const destPath = path.join(destDir, destName);

    // Create directory recursively
    const mkdirResult = safeMkdir(destDir);
    if (!mkdirResult.ok) {
      return sendError(res, ERRORS.DIRECTORY_CREATION_FAILURE);
    }

    // Write the file
    const writeResult = safeWriteFile(destPath, buffer);
    if (!writeResult.ok) {
      return sendError(res, ERRORS.FILE_WRITE_FAILURE);
    }

    // Public URL path (relative to the site root, served by express.static)
    const imagePath = `/uploads/${year}/${month}/${destName}`;

    // Thumbnail generation is best-effort: any failure here still lets the
    // upload succeed with thumb_path: null (JS-2).
    let thumbPath = null;
    if (sharp) {
      try {
        const thumbName = `${uuid}_thumb.${ext}`;
        const thumbDestPath = path.join(destDir, thumbName);
        await sharp(buffer).resize(THUMBNAIL_WIDTH).toFile(thumbDestPath);
        thumbPath = `/uploads/${year}/${month}/${thumbName}`;
      } catch (err) {
        console.warn("Thumbnail generation failed:", err.message);
        thumbPath = null;
      }
    }

    res.status(201).json({ image_path: imagePath, thumb_path: thumbPath });
  } catch (error) {
    console.error("POST /uploads failed:", error);
    sendError(res, ERRORS.FILE_WRITE_FAILURE);
  }
});

module.exports = router;
