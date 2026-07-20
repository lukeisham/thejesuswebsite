# Vibe Coding Rules

## Setup Rules
**SR-1** — One file per function  
Only combine functions in the same file if they form a single linear sequence **or** are tightly related by type/purpose.

**SR-2** — Dependencies  
Use external dependencies **only** for visual/display libraries. Exception: client-side spelling/grammar-checking libraries (e.g. `nspell`, `typo.js`, `retext`) may be used exclusively inside `admin/`, loaded only on admin pages, and never shipped to `frontend/`.

**SR-3** — Performance First  
Website loading speed is non-negotiable. Optimize for it at every step.

**SR-4** — Share, don't copy-paste across admin editors  
Before adding logic to any `admin/<type>/` editor page, check whether the same block already exists in another editor; if so, extract it into a shared module under `admin/assets/js/` and have all editors call it, rather than adding another copy. When a bug is found in one editor, grep the other editors for the same pattern before closing the fix — the same defect has historically shipped in up to five editors at once (the `mla_source_id` incident).

## JS Rules
**JS-1** — Self-documenting > Comments  
Use clear, intention-revealing names for everything. Write code that is readable without comments.

**JS-2** — Robust & Predictable > Clever  
Validate inputs, handle errors explicitly, prefer early returns and defensive programming. Never fail silently. Defensive early returns that guard a "shouldn't happen" state (uninitialized module state, missing required element, malformed data) must `console.warn` with enough context to identify the call site — only *expected* absences (e.g. an optional element genuinely not present on this page) may return silently. A guard that swallows an impossible state without logging hides real bugs (see the spellcheck `invalidateRange()` no-op incident).

**JS-3** — Modern & Simple > Over-engineered  
Use current JS features. Keep functions small and focused. Avoid unnecessary classes, abstractions, or layers.

**JS-4** — Comments: “Why”, not “What”  
Write JSDoc for public APIs and complex logic. Keep comments minimal, truthful, and up-to-date. Delete outdated comments immediately.

**JS-5** — Async/Await by Default  
Use `async/await` + `try/catch` for all async code. Show loading states before fetch and error states on failure. Centralize all raw `fetch()` calls in `api.js`.

**JS-6** — Safe DOM Handling  
Use event delegation for dynamic elements. Remove listeners when elements are removed. Never use `innerHTML` with user data. Cache repeated DOM queries.

## CSS Rules
**CSS-1** — One File, One Job  
Each CSS file styles exactly one component, layout, or page. Keep files under 150 lines. Split when they grow. No unrelated styles.

**CSS-2** — Custom Properties Only  
Reference `--color-*`, `--space-*`, `--font-*` etc. from `variables.css`. Never hardcode values that belong in variables.

**CSS-3** — Mobile Inside Component Files  
Put all `@media (max-width)` rules in the same file as the component. Use breakpoints from `variables.css`. No separate mobile files.

**CSS-4** — Semantic Class Names  
Class names describe *what* something is (`.card-grid`, `.popular-challenges`), never *how* it looks. Use kebab-case, consistent with filenames.

**CSS-5** — Low Specificity  
Prefer single classes. Avoid IDs and nested selectors. Never use `!important`.

**CSS-6** — CSS Comments  
Use large clear section headings and subheadings. Keep comments sparse and useful.

## HTML Rules
**HTML-1** — Semantic First  
Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>` etc. Use `<div>` only for pure styling hooks. One `<main>` per page.

**HTML-2** — Images  
Every `<img>` must have an `alt` attribute. Descriptive for informative images, empty `alt=""` for decorative.

**HTML-3** — Proper Heading Hierarchy  
Exactly one `<h1>` per page. Never skip levels (`h1 → h2 → h3`). Headings describe content structure, not visual size.

**HTML-4** — Asset Loading Order  
CSS in `<head>`. Scripts at bottom or with `defer`. Inline critical CSS only when necessary for above-the-fold performance.

**HTML-5** — Accessible Forms  
Every form control has a proper `<label>`. Use `aria-describedby` for error messages. Placeholders are hints only.

## SVG Rules
**SVG-1** — Coordinate System & `viewBox`  
Origin (0,0) is top-left. x→right, y→down. Always define `viewBox` — it sets the internal coordinate space and aspect ratio for resolution-independent scaling. Case-sensitive: `viewBox`, never `viewbox`.

**SVG-2** — Strict XML Syntax  
Self-close empty tags (`<circle />`, not `<circle>`). Tag and attribute names are case-sensitive. Always quote attribute values (`width="50"`).

**SVG-3** — Painter's Model (No `z-index`)  
Elements render in source order: first in DOM = painted first (beneath), later elements paint on top. No `z-index` stacking.

**SVG-4** — Semantic Shapes & `<path>`  
Use `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>` for simple geometry. Use `<path d="...">` for complex shapes — the `d` attribute takes commands: `M` (move), `L` (line), `C` (cubic bezier), etc.

**SVG-5** — DOM Styling: `fill` & `stroke`  
SVG elements live in the DOM — target them with CSS classes/IDs. Use `fill` for color (not `background-color`) and `stroke` for outlines (not `border`). Attributes can be inline or applied via external stylesheet.

## SQL Rules
**SQL-1** — Prepared Statements Always  
Every SQL query must use `db.prepare(sql)` followed by `.get()`, `.all()`, or `.run()`. Never execute raw SQL strings. Cache prepared statements in module scope for reuse (better-sqlite3 compiles once per prepare call).

**SQL-2** — User Input Only via `?`  
Use `?` placeholders for all user-supplied data (params, filters, search queries). Never interpolate or concatenate user input into SQL strings, even partially. Pass an array of values after the query: `.all(sql, userParam)`.

**SQL-3** — Named Parameters for Clarity  
Use named parameters (`@column`) for multi-column INSERT/UPDATE statements built from object key/value pairs. Convert column names via `Object.keys()` restricted to a whitelisted array (JS-2: never let stray fields reach the database).

**SQL-4** — Identifiers from Whitelists Only  
Table names, column names, and index names must come from hardcoded constants, validated enums, or config objects — never from user input. Example: derive allowed filters from `VALID_FILTERS = ["gospel_category", "timeline_era", ...]`, apply them with `conditions.push(key + " = ?")`.

**SQL-5** — FTS Queries: Sanitize User Search  
Full-text search queries must be sanitized: wrap tokens in double quotes to neutralise FTS operators (`AND`, `OR`, `NOT`, `*`, etc.) that could throw syntax errors. Never pass raw user input to `MATCH ?`. Example: `toMatchExpression(rawQuery)` tokenizes and quotes before `.all(match, params)`.

**SQL-6** — UPDATE Triggers: WHEN Guard Required  
Every `AFTER UPDATE` trigger must include a `WHEN` clause to prevent infinite recursion and redundant writes. Example: `WHEN NEW.updated_at = OLD.updated_at` fires only if the caller did not explicitly set a new timestamp. Without a guard, an UPDATE inside a trigger can fire the same trigger again.

**SQL-7** — FTS Triggers: WHEN Guard & Index Sync  
FTS (virtual table) synchronization triggers must include a `WHEN` clause that lists the specific content columns monitored. Prevents reindexing on unrelated updates. Insert into the FTS table with the magic `'delete'` directive to remove stale entries: `INSERT INTO fts_table(fts_table, rowid, ...) VALUES ('delete', old.id, ...)`.

**SQL-8** — Foreign Key Pragmas  
Enable foreign key constraints on every database connection: `db.pragma('foreign_keys = ON')` (done once in api/config.js). Verify the pragma in tests and deploys to ensure referential integrity is active. SQLite disables foreign keys by default.

