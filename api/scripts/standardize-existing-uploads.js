#!/usr/bin/env node
// standardize-existing-uploads.js — one-off backfill for images uploaded
// before /uploads standardised to a 1440x960 bounding box.
//
// Walks public/uploads/**, skips thumbnails (*_thumb.*) and .gif (animation
// would be dropped by re-encoding), and rewrites any file exceeding
// 1440x960 through the same standardizeImage() the upload route uses.
//
// Dry-run by default — logs candidates and projected savings without
// touching disk. Pass --apply to actually rewrite files.
//
// This is a deliberate one-off, NOT a deploy step: it rewrites files in
// place and is irreversible. Do not add it to deploy.sh. Run it on the VPS
// only after confirming a backup of public/uploads/, and only once.
//
// Run:  node scripts/standardize-existing-uploads.js          (dry run)
//       node scripts/standardize-existing-uploads.js --apply  (writes)

const fs = require("fs");
const path = require("path");
const { standardizeImage } = require("../lib/image-standardize");

const UPLOADS_ROOT = path.resolve(__dirname, "..", "..", "public", "uploads");
const TARGET_WIDTH = 1440;
const TARGET_HEIGHT = 960;

const EXT_BY_SUFFIX = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".webp": "webp",
  ".gif": "gif",
};

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function isThumbnail(filePath) {
  return /_thumb\.[^.]+$/.test(filePath);
}

function extensionFor(filePath) {
  const suffix = path.extname(filePath).toLowerCase();
  return EXT_BY_SUFFIX[suffix] || null;
}

async function getDimensions(buffer) {
  // Reuse sharp's metadata reader rather than a full standardize pass just
  // to decide whether a file is a candidate.
  const sharp = require("sharp");
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width || 0, height: metadata.height || 0 };
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(
    apply
      ? "Running in APPLY mode — files will be rewritten in place.\n"
      : "Running in DRY-RUN mode — no files will be written. Pass --apply to write.\n",
  );

  const allFiles = walk(UPLOADS_ROOT);
  let candidates = 0;
  let rewritten = 0;
  let totalBytesBefore = 0;
  let totalBytesAfter = 0;

  for (const filePath of allFiles) {
    if (isThumbnail(filePath)) continue;

    const ext = extensionFor(filePath);
    if (!ext || ext === "gif") continue;

    const relPath = path.relative(UPLOADS_ROOT, filePath);
    const original = fs.readFileSync(filePath);

    let dims;
    try {
      dims = await getDimensions(original);
    } catch (err) {
      console.warn(`  [skip]  ${relPath} — could not read dimensions (${err.message})`);
      continue;
    }

    if (dims.width <= TARGET_WIDTH && dims.height <= TARGET_HEIGHT) {
      continue;
    }

    candidates++;
    const result = await standardizeImage(original, ext);

    if (!result.standardized) {
      console.warn(`  [skip]  ${relPath} — standardisation failed, left untouched`);
      continue;
    }

    const beforeBytes = original.length;
    const afterBytes = result.buffer.length;
    totalBytesBefore += beforeBytes;
    totalBytesAfter += afterBytes;

    console.log(
      `  [${apply ? "applied" : "dry-run"}] ${relPath} — ${dims.width}x${dims.height} → ` +
        `${result.width}x${result.height}, ${beforeBytes} → ${afterBytes} bytes ` +
        `(${(((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1)}% smaller)`,
    );

    if (apply) {
      fs.writeFileSync(filePath, result.buffer);
      rewritten++;
    }
  }

  console.log(
    `\n${candidates} candidate file(s) found. ` +
      (apply
        ? `${rewritten} rewritten.`
        : `Re-run with --apply to write changes.`),
  );
  if (totalBytesBefore > 0) {
    const savedBytes = totalBytesBefore - totalBytesAfter;
    console.log(
      `Total: ${totalBytesBefore} → ${totalBytesAfter} bytes ` +
        `(${savedBytes} bytes, ${((savedBytes / totalBytesBefore) * 100).toFixed(1)}% saved).`,
    );
  }
}

main().catch((err) => {
  console.error("standardize-existing-uploads failed:", err);
  process.exit(1);
});
