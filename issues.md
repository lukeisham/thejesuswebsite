# Issues

## 1. "Created: [date] Edited: [date]" (Italic, left aligned above the footer) is not appearing on About page (static page) or Blog post (dynamically created page)
**Date:** 2026-07-20

The "Created: [date] Edited: [date]" italic line, meant to appear left-aligned above the footer, is missing on both the static About page and dynamically created Blog post pages.

## 2. Published status in Admin right-hand sidebar is unnecessary; redundant save/publish UI throughout Admin backend
**Date:** 2026-07-20

The Published status indicator in the Admin right-hand sidebar shows up in a variety of places across the Admin backend but is unnecessary. The 'Save Changes' and 'Unpublish / Publish' buttons at the bottom of the page are sufficient. Additionally, the 'Show on landing page' toggle is unnecessary — if a blog post is published, the most recent three should appear on the landing page automatically.

## 3. Spellcheck dictionary is really small
**Date:** 2026-07-20

The spellcheck dictionary is too small and needs to be expanded to cover more words.

## 4. Grammar errors are never flagged
**Date:** 2026-07-20

No grammar error highlighting appears anywhere in the editor. Grammar checking may not be enabled or configured.

## 5. Word correction causes visual overlap / lag (~0.5s)
**Date:** 2026-07-20

Despite a previous attempt to fix it, there is still a lag when a word is corrected — both the previous and corrected word momentarily overlap for about half a second.

## 6. Error when saving description field of an Evidence record: "Failed to save: A data lookup failed"
**Date:** 2026-07-20

Editing and saving the description field of an Evidence record produces the error: "Failed to save: A data lookup failed. The system administrator has been notified."

**Status (2026-07-20):** Fixed locally — corrected mla_source_id→id schema mismatch in five admin editors (evidence, essays, debate, blog, historiography). Pending commit and deploy.

## 7. "Insert image" for Evidence should operate as a separate field above the description, not inside it
**Date:** 2026-07-20

The insert-image feature for Evidence records should place the image in a dedicated field above the description field, rather than embedding it inside the description content.

## 8. Challenge records not populating the challenge frontend
**Date:** 2026-07-20

Challenge records created in the Admin backend are not showing up on the challenge frontend. The data may not be reaching the frontend or the frontend may not be querying/displaying it correctly.

## 9. Spellcheck upgrade dependency risk
**Date:** 2026-07-20

The planned nspell + dictionary-en vendoring (plan: setup/PLANS/New/expand-spellcheck-dictionary.md) assumes ESM bundles are available on jsDelivr for use inside a module Web Worker; needs verification before implementation, with a UMD/bundling fallback decision. May require user input on acceptable payload size (~1-2MB dictionary files served to admin only).

**Status (2026-07-20):** User approved a ~2MB admin-only dictionary payload. Remaining pre-implementation check: verify ESM bundle availability for the module Web Worker (UMD/bundling fallback if not).

## 10. Shared admin editor logic should be extracted, not copy-pasted
**Date:** 2026-07-20

The mla_source_id bug existed identically in five editors (evidence, essays, debate, blog, historiography). The junction-panel init/save wiring should be extracted into one shared admin module so future fixes land once. This is a larger refactor that needs user go-ahead.

**Status (2026-07-20):** User approved. Research → plan → review pipeline in progress; plan will land in setup/PLANS/New/.

## 11. Process gap: fixes marked complete without live production verification
**Date:** 2026-07-20

Issues 1, 5, 6 all recurred after "completed" fixes, typically when live testing was deferred (non-Claude implementers). Recommend: mandatory live-check step before moving plans to Completed, a Vibe rule that silent early-return guards must log a warning, and an automated smoke test asserting all public list API routes return bare arrays (would have caught the challenge frontend crash). Needs user decision to adopt.

