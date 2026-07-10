#!/usr/bin/env node
// embed-initial-data.js — embed deploy-time data snapshots into list/visual pages
// so first paint shows content immediately with no API round-trip (SR-3).
//
// Queries the local SQLite database for the initial page of each content type,
// serialises it as JSON, and injects a <script type="application/json" id="...">
// block before the first <script type="module"> tag in each target HTML file.
//
// Idempotent: any existing embedded-data blocks are removed before injection.
//
// Run:  npm run embed-data   or   node scripts/embed-initial-data.js

const fs = require("fs");
const path = require("path");
const db = require("../config");

const FRONTEND_DIR = path.resolve(__dirname, "..", "..", "frontend");

// ── Page definitions ──────────────────────────────────────────────────────────

/**
 * Each entry describes a page that needs embedded data:
 *   file      — path relative to FRONTEND_DIR
 *   scriptId  — id attribute for the <script> block
 *   query     — function that returns the data object/array to embed
 */
const PAGES = [
  // ── Evidence list ───────────────────────────────────────────────────────────
  {
    file: "evidence/index.html",
    scriptId: "evidence-list-data",
    query: () => {
      return db
        .prepare(
          `SELECT id, slug, title, primary_verse, timeline_era,
                  gospel_category, map_location
           FROM evidence
           WHERE published_draft = 1
           ORDER BY id ASC`,
        )
        .all();
    },
  },

  // ── Search (empty payload — form is already above the fold) ─────────────────
  {
    file: "evidence/search.html",
    scriptId: "search-data",
    query: () => [],
  },

  // ── Arbor ───────────────────────────────────────────────────────────────────
  {
    file: "evidence/arbor.html",
    scriptId: "arbor-data",
    query: () => {
      const nodes = db
        .prepare(
          `SELECT id, slug, title, timeline_era, gospel_category, map_location,
                  primary_verse
           FROM evidence
           WHERE published_draft = 1
           ORDER BY id ASC`,
        )
        .all();

      const edges = db
        .prepare(
          `SELECT source_id, target_id, relationship_type, sort_order
           FROM arbor_edges
           ORDER BY sort_order ASC, id ASC`,
        )
        .all();

      return { nodes, edges };
    },
  },

  // ── Timeline era pages ──────────────────────────────────────────────────────
  // Each era page has <body data-initial-era="EraKey"> — embed events for that era.
  // The era keys map to timeline_era values in the evidence table.
  {
    file: "evidence/timeline/early-life.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("EarlyLife"),
  },
  {
    file: "evidence/timeline/galilee-ministry.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("GalileeMinistry"),
  },
  {
    file: "evidence/timeline/judean-ministry.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("JudeanMinistry"),
  },
  {
    file: "evidence/timeline/life.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("Life"),
  },
  {
    file: "evidence/timeline/old-testament.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("OldTestament"),
  },
  {
    file: "evidence/timeline/passion-week.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("PassionWeek"),
  },
  {
    file: "evidence/timeline/post-passion.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("Post-Passion"),
  },
  {
    file: "evidence/timeline/pre-incarnation.html",
    scriptId: "timeline-data",
    query: () => queryTimelineForEra("PreIncarnation"),
  },

  // ── Map region pages ────────────────────────────────────────────────────────
  // Each map page has <body data-map-key="..."> — embed map + pins for that key.
  {
    file: "evidence/maps/roman-empire.html",
    scriptId: "map-data",
    query: () => queryMapForKey("roman-empire"),
  },
  {
    file: "evidence/maps/levant.html",
    scriptId: "map-data",
    query: () => queryMapForKey("levant"),
  },
  {
    file: "evidence/maps/judea.html",
    scriptId: "map-data",
    query: () => queryMapForKey("judea"),
  },
  {
    file: "evidence/maps/galilee.html",
    scriptId: "map-data",
    query: () => queryMapForKey("galilee"),
  },
  {
    file: "evidence/maps/jerusalem.html",
    scriptId: "map-data",
    query: () => queryMapForKey("jerusalem"),
  },
];

// ── Query helpers ─────────────────────────────────────────────────────────────

function queryTimelineForEra(era) {
  return db
    .prepare(
      `SELECT id, slug, title, timeline_period, timeline_era,
              primary_verse, gospel_category, map_location
       FROM evidence
       WHERE published_draft = 1
         AND timeline_era = ?
         AND timeline_period IS NOT NULL
       ORDER BY id ASC`,
    )
    .all(era);
}

function queryMapForKey(mapKey) {
  const mapRow = db
    .prepare(
      `SELECT id, map_key, map_name, description, image_path FROM maps WHERE map_key = ?`,
    )
    .get(mapKey);

  if (!mapRow) return null;

  const pins = db
    .prepare(
      `SELECT mp.id, mp.label, mp.x, mp.y, mp.evidence_id,
              e.slug AS evidence_slug, e.title AS evidence_title
       FROM map_pins mp
       LEFT JOIN evidence e ON e.id = mp.evidence_id
       WHERE mp.map_id = ?
       ORDER BY mp.id ASC`,
    )
    .all(mapRow.id);

  return {
    map_key: mapRow.map_key,
    map_name: mapRow.map_name,
    description: mapRow.description,
    image_path: mapRow.image_path,
    pins,
  };
}

// ── HTML injection ────────────────────────────────────────────────────────────

/**
 * Remove any existing embedded-data <script> blocks from the HTML.
 * Matches <script type="application/json" id="...">...</script>.
 */
function removeExistingBlocks(html) {
  return html.replace(
    /<script\s+type="application\/json"\s+id="[^"]*">[\s\S]*?<\/script>\s*/g,
    "",
  );
}

/**
 * Escape </script> sequences inside JSON to prevent prematurely
 * closing the script tag.
 */
function safeJsonStringify(data) {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

/**
 * Inject an embedded-data block before the first <script type="module"> tag,
 * or at the end of the file if no module script is found.
 */
function injectBlock(html, scriptId, data) {
  const block = `<script type="application/json" id="${scriptId}">\n${safeJsonStringify(data)}\n</script>\n`;

  const match = html.match(/<script\s+type="module"/);
  if (match) {
    return html.slice(0, match.index) + block + html.slice(match.index);
  }

  // Fallback: inject before </body>
  return html.replace("</body>", block + "</body>");
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  let updated = 0;
  let skipped = 0;

  for (const page of PAGES) {
    const filePath = path.join(FRONTEND_DIR, page.file);

    if (!fs.existsSync(filePath)) {
      console.log(`[embed-data] SKIP (file not found): ${page.file}`);
      skipped++;
      continue;
    }

    const data = page.query();
    if (data === null) {
      console.log(`[embed-data] SKIP (no data): ${page.file}`);
      skipped++;
      continue;
    }

    let html = fs.readFileSync(filePath, "utf8");
    html = removeExistingBlocks(html);
    html = injectBlock(html, page.scriptId, data);
    fs.writeFileSync(filePath, html, "utf8");

    const itemCount = Array.isArray(data)
      ? data.length
      : Object.keys(data).length;
    console.log(`[embed-data] OK  ${page.file} (${itemCount} items)`);
    updated++;
  }

  console.log(`[embed-data] Done: ${updated} updated, ${skipped} skipped`);
}

if (require.main === module) {
  main();
}

module.exports = {
  PAGES,
  removeExistingBlocks,
  injectBlock,
  safeJsonStringify,
};
