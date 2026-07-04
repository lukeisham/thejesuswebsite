/**
 * Formatting utilities: dates, slugs, truncation, verse references.
 *
 * @module utils/format
 */

/**
 * Format an ISO 8601 date string into a long-form localised date.
 *
 * @param {string} iso - ISO 8601 date string.
 * @param {string} [locale] - BCP 47 locale tag (defaults to browser locale).
 * @returns {string} Formatted date string. Returns the input unchanged on error.
 *
 * @example
 * formatDate('2024-03-15') // 'March 15, 2024' (en-US)
 */
export function formatDate(iso, locale) {
  if (typeof iso !== 'string' || iso.length === 0) return iso;

  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale || undefined, options).format(date);
  } catch {
    return iso;
  }
}

/**
 * Convert a string into a URL-safe slug.
 *
 * @param {string} str
 * @returns {string} Lowercase, hyphenated slug.
 *
 * @example
 * formatSlug('Jesus of Nazareth') // 'jesus-of-nazareth'
 */
export function formatSlug(str) {
  if (typeof str !== 'string') return '';

  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Truncate a string to `n` characters, appending an ellipsis if truncated.
 *
 * @param {string} str
 * @param {number} n - Maximum character count (including ellipsis).
 * @returns {string}
 */
export function truncate(str, n) {
  if (typeof str !== 'string') return '';
  if (typeof n !== 'number' || n <= 0) return str;

  if (str.length <= n) return str;
  return str.slice(0, n - 1).trimEnd() + '…';
}

/**
 * Format a biblical verse reference into a styled string.
 *
 * @param {string} ref - The verse reference (e.g. "John 3:16").
 * @returns {string} Formatted reference.
 */
export function formatVerse(ref) {
  if (typeof ref !== 'string' || ref.length === 0) return '';

  // Capitalise book name, normalise spacing around colon
  return ref
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s*:\s*/g, ':')
    .trim();
}
