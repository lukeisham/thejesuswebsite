# Vibe Coding Rules

The coding standard for this project, written for any agent that edits it. It holds the facts
about this project and the checks against known agent habits.

General good practice (semantic HTML, `alt` text, context managers) is listed only in
*IDs Without a Rule Here*. Rule IDs are stable and never reused. Code comments cite these IDs, so an ID never changes its
meaning. An ID that is cited elsewhere but has no rule here is resolved in *IDs Without a Rule
Here* at the end.

## Checklist — read before every change

| # | Check | Rule |
| :-- | :--- | :--- |
| 0 | Clean the whole of each file you edit, and only those files. | Touch rule |
| 1 | Code explains itself. Comments hold only the *why*, for a future AI. | CORE-1, CORE-2 |
| 2 | No history, dates, names, decisions or issue numbers in a comment. | CORE-2 |
| 3 | Behaviour that crosses modules is in the right guide. | CORE-3 |
| 4 | An important decision or a rule exception is logged, not commented. | CORE-4 |
| 5 | Change only what the task names. | AG-1 |
| 6 | Run it and show the output before you say it is done. | AG-2 |
| 7 | No option, flag, fallback or layer that nobody asked for. | AG-3 |
| 8 | No new dependency without sign-off. No build step in `frontend/` or `admin/`. | SR-2, JS-8 |
| 9 | Interpolated text is escaped with the shared `escapeHTML()`. | JS-6, HTML-6 |
| 10 | A write route has `requireAuth` and its two auth tests. | API-5, TEST-7 |
| 11 | Every visual value comes from `variables.css`. | CSS-2 |
| 12 | A schema change updates `schema.sql` in the same commit. | MIG-4 |
| 13 | Smoke tests only, and run them. | TEST-2, TEST-2a |
| 14 | A guide row you edit that a text search can check has a guide test. | TEST-10 |
| 15 | Each file you edit: comments give the *why* and the links to other files. Its cross-app behaviour is in a guide or README, and the file matches it. | CORE-5 |
| 16 | A purpose statement states the *why*: input, output, and the essential functions between them. App purpose 60 words or fewer, every other doc 40 or fewer. | CORE-6 |
| 17 | Do not read completed or abandoned plans to write code. Read archived material only while you develop a feature. | AG-6 |
| 18 | A doc you write or edit opens with a purpose statement, numbers its headings, and puts structured facts in tables. | DOC-1, DOC-2, DOC-3 |

---

## Core Rules

These rules apply without exception. A breach is a defect.

**Touch rule.** When you edit a file (code, guide, style guide or README), bring that whole file
into line with the Core Rules in the same change. A Markdown doc also meets the Documentation
Rules (DOC-1 to DOC-3). Do not open or edit a file only to clean it.
This is the one exception to AG-1.

In a touched doc, keep only purpose, navigation and cross-module behaviour. Delete history,
dates, status notes and permissions. Move a decision to `setup/Decisions_log.md` and an open
problem to `setup/ISSUES/issues.md`, then delete it from the doc. You can move a decision into
the log without asking first (D-011). Say in your reply which entries you added.

Each kind of information has exactly one home:

| Home | Holds | Never holds |
| :--- | :--- | :--- |
| **The code** | What it does and how, through names and structure (CORE-1). Comments: the non-obvious *why* and the connections (CORE-2). | History, decisions, permissions, or a restatement of a line. |
| **`setup/ARCHITECTURE/` guides** (`Website_guide.md` first) | Purpose, navigation, and every behaviour that crosses a module, process or file boundary (CORE-3). Present tense, edited in place. | History, status, or anything the code already says. |
| **`setup/STYLE_GUIDE/`** | Visual conventions that apply across the site, and navigation to them. | History, status, or decisions. |
| **This file** | Each rule exception, named under its rule (CORE-4). | Exceptions that nobody granted. |
| **`setup/Decisions_log.md`** (classifier rulings: `Wikipedia algorithm/Classifier_decisions.md`) | The dated record of each important decision and standing permission: who, when, why, and what was rejected (CORE-4). One table row per entry. Append only. | Routine edits, how the code works, secrets. |
| **`setup/ISSUES/issues.md`, `setup/PLANS/`** | Open problems and planned work. | How the current code works. |
| **`setup/DEPENDENCIES/Dependency_log.md`** (local-only, D-065) | Dependencies that need an update: package, installed and fixed version, severity, status. | Version lists in guides, or decisions. |
| **Commit message** | What changed and why, for this change. Issue numbers go here. | — |

**CORE-1 — Code documents itself.**
Use intention-revealing names, small focused functions, early returns, and a structure that
reads without commentary. If a block needs a comment to say *what* it does, rename or split the
block. Put JSDoc on exported functions (JS-7) and on complex logic only.

**CORE-2 — Comments explain *why*, for a future AI.**
The reader of a comment is the next agent that changes this code. A comment says only what that
agent cannot get from the names and the signature: the non-obvious reason, the constraint, and
how the code connects to other functions or files. Say what calls it, what it depends on, and
what breaks if the connection changes. A comment can cite a rule ID from this file (`API-5`),
because this file is permanent.

A comment never holds:

- history: what the code did before, what changed, what was fixed, or which task caused it;
- a date, a version, or who decided or asked for something;
- a decision, an approval, or a rule exception;
- an issue, plan or spec number (`issue #244`, `Plan 4`). `setup/ISSUES/` and `setup/PLANS/`
  are local-only, so the number points nowhere on GitHub or the VPS. State the reason itself;
- a narration of what the next line obviously does.

In a file you are already editing, delete each stale comment and each comment that restates
the code (Touch rule).

- ✅ `// Registered before /admin/:list_key, or the parameter swallows this path (API-7).`
- ✅ `// Called by every admin editor on save; the order it returns is the saved order.`
- ❌ `// Loop over the items` · `// Fixed bug where X was null` · `// Changed to use Path`
- ❌ `// issue #231` · `// per Plan 4` · `// Luke approved this`

CSS files also follow CSS-6 for section headings.

**CORE-3 — Cross-module behaviour lives in the guides.**
The guides in `setup/ARCHITECTURE/` (start with `Website_guide.md`) hold three things:

- **Purpose** — what an area is for, above the level of any one function (CORE-6).
- **Navigation** — an ASCII map of what lives where. Structure only, no per-file commentary.
- **Cross-boundary behaviour** — everything outside one file that depends on it, or that it
  depends on: a pm2 process, a port, a cron job, a deploy step in `deploy.sh`, a sidecar, a
  generated file (static pages, `sitemap.xml`), or an outside API. An ASCII diagram belongs here
  when a process crosses files.

A behaviour that crosses a boundary and is not in a guide is a defect, even if a comment
mentions it. A guide never walks through function bodies or restates logic. A folder with its
own `README.md` (`mcp-server/`, `Wikipedia algorithm/`) keeps its setup steps there.

**CORE-4 — Important decisions and exceptions are logged, never commented.**
A decision is important when a future agent, who reads only the code and the guides, would
likely undo it or do it differently. `setup/Decisions_log.md` gives the full test, and the
definition of a standing permission.

- Every important decision and every standing permission gets an entry in
  `setup/Decisions_log.md`. A decision on the Wikipedia classifier's labelling rules, labeller
  or activation gate goes in `Wikipedia algorithm/Classifier_decisions.md` instead (D-056).
- An entry is one row in a table, as in `setup/ISSUES/issues.md`, never a prose block. One
  column per field: ID, title, type, date, by, applies to, rule, status, decision, why,
  rejected, where it lives. A cell holds a short phrase. Escape a literal `|` as `\|`.
- A rule exception is also named in this file, under its rule, with where it applies and why.
  See PY-1, CSS-1, CSS-3 and SVG-1 for the pattern.
- The guide for the area in `setup/ARCHITECTURE/` describes the resulting design, in the
  present tense.
- A minor or easily guessed choice is not logged. It lives in the commit message.

A rule exception or a permission needs Luke's explicit sign-off. Until it is granted and logged,
a break from a rule is a defect. After it is logged, code that matches it is intentional. Before
you "fix" a rule break, read the rule's exceptions and search the decisions log.

**CORE-5 — Bring each file you edit up to the comment and guide rules.**
Each file that you edit for a task must meet CORE-2 and CORE-3 when the change is complete.
For each file that you edit, do these steps:

1. **Comments.** Apply CORE-2. Where the file calls another file, is called by another file,
   or depends on a shared value, add a comment that names that connection and what breaks if
   it changes.
2. **Cross-app behaviour.** Find out whether the file takes part in behaviour that crosses a
   module, process or file boundary (CORE-3 lists the kinds). If it does not, stop here.
3. **Guide coverage.** Find that behaviour in `setup/ARCHITECTURE/` or in the folder
   `README.md`. If it is not there, add it to the right guide in the same change.
4. **Match.** Compare the file with what the guide or README says. If the code is wrong, fix
   the code. If the guide is wrong, fix the guide. If you cannot tell which one is wrong, ask
   Luke before you change either.
5. **Guide test.** If you added or edited a guide row that a text search can check, add or
   update its guide test (TEST-10).

In your reply, name each file where you added a connection comment, a guide row, or a fix
from step 4.

**CORE-6 — A purpose statement holds the intent, in few words.**
The app has one purpose statement, and each guide in `setup/ARCHITECTURE/` has one. A purpose
statement is the *why*. It governs the rest of its document: every other section must serve it.
A section that does not serve it belongs in another guide, or nowhere.

- **Place.** The app purpose is the first paragraph of `Website_guide.md`, under the title. A
  guide purpose is the first paragraph of that guide, under the title.
- **Content.** State the highest-level input and the highest-level output. Then say, in plain
  words, what the one or two essential functions do to turn the input into the output, never
  their code names. Leave out every function that only supports those.
- **Word cap.** App purpose: 60 words or fewer. Every other doc, guides included: 40 words or
  fewer. One paragraph, no list. A statement over the cap holds the *how*: cut until it is intent only.
- **Never.** No file, function, process or table names, no counts, and no history. Those are
  navigation or cross-boundary behaviour (CORE-3), and they change when the code changes. The
  purpose changes only when the intent changes.
- **Test.** A refactor that keeps the intent must not force an edit to the statement. If it
  does, the statement holds the *how*.

Exception: the purpose statement of `setup/ARCHITECTURE/performance-and-caching.md` may have
50 words. Its last two sentences say that new code or new backend data shows within a minute, and
that everything else stays cached. Without them the statement hides half of the intent of the
guide (D-070).

When you touch a guide, bring its purpose statement into line with this rule (Touch rule).
Every other doc has a purpose statement too (DOC-1).

---

## Documentation Rules

A doc is any Markdown file in the repo: a guide, a style guide section, a README, a plan, a test
plan, or a reference. Two kinds of file keep their own format: `CLAUDE.md`, which only imports
this file, and a `SKILL.md`, whose frontmatter `description` is its purpose statement.

**DOC-1 — Every doc opens with a purpose statement.**
The first paragraph under the title says why the doc exists: what a reader brings to it and
what they leave with. CORE-6 sets the content, the word cap and the *never* list. A new doc
has one from its first commit. An existing doc gets one when you next touch it (Touch rule).

**DOC-2 — Clear headings, numbered.**
A heading names its topic in a few words, so the list of headings reads as a table of contents.
Number every `##` heading `1`, `2`, `3`, and every `###` heading under it `1.1`, `1.2`, so a
citation names one heading. Never skip a level.

- The style guide prefixes its numbers with `§` (`§1.2`), because other files cite it that way.
- A file whose entries carry stable IDs uses the IDs as its numbering: this file, the decisions
  logs, and `setup/ISSUES/issues.md`. Do not number their headings as well.
- Renumbering a heading breaks every citation of it. `grep` the repo for the old number and fix
  each hit in the same change.

**DOC-3 — Tables for structured facts.**
When three or more items share the same fields (a token and its value, a file and its job, a
rule and its check, a step and its command), put them in a table with one column per field. A
cell holds a short phrase. Keep prose for reasons and for a sequence that a reader follows in
order, and a numbered list for steps. Never put a table where one sentence is enough.

---

## Agent Rules

How an agent behaves while it writes code.

**AG-1 — Change only what the task names.**
No drive-by refactors, renames, reformatting, import reordering or "while I was here" fixes. If
you see another defect, name it in your reply and leave the code alone. The one exception is a
Core Rule breach in a file you are already editing, which you fix (Touch rule).

**AG-2 — Done means you ran it.**
Before you report a change as done, run the script, the tests or the page, and show the result.
Never write "this should work". If you could not run it, say so and say why. Code is not live
until it is pushed and deployed (see `CLAUDE.local.md`).

**AG-3 — Build only what was asked.**
No configuration options, CLI flags, environment switches, abstraction layers, retries or
fallbacks that the task did not ask for. Three similar lines are better than a helper that is
used once. Add the generality when a second real caller needs it.

**AG-4 — Never make an error disappear. Fix it.**
Never edit a test to match broken output, loosen an assertion, skip a test, or wrap a call in
`try` to silence an exception. If the test is wrong, say why before you change it.

**AG-5 — Check before you call.**
If you are not sure that a function, method, flag, route or file exists, look: `grep` the repo,
read the module, or run `node -e` / `python3 -c "help(module.name)"`. Never guess the name or
the signature of an API.

**AG-6 — Old plans are not a source for code.**
When you write or change code, do not read a plan in `setup/PLANS/Completed/` or a plan that was
abandoned. The code, the guides and `setup/Decisions_log.md` say how the system works now, and
a finished plan goes out of date. Read `setup/ARCHIVES/` only while you develop a feature, and
only for the background of that feature.

---

## Setup Rules

**SR-1 — One file per function.**
Only combine functions in the same file if they form a single linear sequence (parse, then
validate, then save) **or** share one type or job (the read and write helpers of one table).

**SR-2 — Dependencies are case-by-case, never default.**
Write it yourself. No library is pre-approved: each one needs Luke's explicit sign-off before it
enters the repo, and never for something the stdlib or a short module already does.

**SR-3 — Performance first.**
Ship no blocking script, no unused CSS, no unbounded query. If a change adds bytes to
`frontend/`, say why in the commit message.

**SR-4 — Share, don't copy-paste.**
Before adding logic to an `admin/<type>/` editor, grep the other editors for it — if it exists, extract to `admin/assets/js/` and have all of them call it. Fixing a bug in one editor means grepping the rest for the same pattern before closing it.

**SR-5 — Secrets never enter the repo.**
Credentials, tokens, and keys live in `.env` and are read at runtime — never hardcoded, never in a test fixture, never in a comment, never in a log. Confirm `.gitignore` covers a new secret file before writing to it.

**SR-7 — Screen text serves only the person using the page.**
Text for whoever builds or maintains the code — a validation rule, an invariant, a "this is
required because…" reason — goes in a code comment (CORE-2), never in the interface. An error
message that shows after an action fails is UI. A permanent caption that restates the rule is
not. "Title is required" beside a field that just refused to save is UI. "Title — required, a
record cannot be saved without one" under the heading is a comment that escaped. In the other
direction, real user guidance (what a control does, what a state means) belongs in the UI, not
only in a comment. This applies to `admin/` editors as much as to `frontend/`.

**SR-8 — Match the neighbours before you invent.**
Read the closest existing sibling file before you write a new one, and use its conventions:
naming, argument handling, error handling, logging format. For an admin editor, read another
`admin/<type>/` editor. For a route, read another `api/routes/` file and its model. A new file
that looks nothing like the file next to it is a defect, even if it runs.

## JS Rules

Browser JavaScript targets current Safari and Chrome. `api/`, tests and tools target the
installed Node (26).

**JS-2 — Robust and predictable over clever.**
Never fail silently: a guard against a "shouldn't happen" state must `console.warn` with enough context to locate the call site. Only genuinely optional absences may return quietly.

**JS-3 — Modern and simple over over-engineered.**
In new files in `frontend/` and `admin/`:

- ES modules only: `import` / `export`, loaded with `<script type="module">`. Put nothing on
  `window`, and use no IIFE wrappers. Exception: `admin/` keeps its shared `window.Admin`
  namespace from `admin.js`, and a new admin file follows that pattern (D-009, SR-8).
- `const` by default, `let` when the value changes, never `var`.
- A `class` only when it holds both state and behaviour that change together.
- Current features are welcome: `?.`, `??`, `structuredClone`, `Array.prototype.at`,
  `Object.groupBy`, `AbortController`.

Many older files use `var` and `window` globals. That is not a Core Rule breach. Leave them
alone unless the task names them (AG-1).

**JS-5 — Async/await by default.**
Use `async/await` + `try/catch` for all async code. Show loading states before fetch and error
states on failure. Every raw `fetch()` call lives in one file per area:
`frontend/assets/js/api.js` or `admin/assets/js/admin-http.js`.

**JS-6 — Safe DOM handling.**
Put text on the page in this order of preference:

1. `textContent`, or `document.createElement` / `createElementNS` with properties set.
2. `innerHTML` with a static literal string that holds no data.
3. `innerHTML` with data only through the shared `escapeHTML()`. Never write a new local
   `escapeHTML()` or `esc()`. Import the shared one.

Database text is still untrusted input to a renderer, even when an admin wrote it. `escapeHTML()`
is safe for text and quoted attributes only — never for a URL, an inline script or a style. Use
event delegation for dynamic elements. Remove listeners when elements are removed. Cache
repeated DOM queries.

**JS-7 — Types on exports.**
Every exported function carries JSDoc `@param {Type}` and `@returns {Type}`, so that a later
agent can call it correctly without reading the body.

**JS-8 — No build step, no framework, no bundler.**
`frontend/` and `admin/` are vanilla JavaScript, served directly. A framework, a transpiler or a
bundler is a dependency decision that needs sign-off (SR-2), not a default. Scripts that rewrite
files at deploy time (`npm run pages`, `npm run version-assets`) are not a build step in this
sense: the source files still run as they are.

## Python Rules

**PY-1 — Standard library only.**
Python is for local scripts and tooling, never for anything the site serves. Stdlib only (`pathlib`, `json`, `csv`, `sqlite3`, `argparse`) — no `pip install`, no venv, no `requirements.txt` (SR-2). If a script needs a third-party package, write it in Node instead.

Exception: a Python service may serve the site, with third-party dependencies and its own `requirements.txt`, when it is the most effective, robust, and safe solution available — not merely convenient. This means: no Node equivalent exists at comparable maturity for the problem (e.g. FAISS/ONNX-based approximate nearest-neighbor search and local embedding inference), the service is isolated as its own process (own venv, own pm2 process) rather than imported into the main app, and callers degrade gracefully if it's unavailable (timeout + fallback, never a hard dependency). Each exception must be named explicitly here, not inferred:

- `Wikipedia algorithm/vector-sidecar/` — FastAPI/uvicorn, pm2-managed as `thejesuswebsite-vector-sidecar` on `127.0.0.1:8901`, synced via `scripts/sync-vector-sidecar.sh`. Called from `api/lib/vector-sidecar-client.js` with a 2s timeout and graceful degradation on failure.

Offline tooling (`Wikipedia algorithm/classifier/`, `families/`, `scripts/`, `setup/scripts/`) that `deploy.sh` never invokes may also carry a `requirements.txt` for the same reason — it never serves a live request, so SR-2 doesn't apply to it the way it applies to anything in the request path.

**PY-2 — One script, one job.**
A script does one thing, named by its filename. Shared logic goes in a plain importable module beside it — never copy-pasted between scripts (SR-4).

**PY-3 — Import is free.**
Real work lives in named functions behind `if __name__ == "__main__":`. Importing a script must never read files, write, hit the database, or take measurable time.

**PY-4 — Typed signatures.**
Annotate every parameter and return. Modern generics only: `list[str]`, `dict[str, int]`, `str | None` — never `typing.List` or `Optional`. No `from __future__ import annotations` in new files (PY-11).

**PY-5 — `pathlib`, never string paths.**
Join with `Path` and `/`. Never `os.path.join` or manual separators. Anchor project paths to `Path(__file__).resolve().parents[n]`, never the working directory.

**PY-6 — Explicit exceptions, non-zero exit.**
Catch the specific exception you expect. Never a bare `except:` or a silent `except Exception:`. Raise with context and exit non-zero so callers and CI see the failure (JS-2).

Fail loudly, but only where it can fail. No `try` around code that cannot fail in a way you
would handle differently. Let an unexpected error rise to the one top-level handler in `main()`.

- ✅ `except FileNotFoundError: sys.exit(f"no store at {path}")`
- ❌ `try: total = a + b` / `except Exception: total = 0`

**PY-8 — `sqlite3`: `?` placeholders, `mode=ro` by default.**
The SQL Rules apply: `cursor.execute(sql, (value,))`, never f-string or `%` interpolation. Scripts that only read open read-only: `sqlite3.connect("file:...?mode=ro", uri=True)`.

**PY-9 — Stream and batch, don't load everything.**
Iterate the cursor or file handle; avoid `.fetchall()` and `.read()` on anything unbounded. Wrap bulk writes in one transaction with `executemany` — never a loop of single `execute` + commit.

**PY-10 — PEP 8 by hand.**
No Black, Ruff, or linter config in the repo.

**PY-11 — Target the installed Python, 3.14.**
Use what 3.14 gives you: `match`, `@dataclass(frozen=True, slots=True)`, `tomllib`,
`itertools.batched`, `Path.walk`. No compatibility shims for older versions.

## Test Rules
**TEST-1 — Built-in runners only, no external runners.**
JavaScript: `node:test` + `node:assert/strict`, nothing else (SR-2). No Jest, Mocha, Vitest, Sinon, or mocking libraries — hand-build fakes, as `admin/tests/admin-editor-utils.test.js` does.

Python: stdlib scripts use `unittest`. Offline tooling under PY-1's exception
(`Wikipedia algorithm/`) uses `pytest` from its own venv, as its `README.md` shows.

**TEST-2 — Smoke, not exhaustive.**
Assert three things per module: it imports cleanly, the happy path produces the right output, one guard or failure path behaves. Stop there — full branch coverage belongs in a suite this project doesn't run. Do not add tests for code that the task did not change (AG-1).

Exception: a guide test (TEST-10) scans every file that its guide rule covers, including files
that the task did not change. That scan is its purpose.

Exception: a model test (`api/tests/<name>.model.test.js`) may go past three assertions to pin a
data-loss guard, such as a save that must keep the rows whose keys it omits. Each extra test
names the loss it prevents. Smoke depth still applies to everything else in the file (D-061).

**TEST-2a — Run the suite before you report.**
Run the tests for each area you changed, and show the pass/fail summary (AG-2). A red test is
reported, never hidden (AG-4).

- `api/`: `cd api && npm test`
- `admin/` and `frontend/`: `node --test <area>/tests/<module>.test.js`
- `Wikipedia algorithm/`: `python -m pytest <package>/tests/`

**TEST-3 — File naming and location.**
One test file per source module, named after the module, not the feature. Put it in `<area>/tests/<module>.test.js` — or beside nested modules, mirroring the source tree (`frontend/assets/js/arbor/tests/arbor-render.test.js`).

Exception: a guide test (TEST-10) is named after its guide, not a module.

**TEST-4 — Isolated, in-memory, no network.**
API tests build a fresh in-memory database with `createTestDb()` (`api/tests/helpers/db.js`) — never touch the real `database/thejesuswebsite.db`. No real network requests. Reset shared module state (e.g. `clearSessions()`) in `afterEach`.

**TEST-5 — Deterministic, no sleeps.**
Await the real operation — a promise, a response, a write — never a guessed `setTimeout` delay.

**TEST-6 — Assert on behaviour, not on the absence of a throw.**
"It didn't crash" is not coverage. Assert the actual output, return value, HTTP status, or state change (JS-2).

**TEST-7 — Anything with a gate gets a gate test.**
Every route behind `middleware/auth` needs two tests: 401 without a session cookie, pass-through with a valid one (see `api/tests/auth-guard.test.js`). The route isn't done until both exist.

The same applies to any other gate: a permission, a read-only mode, a rate limit, or a
published-only filter. Write two tests. The blocked path is really blocked, and the permitted
path passes through.

**TEST-8 — DOM-dependent modules: fake DOM, not a DOM library.**
Run the real source against a small hand-built fake DOM exposing only what the module uses, as `admin/tests/admin-editor-utils.test.js` does. No `jsdom` or similar (SR-2).

**TEST-9 — Mirror the logic, don't duplicate the bug.**
Import the real module whenever possible. If a test must recreate source logic (e.g. `announce.test.js`'s `arborAriaLabel`), comment which file/function it mirrors — a passing test against a stale copy proves nothing.

**TEST-10 — Guide tests guard the text rules of a guide.**
A guide test reads source files as text and fails when code breaks a rule that a guide in
`setup/ARCHITECTURE/` states. It does not test behaviour. It catches the drift where one file
changes and another file that depends on it silently breaks. See
`api/tests/guide-error-notification.test.js`.

- When you add or edit a guide row whose rule a text search can check, add or update its guide
  test in the same change. Two examples: a banned pattern, and a value that two files must
  share. Do not add guide tests for rows that the task did not touch.
- A rule about meaning or behaviour stays prose, or gets a real behaviour test.
- Put all the tests for one guide in `api/tests/guide-<guide-name>.test.js`, so `npm test` runs
  them. The test reads `frontend/` and `admin/` files by path.
- Each failure message names the rule, the file and line, and the guide path.
- Each allowed exception is in a named list in the test file, with a one-line reason. The test
  fails when an exception names a file that no longer exists. Never add an exception or widen a
  pattern only to make a red test pass (AG-4).
- The guide names its guide test next to the rows that the test covers.

## CSS Rules

Visual values and design choices come from `setup/STYLE_GUIDE/`. These rules govern how the CSS
is written.

**CSS-1 — One file, one component.**
Each CSS file styles exactly one component, layout, or page. Split a file when it starts to
style a second, unrelated thing, not at a line count.

Exception: `variables.css` holds every token, however long. Its one job is to be the single
place to look (CSS-2), so do not split it.

**CSS-2 — Custom properties only.**
Every colour, space, size, font and duration is a custom property from the area's one
`variables.css` (`frontend/assets/css/base/variables.css`, `admin/assets/css/admin-base/variables.css`),
including any print block. Component files reference `var(--…)` only.

Exception: `admin/assets/css/admin-diagrams/timeline-tokens.css` and `maps-tokens.css` keep the
literal values of the frontend-named tokens that only the timeline and maps editors use. The admin
`variables.css` holds the `--admin-*` and `--era-*` tokens, and the diagram stylesheets reuse the
public site's token names so that an editor draws what the public page draws. Component files in
`admin-diagrams/` still reference `var(--…)` only.

**CSS-3 — Mobile inside component files.**
Put all `@media (max-width)` rules in the same file as the component. Use breakpoints from `variables.css`. No separate mobile files.

Exception: an `@media` condition writes the pixel value that `variables.css` documents, because
`var()` cannot be read there without a build step (JS-8). The duplication is accepted. A value
that drifts from the documented breakpoint is the bug.

**CSS-4 — Semantic class names.**
Class names describe *what* something is (`.card-grid`, `.popular-challenges`), never *how* it looks. Use kebab-case, consistent with filenames.

**CSS-5 — Low specificity; modern CSS welcome.**
Prefer single classes. Avoid IDs. Never use `!important`. Native nesting is allowed one level
deep for states and pseudo-elements (`&:hover`, `&::before`, `&[aria-expanded="true"]`), never
for descendant chains. Use current CSS instead of JavaScript or extra markup where it does the
job: `:has()`, container queries, `color-mix()`, logical properties, `clamp()`.

Exception: the global `@media (prefers-reduced-motion: reduce)` rule in
`frontend/assets/css/base/animations.css` uses `!important` on the two duration properties. It
must beat every component-level duration, or a new component can bring back motion for a reader
who turned it off. No other rule gets this exception.

**CSS-6 — CSS comments.**
Use large clear section headings and subheadings. Any other comment follows CORE-2.

## HTML Rules

HTML-1 to HTML-5 are general practice. See *IDs Without a Rule Here*.

**HTML-6 — Escape everything interpolated.**
Text from the database that goes into a page is escaped before insertion. In the browser, follow
JS-6. In `api/`, HTML built as strings (static pages in `api/services/page-generator.js`, map SVGs
in `api/scripts/generate-maps/`) escapes every value with the shared server-side `escapeHTML()`.

## SVG Rules

SVG-2 to SVG-5 are general practice. See *IDs Without a Rule Here*.

**SVG-1 — Always define `viewBox`.**
Every `<svg>` defines `viewBox`. Case-sensitive: `viewBox`, never `viewbox`.

Exception: the `<svg>` in `admin/assets/js/admin-arbor/arbor-canvas.js` has no `viewBox`. Its
zoom and pan use a CSS `transform` on a `<g>` with screen-pixel math throughout, and a `viewBox`
would break that math.

**SVG-6 — Icons take the text colour.**
An interface icon uses `fill="currentColor"` or `stroke="currentColor"`, so that it follows
the text colour around it. Any other colour comes from a token by class, never inline. A decorative icon carries
`aria-hidden="true"`. An icon that is the only label of a control carries a `<title>`, or the
control carries `aria-label`.

## API Rules
**API-1 — Routes are a thin layer.**
A handler parses input, calls a model, shapes the response. No SQL and no business logic in `routes/` — all SQL lives in `models/<type>.model.js`.

**API-2 — One route file per resource.**
`routes/<resource>.js` serves one mounted path and one model. Never add an endpoint for one resource to another resource's file (SR-1).

**API-3 — Errors come from the registry.**
Every failure response goes through `sendError()` / `sendValidationError()` with a code from `lib/error-codes.js`. No inline `res.status(500).json({...})`. A new failure mode earns a new registry entry in the right category, not a one-off message.

**API-4 — Validate before the model.**
Check required fields, types, and enums in the handler and return 400 naming the offending field. Models assume valid input; they are not the validation layer.

**API-5 — Write routes require auth.**
Every POST, PUT, PATCH, and DELETE mounts `requireAuth`, as does any GET exposing unpublished content (`/admin*`). Public GETs return published rows only, and the model decides that — never a flag from the query string. Not done until TEST-7's two tests exist.

**API-6 — Catch, log, respond.**
Every handler wraps its work in `try/catch`. Log the cause with method and path (`console.error("GET /resources failed:", error)`), then send a registry error. No raw exception or stack trace ever reaches the client.

**API-7 — Static route paths before dynamic.**
Register `/admin/holding-pen` before `/admin/:list_key` — Express matches in order, so the parameter would swallow it. Comment the constraint where it's load-bearing.

**API-8 — Bounded responses.**
List endpoints follow SQL-9 and never dump a whole table (SR-3). Paginate anything that grows
without limit.

## SQL Rules
**SQL-1 — Prepared statements always.**
Every query goes through `db.prepare(sql)` then `.get()`, `.all()`, or `.run()`. Never execute a raw SQL string. Cache statements in module scope — better-sqlite3 compiles on every `prepare` call.

**SQL-2 — User input only via `?`.**
All user-supplied data — params, filters, search terms — goes in as a `?` placeholder with values passed after the query. Never interpolate or concatenate it into SQL, even partially.

**SQL-3 — Named parameters for clarity.**
Multi-column INSERT/UPDATE built from an object uses named parameters (`@column`), with keys filtered through a whitelist so stray fields can't reach the database (JS-2).

**SQL-4 — Identifiers from whitelists only.**
Table, column, and index names come from hardcoded constants or validated enums — never user input. Derive filters from a list like `VALID_FILTERS = ["gospel_category", "timeline_era"]`, then `conditions.push(key + " = ?")`.

**SQL-5 — FTS queries: sanitize user search.**
Never pass raw input to `MATCH ?`. Tokenize and double-quote first (`toMatchExpression()`) so FTS operators (`AND`, `OR`, `NOT`, `*`) can't throw or change the query.

**SQL-6 — UPDATE triggers: WHEN guard required.**
Every `AFTER UPDATE` trigger needs a `WHEN` clause, or its own write re-fires it. `WHEN NEW.updated_at = OLD.updated_at` fires only when the caller didn't set a timestamp.

**SQL-7 — FTS triggers: WHEN guard and index sync.**
FTS sync triggers list the exact content columns in their `WHEN` clause, so unrelated updates don't reindex. Remove stale rows with the `'delete'` directive: `INSERT INTO fts_table(fts_table, rowid, ...) VALUES ('delete', old.id, ...)`.

**SQL-8 — Foreign key pragmas.**
`db.pragma('foreign_keys = ON')` on every connection (done in `api/config.js`) — SQLite disables it by default. Verify it in tests and on deploy.

**SQL-9 — Query in sets, not loops.**
One query returns what a request needs; never run a query per row of a previous result. Select named columns, not `SELECT *`, and bound anything user-facing with `LIMIT`.

**SQL-10 — Every filter and join has an index.**
Columns used in `WHERE`, `JOIN`, or `ORDER BY` are indexed in `schema.sql`. Check new queries against the schema, and confirm with `EXPLAIN QUERY PLAN` that a hot query isn't scanning the table.

## Migration Rules
**MIG-1 — Numbered, sequential, one per number.**
`NNN_short_description.sql`, zero-padded, next number up. Never a suffix like `004b`, never two files sharing a number — the runner applies them in `sort` order, so duplicates make that order ambiguous.

**MIG-2 — Applied migrations are immutable.**
Never edit a migration once it's pushed. `schema_migrations` keys on filename, so the VPS has already recorded it and your edit will never run there — local and production silently diverge. Fix a bad migration with a new one (042 fixes 032).

**MIG-3 — Idempotent and re-runnable.**
`IF EXISTS` / `IF NOT EXISTS` on every drop and create. Running a migration twice must not error.

**MIG-4 — `schema.sql` updated in the same commit.**
`database/schema.sql` is authoritative and builds fresh databases. A structural change that skips it leaves new and migrated databases out of sync.

**MIG-5 — Header comment: why, what, how to run.**
Open with the bug or need, the fix, and the run command — the style of `042_restore_fts_news_resource_triggers.sql`. The header explains the change. An important schema decision also goes in the decisions log (CORE-4).

**MIG-6 — Verify before you drop.**
Check `schema.sql` and the migration history for what actually exists before dropping a table, trigger, or column. A dropped trigger that is still in use breaks search re-indexing with no error (032 did this; 042 repaired it).

**MIG-7 — Destructive changes need explicit confirmation.**
`DROP TABLE`, `DROP COLUMN`, and bulk `DELETE`/`UPDATE` reach real production content on the next push. Confirm with Luke first — the empty local database is no guide to what's there.

**MIG-8 — Never special-case the runner.**
Don't fix a broken migration by adding a skip to `deploy.sh`. The `001_`/`005_` skips are legacy, not a pattern — new exceptions make deploy behavior unreproducible locally.

---

## IDs Without a Rule Here

Code and older plans cite these IDs. Each one resolves as shown. A retired ID is never reused.

| ID | Meant | Resolves to |
| :--- | :--- | :--- |
| SR-6 | Code is self-explanatory; guides are for the rest | CORE-1, CORE-3 |
| JS-1 | Self-documenting names over comments | CORE-1 |
| JS-4 | Comments say "why", not "what"; JSDoc on public APIs | CORE-2, JS-7 |
| HTML-1 | Semantic elements; one `<main>` per page | General practice |
| HTML-2 | Every `<img>` has `alt`; empty for decorative images | General practice |
| HTML-3 | One `<h1>`; never skip heading levels | General practice |
| HTML-4 | CSS in `<head>`; scripts at the bottom or `defer` | General practice, SR-3 |
| HTML-5 | Every form control has a `<label>`; `aria-describedby` for errors | General practice |
| SVG-2 | Strict XML syntax: self-close, quote attributes | General practice |
| SVG-3 | Painter's model: source order, no `z-index` | General practice |
| SVG-4 | Basic shapes for simple geometry; `<path>` for complex | General practice |
| SVG-5 | Style SVG with `fill` and `stroke` | General practice, SVG-6, CSS-2 |
| PY-7 | Context managers for every resource | General practice |
