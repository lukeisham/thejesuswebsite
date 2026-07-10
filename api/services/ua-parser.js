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
  } else if (
    lower.includes("msie ") ||
    lower.includes("trident/")
  ) {
    browser = "Internet Explorer";
  }

  return { device_type, browser, os };
}

module.exports = { parse };
