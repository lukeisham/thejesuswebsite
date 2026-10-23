
## Validation: Evidence image speed
**Plan:** evidence-image-speed.md
**Date:** 2026-10-23

### Manual checks
- [ ] `curl -s https://thejesuswebsite.org/api/evidence/the-logos` after the backfill: `image_width`, `image_height` and `image_display_path` are set, and `image` has a new file name.
- [ ] `curl -sI` on the new `image` and `image_display_path` URLs: status 200, `cache-control: public, max-age=31536000, immutable`.
- [ ] `/evidence/the-logos` on a phone-width window: the primary `<img>` has the stored `width` and `height`, a `srcset` with the `720w` file, and no `loading="lazy"`.
- [ ] The reserved box before the picture loads has the same size as the loaded picture (`getBoundingClientRect()` before and after the load event). The text below does not move.
- [ ] The picture looks the same as before at 412 px wide and at desktop width (same size, border, centring, caption). No bars, no crop.
- [ ] A record with no stored size still renders as it did (720 x 480 tag) and writes one console warning.
- [ ] Admin: edit page of `the-logos` shows the picture in the picker, and the form values hold the three new fields. Uploading a new picture in a draft fills them (do not save a real record).
- [ ] Lighthouse mobile on `/evidence/the-logos`, three runs: CLS 0.1 or less, LCP 2500 ms or less, score 90 or more. Write the numbers down.
- [ ] Phase 4 decision written down: needed or not needed, with the LCP value.
- [ ] Luke said yes before the backfill ran on the VPS. Dry run first, then `--apply`. Old image files are still on disk.

### Code-review checks
- [ ] MIG-1, MIG-3, MIG-4, MIG-5 — migration 051 is the next number, re-runnable in spirit, and `database/schema.sql` has the same three columns.
- [ ] MIG-7 — the backfill updates production rows only after Luke's yes and writes new file names.
- [ ] SQL-1, SQL-3 — the model whitelists the three columns; the backfill uses prepared, named statements.
- [ ] API-4 — a bad width or height is stored as `null`.
- [ ] JS-2 — a failed display copy still returns 201 with `display_path: null` and a warning; a missing stored size warns once.
- [ ] SR-4, SR-8 — the upload route and the backfill call one shared display-copy module; the picker change does not break the other editors.
- [ ] CSS-2, CSS-5 — `figures.css` change uses no literal visual values and no `!important`.
- [ ] Touch rule + CORE-5 — every `modified` file in the plan: comments give the why and the links, the guide matches the file.
- [ ] TEST-10 — `api/tests/guide-image-display.test.js`: fails with the rule, file, line and guide path; exceptions are named with a reason; no pattern was widened only to pass.
- [ ] CORE-4 — the decisions-log row exists (after Luke's yes), and no decision sits in a comment.
