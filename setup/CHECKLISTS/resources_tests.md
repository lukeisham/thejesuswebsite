# Resources Module — Validation Checklists

Manual validation checks for the Resources module (public list pages, admin
editors, API). Distinct from automated `.test.js` files, which are created by
each plan's own implementation tasks.

---

## Validation: Resources Module Refactor
**Plan:** resources-module-refactor.md
**Date:** 2026-07-25

### Manual checks

**Admin consolidation (do this first — everything else depends on it):**
- [ ] `grep -c "function buildRow" admin/resources/*.html` returns 0 for all 16 files
- [ ] No `admin/resources/*.html` file contains an inline `<style>` block; all styling comes from `admin-components/resources-list.css`
- [ ] Each of the 15 topic pages loads `admin-resources-pen.js` then `admin-resources-topic.js`
- [ ] Open three different list pages (e.g. OT Verses, Parables, Sources) — each renders its own list, with the header, Switch List dropdown, and Save All bar styled identically to before the change
- [ ] Reorder by drag, edit a title, delete a row, and save — all behave as they did with the inline editor
- [ ] Line count across `admin/resources/` has dropped substantially from the 10,864-line baseline

**Admin — drafts visible and publishable (the finding-1 fix):**
- [ ] Click "+ Add Item", type a title, Save All, then **reload the page** — the new item is still listed (before this plan it vanished)
- [ ] The item shows as Draft; the publish toggle switches it to Published and the state survives a reload
- [ ] The public list page shows the item only once it is Published
- [ ] A save that fails for one row surfaces in the error banner naming that row — not just a count in the status line

**Admin — Move to list:**
- [ ] A row's "Move to list…" dropdown lists all 15 lists plus "Holding pen"
- [ ] Moving an item to another list removes it from the current page and it appears on the target list's page after reload
- [ ] Moving an item to "Holding pen" removes it from the list and it appears as a pen chip
- [ ] The moved item keeps its title, URL, description and publish state

**Admin — holding pen:**
- [ ] The pen panel renders below the list on every resource topic page
- [ ] The pen shows the **same items** on two different list pages (site-wide pool, not per-list)
- [ ] Each chip shows the originating list label
- [ ] "File into this list" appends the item to the currently open list, clears it from the pen, and survives a reload
- [ ] With an empty pen, an explicit empty state is shown — not a blank panel
- [ ] A failed pen fetch shows an error state rather than silently rendering an empty pen

**Admin — subheadings:**
- [ ] "+ Add Subheading" adds a row with a title input only — no URL field, no description field, no ordinal
- [ ] The subheading row is visually distinct from item rows
- [ ] A subheading can be dragged to any position in the list and its position survives Save All + reload
- [ ] A subheading defaults to Published

**Public — chips removed:**
- [ ] No chip row appears on any of the 15 `/resources/<key>.html` pages
- [ ] `document.getElementById('category-nav')` is `null` on a live resource page
- [ ] No console errors and no 404s on page load
- [ ] `/resources/` still shows the full card grid, so every category remains reachable

**Public — subheadings and numbering:**
- [ ] A list containing subheadings renders one `<section>` per heading, each with an `<h3>` and its own `<ol>`
- [ ] Item numbering **restarts at 1** under each subheading
- [ ] Subheadings themselves carry no ordinal
- [ ] Items appearing before the first subheading render in a leading unlabelled list
- [ ] A subheading whose items are all drafts/absent does not render as an orphan heading
- [ ] Scroll past the 30-item pagination boundary — the next batch continues the current section and does not restart the ordinal count
- [ ] Heading hierarchy is intact: page `<h2>` → section `<h3>`, no skipped levels

**Public — OT Verses (the live acceptance check):**
- [ ] `https://thejesuswebsite.org/resources/ot-verses.html` renders **four verses**
- [ ] If fewer appear, check each row's `published_draft` in the admin before treating it as a rendering bug — record which state the rows were in

**API:**
- [ ] `curl https://thejesuswebsite.org/api/resources?list_key=ot-verses` returns only published, non-pen rows
- [ ] `curl` `/api/resources/admin?list_key=ot-verses` without a session returns 401
- [ ] `curl` `/api/resources/admin/holding-pen` without a session returns 401
- [ ] A PUT with an invalid `list_key` returns 400 with the `INVALID_LIST_KEY` code, not a 500
- [ ] A PUT with an invalid `item_type` returns 400 with the `INVALID_RESOURCE_ITEM_TYPE` code
- [ ] No resources route returns a raw `{ error: "..." }` body without an `E-*` code

**Search:**
- [ ] A subheading's text does not appear in site search results under Bible Verses
- [ ] A parked (holding-pen) OT verse does not appear in search results
- [ ] A normal published OT verse still does

**Database:**
- [ ] `PRAGMA table_info(resources)` shows `item_type` (default `'item'`, NOT NULL) and `in_holding_pen` (default `0`, NOT NULL)
- [ ] `idx_resources_holding_pen` exists
- [ ] Existing rows all have `item_type = 'item'` and `in_holding_pen = 0` after the migration
- [ ] `api/tests/helpers/db.js` skips `036_` and the suite runs without a duplicate-column error

### Code-review checks
- [ ] SR-4 — no resources editor logic remains in any `admin/resources/*.html`; every feature exists once in `admin-resources-topic.js`
- [ ] SR-1 — the holding pen lives in its own `admin-resources-pen.js`, not inside the topic editor
- [ ] SQL-3/SQL-4 — `item_type` and `in_holding_pen` go through the `WRITABLE_COLUMNS` whitelist; `list_key` and `item_type` are validated against hardcoded constants in **both** `create()` and `update()`
- [ ] SQL-2 — every new query uses `?`/named placeholders; no interpolated `list_key`
- [ ] JS-2 — admin list, pen fetch, and per-row save failures all surface to the user; no silent empty-list fallback
- [ ] JS-6 — row buttons and the move dropdown are bound by delegation on the list container, not per-row listeners rebuilt on each render
- [ ] CSS-1 — `resources-list.css` styles only the resources editor and stays under 150 lines (split if not)
- [ ] CSS-2 — no hardcoded colours or spacing in the new admin CSS; `--admin-*` / `--space-*` tokens only
- [ ] CSS-5 — no `!important`, no ID selectors in the new rules
- [ ] HTML-1/HTML-3 — public subheadings are real `<h3>` elements inside `<section>`s under the page `<h2>`; each section has its own `<ol>`
- [ ] Every list-membership query also tests `in_holding_pen = 0` (public list, admin list, search `extraWhere`, any count query)
- [ ] The two new `E-*` codes follow the existing `error-codes.js` entry shape (code, category, httpStatus, message, detail, severity)
