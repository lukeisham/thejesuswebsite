# Plan: Pre-Launch Code Bug Fixes

**Module(s):** API / Frontend
**Date:** 2026-07-03
**Status:** ✅ Completed

## Goal
Fix two confirmed correctness bugs found during the launch-readiness review
that are not covered by any other plan: `evidence-detail.js` double-escapes
related-evidence link titles, and `POST /publish/:type/:id` throws a 500
(instead of a clean 400) for inherited `Object.prototype` keys.

> The drafts-list routing bug (Issue #13) was originally a third task here, but
> it is now owned entirely by `historiography-admin-editor.md`, which builds the
> real historiography editor and lands the correct `draftEditUrl` for both
> `responses` and `historiography`. It was removed from this plan so the two
> plans no longer both edit `admin/drafts/index.html`.

## Coding rules to keep in mind
- **JS-2** — Robust & predictable. Route by real, enumerable keys only
  (`Object.hasOwn`), and return an explicit 400 for an unknown/prototype type
  rather than letting it fall through to a 500.
- **JS-6** — Safe DOM handling. Inside the `html` tagged template, interpolated
  values are already escaped exactly once; calling `escapeHTML()` on them first
  is the double-escape defect being removed.
- **JS-3 / JS-1** — Keep the fixes minimal and self-documenting; no refactors
  beyond the bug.

## Tasks

### API

- [x] **Guard the publish type map against prototype keys** — in `setPublished`,
  resolve the model with `Object.hasOwn(MODELS, req.params.type)` before the
  lookup so `/publish/constructor/1` (and `toString`, etc.) return the existing
  400 "Unknown or non-publishable type." instead of throwing at the model call.
  File: `api/routes/publish.js`
- [x] **Test the publish route** — cover: a valid type publishes/unpublishes and
  flips `published_draft`; an unknown type returns 400; a prototype key
  (`constructor`) returns 400, not 500; a non-numeric id returns 400; a missing
  id returns 404. File: `api/tests/publish-route.test.js`

### Frontend

- [x] **Remove the double-escape in the related-evidence list** — drop the inner
  `escapeHTML(...)` calls on `link.slug` and `link.title` inside the `html`
  tagged-template block; the template already escapes interpolated values once
  (an ampersand in a title currently renders as `&amp;`). File:
  `frontend/assets/js/evidence-detail.js`

## Files touched
- `api/routes/publish.js` — modified
- `api/tests/publish-route.test.js` — created
- `frontend/assets/js/evidence-detail.js` — modified

## Notes
- **Drafts routing (Issue #13) is not in this plan.** It is handled by
  `historiography-admin-editor.md`, which builds the real historiography editor
  and sets the final `draftEditUrl` for both `responses` and `historiography`.
  Keeping it out of here means only one plan edits `admin/drafts/index.html`.
- **No automated test for the frontend edit.** `evidence-detail.js` is frontend
  UI code and `frontend/` has no JS test runner (only `api/` and `mcp-server/`
  do); it is covered by a manual check in the validation checklist instead. The
  one code-facing change with a test harness available — `api/routes/publish.js`
  — gets a dedicated automated test, satisfying the plan's test requirement.
- The `evidence-detail.js` fix mirrors the escaping-order corrections already
  applied across the other detail-page scripts (Issues #16–#18); this instance
  was missed in that sweep.

---

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [x]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
