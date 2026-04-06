// =============================================================================
//
//   THE JESUS WEBSITE — CLIENT-SIDE SQLITE INITIALIZER
//   File:    frontend/core/setup_db.js
//   Version: 1.0.0
//   Purpose: Fetches the compiled SQLite database file (database.sqlite),
//            loads it into the sql.js WebAssembly engine in browser memory,
//            and exposes a global TheJesusDB interface for all view scripts.
//   Source:  module_sitemap.md §2.0, guide_function.md §2.0, vibe_coding_rules.md
//
//   DEPENDENCIES:
//     Must be loaded AFTER sql-wasm.js on any page that queries the database.
//     sql-wasm.wasm must reside in the same directory as sql-wasm.js.
//
//   TRIGGER:  Script tag on any page that needs database access.
//             Automatically runs initDatabase() on DOMContentLoaded.
//             Pages listen for the custom event 'thejesusdb:ready' before
//             rendering data views.
//   FUNCTION: initDatabase() — fetches .sqlite binary, boots sql.js WASM,
//             loads the database, and dispatches 'thejesusdb:ready'.
//   OUTPUT:   window.TheJesusDB — global DB interface object.
//             Custom event 'thejesusdb:ready' dispatched on window.
//
// =============================================================================


// =============================================================================
//   CONFIGURATION
//   Centralised path constants — update if directory structure changes.
// =============================================================================

var DB_CONFIG = {

    // Path to the compiled SQLite database file (served as a static asset)
    databasePath: '/database/database.sqlite',

    // Path to the sql.js WASM file — must match the location of sql-wasm.js
    wasmPath: '/frontend/core/sql-wasm.wasm',

    // Custom event name dispatched when the DB is ready for queries
    readyEvent: 'thejesusdb:ready',

    // Custom event name dispatched if initialization fails
    errorEvent: 'thejesusdb:error'

};


// =============================================================================
//   GLOBAL DB INTERFACE
//   Exposed on window.TheJesusDB after successful initialization.
//   All view scripts (single_view.js, list_view.js, etc.) consume this object.
// =============================================================================

window.TheJesusDB = {

    // The live sql.js Database instance — null until initDatabase() resolves
    _db: null,

    // True once the database is loaded and ready
    ready: false,


    // -------------------------------------------------------------------------
    //   runQuery
    //   Execute a SELECT query against the in-memory SQLite database.
    //
    //   @param  {string}  sql     - The SQL SELECT statement to execute.
    //   @param  {Array}   [params] - Optional parameterised values (binding).
    //   @return {Array<Object>}   - Rows as plain JavaScript objects.
    //                               Returns [] if the DB is not ready or
    //                               the query returns no results.
    //
    //   NOTE:  Only read operations. This engine never writes to disk —
    //          all writes go through the Python Admin API.
    // -------------------------------------------------------------------------

    runQuery: function runQuery(sql, params) {

        if (!this._db) {
            console.warn('[setup_db.js] runQuery called before database is ready.');
            return [];
        }

        // Sanitize input before execution (sanitize_query.js must be loaded)
        var cleanSql = (typeof sanitizeQuery === 'function')
            ? sanitizeQuery(sql)
            : sql;

        var bindParams = params || [];
        var results    = [];

        try {
            var stmt = this._db.prepare(cleanSql);
            stmt.bind(bindParams);

            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }

            stmt.free();

        } catch (queryError) {
            console.error('[setup_db.js] Query error:', queryError.message, '\nSQL:', cleanSql);
        }

        return results;
    },


    // -------------------------------------------------------------------------
    //   getRecord
    //   Convenience: fetch a single record by its slug.
    //
    //   @param  {string} slug - The record's URL-safe slug identifier.
    //   @return {Object|null} - The record row as an object, or null.
    // -------------------------------------------------------------------------

    getRecord: function getRecord(slug) {

        var rows = this.runQuery(
            'SELECT * FROM records WHERE slug = ? AND users = \'Public\' LIMIT 1;',
            [slug]
        );

        return rows.length > 0 ? rows[0] : null;
    },


    // -------------------------------------------------------------------------
    //   getRecordList
    //   Convenience: fetch a list of public records with optional filters.
    //   Returns lightweight list columns only — avoids fetching heavy BLOBs.
    //
    //   @param  {Object} [options]
    //   @param  {string} [options.era]              - Filter by era enum
    //   @param  {string} [options.gospel_category]  - Filter by category enum
    //   @param  {string} [options.map_label]        - Filter by map label
    //   @param  {number} [options.limit]            - Max rows (default: 100)
    //   @param  {number} [options.offset]           - Pagination offset (default: 0)
    //   @return {Array<Object>}
    // -------------------------------------------------------------------------

    getRecordList: function getRecordList(options) {

        var opts   = options || {};
        var limit  = opts.limit  || 100;
        var offset = opts.offset || 0;

        // Build WHERE clause dynamically from provided filters
        var conditions = ["users = 'Public'"];
        var bindings   = [];

        if (opts.era) {
            conditions.push('era = ?');
            bindings.push(opts.era);
        }

        if (opts.gospel_category) {
            conditions.push('gospel_category = ?');
            bindings.push(opts.gospel_category);
        }

        if (opts.map_label) {
            conditions.push('map_label = ?');
            bindings.push(opts.map_label);
        }

        var where = conditions.join(' AND ');

        // Lightweight column selection — omit heavy BLOBs for list views
        var sql = [
            'SELECT',
            '  id, title, slug, snippet, era, timeline,',
            '  map_label, gospel_category, primary_verse,',
            '  picture_name, wikipedia_rank, popular_challenge_rank,',
            '  academic_challenge_rank, page_views',
            'FROM records',
            'WHERE ' + where,
            'ORDER BY title ASC',
            'LIMIT ? OFFSET ?;'
        ].join(' ');

        bindings.push(limit, offset);

        return this.runQuery(sql, bindings);
    },


    // -------------------------------------------------------------------------
    //   searchRecords
    //   Full-text search across title + snippet fields.
    //
    //   @param  {string} term   - Raw user search term (sanitized internally)
    //   @param  {number} [limit] - Max rows (default: 50)
    //   @return {Array<Object>}
    // -------------------------------------------------------------------------

    searchRecords: function searchRecords(term, limit) {

        var maxRows  = limit || 50;

        // Sanitize via sanitize_query.js if available
        var cleanTerm = (typeof sanitizeSearchTerm === 'function')
            ? sanitizeSearchTerm(term)
            : term.trim();

        var likeTerm = '%' + cleanTerm + '%';

        var sql = [
            'SELECT',
            '  id, title, slug, snippet, era, gospel_category,',
            '  primary_verse, picture_name',
            'FROM records',
            "WHERE users = 'Public'",
            '  AND (title LIKE ? OR snippet LIKE ?)',
            'ORDER BY page_views DESC',
            'LIMIT ?;'
        ].join(' ');

        return this.runQuery(sql, [likeTerm, likeTerm, maxRows]);
    }

};


// =============================================================================
//   READY PROMISE
//   A global promise that resolves when the database is fully initialized.
//   Components can use window.dbReadyPromise.then(db => { ... })
// =============================================================================

window.dbReadyPromise = new Promise(function(resolve, reject) {
    window._resolveDbReady = resolve;
    window._rejectDbReady = reject;
});


// =============================================================================
//   TRIGGER — Auto-run on DOMContentLoaded
//   Pages can also call initDatabase() manually if they need earlier control.
// =============================================================================

document.addEventListener('DOMContentLoaded', function onDOMReady() {
    initDatabase();
});

function initDatabase() {

    // --- 1. Boot sql.js WASM engine ------------------------------------------
    //   locateFile tells sql.js where to find the .wasm binary.
    //   We serve it locally to avoid CORS and CDN dependency at runtime.

    initSqlJs({
        locateFile: function locateSqlWasm(filename) {
            return DB_CONFIG.wasmPath;
        }

    }).then(function onSqlJsReady(SQL) {

        // --- 2. Fetch the compiled SQLite database file ----------------------

        return fetch(DB_CONFIG.databasePath)
            .then(function onFetchResponse(response) {

                if (!response.ok) {
                    throw new Error(
                        '[setup_db.js] Failed to fetch database: '
                        + response.status + ' ' + response.statusText
                    );
                }

                return response.arrayBuffer();
            })
            .then(function onBufferReady(buffer) {

                // --- 3. Load binary into sql.js in-memory database -----------

                var uint8Array = new Uint8Array(buffer);
                var db         = new SQL.Database(uint8Array);

                // --- 4. Attach to global interface ---------------------------

                window.TheJesusDB._db   = db;
                window.TheJesusDB.ready = true;

                console.info(
                    '[setup_db.js] Database loaded successfully.',
                    uint8Array.byteLength + ' bytes in memory.'
                );

                // --- 5. Resolve the global promise ---------------------------

                if (typeof window._resolveDbReady === 'function') {
                    window._resolveDbReady(db);
                }

                // --- 6. Dispatch ready event for view scripts to consume -----

                var readyEvent = new CustomEvent(DB_CONFIG.readyEvent, {
                    detail: { db: window.TheJesusDB }
                });

                window.dispatchEvent(readyEvent);
            });

    }).catch(function onInitError(err) {

        console.error('[setup_db.js] Database initialization failed:', err);

        // Reject the global promise
        if (typeof window._rejectDbReady === 'function') {
            window._rejectDbReady(err);
        }

        // Dispatch error event so pages can display a graceful fallback
        var errorEvent = new CustomEvent(DB_CONFIG.errorEvent, {
            detail: { error: err.message }
        });

        window.dispatchEvent(errorEvent);
    });
}
