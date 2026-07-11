/**
 * Minimal user-agent parser — zero dependencies (SR-2).
 *
 * Extracts device_type, browser, and OS from a user-agent string using
 * regex patterns targeting the top ~95% of web traffic. Exotic browsers
 * and OS versions fall through to `null` — acceptable for a first pass.
 *
 * @module services/ua-parser
 */

/**
 * Parse a user-agent string and return device/browser/OS details.
 *
 * @param {string|null|undefined} ua - The raw user-agent header value.
 * @returns {{ device_type: 'mobile'|'desktop'|'tablet'|null, browser: string|null, os: string|null }}
 */
function parse(ua) {
  if (!ua || typeof ua !== "string") {
    return { device_type: null, browser: null, os: null };
  }

  const lower = ua.toLowerCase();

  // ── OS detection (order matters — iOS reports "like Mac OS X") ──────

  let os = null;
  if (lower.includes("windows nt")) {
    os = "Windows";
  } else if (lower.includes("iphone") || lower.includes("ipod")) {
    os = "iOS";
  } else if (lower.includes("ipad")) {
    os = "iPadOS";
  } else if (lower.includes("mac os x")) {
    os = "macOS";
  } else if (lower.includes("android")) {
    os = "Android";
  } else if (lower.includes("linux") || lower.includes("x11")) {
    os = "Linux";
  }

  // ── Device type ──────────────────────────────────────────────────────

  let device_type = "desktop";
  if (
    lower.includes("iphone") ||
    lower.includes("ipod") ||
    lower.includes("android") ||
    lower.includes("windows phone")
  ) {
    device_type = "mobile";
  } else if (
    lower.includes("ipad") ||
    (lower.includes("android") && !lower.includes("mobile"))
  ) {
    device_type = "tablet";
  } else if (lower.includes("tablet") || lower.includes("playbook")) {
    device_type = "tablet";
  }

  // ── Browser ──────────────────────────────────────────────────────────

  let browser = null;
  if (lower.includes("edg/") || lower.includes("edge/")) {
    browser = "Edge";
  } else if (lower.includes("opr/") || lower.includes("opera")) {
    browser = "Opera";
  } else if (
    lower.includes("chrome") &&
    !lower.includes("edg") &&
    !lower.includes("opr")
  ) {
    browser = "Chrome";
  } else if (lower.includes("safari") && !lower.includes("chrome")) {
    browser = "Safari";
  } else if (lower.includes("firefox")) {
    browser = "Firefox";
  } else if (lower.includes("msie ") || lower.includes("trident/")) {
    browser = "Internet Explorer";
  }

  return { device_type, browser, os };
}

/**
 * Detect whether a user-agent string belongs to a known bot/crawler.
 * Best-effort substring matching — sophisticated bots that spoof browser
 * UAs will not be detected. Returns false for null/empty input (JS-2).
 *
 * @param {string|null|undefined} ua - The raw user-agent header value.
 * @returns {boolean}
 */
function isBot(ua) {
  if (!ua || typeof ua !== "string") return false;

  const lower = ua.toLowerCase();

  // Well-known bot tokens — add new ones as they appear in logs.
  const botTokens = [
    "googlebot",
    "bingbot",
    "msnbot",
    "slurp", // Yahoo
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "facebookexternalhit",
    "twitterbot",
    "ahrefsbot",
    "semrushbot",
    "mj12bot", // Majestic
    "dotbot", // Moz
    "rogerbot", // Moz
    "screaming frog",
    "sitebulb",
    "petalbot", // Huawei
    "applebot",
    "linkedinbot",
    "telegrambot",
    "discordbot",
    "whatsapp",
    "pinterest",
    "crawler", // Generic catch-all
    "spider", // Generic catch-all
    "bot/", // Generic catch-all (bot/1.0)
  ];

  for (let i = 0; i < botTokens.length; i++) {
    if (lower.includes(botTokens[i])) return true;
  }

  return false;
}

/**
 * Extract search terms from a search-engine referrer URL.
 * Parses the query parameter used by known engines (Google, Bing, DDG,
 * Yahoo, Yandex). Returns null if the referrer is missing, empty, or not
 * from a recognised search engine.
 *
 * URL-decodes the extracted query string (e.g. "historical+jesus" → "historical jesus").
 *
 * @param {string|null|undefined} referrer - The raw referrer header value.
 * @returns {string|null}
 */
function parseSearchTerms(referrer) {
  if (!referrer || typeof referrer !== "string") return null;

  const lower = referrer.toLowerCase();

  // Map of search engine hostname fragments to query-param names.
  const engines = [
    { host: "google.", param: "q" },
    { host: "bing.", param: "q" },
    { host: "duckduckgo.", param: "q" },
    { host: "search.yahoo.", param: "p" },
    { host: "yandex.", param: "text" },
  ];

  let paramName = null;
  for (let i = 0; i < engines.length; i++) {
    if (lower.includes(engines[i].host)) {
      paramName = engines[i].param;
      break;
    }
  }

  if (!paramName) return null;

  // Extract the query parameter value.
  try {
    const url = new URL(referrer);
    const raw = url.searchParams.get(paramName);
    if (!raw || !raw.trim()) return null;
    // Decode + and %XX encoding, limit to 200 chars to prevent abuse.
    return (
      decodeURIComponent(raw.replace(/\+/g, " ")).slice(0, 200).trim() || null
    );
  } catch {
    // Malformed URL — not a valid referrer.
    return null;
  }
}

module.exports = { parse, isBot, parseSearchTerms };
