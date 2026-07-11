/**
 * Safe date formatting utilities for the frontend.
 *
 * Every function here guarantees a string return value (never "Invalid Date"),
 * so callers can interpolate the result directly into DOM content without
 * conditional checks.
 *
 * These replace the ad-hoc `new Date(x).toLocaleDateString(...)` patterns
 * scattered across ~10 frontend files that currently produce "Invalid Date"
 * in the UI when the input is null, undefined, or un-parseable.
 *
 * @module utils/date-format
 */

/**
 * Format an ISO 8601 date string into a long-form date for display.
 * Returns a fallback string (default "—") when the date is invalid,
 * missing, or un-parseable.
 *
 * @param {string|null|undefined} iso           - ISO 8601 date string.
 * @param {string}                [fallback="—"] - Returned for invalid/missing dates.
 * @returns {string} Formatted date or fallback.
 *
 * @example
 * formatDate("2024-03-15")            // "15 March 2024" (defaults to en-NZ / en-GB)
 * formatDate(null)                    // "—"
 * formatDate("bad-date", "Unknown")   // "Unknown"
 */
export function formatDate(iso, fallback = "\u2014") {
  if (typeof iso !== "string" || iso.length === 0) return fallback;

  const date = new Date(iso);
  if (isNaN(date.getTime())) return fallback;

  try {
    return new Intl.DateTimeFormat("en-NZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return fallback;
  }
}

/**
 * Format an ISO 8601 date string into a short-form date (e.g. "15/03/2024").
 * Handles the same edge cases as `formatDate`.
 *
 * @param {string|null|undefined} iso           - ISO 8601 date string.
 * @param {string}                [fallback="—"] - Returned for invalid/missing dates.
 * @returns {string} Short formatted date or fallback.
 *
 * @example
 * formatDateShort("2024-03-15")  // "15/03/2024"
 * formatDateShort(null)          // "—"
 */
export function formatDateShort(iso, fallback = "\u2014") {
  if (typeof iso !== "string" || iso.length === 0) return fallback;

  const date = new Date(iso);
  if (isNaN(date.getTime())) return fallback;

  try {
    return new Intl.DateTimeFormat("en-NZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return fallback;
  }
}

/**
 * Stable date-aware sort comparator for Array.prototype.sort.
 * Items with invalid, missing, or un-parseable dates are pushed to the end
 * (ascending) so they never corrupt the sort or interleave unpredictably.
 *
 * @param {Object} a                - First item.
 * @param {Object} b                - Second item.
 * @param {string} dateField        - Property name holding the ISO date string.
 * @param {string} [direction="desc"] - "asc" or "desc".
 * @returns {number} -1, 0, or 1 (never NaN).
 *
 * @example
 * posts.sort((a, b) => sortByDate(a, b, "published_at", "desc"))
 */
export function sortByDate(a, b, dateField, direction = "desc") {
  const dateA = a && a[dateField] ? new Date(a[dateField]) : null;
  const dateB = b && b[dateField] ? new Date(b[dateField]) : null;

  const validA = dateA && !isNaN(dateA.getTime());
  const validB = dateB && !isNaN(dateB.getTime());

  // Both invalid → keep original order (stable)
  if (!validA && !validB) return 0;
  // Only A invalid → push to end
  if (!validA) return 1;
  // Only B invalid → push to end
  if (!validB) return -1;

  const result = dateA.getTime() < dateB.getTime()
    ? -1
    : dateA.getTime() > dateB.getTime()
      ? 1
      : 0;

  return direction === "desc" ? -result : result;
}
