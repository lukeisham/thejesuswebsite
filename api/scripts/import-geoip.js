/**
 * GeoLite2 Country CSV → SQLite import script.
 *
 * ONE-TIME setup — run after downloading the MaxMind GeoLite2 Country CSV.
 *
 * Prerequisites:
 *   1. Create a free MaxMind account at https://www.maxmind.com/en/geolite2/signup
 *   2. Download "GeoLite2 Country CSV" from https://www.maxmind.com/en/accounts/current/geoip/downloads
 *   3. Extract the ZIP — you need:
 *      - GeoLite2-Country-Blocks-IPv4.csv
 *      - GeoLite2-Country-Locations-en.csv
 *   4. Place both CSVs in api/data/geoip/
 *
 * Usage:
 *   cd api
 *   node scripts/import-geoip.js
 *
 * The script reads the two CSVs, joins them on geoname_id, converts CIDR
 * network addresses to integer start/end ranges, and bulk-inserts into the
 * `geoip_blocks` table. Run quarterly to pick up MaxMind database updates.
 *
 * No npm dependencies — uses only Node.js built-ins (fs, path, readline).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const db = require("../config");

const DATA_DIR = path.resolve(__dirname, "..", "data", "geoip");
const BLOCKS_CSV = path.join(DATA_DIR, "GeoLite2-Country-Blocks-IPv4.csv");
const LOCATIONS_CSV = path.join(DATA_DIR, "GeoLite2-Country-Locations-en.csv");

/**
 * Convert a CIDR "network" field (e.g. "1.0.0.0/24") to integer start and end.
 * Arithmetic only — no bitwise operators (they clamp to signed int32).
 *
 * @param {string} network - CIDR notation.
 * @returns {{ start: number, end: number }|null}
 */
function cidrToRange(network) {
  const [addr, prefixStr] = network.split("/");
  const prefix = Number(prefixStr);
  if (isNaN(prefix)) return null;

  const parts = addr.split(".");
  if (parts.length !== 4) return null;

  const start =
    Number(parts[0]) * 16777216 +
    Number(parts[1]) * 65536 +
    Number(parts[2]) * 256 +
    Number(parts[3]);

  const mask = 0xffffffff >>> (32 - prefix);
  const hosts = 2 ** (32 - prefix) - 1;
  const end = start + hosts;

  return { start, end };
}

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function importGeoip() {
  console.log("Importing GeoLite2 Country data into geoip_blocks...\n");

  // ── Check files exist ──────────────────────────────────────────────────
  if (!fs.existsSync(BLOCKS_CSV)) {
    console.error(`ERROR: Blocks CSV not found at ${BLOCKS_CSV}`);
    console.error("Download GeoLite2-Country-Blocks-IPv4.csv from MaxMind.");
    process.exit(1);
  }
  if (!fs.existsSync(LOCATIONS_CSV)) {
    console.error(`ERROR: Locations CSV not found at ${LOCATIONS_CSV}`);
    console.error("Download GeoLite2-Country-Locations-en.csv from MaxMind.");
    process.exit(1);
  }

  // ── Ensure geoip_blocks table exists ────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS geoip_blocks (
      network_start_ip INTEGER NOT NULL,
      network_end_ip   INTEGER NOT NULL,
      geoname_id       INTEGER,
      country_iso_code TEXT,
      country_name     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_geoip_start ON geoip_blocks (network_start_ip);
  `);

  // ── Load locations into a Map ──────────────────────────────────────────
  const locations = new Map();
  const locRl = readline.createInterface({
    input: fs.createReadStream(LOCATIONS_CSV),
  });

  let locHeader = null;
  for await (const line of locRl) {
    if (!locHeader) {
      locHeader = parseCsvLine(line);
      continue;
    }
    const cols = parseCsvLine(line);
    // Columns: geoname_id, locale_code, continent_code, continent_name,
    //   country_iso_code, country_name, ...
    const geonameId = Number(cols[0]);
    if (!isNaN(geonameId)) {
      locations.set(geonameId, {
        iso: cols[4] || null,
        name: cols[5] || null,
      });
    }
  }
  console.log(`Loaded ${locations.size} location records.`);

  // ── Import blocks with a transaction for speed ─────────────────────────
  const insert = db.prepare(`
    INSERT INTO geoip_blocks (network_start_ip, network_end_ip, geoname_id, country_iso_code, country_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Clear existing data
  db.exec("DELETE FROM geoip_blocks");

  const importTxn = db.transaction(() => {
    const blocksRl = readline.createInterface({
      input: fs.createReadStream(BLOCKS_CSV),
    });

    let header = null;
    let count = 0;
    let skipped = 0;

    // We must use a sync approach inside the transaction
    const lines = fs.readFileSync(BLOCKS_CSV, "utf8").split("\n");
    for (const line of lines) {
      if (!header) {
        header = line;
        continue;
      }
      if (!line.trim()) continue;

      const cols = parseCsvLine(line);
      const network = cols[0]; // e.g. "1.0.0.0/24"
      const geonameId = Number(cols[1]);
      const range = cidrToRange(network);

      if (!range) {
        skipped++;
        continue;
      }

      const loc = locations.get(geonameId);
      insert.run(
        range.start,
        range.end,
        geonameId || null,
        loc ? loc.iso : null,
        loc ? loc.name : null,
      );
      count++;

      if (count % 50000 === 0) {
        process.stdout.write(`  Imported ${count} blocks...\r`);
      }
    }

    console.log(`\nImported ${count} blocks (${skipped} skipped).`);
  });

  importTxn();
  console.log("Done. geoip_blocks table is ready.\n");
}

importGeoip().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
