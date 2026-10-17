# Decisions Log

The dated record of important decisions and permissions for this project. It says *what* was
decided, *when*, *who* granted it, and *why*. The code, the guides and the rules say how things
are now. This log says how they got that way, so that a future agent does not undo a choice on
purpose that it thinks is a mistake.

This file is tracked in git (a `.gitignore` exception), so it is on GitHub and can be
recovered. It holds no secrets.

## What goes in this log

### An important decision

A decision goes in this log if **any** of these is true:

1. **A future agent would undo it.** An agent that reads only the code, the guides and the rules
   would likely undo it, or do it differently (the CORE-4 test).
2. **It is hard to reverse.** It sets the database schema shape, a data migration, the URL
   structure, the public API or MCP contract, or the deploy and server setup.
3. **It adds or removes a moving part.** A dependency, a service, a pm2 process, a cron job, or
   an outside API.
4. **It changes what is safe or public.** Auth, security, privacy, or what content the public can
   see.
5. **It picks between real options.** Two or more workable designs existed, and the choice has a
   trade-off.
6. **It reverses an earlier entry.** Any change to a decision in this log is itself a decision.

These are **not** important decisions. They go in the commit message only:

- routine edits, refactors and renames;
- a bug fix that restores the intended behaviour;
- a choice that the rules or the style guide already make;
- a choice that any capable agent would make the same way.

### A permission

A permission is Luke's explicit grant to do something that a rule or a default forbids. It goes
in this log if it is **standing**, that is, it applies again in the future:

- a rule exception (CORE-4) — the exception text also goes under its rule in
  `setup/Vibe_coding_rules.md`, where agents read it;
- a new dependency, or a new language for a service (SR-2, PY-1);
- a standing grant to an agent, for example "agents can do X without asking".

A one-off confirmation (for example, one destructive migration under MIG-7) is not a standing
permission. Record it in that commit message.

Only Luke grants a permission. An agent can draft the entry, but only after Luke says yes in
chat. A permission that is not in this log, or not under its rule, does not exist (CORE-4).

## How to write an entry

- **Append only.** Add new entries at the bottom, with the next number. Never reuse a number.
- **Never rewrite an entry.** To change a decision, add a new entry. Then change only the
  **Status** line of the old entry to `Superseded by D-NNN`.
- **Keep it short.** Give the reason and the trade-off, not a design document. Link to the plan
  or the guide for detail.
- **Dates** are the day of the decision. If the exact day is not known, write `by <date>` with
  the date of the first commit that records it.

Copy this template:

```markdown
### D-NNN — <short title>

- **Type:** Decision | Permission
- **Date:** YYYY-MM-DD
- **By:** Luke (agent drafts say "Luke, in chat")
- **Applies to:** <files, folders or areas>
- **Rule:** <rule IDs, or "none">
- **Status:** Active | Superseded by D-NNN

**Decision:** <one or two sentences: what was decided or granted.>

**Why:** <the reason, and what this protects.>

**Rejected:** <the other options, and why not. Write "none" for a permission.>

**Where it lives:** <the commit, and the rule, guide or file that holds the current text.>
```

---

## Entries

### D-001 — Approved dependency classes

- **Type:** Permission
- **Date:** by 2026-07-18
- **By:** Luke
- **Applies to:** `frontend/`, `admin/`
- **Rule:** SR-2
- **Status:** Active

**Decision:** Visual and display libraries are approved. Client-side spell and grammar checkers
(`nspell`, `typo.js`, `retext`) are approved inside `admin/` only, and never ship to `frontend/`.

**Why:** These solve problems that a short hand-written module cannot. Keeping spellcheck out of
`frontend/` keeps public pages light (SR-3).

**Rejected:** none

**Where it lives:** SR-2 in `setup/Vibe_coding_rules.md`; first tracked in `b7cbdaf`.

### D-002 — Python vector sidecar can serve the site

- **Type:** Permission
- **Date:** 2026-08-16
- **By:** Luke
- **Applies to:** `Wikipedia algorithm/vector-sidecar/`, `api/lib/vector-sidecar-client.js`
- **Rule:** PY-1, SR-2
- **Status:** Active

**Decision:** A FastAPI/uvicorn service with its own venv and `requirements.txt` serves live
requests. It runs as the pm2 process `thejesuswebsite-vector-sidecar` on `127.0.0.1:8901`. Node
calls it with a 2s timeout and keeps working if it is down.

**Why:** No Node-native option for FAISS search and local ONNX embedding is as mature. Its own
process keeps the Python dependencies out of the main app.

**Rejected:** A Node-only version, which has no mature library for this.

**Where it lives:** PY-1 in `setup/Vibe_coding_rules.md` (`0b2e011`);
`setup/ARCHITECTURE/wikipedia-ranking-pipeline.md`.

### D-003 — Offline Python tooling can have dependencies

- **Type:** Permission
- **Date:** 2026-08-16
- **By:** Luke
- **Applies to:** `Wikipedia algorithm/classifier/`, `families/`, `scripts/`, `setup/scripts/`
- **Rule:** PY-1, SR-2
- **Status:** Active

**Decision:** Python tooling that `deploy.sh` never runs can carry a `requirements.txt`.

**Why:** It never serves a live request, so it does not add weight or risk to the site.

**Rejected:** none

**Where it lives:** PY-1 in `setup/Vibe_coding_rules.md` (`0b2e011`).

### D-004 — `variables.css` is exempt from the file-size split

- **Type:** Permission
- **Date:** 2026-08-16
- **By:** Luke
- **Applies to:** `frontend/assets/css/base/variables.css`, `admin/assets/css/admin-base/variables.css`
- **Rule:** CSS-1, CSS-2
- **Status:** Active

**Decision:** Each `variables.css` holds every token for its area, however long it gets.

**Why:** CSS-2 needs exactly one place to look for a token. Splitting the file would spread
tokens across files.

**Rejected:** Splitting tokens by type into several files.

**Where it lives:** CSS-1 in `setup/Vibe_coding_rules.md` (`f14321e`).

### D-005 — Media-query breakpoints are literal numbers

- **Type:** Decision
- **Date:** 2026-08-17
- **By:** Luke
- **Applies to:** every CSS file with `@media`
- **Rule:** CSS-3
- **Status:** Active

**Decision:** Each `@media` rule writes the breakpoint as a literal pixel value that matches
`variables.css`. The duplication is accepted and is not a defect.

**Why:** CSS custom properties do not work inside an `@media` condition without a build step,
and the project has none (JS-8).

**Rejected:** Adding a build step only to share breakpoints.

**Where it lives:** CSS-3 in `setup/Vibe_coding_rules.md` (`b8e6c2a`).

### D-006 — Arbor canvas SVG has no `viewBox`

- **Type:** Permission
- **Date:** 2026-08-17
- **By:** Luke
- **Applies to:** `admin/assets/js/admin-arbor/arbor-canvas.js`
- **Rule:** SVG-1
- **Status:** Active

**Decision:** The Arbor canvas `<svg>` does zoom and pan with a CSS `transform` on a `<g>` and
screen-pixel math, without a `viewBox`.

**Why:** It works, and a `viewBox` would mean a full rewrite of its coordinate math.

**Rejected:** A rewrite to use `viewBox` scaling.

**Where it lives:** SVG-1 in `setup/Vibe_coding_rules.md` (`b8e6c2a`).

### D-007 — Core and Agent rules added; old rule IDs kept

- **Type:** Decision
- **Date:** 2026-10-17
- **By:** Luke, in chat
- **Applies to:** `setup/Vibe_coding_rules.md`
- **Rule:** all
- **Status:** Active

**Decision:** Add CORE-1 to CORE-4 and AG-1 to AG-5, based on the Lukeatron rules. Every old ID
keeps its meaning. New rules take free IDs. Retired IDs stay in the "IDs Without a Rule Here"
table and are never reused.

**Why:** Code comments cite rule IDs in hundreds of files (for example, `JS-6` in 165). If an ID
changed its meaning, those citations would be wrong.

**Rejected:** Renumbering to match the Lukeatron file.

**Where it lives:** `83591e8`.

### D-008 — Python tests for offline tooling use pytest

- **Type:** Decision
- **Date:** 2026-10-17
- **By:** Luke, in chat
- **Applies to:** `Wikipedia algorithm/`
- **Rule:** TEST-1
- **Status:** Active

**Decision:** Tooling under PY-1's exception uses `pytest` from its own venv. Stdlib-only scripts
use `unittest`.

**Why:** The tooling already used pytest, and it already has its own dependencies (D-003).

**Rejected:** Moving those tests to `unittest`.

**Where it lives:** TEST-1 in `setup/Vibe_coding_rules.md` (`83591e8`).

### D-009 — Admin JavaScript keeps the `window.Admin` namespace

- **Type:** Decision
- **Date:** 2026-10-17 (the pattern is older; this records it)
- **By:** Luke, in chat
- **Applies to:** `admin/`
- **Rule:** JS-3, SR-8
- **Status:** Active

**Decision:** Admin JavaScript attaches helpers to the shared `Admin` object in `admin.js`. New
admin files follow that pattern. JS-3's "ES modules only, nothing on `window`" applies to new
files in `frontend/`.

**Why:** All admin pages call `Admin.api.*`. A new admin file in ES-module style would not match
its neighbours (SR-8) or fit the pages that load it.

**Rejected:** Moving `admin/` to ES modules, which is a large change that no task asks for.

**Where it lives:** JS-3 in `setup/Vibe_coding_rules.md`; "`window.Admin` global namespace" in
`setup/ARCHITECTURE/Website_guide.md`.

### D-010 — The decisions log is tracked in git

- **Type:** Decision
- **Date:** 2026-10-17
- **By:** Luke, in chat
- **Applies to:** `setup/Decisions_log.md`, `.gitignore`
- **Rule:** CORE-4
- **Status:** Active

**Decision:** This log lives at `setup/Decisions_log.md`, next to the rules, and is a `.gitignore`
exception like `setup/Vibe_coding_rules.md`.

**Why:** Most of `setup/` exists only on this machine and was lost once. Permissions must survive
that, and agents on any copy of the repo must be able to read them.

**Rejected:** A local-only file in `setup/`, and a new `docs/` folder at the repo root.

**Where it lives:** this file.

### D-011 — Touch rule, and agents move decisions into this log without asking

- **Type:** Decision and Permission
- **Date:** 2026-10-17
- **By:** Luke, in chat
- **Applies to:** every file in the repo; `setup/Decisions_log.md`
- **Rule:** CORE-1 to CORE-4, AG-1
- **Status:** Active

**Decision:** The Core Rules are applied file by file. When an agent edits a file, it brings that
whole file into line with the Core Rules in the same change. Docs keep only purpose, navigation
and cross-module behaviour. Decisions go only in this log, and open problems only in
`setup/ISSUES/Issues.md`.

**Permission:** When an agent cleans a touched doc, it can move a decision from that doc into
this log without asking Luke first. The agent names the new entries in its reply.

**Why:** The repo moves to self-documenting code and short docs without a rewrite of every file.
The scope is the files that a task edits, so a cleanup never grows into a repo-wide change.

**Rejected:** A rewrite of the whole repo in one pass, which is too large. "Fix it when you see
it", which had no clear scope. Asking Luke before each move, which adds a stop for a low-risk
change.

**Where it lives:** "Touch rule" under Core Rules in `setup/Vibe_coding_rules.md`.

### D-012 — The Wikipedia list is fixed, and the vector classifier is the only section classifier

- **Type:** Decision
- **Date:** by 2026-07-31 (moved here from `setup/ARCHITECTURE/wikipedia-ranking-pipeline.md` under D-011)
- **By:** Luke
- **Applies to:** `setup/SKILLS/!TheJesusWebsite-Wikipedia/`, `Wikipedia algorithm/`
- **Rule:** none
- **Status:** Active

**Decision:** The `/debate/wikipedia/` page ranks a fixed list of articles. An article is added or
removed only when Luke names it. The vector classifier's paragraph labels are the only section
buckets for placement-sensitive signals. There is no heading-based fallback.

**Why:** An automatic top-up re-pools and re-scores articles that nobody asked to touch. Two
classifiers give two definitions of "data" and "interpretation".

**Rejected:** The earlier automatic top-up to a ceiling size, and the earlier heading-based
section classifier.

**Where it lives:** "Invariants" in `setup/ARCHITECTURE/wikipedia-ranking-pipeline.md`; the skill
`setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md`.

### D-013 — Cloudflare caches HTML at the edge for 60 seconds

- **Type:** Decision
- **Date:** 2026-07-11 (moved here from a completed plan under D-011)
- **By:** Luke
- **Applies to:** `deploy/nginx.conf`, the Cloudflare dashboard (Caching → Cache Rules)
- **Rule:** SR-3
- **Status:** Active

**Decision:** A Cache Rule in the Cloudflare dashboard caches HTML at the edge. It excludes
`/api/*` and `/admin/*`, and it obeys the origin `Cache-Control`. nginx sends HTML with
`public, max-age=60`, so a deploy is visible within 60 seconds on the edge and at the origin.

**Why:** Without the rule, every page went to the VPS, with a time to first byte of 280–900 ms.
With the rule, a cached page takes about 50–70 ms. The 60-second limit keeps deploys quick to
appear. The rule is not in the repo, so an agent that reads only the code cannot see it.

**Rejected:** No edge caching for HTML, which sends every request to the VPS. The plan recorded
no other options.

**Where it lives:** the HTML `Cache-Control` comment in `deploy/nginx.conf`; the cache policy
section of `setup/ARCHITECTURE/Website_guide.md`.

### D-014 — Browser spellcheck replaces the `nspell` admin spellcheck

- **Type:** Decision
- **Date:** 2026-10-17
- **By:** Luke
- **Applies to:** `admin/`, `api/`
- **Rule:** SR-2
- **Status:** Active

**Decision:** The admin uses the spellcheck that the browser already has. Prose fields set
`spellcheck` to true. Slugs, keywords, ids, urls, verses and name fields set it to false. This ends
the spellcheck clause of `D-001`. The custom overlay, the `nspell` library and the learned-words
route are removed.

**Why:** The custom engine needed a vendored library, a worker, a table and a route. The browser
gives the same underline and right-click menu on every prose field with no code to maintain.

**Rejected:** Keeping the custom engine. It also flagged passive voice, repeated words and a/an
mistakes, and it kept one shared word list. Luke accepted the loss of these three things: grammar
hints, the shared learned-words list, and the same result in every browser.

**Where it lives:** `AdminFormBuilder` in `admin/assets/js/admin-form-builder.js`, and the
`spellcheck` attribute on each prose field in `admin/`.

### D-015 — Admin sessions are in memory only

- **Type:** Decision
- **Date:** by 2026-07-04 (moved here from `setup/ARCHITECTURE/Website_guide.md` under D-011)
- **By:** Luke
- **Applies to:** `api/middleware/auth.js`
- **Rule:** SR-2
- **Status:** Active

**Decision:** Admin sessions live in an in-memory `Map` with a 12-hour TTL. Nothing is stored on
disk, so an API restart logs the admin out.

**Why:** The site has one admin. A logout after each deploy costs little, and the design needs no
session table, no session library and no stored tokens.

**Rejected:** A persisted session store. It becomes necessary only if the site adds public
accounts.

**Where it lives:** the session comment in `api/middleware/auth.js`.

### D-016 — Admin login is passkey only

- **Type:** Decision
- **Date:** by 2026-07-04 (moved here from `setup/ARCHITECTURE/Website_guide.md` under D-011)
- **By:** Luke
- **Applies to:** `api/middleware/auth.js`, `api/routes/` auth and passkey routes, `admin/auth/`
- **Rule:** none
- **Status:** Active

**Decision:** The admin signs in only with a WebAuthn passkey. There is no password and no
password reset.

**Why:** With no password, there is no password to steal, guess or leak.

**Rejected:** A password login, or a password as a fallback.

**Where it lives:** `api/middleware/auth.js` and the passkey routes in `api/routes/`.

### D-017 — Frontend and admin stay two separate systems

- **Type:** Decision
- **Date:** by 2026-07-04 (moved here from `setup/ARCHITECTURE/Website_guide.md` under D-011)
- **By:** Luke
- **Applies to:** `frontend/assets/`, `admin/assets/`
- **Rule:** SR-1
- **Status:** Active

**Decision:** The frontend and the admin keep separate stylesheets and separate API clients. The
frontend client returns `{ data, error }` and never throws. The admin client throws, and it sends
the user to the login page on a 401. Neither side imports CSS from the other. When the two must
look the same, each side writes the same spec in its own tokens.

**Why:** The public site is tuned for reading, and the admin is tuned for dense data entry. A
shared stylesheet would make a change on one side break the other.

**Rejected:** One shared design system, and one shared API client.

**Where it lives:** "Refactoring rules" in `setup/ARCHITECTURE/Website_guide.md`; D-009 for the
`window.Admin` namespace.

### D-018 — Wikipedia scoring never runs on the VPS

- **Type:** Decision
- **Date:** by 2026-07-16 (moved here from `setup/ARCHITECTURE/wikipedia-ranking-pipeline.md` under D-011)
- **By:** Luke
- **Applies to:** `deploy.sh`, `setup/SKILLS/!TheJesusWebsite-Wikipedia/`, `api/scripts/import-wikipedia-scoring.js`
- **Rule:** none
- **Status:** Active

**Decision:** Wikipedia scoring runs only on the developer machine. The VPS imports the finished
`database/scoring-export.json` at deploy time. `deploy.sh` stays Node-only, with no Python, pip
or venv step.

**Why:** A Python step in the deploy path needs a Python runtime on every VPS. A new VPS without
it would fail with no clear error.

**Rejected:** Scoring at deploy time on the VPS.

**Where it lives:** "Invariants" in `setup/ARCHITECTURE/wikipedia-ranking-pipeline.md`.
