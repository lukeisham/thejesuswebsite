## Validation: Timeline node positions, period headings and zoom stacks
**Plan:** timeline-node-positions-and-headings.md
**Date:** 2026-10-18

### Manual checks
- [ ] Admin editor (`/admin/diagrams/timeline.html`, needs passkey): drag a node. Its title moves out of the way of other titles while you drag. Pass: no two titles overlap at any moment.
- [ ] Admin editor: a moved title has a leader line. The line starts at the first letter of the name and ends at the edge of the node. Pass: the line and the title move together, with no gap.
- [ ] Admin editor at zoom 2: the node follows the pointer. Pass: the node stays under the pointer for the whole drag.
- [ ] Admin editor: after a drag, the Save count goes up by one. Pass: the edit panel does not open after a drag.
- [ ] Save one move, then open `/evidence/timeline/` at zoom 1.5 or more. Pass: the node sits at the spot you dropped it.
- [ ] Public timeline zoomed out: close nodes form a neat column with a count badge at about their real position. Pass: moving the zoom slowly makes the nodes glide to their exact spots, with no jump.
- [ ] Click a stack, then press `Enter` on a focused stack. Pass: the view zooms to fit the stack members.
- [ ] Public timeline at zoom 0.3, 1 and 3: every period heading sits in the band above the dots. Pass: no heading overlaps another heading or a dot, and "Pre-Incarnation" has a leader line.
- [ ] Resize the window after a zoom. Pass: the zoom and the zoom buttons agree.
- [ ] Open `/evidence/timeline/life.html`. Pass: nodes do not jump when the live data arrives.
- [ ] Phone width (under 768 px): a node with a stored offset shows at the same period position and the same side as on desktop.
- [ ] Data-loss fix: pick a record that has MLA sources. Make one admin move and save. Pass: the MLA sources, identifiers and links are all still on the record.
- [ ] `curl -s https://thejesuswebsite.org/evidence/timeline/life.html | grep -c timeline_offset_x` after deploy. Pass: the count is more than 0 when a node on that era has an offset.

### Code-review checks
- [ ] CORE-2 — every edited file has connection comments and no history, date, name or issue number.
- [ ] CORE-3, CORE-5 — `node-cluster-logic.md` and `Website_guide.md` describe the new behaviour, and each edited file matches them.
- [ ] CORE-4 — each decision that Luke approved has an entry in `setup/Decisions_log.md`.
- [ ] SR-4 — the offset maths, the label collision and the leader line each exist once in `frontend/assets/js/cluster-logic/`. No copy in `admin/`.
- [ ] SR-3 — stacks and headings recompute at most once per frame, and only when zoom or pan ends.
- [ ] JS-6 — stack `aria-label` text and titles go through the shared `escapeHTML()`.
- [ ] JS-7 — every new export has `@param` and `@returns`.
- [ ] CSS-1, CSS-2, CSS-4 — `timeline-stacks.css` styles only stacks. Every value is a `var(--…)`. Class names say what a thing is.
- [ ] CSS-3 — mobile rules sit in the component files.
- [ ] CSS-5 — no `!important` and no ID selectors.
- [ ] SVG-1, SVG-6 — the leader-line layer has a `viewBox` and uses a token colour.
- [ ] API-1, SQL-1 — the model change adds no SQL to the route, and statements stay prepared.
- [ ] TEST-7 — `PUT /evidence/:id` still has its 401 test and its valid-session test.
- [ ] TEST-9 — `cluster-label-collision.test.js` and `timeline-era-heading-placement.test.js` import the real modules.
- [ ] TEST-10 — `api/tests/guide-node-cluster-logic.test.js` covers the offset literals, the snapshot columns, the shared limits, stacks being public only, shared use of `computeLeaderLine`, and pure `cluster-logic/` files. It has a named exception list, and every edited guide row that a text search can check has a row.
- [ ] Touch rule, CORE-5 — for each edited code file: comments give the *why*; the cross-file behaviour is in a guide; the file matches the guide; the reply names the files that got a connection comment, a guide row or a fix.
- [ ] CORE-3, Touch rule — each edited guide holds only purpose, navigation and cross-boundary behaviour, in the present tense. No history, date, status note or permission. Decisions are in `setup/Decisions_log.md`.
- [ ] Checklist table in `setup/Vibe_coding_rules.md` — items 0 to 15 each hold for the finished diff.
- [ ] `node setup/scripts/check-architecture-docs.js` and `--touched` — all paths resolve, and each listed guide was re-read.
