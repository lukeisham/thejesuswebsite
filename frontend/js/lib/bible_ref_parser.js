/**
 * bible_ref_parser.js
 * Parses Bible reference strings (e.g. "Mk 4:35–41", "Isaiah 7:14")
 * into structured objects matching the Rust BibleBook enum names.
 */

// ── Book Name Mapping ─────────────────────────────────────────────
// Keys are lowercase; values are the Rust BibleBook enum variant names.
const BOOK_MAP = {
    // OT
    'genesis': 'Genesis', 'gen': 'Genesis',
    'exodus': 'Exodus', 'ex': 'Exodus', 'exod': 'Exodus',
    'leviticus': 'Leviticus', 'lev': 'Leviticus',
    'numbers': 'Numbers', 'num': 'Numbers',
    'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy', 'dt': 'Deuteronomy',
    'joshua': 'Joshua', 'josh': 'Joshua',
    'judges': 'Judges', 'judg': 'Judges',
    'ruth': 'Ruth',
    '1 samuel': 'FirstSamuel', '1 sam': 'FirstSamuel', '1samuel': 'FirstSamuel',
    '2 samuel': 'SecondSamuel', '2 sam': 'SecondSamuel', '2samuel': 'SecondSamuel',
    '1 kings': 'FirstKings', '1 kgs': 'FirstKings', '1kings': 'FirstKings',
    '2 kings': 'SecondKings', '2 kgs': 'SecondKings', '2kings': 'SecondKings',
    '1 chronicles': 'FirstChronicles', '1 chr': 'FirstChronicles', '1chronicles': 'FirstChronicles',
    '2 chronicles': 'SecondChronicles', '2 chr': 'SecondChronicles', '2chronicles': 'SecondChronicles',
    'ezra': 'Ezra',
    'nehemiah': 'Nehemiah', 'neh': 'Nehemiah',
    'esther': 'Esther', 'est': 'Esther',
    'job': 'Job',
    'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms',
    'proverbs': 'Proverbs', 'prov': 'Proverbs',
    'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes',
    'song of solomon': 'SongOfSolomon', 'song': 'SongOfSolomon',
    'isaiah': 'Isaiah', 'isa': 'Isaiah',
    'jeremiah': 'Jeremiah', 'jer': 'Jeremiah',
    'lamentations': 'Lamentations', 'lam': 'Lamentations',
    'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel',
    'daniel': 'Daniel', 'dan': 'Daniel',
    'hosea': 'Hosea', 'hos': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obadiah': 'Obadiah', 'obad': 'Obadiah',
    'jonah': 'Jonah',
    'micah': 'Micah', 'mic': 'Micah',
    'nahum': 'Nahum', 'nah': 'Nahum',
    'habakkuk': 'Habakkuk', 'hab': 'Habakkuk',
    'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah',
    'haggai': 'Haggai', 'hag': 'Haggai',
    'zechariah': 'Zechariah', 'zech': 'Zechariah',
    'malachi': 'Malachi', 'mal': 'Malachi',

    // NT
    'matthew': 'Matthew', 'matt': 'Matthew', 'mt': 'Matthew',
    'mark': 'Mark', 'mk': 'Mark',
    'luke': 'Luke', 'lk': 'Luke',
    'john': 'John', 'jn': 'John',
    'acts': 'Acts',
    'romans': 'Romans', 'rom': 'Romans',
    '1 corinthians': 'FirstCorinthians', '1 cor': 'FirstCorinthians', '1corinthians': 'FirstCorinthians',
    '2 corinthians': 'SecondCorinthians', '2 cor': 'SecondCorinthians', '2corinthians': 'SecondCorinthians',
    'galatians': 'Galatians', 'gal': 'Galatians',
    'ephesians': 'Ephesians', 'eph': 'Ephesians',
    'philippians': 'Philippians', 'phil': 'Philippians',
    'colossians': 'Colossians', 'col': 'Colossians',
    '1 thessalonians': 'FirstThessalonians', '1 thess': 'FirstThessalonians',
    '2 thessalonians': 'SecondThessalonians', '2 thess': 'SecondThessalonians',
    '1 timothy': 'FirstTimothy', '1 tim': 'FirstTimothy',
    '2 timothy': 'SecondTimothy', '2 tim': 'SecondTimothy',
    'titus': 'Titus',
    'philemon': 'Philemon', 'phlm': 'Philemon',
    'hebrews': 'Hebrews', 'heb': 'Hebrews',
    'james': 'James', 'jas': 'James',
    '1 peter': 'FirstPeter', '1 pet': 'FirstPeter',
    '2 peter': 'SecondPeter', '2 pet': 'SecondPeter',
    '1 john': 'FirstJohn', '1 jn': 'FirstJohn',
    '2 john': 'SecondJohn', '2 jn': 'SecondJohn',
    '3 john': 'ThirdJohn', '3 jn': 'ThirdJohn',
    'jude': 'Jude',
    'revelation': 'Revelation', 'rev': 'Revelation',
};

/**
 * Normalise a book abbreviation to the Rust BibleBook enum name.
 * @param {string} raw — e.g. "Mk", "Isaiah", "1 Sam"
 * @returns {string|null} — e.g. "Mark", "Isaiah", "FirstSamuel", or null
 */
export function normalizeBookName(raw) {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    return BOOK_MAP[key] || null;
}

/**
 * Parse a single Bible reference string into a structured object.
 * Handles: "Mk 4:35–41", "Matthew 14:28", "Isaiah 53", "Jn 2", "(Mt 1:23)"
 *
 * @param {string} refStr — raw Bible reference string
 * @returns {{book: string, chapter: number, verse: number}|null}
 */
export function parseBibleRef(refStr) {
    if (!refStr) return null;

    // Strip parentheses, leading/trailing whitespace
    let s = refStr.replace(/[()]/g, '').trim();
    if (!s) return null;

    // Regex: optional number prefix (1/2/3) + book name + chapter:verse or chapter only
    // Group 1: optional number prefix (e.g. "1 ", "2 ")
    // Group 2: book name
    // Group 3: chapter (required)
    // Group 4: verse start (optional)
    const re = /^(\d\s*)?([A-Za-z][A-Za-z\s]*?)\s+(\d+)(?:\s*[:\.]\s*(\d+))?/;
    const m = s.match(re);
    if (!m) return null;

    const prefix = m[1] ? m[1].trim() : '';
    const bookRaw = (prefix ? prefix + ' ' : '') + m[2].trim();
    const chapter = parseInt(m[3], 10);
    const verse = m[4] ? parseInt(m[4], 10) : 1; // default verse 1 for chapter-only

    const book = normalizeBookName(bookRaw);
    if (!book) return null;

    if (chapter < 1 || verse < 1) return null;

    return { book, chapter, verse };
}

/**
 * Split a multi-reference string into individual reference strings.
 * Handles semicolons, commas (when followed by a book name or number prefix).
 *
 * @param {string} str — e.g. "Lk 5:1–11; Jn 21:1–14" or "Matthew 8:16–17, Mark 1:32–34"
 * @returns {string[]}
 */
export function splitMultipleRefs(str) {
    if (!str) return [];
    // Split on semicolons first
    const parts = str.split(/\s*;\s*/);
    const result = [];
    for (const part of parts) {
        // Split on commas only if followed by a book-like pattern (letter or digit+letter)
        const subParts = part.split(/,\s*(?=\d?\s*[A-Z])/i);
        for (const sp of subParts) {
            const trimmed = sp.trim();
            if (trimmed) result.push(trimmed);
        }
    }
    return result;
}

/**
 * Extract parenthetical Bible references from a text string.
 * e.g. "applied to the nativity (Mt 1:23)." → ["Mt 1:23"]
 *
 * @param {string} text
 * @returns {string[]} — array of ref strings found inside parentheses
 */
export function extractParentheticalRefs(text) {
    if (!text) return [];
    const matches = text.match(/\(([^)]+)\)/g) || [];
    const refs = [];
    for (const m of matches) {
        const inner = m.slice(1, -1).trim();
        // Only keep if it looks like a Bible ref (starts with letter or digit+letter)
        if (/^\d?\s*[A-Za-z]/.test(inner) && parseBibleRef(inner)) {
            refs.push(inner);
        }
    }
    return refs;
}
