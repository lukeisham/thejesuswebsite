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

/**
 * Build the display strings for a "Created: …, Edited: …" metadata line.
 * Compares calendar days in UTC (not the visitor's local timezone) so
 * DB-backed pages (SQLite `CURRENT_TIMESTAMP`) and the git-stamped about
 * page (`git log --format=%aI`) behave identically regardless of who's
 * viewing. `edited` is `null` whenever `updatedAt`'s UTC calendar day is not
 * later than `createdAt`'s.
 *
 * @param {string|null|undefined} createdAt - ISO 8601 date string.
 * @param {string|null|undefined} updatedAt - ISO 8601 date string.
 * @returns {{created: string, edited: string|null}}
 *
 * @example
 * formatCreatedEdited("2026-07-19", "2026-07-19")  // { created: "19 July 2026", edited: null }
 * formatCreatedEdited("2026-07-19", "2026-07-21")  // { created: "19 July 2026", edited: "21 July 2026" }
 * formatCreatedEdited(null, "2026-07-21")          // { created: "—", edited: null }
 */
export function formatCreatedEdited(createdAt, updatedAt) {
  const created = formatDate(createdAt);

  const createdDate = typeof createdAt === "string" ? new Date(createdAt) : null;
  if (!createdDate || isNaN(createdDate.getTime())) {
    return { created, edited: null };
  }

  const updatedDate =
    typeof updatedAt === "string" && updatedAt.length > 0
      ? new Date(updatedAt)
      : null;
  if (!updatedDate || isNaN(updatedDate.getTime())) {
    return { created, edited: null };
  }

  const createdDay = Date.UTC(
    createdDate.getUTCFullYear(),
    createdDate.getUTCMonth(),
    createdDate.getUTCDate(),
  );
  const updatedDay = Date.UTC(
    updatedDate.getUTCFullYear(),
    updatedDate.getUTCMonth(),
    updatedDate.getUTCDate(),
  );

  return {
    created,
    edited: updatedDay > createdDay ? formatDate(updatedAt) : null,
  };
}

/**
 * Insert an italic "Created: …[, Edited: …]" paragraph immediately before
 * the universal site footer. No-ops if no `.site-footer` element exists in
 * the document (JS-2 — defensive, not an error: not every template has
 * landed the universal footer).
 *
 * @param {string|null|undefined} createdAt - ISO 8601 date string.
 * @param {string|null|undefined} updatedAt - ISO 8601 date string.
 */
export function renderCreatedEditedLine(createdAt, updatedAt) {
  const siteFooter = document.querySelector(".site-footer");
  if (!siteFooter) return;

  const { created, edited } = formatCreatedEdited(createdAt, updatedAt);

  const p = document.createElement("p");
  p.className = "created-edited-line";
  p.textContent = edited
    ? `Created: ${created}, Edited: ${edited}`
    : `Created: ${created}`;

  siteFooter.before(p);
}
