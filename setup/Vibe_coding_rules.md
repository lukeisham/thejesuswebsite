# Vibe Coding Rules

## Setup Rules
**SR-1** — One file per function  
Only combine functions in the same file if they form a single linear sequence **or** are tightly related by type/purpose.

**SR-2** — Dependencies Are Case-by-Case, Never Default  
Write it yourself unless the case is already approved. Approved: visual/display libraries; client-side spell/grammar checkers (`nspell`, `typo.js`, `retext`) inside `admin/` only, never shipped to `frontend/`. Anything else needs explicit sign-off before it enters the repo — and never for something the stdlib or a short module already does.

**SR-3** — Performance First  
Loading speed is non-negotiable. Ship no blocking script, no unused CSS, no unbounded query. If a change adds bytes to `frontend/`, it must justify them.

**SR-4** — Share, Don't Copy-Paste  
Before adding logic to an `admin/<type>/` editor, grep the other editors for it — if it exists, extract to `admin/assets/js/` and have all of them call it. Fixing a bug in one editor means grepping the rest for the same pattern before closing it (the `mla_source_id` incident shipped one defect in five editors).

**SR-5** — Secrets Never Enter the Repo  
Credentials, tokens, and keys live in `.env` and are read at runtime — never hardcoded, never in a test fixture, never in a comment. Confirm `.gitignore` covers a new secret file before writing to it.

## JS Rules
**JS-1** — Self-documenting > Comments  
Use clear, intention-revealing names for everything. Write code that is readable without comments.

**JS-2** — Robust & Predictable > Clever  
Validate inputs, handle errors explicitly, prefer early returns. Never fail silently: a guard against a "shouldn't happen" state must `console.warn` with enough context to locate the call site. Only genuinely optional absences may return quietly (the spellcheck `invalidateRange()` no-op hid a real bug this way).

**JS-3** — Modern & Simple > Over-engineered  
Use current JS features. Keep functions small and focused. Avoid unnecessary classes, abstractions, or layers.

**JS-4** — Comments: “Why”, not “What”  
Write JSDoc for public APIs and complex logic. Keep comments minimal, truthful, and up-to-date. Delete outdated comments immediately.

**JS-5** — Async/Await by Default  
Use `async/await` + `try/catch` for all async code. Show loading states before fetch and error states on failure. Centralize all raw `fetch()` calls in `api.js`.

**JS-6** — Safe DOM Handling  
Use event delegation for dynamic elements. Remove listeners when elements are removed. Never use `innerHTML` with user data. Cache repeated DOM queries.

## Python Rules
**PY-1** — Standard Library Only  
Python is for local scripts and tooling, never for anything the site serves. Stdlib only (`pathlib`, `json`, `csv`, `sqlite3`, `argparse`) — no `pip install`, no venv, no `requirements.txt` (SR-2). If a script needs a third-party package, write it in Node instead.

**PY-2** — One Script, One Job  
A script does one thing, named by its filename. Shared logic goes in a plain importable module beside it — never copy-pasted between scripts (SR-4).

**PY-3** — Import Is Free  
Real work lives in named functions behind `if __name__ == "__main__":`. Importing a script must never read files, write, hit the database, or take measurable time.

**PY-4** — Typed Signatures  
Annotate every parameter and return. Modern generics only: `list[str]`, `dict[str, int]`, `str | None` — never `typing.List` or `Optional`.

**PY-5** — `pathlib`, Never String Paths  
Join with `Path` and `/`. Never `os.path.join` or manual separators. Anchor project paths to `Path(__file__).resolve().parents[n]`, never the working directory.

**PY-6** — Explicit Exceptions, Non-Zero Exit  
Catch the specific exception you expect. Never a bare `except:` or a silent `except Exception:`. Raise with context and exit non-zero so callers and CI see the failure (JS-2).

**PY-7** — Context Managers for Every Resource  
Open files, connections, and subprocesses with `with`. Never leave a close or commit to the garbage collector.

**PY-8** — `sqlite3`: `?` Placeholders, `mode=ro` by Default  
The SQL Rules apply: `cursor.execute(sql, (value,))`, never f-string or `%` interpolation. Scripts that only read open read-only: `sqlite3.connect("file:...?mode=ro", uri=True)`.

**PY-9** — Stream and Batch, Don't Load Everything  
Iterate the cursor or file handle; avoid `.fetchall()` and `.read()` on anything unbounded. Wrap bulk writes in one transaction with `executemany` — never a loop of single `execute` + commit.

**PY-10** — PEP 8 by Hand  
`snake_case`, `UPPER_SNAKE` constants, 4-space indent. No Black, Ruff, or linter config in the repo.

## Test Rules
**TEST-1** — `node:test` Only, No External Runners  
`node:test` + `node:assert/strict`, nothing else (SR-2). No Jest, Mocha, Vitest, Sinon, or mocking libraries — hand-build fakes, as `admin/tests/admin-editor-utils.test.js` does.

**TEST-2** — Smoke, Not Exhaustive  
Assert three things per module: it imports cleanly, the happy path produces the right output, one guard or failure path behaves. Stop there — full branch coverage belongs in a suite this project doesn't run.

**TEST-3** — File Naming & Location  
One test file per source module, named after the module, not the feature. Put it in `<area>/tests/<module>.test.js` — or beside nested modules, mirroring the source tree (`frontend/assets/js/arbor/tests/arbor-render.test.js`).

**TEST-4** — Isolated, In-Memory, No Network  
API tests build a fresh in-memory database with `createTestDb()` (`api/tests/helpers/db.js`) — never touch the real `database/thejesuswebsite.db`. No real network requests. Reset shared module state (e.g. `clearSessions()`) in `afterEach`.

**TEST-5** — Deterministic, No Sleeps  
Await the real operation — a promise, a response, a write — never a guessed `setTimeout` delay. `npm test` runs in seconds; a slow test is usually doing more than a smoke test needs.

**TEST-6** — Assert on Behavior, Not Absence of a Throw  
"It didn't crash" is not coverage. Assert the actual output, return value, HTTP status, or state change (JS-2).

**TEST-7** — Auth Routes Get an Unauthenticated-Access Test  
Every route behind `middleware/auth` needs two tests: 401 without a session cookie, pass-through with a valid one (see `api/tests/auth-guard.test.js`). The route isn't done until both exist.

**TEST-8** — DOM-Dependent Modules: Fake DOM, Not a DOM Library  
Run the real source against a small hand-built fake DOM exposing only what the module uses, as `admin/tests/admin-editor-utils.test.js` does. No `jsdom` or similar (SR-2).

**TEST-9** — Mirror the Logic, Don't Duplicate the Bug  
Import the real module whenever possible. If a test must recreate source logic (e.g. `announce.test.js`'s `arborAriaLabel`), comment which file/function it mirrors — a passing test against a stale copy proves nothing.

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

## API Rules
**API-1** — Routes Are a Thin Layer  
A handler parses input, calls a model, shapes the response. No SQL and no business logic in `routes/` — all SQL lives in `models/<type>.model.js`.

**API-2** — One Route File Per Resource  
`routes/<resource>.js` serves one mounted path and one model. Never add an endpoint for one resource to another resource's file (SR-1).

**API-3** — Errors Come From the Registry  
Every failure response goes through `sendError()` / `sendValidationError()` with a code from `lib/error-codes.js`. No inline `res.status(500).json({...})`. A new failure mode earns a new registry entry in the right category, not a one-off message.

**API-4** — Validate Before the Model  
Check required fields, types, and enums in the handler and return 400 naming the offending field. Models assume valid input; they are not the validation layer.

**API-5** — Write Routes Require Auth  
Every POST, PUT, PATCH, and DELETE mounts `requireAuth`, as does any GET exposing unpublished content (`/admin*`). Public GETs return published rows only, and the model decides that — never a flag from the query string. Not done until TEST-7's two tests exist.

**API-6** — Catch, Log, Respond  
Every handler wraps its work in `try/catch`. Log the cause with method and path (`console.error("GET /resources failed:", error)`), then send a registry error. No raw exception or stack trace ever reaches the client.

**API-7** — Static Route Paths Before Dynamic  
Register `/admin/holding-pen` before `/admin/:list_key` — Express matches in order, so the parameter would swallow it. Comment the constraint where it's load-bearing.

**API-8** — Bounded Responses  
List endpoints return named columns with a `LIMIT`, never an unbounded table dump (SR-3, SQL-9). Paginate anything that grows without limit.

## SQL Rules
**SQL-1** — Prepared Statements Always  
Every query goes through `db.prepare(sql)` then `.get()`, `.all()`, or `.run()`. Never execute a raw SQL string. Cache statements in module scope — better-sqlite3 compiles on every `prepare` call.

**SQL-2** — User Input Only via `?`  
All user-supplied data — params, filters, search terms — goes in as a `?` placeholder with values passed after the query. Never interpolate or concatenate it into SQL, even partially.

**SQL-3** — Named Parameters for Clarity  
Multi-column INSERT/UPDATE built from an object uses named parameters (`@column`), with keys filtered through a whitelist so stray fields can't reach the database (JS-2).

**SQL-4** — Identifiers from Whitelists Only  
Table, column, and index names come from hardcoded constants or validated enums — never user input. Derive filters from a list like `VALID_FILTERS = ["gospel_category", "timeline_era"]`, then `conditions.push(key + " = ?")`.

**SQL-5** — FTS Queries: Sanitize User Search  
Never pass raw input to `MATCH ?`. Tokenize and double-quote first (`toMatchExpression()`) so FTS operators (`AND`, `OR`, `NOT`, `*`) can't throw or change the query.

**SQL-6** — UPDATE Triggers: WHEN Guard Required  
Every `AFTER UPDATE` trigger needs a `WHEN` clause, or its own write re-fires it. `WHEN NEW.updated_at = OLD.updated_at` fires only when the caller didn't set a timestamp.

**SQL-7** — FTS Triggers: WHEN Guard & Index Sync  
FTS sync triggers list the exact content columns in their `WHEN` clause, so unrelated updates don't reindex. Remove stale rows with the `'delete'` directive: `INSERT INTO fts_table(fts_table, rowid, ...) VALUES ('delete', old.id, ...)`.

**SQL-8** — Foreign Key Pragmas  
`db.pragma('foreign_keys = ON')` on every connection (done in `api/config.js`) — SQLite disables it by default. Verify it in tests and on deploy.

**SQL-9** — Query in Sets, Not Loops  
One query returns what a request needs; never run a query per row of a previous result. Select named columns, not `SELECT *`, and bound anything user-facing with `LIMIT`.

**SQL-10** — Every Filter and Join Has an Index  
Columns used in `WHERE`, `JOIN`, or `ORDER BY` are indexed in `schema.sql`. Check new queries against the schema, and confirm with `EXPLAIN QUERY PLAN` that a hot query isn't scanning the table.

