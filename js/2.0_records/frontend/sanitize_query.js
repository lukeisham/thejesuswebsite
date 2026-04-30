// =============================================================================
//
//   THE JESUS WEBSITE — QUERY SANITIZER
//   File:    js/2.0_records/frontend/sanitize_query.js
//   Version: 1.0.0
//   Purpose: Security utility to clean and validate user-supplied search input
//            and SQL strings before they are passed to the sql.js WASM engine.
//            Prevents SQL injection and enforces read-only query constraints.
//   Source:  module_sitemap.md §2.0, vibe_coding_rules.md §3
//
//   TRIGGER:  Loaded on any page that uses setup_db.js (must be loaded FIRST).
//             Called internally by TheJesusDB.runQuery() and TheJesusDB.searchRecords().
//   FUNCTION: sanitizeQuery(sql)      — validates and cleans raw SQL strings.
//             sanitizeSearchTerm(term) — strips dangerous chars from user input.
//   OUTPUT:   Safe SQL string or sanitized search term string.
//
// =============================================================================


// =============================================================================
//   sanitizeQuery
//   Validates a raw SQL string before execution in the WASM engine.
//   Enforces read-only access by blocking all write and DDL operations.
//
//   @param  {string} sql - A raw SQL query string from application code.
//   @return {string}     - The validated SQL string (unchanged if safe).
//   @throws {Error}      - If the SQL contains forbidden operations.
// =============================================================================

function sanitizeQuery(sql) {

    if (typeof sql !== 'string') {
        throw new Error('[sanitize_query.js] Query must be a string. Received: ' + typeof sql);
    }

    var trimmed = sql.trim();

    if (trimmed.length === 0) {
        throw new Error('[sanitize_query.js] Empty query string provided.');
    }

    // --- Block all write and DDL operations -----------------------------------
    //   This is a PUBLIC frontend — the WASM database is read-only by design.
    //   All writes go through the secure Python Admin API (admin_api.py).

    var FORBIDDEN_KEYWORDS = [
        'INSERT',
        'UPDATE',
        'DELETE',
        'DROP',
        'CREATE',
        'ALTER',
        'TRUNCATE',
        'REPLACE',
        'ATTACH',
        'DETACH',
        'PRAGMA',
        'VACUUM',
        'SAVEPOINT',
        'ROLLBACK',
        'COMMIT',
        'BEGIN'
    ];

    // Check against the uppercase version to be case-insensitive
    var upperSql = trimmed.toUpperCase();

    for (var i = 0; i < FORBIDDEN_KEYWORDS.length; i++) {
        var keyword = FORBIDDEN_KEYWORDS[i];

        // Match the keyword as a word boundary (not embedded in a column name)
        var pattern = new RegExp('\\b' + keyword + '\\b');

        if (pattern.test(upperSql)) {
            throw new Error(
                '[sanitize_query.js] Forbidden SQL operation detected: '
                + keyword + '. Only SELECT queries are permitted on the frontend.'
            );
        }
    }

    // --- Block multiple statement injection ----------------------------------
    //   Reject any query that tries to chain statements through semicolons.
    //   sql.js's .prepare() handles a single statement — we enforce this here.

    var statementCount = trimmed.split(';').filter(function isNonEmpty(part) {
        return part.trim().length > 0;
    }).length;

    if (statementCount > 1) {
        throw new Error(
            '[sanitize_query.js] Multiple SQL statements in a single query are forbidden. '
            + 'Issue queries one at a time.'
        );
    }

    // --- Block inline comments that could obscure intent ---------------------

    if (trimmed.indexOf('--') !== -1 || trimmed.indexOf('/*') !== -1) {
        throw new Error(
            '[sanitize_query.js] SQL comments are not permitted in queries.'
        );
    }

    // Return the trimmed, validated SQL
    return trimmed;
}


// =============================================================================
//   sanitizeSearchTerm
//   Cleans raw user-typed search input before it is used in LIKE bindings.
//   Since sql.js uses parameterised bindings (?) there is no direct injection
//   risk, but this function normalizes whitespace and strips control characters.
//
//   @param  {string} term  - Raw user search string from an input field.
//   @param  {number} [max] - Maximum allowed character length (default: 200).
//   @return {string}       - Cleaned, safe search term.
// =============================================================================

function sanitizeSearchTerm(term, max) {

    if (typeof term !== 'string') {
        return '';
    }

    var maxLen = max || 200;

    var clean = term
        // Strip null bytes and control characters (ASCII 0–31, except space)
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Collapse multiple internal whitespace into a single space
        .replace(/\s+/g, ' ')
        // Trim leading/trailing whitespace
        .trim();

    // Enforce maximum length to prevent excessively large LIKE patterns
    if (clean.length > maxLen) {
        clean = clean.substring(0, maxLen);
    }

    return clean;
}


// =============================================================================
//   sanitizeSlug
//   Validates that a slug parameter matches the expected format before it
//   is passed to getRecord(). Slugs should be lowercase alphanumeric with
//   hyphens only — anything else is rejected.
//
//   @param  {string} slug - A raw slug string (e.g. from window.location).
//   @return {string|null} - The validated slug, or null if invalid.
// =============================================================================

function sanitizeSlug(slug) {

    if (typeof slug !== 'string') {
        return null;
    }

    var trimmed = slug.trim().toLowerCase();

    // Valid slug: lowercase letters, digits, hyphens, underscores, max 120 chars
    var SLUG_PATTERN = /^[a-z0-9_-]{1,120}$/;

    if (!SLUG_PATTERN.test(trimmed)) {
        console.warn('[sanitize_query.js] Invalid slug format rejected:', slug);
        return null;
    }

    return trimmed;
}
