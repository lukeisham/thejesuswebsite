/**
 * Static reliability-signal dictionary for the Wikipedia quality grid widget.
 * Identical for every article, so it lives here rather than in the
 * database — `wikipedia_article_signals` only stores the per-article numbers
 * (contribution, cap); this module supplies the display name, polarity, and
 * plain-English statement logic.
 *
 * Order: exactly the §9 row order of
 * `setup/Wikipedia algorithm v2/Wikipedia_alogrithm_refractor.md` — strongest
 * positive signal first, strongest negative signal last. This is the same
 * order the 5×5 grid renders in (row-major, left to right, top to bottom) and
 * must never be re-sorted; the grid's gradient reading (top-left = earn
 * score, bottom-right = lose score) depends on it.
 *
 * Each `key` is identical, one-to-one, to `KNOWN_SIGNAL_KEYS` in
 * `api/scripts/import-wikipedia-scoring.js` — see the key-parity test in
 * `wikipedia-signals.test.js`.
 *
 * @module utils/wikipedia-signals
 */

/**
 * @typedef {Object} SignalDictEntry
 * @property {string} key - Matches `signal_key` in `wikipedia_article_signals`.
 * @property {string} name - Official display name.
 * @property {number} capMagnitude - Absolute value of this signal's cap.
 * @property {'positive'|'negative'} polarity
 */

/** @type {SignalDictEntry[]} */
export const SIGNAL_DICTIONARY = [
  // ─── §9 row order — do not re-sort ──────────────────────────────────────
  { key: 'manuscripts', name: 'Named manuscripts', capMagnitude: 8, polarity: 'positive' },
  { key: 'bible_verses', name: 'Bible verses cited', capMagnitude: 12, polarity: 'positive' },
  // Bidirectional (+10/-3/-5/0, §9 row 3) — listed under 'positive' since its best-case
  // magnitude dominates; a negative contribution here still renders correctly via
  // buildStatement()'s sign-agnostic ratio math, it just reads as "partial credit" rather
  // than "penalty" in the -3/-5 cases.
  { key: 'narrative_interp_split', name: 'Narrative/interpretation section split', capMagnitude: 10, polarity: 'positive' },
  { key: 'commentaries', name: 'Commentary citations', capMagnitude: 6, polarity: 'positive' },
  { key: 'balanced_debate', name: 'Balanced debate', capMagnitude: 12, polarity: 'positive' },
  { key: 'ante_nicene', name: 'Ante-Nicene authors', capMagnitude: 6, polarity: 'positive' },
  { key: 'arch_site', name: 'Archaeological site/artefact', capMagnitude: 8, polarity: 'positive' },
  { key: 'jewish_context', name: 'Jewish context terms', capMagnitude: 6, polarity: 'positive' },
  { key: 'ancient_historians', name: 'Non-Christian ancient historians', capMagnitude: 6, polarity: 'positive' },
  { key: 'literary_analysis', name: 'Literary analysis', capMagnitude: 6, polarity: 'positive' },
  { key: 'primary_quotes', name: 'Primary-source quotes', capMagnitude: 4, polarity: 'positive' },
  { key: 'journal_or_book', name: 'Journal/book citations', capMagnitude: 4, polarity: 'positive' },
  { key: 'maps_diagrams', name: 'Maps and diagrams', capMagnitude: 2, polarity: 'positive' },
  { key: 'wiki_quality', name: 'Wikipedia Good/Featured Article', capMagnitude: 1, polarity: 'positive' },
  { key: 'religious_art', name: 'Religious art', capMagnitude: 1, polarity: 'positive' },
  { key: 'gnostic_over_emphasis', name: 'Gnostic over-emphasis', capMagnitude: 4, polarity: 'negative' },
  { key: 'confessional_balance', name: 'Confessional balance', capMagnitude: 3, polarity: 'negative' },
  { key: 'other_religion', name: 'Other-religion sources', capMagnitude: 3, polarity: 'negative' },
  { key: 'jesus_seminar', name: 'Jesus Seminar citations', capMagnitude: 14, polarity: 'negative' },
  { key: 'ot_nt_criticism', name: 'OT-NT continuity criticism', capMagnitude: 6, polarity: 'negative' },
  { key: 'mythicist', name: 'Mythicist citations', capMagnitude: 16, polarity: 'negative' },
  { key: 'supernatural_criticism', name: 'Supernatural-worldview criticism', capMagnitude: 8, polarity: 'negative' },
  { key: 'secular_materialist', name: 'Secular-materialist presuppositions', capMagnitude: 8, polarity: 'negative' },
  { key: 'referencing_quality', name: 'Referencing quality', capMagnitude: 9, polarity: 'negative' },
  { key: 'no_bible_verse', name: 'No Bible verse cited', capMagnitude: 10, polarity: 'negative' },
];

/** Lookup map built once for O(1) access by `signal_key`. */
const SIGNAL_BY_KEY = new Map(SIGNAL_DICTIONARY.map((entry) => [entry.key, entry]));

/**
 * @param {string} key
 * @returns {SignalDictEntry|undefined}
 */
export function getSignalDictEntry(key) {
  return SIGNAL_BY_KEY.get(key);
}

/**
 * How fully a signal fired, as a 0..1 ratio of |contribution| to |cap|.
 *
 * @param {number} contribution
 * @param {number} cap
 * @returns {number}
 */
export function fulfilmentRatio(contribution, cap) {
  if (!cap) return 0;
  const ratio = Math.abs(contribution) / Math.abs(cap);
  return Math.min(Math.max(ratio, 0), 1);
}

/**
 * Build the plain-English sentence describing whether and how far a signal
 * applied to an article, calibrated in tone against the approved mockup
 * (e.g. "Cites Bible verses (maximum credit)") but templated so it works for
 * any signal/contribution/cap combination rather than hardcoded per key.
 *
 * @param {SignalDictEntry} signalDictEntry
 * @param {number} contribution - Points earned for this article (can be negative).
 * @param {number} cap - This signal's max magnitude for this article (can be negative).
 * @returns {string}
 */
export function buildStatement(signalDictEntry, contribution, cap) {
  if (!signalDictEntry) return '';

  const { name, polarity } = signalDictEntry;
  const label = name.charAt(0).toLowerCase() + name.slice(1);
  const ratio = fulfilmentRatio(contribution, cap);

  if (polarity === 'negative') {
    if (ratio <= 0) return `No penalty from ${label}.`;
    if (ratio >= 0.95) return `Full penalty from ${label} (${contribution} of ${cap} points).`;
    return `Partial penalty from ${label} (${contribution} of ${cap} points).`;
  }

  if (ratio <= 0) return `No credit for ${label}.`;
  if (ratio >= 0.95) return `Full credit for ${label} (maximum ${cap} points).`;
  return `Partial credit for ${label} (${contribution} of ${cap} points).`;
}
