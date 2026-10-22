## Validation: Architecture Docs → Code Comments Migration
**Plan:** architecture-docs-to-code-comments-migration.md
**Date:** 2026-08-17

### Manual checks
- [ ] Every file listed in the plan's "Files touched" has been opened and the intended comment/trim is present — not a stub, not a copy-pasted doc sentence with no "why" added.
- [ ] `setup/ARCHITECTURE/INDEX.md`'s template section now states the cross-file-only bar for Invariants rows, with a sentence pointing to SR-6.
- [ ] Each trimmed subsystem doc (`image-display.md`, `esv-api.md`, `node-cluster-logic.md`, `error-notification.md`, `wikipedia-ranking-pipeline.md`) still has all four required sections (Shape, Extending it, Not documented here, plus Source of truth/Spans) — trimming removed rows, not sections.
- [ ] `Website_guide.md` still contains the "no frameworks, no build step" decision row (cited by `Vibe_coding_rules.md` CSS-3) and an Error Notification pointer (cited by `plan_template.md` and the `!GenerateAPlan` skill).
- [ ] `wikipedia-ranking-pipeline.md`'s "Known drift" callout is either resolved (git tracking reconciled with the doc's stated invariant) or explicitly left open and logged to `setup/ISSUES/issues.md` — not silently deleted without a decision.
- [ ] Every file in `admin/assets/js/cluster-logic-bridge/` (checked via `ls`) got the bare re-export guard comment, not just one sample file — and that comment is a single line, not the full cross-module rationale.
- [ ] `donation.md`, `users.md`, `video.md` are unchanged (git diff shows no modification).
- [ ] `database/schema.sql`, `api/scripts/version-assets.js`, `deploy.sh`, and `api/lib/error-codes.js` are unchanged (git diff shows no modification) — these were explicitly excluded from code-comment tasks because their content is cross-module/navigational and stays doc-only.
- [ ] `frontend/assets/css/components/figures.css` is unchanged — the width/height + lazy-loading convention stays in `image-display.md` only.
- [ ] The final architecture directory review task was done as a separate pass **after** every per-file trim was checked off — not folded into the individual trim tasks — and it re-ran `node setup/scripts/check-architecture-docs.js` on its own, not just relying on the Deploy & verify run.
- [ ] Every remaining sentence across all nine `setup/ARCHITECTURE/` files sorts cleanly into one of the four categories (purpose description / navigation pointer / cross-module behaviour / architecture decision) — no leftover sentence that's really an implementation detail, a gotcha, or restated code behaviour that a per-file trim missed.
- [ ] No two docs restate the same fact in different words after the final pass (e.g. a decision covered in both `Website_guide.md` and a subsystem file) — kept in the one file that owns it, cross-referenced from the other.
- [ ] `INDEX.md`'s `Files` table descriptions still accurately summarize each trimmed file's current content.

### Code-review checks
- [ ] SR-6 — every relocated invariant now reads as a comment at the point it applies, in the file named by the plan's task, not a new doc elsewhere.
- [ ] JS-4 — added comments state *why*/consequence, not a restatement of the adjacent code or a verbatim copy of the old doc sentence.
- [ ] JS-1 — no comment was added to compensate for an unclear name; if a comment task revealed a genuinely bad name, that's a separate issue to log, not a silent rename inside this plan.
- [ ] No task introduced a behavioural change — diff every code file touched and confirm only comment lines (and, if branch (a) was taken, `.gitignore`) changed.
- [ ] `node setup/scripts/check-architecture-docs.js` exits 0 after all doc trims — no dangling path references left behind by a row deletion.
- [ ] No code comment added by this plan contains a hardcoded count/tally, a "does this generalise to X" forward-looking clause, an "adding a new Y means..." extend-it instruction, or a "this replaces the old Z" historical reference — each of those is a specific pattern the post-generation review found leaking doc-only content into code, and the fix should not have crept back in during implementation (see the plan's Notes section).
