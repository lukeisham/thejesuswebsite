#!/usr/bin/env node
// backfill-evidence-images.js — fills image_width, image_height and
// image_display_path for evidence rows saved before those columns existed.
//
// For each evidence row with an `image` and no `image_width`, it reads the file,
// runs the same standardizeImage() and createDisplayCopy() as routes/uploads.js,
// and writes both under a NEW <uuid>.<ext> name. The row then points at the new
// file. The old file stays on disk: uploads are served as immutable for a year
// (performance-and-caching.md), so rewriting in place would leave browsers and
// the edge with the old bytes.
//
// Dry run by default; --apply writes. Not a deploy step: deploy.sh never runs it,
// and it changes production rows, so run it on the VPS only after a backup.
//
// Run:  node scripts/backfill-evidence-images.js          (dry run)
//       node scripts/backfill-evidence-images.js --apply  (writes)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { standardizeImage } = require("../lib/image-standardize");
const { createDisplayCopy } = require("../lib/image-display-copy");

const UPLOADS_ROOT = path.resolve(__dirname, "..", "..", "public", "uploads");

const EXT_BY_SUFFIX = { ".jpg": "jpg", ".jpeg": "jpg", ".png": "png", ".webp": "webp" };

/**
 * Backfill the picture size and display copy of evidence rows.
 *
 * @param {import('better-sqlite3').Database} db - Database to read and update.
 * @param {string} uploadsRoot - Folder that holds the `/uploads/...` files.
 * @param {boolean} apply - False for a dry run that changes nothing.
 * @returns {Promise<{ candidates: number, updated: number, skipped: number }>}
 */
async function backfillEvidenceImages(db, uploadsRoot, apply) {
  const rows = db
    .prepare("SELECT id, slug, image FROM evidence WHERE image IS NOT NULL AND image != '' AND image_width IS NULL")
    .all();
  const update = db.prepare(
    "UPDATE evidence SET image = @image, image_width = @width, image_height = @height, image_display_path = @display WHERE id = @id",
  );

  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const ext = EXT_BY_SUFFIX[path.extname(row.image).toLowerCase()];
    const sourcePath = path.join(uploadsRoot, row.image.replace(/^\/uploads\//, ""));
    if (!ext || !fs.existsSync(sourcePath)) {
      console.warn(`  [skip]  ${row.slug} — no readable file at ${row.image}`);
      skipped++;
      continue;
    }

    const standardized = await standardizeImage(fs.readFileSync(sourcePath), ext);
    if (!standardized.width || !standardized.height) {
      console.warn(`  [skip]  ${row.slug} — could not read the picture size`);
      skipped++;
      continue;
    }
    const display = await createDisplayCopy(standardized.buffer, ext);

    console.log(
      `  [${apply ? "applied" : "dry-run"}] ${row.slug} — ${standardized.width}x${standardized.height}` +
        (display ? ", display copy 720 px" : ", no display copy"),
    );
    if (!apply) continue;

    const dir = path.dirname(sourcePath);
    const uuid = crypto.randomUUID();
    const urlDir = path.posix.dirname(row.image);
    const newName = `${uuid}.${ext}`;
    fs.writeFileSync(path.join(dir, newName), standardized.buffer);
    let displayUrl = null;
    if (display) {
      const displayName = `${uuid}_720.${ext}`;
      fs.writeFileSync(path.join(dir, displayName), display.buffer);
      displayUrl = `${urlDir}/${displayName}`;
    }
    update.run({
      id: row.id,
      image: `${urlDir}/${newName}`,
      width: standardized.width,
      height: standardized.height,
      display: displayUrl,
    });
    updated++;
  }

  return { candidates: rows.length, updated, skipped };
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    apply
      ? "Running in APPLY mode — new files are written and evidence rows updated.\n"
      : "Running in DRY-RUN mode — nothing is written. Pass --apply to write.\n",
  );
  const db = require("../config");
  const { candidates, updated, skipped } = await backfillEvidenceImages(db, UPLOADS_ROOT, apply);
  console.log(`\n${candidates} candidate row(s), ${updated} updated, ${skipped} skipped.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("backfill-evidence-images failed:", err);
    process.exit(1);
  });
}

module.exports = { backfillEvidenceImages };
