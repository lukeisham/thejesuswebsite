/**
 * GeoIP lookup service — zero npm dependencies (SR-2).
 *
 * Resolves an IPv4 address to a country name using a local SQLite
 * `geoip_blocks` table populated from MaxMind's GeoLite2 Country CSV.
 * Returns `null` for private/local addresses and when the lookup table
 * is empty — analytics must never break the site (JS-2).
 *
 * The lookup converts IPv4 dotted-decimal strings to unsigned 32-bit
 * integers using arithmetic (a*2**24 + b*2**16 + c*256 + d), NOT JS
 * bitwise ops — `(a<<24)` overflows the signed 32-bit range for first
 * octets >= 128 and would never match half the internet.
 *
 * @module services/geoip
 */

const db = require("../config");

/** Prepared statement, cached after first call. */
let lookupStmt = null;

/**
 * Convert an IPv4 dotted-decimal string to an unsigned 32-bit integer.
 * Arithmetic only — no bitwise operators (they clamp to signed int32).
 *
 * @param {string} ip - e.g. "8.8.8.8"
 * @returns {number}
 */
function ipToInteger(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return NaN;
  return (
    Number(parts[0]) * 16777216 + // 2^24
    Number(parts[1]) * 65536 +    // 2^16
    Number(parts[2]) * 256 +      // 2^8
    Number(parts[3])
  );
}

/**
 * Return true if the IP is a private/local address that should
 * not be looked up in the GeoIP table.
 *
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  const a = Number(parts[0]);
  const b = Number(parts[1]);

  // 10.x.x.x, 127.x.x.x
  if (a === 10 || a === 127) return true;
  // 172.16.x.x – 172.31.x.x
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.x.x
  if (a === 192 && b === 168) return true;
  // 0.x.x.x, 169.254.x.x (link-local)
  if (a === 0 || (a === 169 && b === 254)) return true;

  return false;
}

/**
 * Look up the country name for an IPv4 address.
 *
 * @param {string} ip - IPv4 address string (e.g. "8.8.8.8").
 * @returns {{ country: string|null }} Country name or null if not found / private / no table.
 */
function lookup(ip) {
  if (!ip || typeof ip !== "string") return { country: null };

  // Express may prefix IPv4 with "::ffff:" when running behind a proxy
  const cleanIp = ip.replace(/^::ffff:/, "");

  // Only handle IPv4 for now — IPv6 returns null (see plan Notes)
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp)) {
    return { country: null };
  }

  // Skip private/local addresses
  if (isPrivateIp(cleanIp)) return { country: null };

  const ipInt = ipToInteger(cleanIp);
  if (isNaN(ipInt)) return { country: null };

  try {
    if (!lookupStmt) {
      // Find the block whose network_start_ip is at or below the target IP,
      // ordered descending so the first row is the largest matching start.
      lookupStmt = db.prepare(
        `SELECT country_name, network_end_ip
         FROM geoip_blocks
         WHERE network_start_ip <= ?
         ORDER BY network_start_ip DESC
         LIMIT 1`,
      );
    }

    const row = lookupStmt.get(ipInt);
    if (!row || row.network_end_ip < ipInt) {
      return { country: null };
    }

    return { country: row.country_name || null };
  } catch {
    // geoip_blocks table may not exist yet — never throw from analytics
    return { country: null };
  }
}

module.exports = { lookup, ipToInteger, isPrivateIp };
