# Plan: JS Vibe Coding Rule Compliance

**Module(s):** Admin
**Date:** 2026-06-30
**Status:** ✅ Plan generated — ready for implementation

## Goal
Fix JS-3 (`var` → `const`/`let`) and JS-5 (raw `fetch` → centralised `Admin.api`) violations found across 5 admin JavaScript files. The frontend and API layer scored clean on all rules and need no changes.

## Coding rules to keep in mind
- **JS-3** — Use `const`/`let` instead of `var`. The five files listed below contain the only `var` usage in the project outside of tests. Modern block-scoped declarations are the standard everywhere else.
- **JS-5** — Centralise all raw `fetch()` calls. The two maps admin files currently bypass `Admin.api` (the admin equivalent of frontend `api.js`) to call `fetch("/maps/*")` directly. They should route through the same `Admin.api.get/post/put/del` wrappers that the arbor and timeline admin editors already use.
- **JS-2** — Preserve existing error handling. Raw `fetch` calls in the maps files currently have their own `try/catch` + status checking. When switching to `Admin.api`, ensure the same error-message extraction and handling is preserved (the API wrapper already handles 401 redirects and throws structured errors).
- **SR-1** — One file per function. The maps files already follow this (pins, regions, render are separate files). No structural changes — only inline refactoring.

## Tasks

### Phase 1 — Fix JS-5: Route maps API calls through Admin.api

- [ ] **Refactor `maps-pins.js` to use Admin.api** — Replace all 5 raw `fetch()` calls (GET /maps/pins/by-map/:id, POST /maps/pins, PUT /maps/pins/:id, DELETE /maps/pins/:id, PUT /maps/pins/:id for drag position save) with `Admin.api.get/post/put/del`. Preserve existing error handling — Admin.api already throws on non-ok statuses and surfaces `err.message`, so the existing `catch (e) { console.error(...); showError(e.message); }` pattern will still work. File: `admin/assets/js/admin-maps/maps-pins.js` — modified

- [ ] **Refactor `maps-regions.js` to use Admin.api** — Replace both raw `fetch()` calls (GET /maps for the list, GET /maps/:key for single map detail) with `Admin.api.get`. Same pattern: Admin.api throws structured errors that the existing catch blocks already handle. File: `admin/assets/js/admin-maps/maps-regions.js` — modified

### Phase 2 — Fix JS-3: Convert `var` to `const`/`let`

- [ ] **Convert `var` in `timeline-events.js`** — Replace all `var` declarations (approximately 25+ instances) with `const` for variables that are never reassigned, and `let` for loop counters and variables that are reassigned. File: `admin/assets/js/admin-timeline/timeline-events.js` — modified

- [ ] **Convert `var` in `arbor-nodes.js`** — Replace all `var` declarations with `const`/`let` per the same rule. File: `admin/assets/js/admin-arbor/arbor-nodes.js` — modified

- [ ] **Convert `var` in `maps-pins.js`** — Replace al `var` declarations with `const`/`let`. This can be done simultaneously with the Phase 1 refactor. File: `admin/assets/js/admin-maps/maps-pins.js` — modified (same file as Phase 1)

- [ ] **Convert `var` in `maps-regions.js`** — Same as above. File: `admin/assets/js/admin-maps/maps-regions.js` — modified (same file as Phase 1)

- [ ] **Convert `var` in `analytics.js`** — Replace the few remaining `var` declarations with `const`. File: `admin/assets/js/analytics.js` — modified

### Phase 3 — Validation

- [ ] **Run `admin/tests/maps.test.js`** — The maps tests exercise coordinate-mapping helpers. Since the refactored files only change how fetch calls are made (not what data is passed or returned), these should pass unchanged. Run: `cd admin && node --test tests/maps.test.js`. File: terminal command

- [ ] **Run `admin/tests/admin-arbor.test.js` and `admin/tests/admin-timeline.test.js`** — Verify that the `var` → `const`/`let` conversion in arbor-nodes.js and timeline-events.js doesn't break the test suites. The tests exercise pure helpers, not the file-level `var` declarations, but run them to confirm. File: terminal command

- [ ] **Spot-check the maps admin UI** — Open `admin/diagrams/maps.html` in browser, verify: map selector populates, pin creation/edit/delete/drag all work, error states appear correctly on API failure. File: manual browser check

- [ ] **Spot-check the arbor admin UI** — Open `admin/diagrams/arbor.html`, verify adding nodes and creating edges work as expected after the `var` → `const`/`let` conversion. File: manual browser check

- [ ] **Spot-check the timeline admin UI** — Open `admin/diagrams/timeline.html`, verify events render and edit panel works as expected. File: manual browser check

- [ ] **Spot-check the analytics page** — Open `admin/analytics.html`, verify stats cards, page views table, and referrers table render correctly. File: manual browser check

- [ ] **Verify zero `var` in admin JS** — Run `grep -rn '\bvar\b' admin/assets/js --include='*.js'` and confirm zero results. File: terminal command

- [ ] **Verify zero raw `fetch` in admin maps JS** — Run `grep -rn 'fetch(' admin/assets/js/admin-maps --include='*.js'` and confirm zero results outside of comments. File: terminal command

## Files touched
- `admin/assets/js/admin-maps/maps-pins.js` — modified
- `admin/assets/js/admin-maps/maps-regions.js` — modified
- `admin/assets/js/admin-timeline/timeline-events.js` — modified
- `admin/assets/js/admin-arbor/arbor-nodes.js` — modified
- `admin/assets/js/analytics.js` — modified

## Notes
- **No new test files needed** — These are pure refactoring changes. The refactored files produce identical behaviour (same data, same error handling). Existing test suites at `admin/tests/maps.test.js`, `admin/tests/admin-arbor.test.js`, and `admin/tests/admin-timeline.test.js` confirm the helpers and coordinate logic are unaffected.
- **`passkey.js` and `auth.js` are intentionally excluded** — Both use raw `fetch()` because they run on auth pages (`login.html`/`register.html`) that don't load the `admin.js` bundle containing the `Admin.api` wrapper. This is an accepted exception documented in the original audit.
- **`fetch` → `Admin.api` error compatibility** — The existing code in `maps-pins.js` catches errors with `catch (e) { console.error(...); showError(e.message); }`. `Admin.api` throws `Error` objects with the same `.message` property, so the catch blocks work identically without modification.
- **`var` → `const`/`let` is zero-risk** — `var` and `let` have identical behaviour in the top-level function scopes where they're used in these files. The only difference (`var` is function-scoped, `let` is block-scoped) doesn't apply because no declarations are inside `if`/`for` blocks where block scoping would matter.
- **Technical summary alignment** — The Website_guide.md specifies "vanilla HTML, CSS, and JavaScript" for the frontend and admin. These changes reinforce that by keeping the admin's API layer within a single centralised vanilla module (`admin.js`) rather than scattering raw `fetch()` across files.
