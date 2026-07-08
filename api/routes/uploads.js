// Image upload route — the single boundary where untrusted file bytes enter
// the system. Uses base64 JSON + magic-byte sniffing rather than multer (SR-2).
// Mounted BEFORE the global 1 MB body limit so we can set our own 8 MB limit
// (base64 inflates payload size ~33 %).

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const requireAuth = require("../middleware/auth");

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
router.post("/", requireAuth, (req, res) => {
  try {
    const { filename, data } = req.body || {};

    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'data' field (base64 string required)." });
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
      return res.status(400).json({ error: "Could not decode base64 'data' field." });
    }

    // Size guard (after decode — base64 is ~33% larger than raw)
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(413).json({ error: "File exceeds 5 MB limit." });
    }

    // Sniff magic bytes to determine extension
    const ext = sniffExtension(buffer);
    if (!ext) {
      return res.status(400).json({ error: "Unsupported image type. Allowed: JPEG, PNG, GIF, WEBP." });
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
    fs.mkdirSync(destDir, { recursive: true });

    // Write the file
    fs.writeFileSync(destPath, buffer);

    // Public URL path (relative to the site root, served by express.static)
    const imagePath = `/uploads/${year}/${month}/${destName}`;

    res.status(201).json({ image_path: imagePath });
  } catch (error) {
    console.error("POST /uploads failed:", error);
    res.status(500).json({ error: "Upload failed." });
  }
});

module.exports = router;
