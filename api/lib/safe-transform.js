/**
 * Defensive transformation helpers — pure functions that handle common
 * failure patterns during data processing so callers never have to write
 * the same null/undefined/type-guard boilerplate twice.
 *
 * Every function here follows JS-2 (defensive programming): validate inputs,
 * return safe fallbacks instead of throwing, never fail silently with
 * corrupted output.
 *
 * All functions are synchronous and pure — no database, no HTTP, no side
 * effects.
 *
 * @module lib/safe-transform
 */

// ── String Operations ────────────────────────────────────────────────────────

/**
 * Split a string by a delimiter, returning an empty array for non-string
 * or empty input instead of throwing.
 *
 * @param {string|null|undefined} str       - Input to split.
 * @param {string}                delimiter - Delimiter to split on.
 * @returns {string[]} Array of segments. Never null/undefined.
 *
 * @example
 * safeSplit("a,b,c", ",")   // ["a", "b", "c"]
 * safeSplit(null, ",")       // []
 * safeSplit("", ",")         // []
 */
function safeSplit(str, delimiter) {
  if (typeof str !== "string" || str.length === 0) return [];
  if (typeof delimiter !== "string" || delimiter.length === 0) return [str];
  return str.split(delimiter);
}

/**
 * Convert a value to lowercase safely. Returns an empty string for non-strings
 * instead of throwing TypeError.
 *
 * @param {*} str - Value to lowercase.
 * @returns {string} Lowercased string, or "" for non-strings.
 *
 * @example
 * safeToLowerCase("Hello")   // "hello"
 * safeToLowerCase(null)      // ""
 * safeToLowerCase(123)       // ""
 */
function safeToLowerCase(str) {
  if (typeof str !== "string") return "";
  return str.toLowerCase();
}

/**
 * Generate a URL-safe slug from arbitrary input. Handles null, undefined,
 * numbers, and empty strings — never returns undefined.
 *
 * @param {*} text - Value to convert into a slug.
 * @returns {string} Lowercase hyphenated slug, or "" if no valid output.
 *
 * @example
 * safeSlug("Jesus of Nazareth")  // "jesus-of-nazareth"
 * safeSlug(null)                 // ""
 * safeSlug(42)                   // "42"
 */
function safeSlug(text) {
  if (text == null) return "";
  const raw = typeof text === "string" ? text : String(text);
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "";
}

// ── Date Operations ──────────────────────────────────────────────────────────

/**
 * Parse an ISO 8601 string into a Date, returning null for any invalid or
 * un-parseable input. Never returns an "Invalid Date" object.
 *
 * @param {string|null|undefined} isoString - ISO 8601 date string.
 * @returns {Date|null} A valid Date, or null.
 *
 * @example
 * safeDate("2024-03-15")   // Date object
 * safeDate("nope")          // null
 * safeDate(null)            // null
 */
function safeDate(isoString) {
  if (typeof isoString !== "string" || isoString.length === 0) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Format a date string for display. Returns the fallback string (default "—")
 * when the input is invalid, null, or parseable.
 *
 * @param {string|null|undefined} isoString - ISO 8601 date string.
 * @param {string}                [fallback="—"] - Fallback for invalid dates.
 * @param {string}                [locale]        - BCP 47 locale tag.
 * @returns {string} Formatted date or fallback.
 *
 * @example
 * safeFormatDate("2024-03-15")                       // "March 15, 2024" (en)
 * safeFormatDate(null)                                // "—"
 * safeFormatDate("bad-date", "Unknown")               // "Unknown"
 * safeFormatDate("2024-03-15", "—", "en-GB")          // "15 March 2024"
 */
function safeFormatDate(isoString, fallback = "\u2014", locale) {
  const date = safeDate(isoString);
  if (!date) return fallback;

  const options = { year: "numeric", month: "long", day: "numeric" };
  try {
    return new Intl.DateTimeFormat(locale || undefined, options).format(date);
  } catch {
    return fallback;
  }
}

// ── Array & Sort Operations ──────────────────────────────────────────────────

/**
 * Stable comparator for Array.prototype.sort that handles null, undefined,
 * and NaN values without corrupting the sort order or producing NaN.
 *
 * Items with missing or non-finite extracted values are pushed to the end
 * (ascending) or beginning (descending) depending on direction.
 *
 * @param {*}        a         - First item.
 * @param {*}        b         - Second item.
 * @param {Function} extractor - Function that returns a comparable value from an item.
 * @param {string}   [direction="asc"] - "asc" or "desc".
 * @returns {number} -1, 0, or 1 (never NaN).
 *
 * @example
 * items.sort((a, b) => safeSortCompare(a, b, (item) => item.score))
 */
function safeSortCompare(a, b, extractor, direction = "asc") {
  const valA = extractor(a);
  const valB = extractor(b);

  const aValid = valA != null && Number.isFinite(Number(valA));
  const bValid = valB != null && Number.isFinite(Number(valB));

  // Both invalid → keep original order (stable)
  if (!aValid && !bValid) return 0;
  // Only A invalid → push to end
  if (!aValid) return 1;
  // Only B invalid → push to end
  if (!bValid) return -1;

  const numA = Number(valA);
  const numB = Number(valB);

  const result = numA < numB ? -1 : numA > numB ? 1 : 0;
  return direction === "desc" ? -result : result;
}

// ── JSON Operations ──────────────────────────────────────────────────────────

/**
 * Parse a JSON string safely, returning a fallback value on any failure
 * instead of throwing SyntaxError.
 *
 * @param {string|null|undefined} raw      - JSON string to parse.
 * @param {*}                     fallback - Value returned when parsing fails.
 * @returns {*} Parsed object/array/value, or fallback.
 *
 * @example
 * safeParseJSON('{"a":1}')        // { a: 1 }
 * safeParseJSON('nope', [])       // []
 * safeParseJSON(null, {})         // {}
 */
function safeParseJSON(raw, fallback = null) {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ── URL / URI Operations ─────────────────────────────────────────────────────

/**
 * Encode a value for use in a URI component. Returns an empty string for
 * non-string inputs instead of the literal string "undefined" or "null".
 *
 * @param {*} str - Value to encode.
 * @returns {string} Encoded component, or "" for non-string inputs.
 *
 * @example
 * safeEncodeURIComponent("hello world")   // "hello%20world"
 * safeEncodeURIComponent(null)            // ""
 * safeEncodeURIComponent(undefined)       // ""
 */
function safeEncodeURIComponent(str) {
  if (typeof str !== "string") return "";
  if (str.length === 0) return "";
  return encodeURIComponent(str);
}

// ── Math / Numeric Operations ────────────────────────────────────────────────

/**
 * Divide two numbers safely, returning a fallback when the divisor is zero
 * or either operand is non-finite instead of producing NaN or Infinity.
 *
 * @param {number} a        - Dividend.
 * @param {number} b        - Divisor.
 * @param {number} [fallback=0] - Value returned on invalid division.
 * @returns {number} Quotient or fallback.
 *
 * @example
 * safeDiv(10, 2)    // 5
 * safeDiv(10, 0)    // 0
 * safeDiv(10, 0, 1)  // 1
 */
function safeDiv(a, b, fallback = 0) {
  if (
    typeof a !== "number" ||
    !Number.isFinite(a) ||
    typeof b !== "number" ||
    !Number.isFinite(b) ||
    b === 0
  ) {
    return fallback;
  }
  return a / b;
}

/**
 * Find the maximum value in an array safely. Returns the fallback when the
 * array is empty or contains only non-finite values.
 *
 * @param {number[]} values   - Array of numbers.
 * @param {number}   [fallback=0] - Returned when no valid max exists.
 * @returns {number} The maximum finite value, or fallback.
 *
 * @example
 * safeMax([1, 5, 3])       // 5
 * safeMax([])               // 0
 * safeMax([NaN, Infinity])  // 0
 * safeMax([], -1)           // -1
 */
function safeMax(values, fallback = 0) {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const finite = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return fallback;
  return Math.max(...finite);
}

module.exports = {
  safeSplit,
  safeToLowerCase,
  safeSlug,
  safeDate,
  safeFormatDate,
  safeSortCompare,
  safeParseJSON,
  safeEncodeURIComponent,
  safeDiv,
  safeMax,
};
