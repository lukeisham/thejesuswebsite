# Validation: Challenge Detail Essay-Grade Refactor (Plans 01–04)

The challenge detail refactor is split into four numbered plans run in order:
**01 schema → 02 API → 03 admin editors → 04 detail page**. Each section below is that plan's checklist.

---

## Plan 01 — Challenge schema (Database; smoke test)
**Plan:** 01-challenge-schema-body-and-drop-urls.md
**Date:** 2026-07-21

### Manual checks
- [ ] Migration 032 applies cleanly on a copy of the DB.
- [ ] `PRAGMA table_info(challenges)` shows `challenge_body` present and `challenge_url_a`–`_d` gone.
- [ ] `database/schema.sql` matches the migrated table (adds body, drops the four URL columns).

### Code-review checks
- [ ] Migration follows the `NNN_*.sql` forward-only convention; one concern per file.
- [ ] No `.js` touched — automated-test mandate N/A; smoke test is the verification.

---

## Plan 02 — Challenge API (API; smoke test)
**Plan:** 02-challenge-api-detail-and-mla.md
**Date:** 2026-07-21

### Manual checks
- [ ] `curl -s https://thejesuswebsite.org/api/popular-challenges/<slug>` returns `title`/`summary`/`body`/`bibliography`; no `challenge_url_*`. Repeat for `/api/academic-challenges/<slug>`.
- [ ] Admin read (`/admin/:id`) still returns raw columns (`challenge_title`, `challenge_body`, `mla_sources` with ids).
- [ ] A challenge saved with `mla_source_ids` reloads with those sources linked (via the lifecycle test).

### Code-review checks
- [ ] SQL-3/SQL-4 — `challenge_body` added, `challenge_url_*` removed in both models' `WRITABLE_COLUMNS`; MLA links only via `replaceLinks()` with hardcoded junction names.
- [ ] JS-5 — `createComposite`/`updateComposite` are transactional in both models; both routes call them.
- [ ] JS-2 — public `getDetailBySlug` normalizes and returns `undefined` for missing/unpublished; admin path keeps raw columns.
- [ ] Automated tests added/extended in `api/tests/challenge-lifecycle.test.js` and passing.

---

## Plan 03 — Challenge admin editors (Admin; test live)
**Plan:** 03-challenge-admin-editors.md
**Date:** 2026-07-21

### Manual checks *(admin — requires passkey auth; see plan's Live testing playbook; clean up test input, don't Save junk)*
- [ ] All four editors (popular/academic × new/edit): Content card shows Summary AND a Body textarea.
- [ ] Body has a working Insert Image button (inserts `[figure …]`) and spellcheck; a Shortcode Help reference is present.
- [ ] The Source URLs card is gone; a Bibliography (MLA) panel adds/removes sources.
- [ ] On `edit-[id].html`, a saved Body + selected MLA sources reload correctly.

### Code-review checks
- [ ] SR-4 — identical changes landed in all four editors; grep confirms none missed.
- [ ] HTML-4/HTML-5 — new script includes in `<head>`; Body textarea has a proper `<label>`.
- [ ] No publish toggle card added; existing bottom Save/Publish buttons unchanged.
- [ ] Payloads include `challenge_body` + `mla_source_ids`, exclude `challenge_url_*`.

---

## Plan 04 — Challenge detail page (Frontend; test live)
**Plan:** 04-challenge-detail-frontend-rendering.md
**Date:** 2026-07-21

### Manual checks *(public page — no auth needed)*
- [ ] `#challenge-title` shows the real title (not "Untitled Challenge"); body renders — verify via `read_page` / `querySelector`.
- [ ] Summary vs body: the list page shows the summary on cards; the detail page shows the body and never the summary.
- [ ] A body with `[mla:N]` renders superscripts linked to a populated `#challenge-references-list`; `[figure]` renders an image + caption.
- [ ] `.challenge-detail-body` sits in a ~680px reading column (computed `max-width`).
- [ ] Responses section still lists linked responses.
- [ ] No console errors.

### Code-review checks
- [ ] JS-6 — body renders via `parseContentBody()` (escaped) → `innerHTML`; no raw interpolation.
- [ ] CSS-1/CSS-2/CSS-4 — `challenge-detail.css` single-purpose, < 150 lines, tokens only, semantic names.
- [ ] HTML-4 — new stylesheet `<link>`s in `<head>` of both `[slug].html`.
- [ ] HTML-1 — stray `</h2>` removed from academic `[slug].html`; both templates well-formed.
- [ ] Issues.md row #96 flipped to `resolved` (only its Status cell).
