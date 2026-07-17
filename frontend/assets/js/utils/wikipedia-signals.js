/**
 * Static reliability-signal dictionary for the Wikipedia "reliability stones"
 * widget. Identical for every article, so it lives here rather than in the
 * database — `wikipedia_article_signals` only stores the per-article numbers
 * (contribution, cap); this module supplies the display name, polarity, and
 * plain-English statement logic.
 *
 * Order: positives first (highest cap magnitude first), then negatives
 * (largest penalty magnitude first) — matches the approved stone-wall mockup
 * and the §6 Wikipedia Quality Grid tables in the style guide.
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
  // ─── Positive signals, highest cap magnitude first ─────────────────────────
  { key: 'bible_verses', name: 'Bible verses cited', capMagnitude: 9, polarity: 'positive' },
  { key: 'manuscripts', name: 'Named manuscripts', capMagnitude: 6, polarity: 'positive' },
  { key: 'ante_nicene', name: 'Ante-Nicene authors', capMagnitude: 6, polarity: 'positive' },
  { key: 'journals', name: 'Journal citations', capMagnitude: 5, polarity: 'positive' },
  { key: 'books', name: 'Book citations', capMagnitude: 5, polarity: 'positive' },
  { key: 'primary_quotes', name: 'Primary-source quotes', capMagnitude: 4, polarity: 'positive' },
  { key: 'jewish_context', name: 'Jewish context terms', capMagnitude: 4, polarity: 'positive' },
  { key: 'balanced_debate', name: 'Balanced debate', capMagnitude: 2, polarity: 'positive' },
  { key: 'narrative_interp_split', name: 'Narrative/interpretation section split', capMagnitude: 3, polarity: 'positive' },
  { key: 'location_bonus', name: 'Location + archaeology bonus', capMagnitude: 3, polarity: 'positive' },
  { key: 'commentaries', name: 'Commentary citations', capMagnitude: 3, polarity: 'positive' },
  { key: 'ancient_historians', name: 'Non-Christian ancient historians', capMagnitude: 3, polarity: 'positive' },
  { key: 'arch_site', name: 'Archaeological site/artefact', capMagnitude: 2, polarity: 'positive' },
  { key: 'historical_context', name: 'Historical/contextual comparanda', capMagnitude: 2, polarity: 'positive' },
  { key: 'wiki_quality', name: 'Wikipedia Good/Featured Article', capMagnitude: 1, polarity: 'positive' },
  { key: 'niche_bonus', name: 'Niche exposure bonus', capMagnitude: 1, polarity: 'positive' },

  // ─── Negative signals, largest penalty magnitude first ─────────────────────
  { key: 'no_bible_verse', name: 'No Bible verse cited', capMagnitude: 10, polarity: 'negative' },
  { key: 'mythicist', name: 'Mythicist citations', capMagnitude: 9, polarity: 'negative' },
  { key: 'no_references', name: 'No references at all', capMagnitude: 8, polarity: 'negative' },
  { key: 'jesus_seminar', name: 'Jesus Seminar citations', capMagnitude: 6, polarity: 'negative' },
  { key: 'ot_nt_criticism', name: 'OT-NT continuity criticism', capMagnitude: 6, polarity: 'negative' },
  { key: 'supernatural_criticism', name: 'Supernatural-worldview criticism', capMagnitude: 6, polarity: 'negative' },
  { key: 'passion_criticism', name: 'Passion-specific criticism', capMagnitude: 6, polarity: 'negative' },
  { key: 'miracle_criticism', name: 'Miracle-specific criticism', capMagnitude: 6, polarity: 'negative' },
  { key: 'other_religion', name: 'Other-religion sources', capMagnitude: 3, polarity: 'negative' },
  { key: 'confessional_balance', name: 'Confessional balance', capMagnitude: 3, polarity: 'negative' },
  { key: 'gnostic_quoted', name: 'Gnostic source quoted', capMagnitude: 1, polarity: 'negative' },
  { key: 'poor_referencing', name: 'Poor referencing', capMagnitude: 1, polarity: 'negative' },
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
