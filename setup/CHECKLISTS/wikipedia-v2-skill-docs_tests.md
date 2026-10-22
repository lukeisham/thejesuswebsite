## Validation: Wikipedia v2 Skill Documentation Update
**Plan:** wikipedia-v2-08-skill-documentation-update.md
**Date:** 2026-07-27

### Manual checks
- [ ] Open `setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md` and read it start to finish as if seeing it for the first time — every step should describe a pipeline that is internally consistent (no leftover reference to a 250 ceiling, 28 signals, three-rule tie-break, or heading-based section bucketing anywhere in the document).
- [ ] Confirm the frontmatter `version` field was bumped from `1.6.0` and the `dependencies` array includes the vector-store threshold config and gold-set label file entries.
- [ ] Confirm STEP 0b lists at least five (this plan documents six) places that must move together on a weight-table change, not the old three.
- [ ] Confirm STEP 1's tie-break description reads "alphabetical by raw title" (or equivalent composite-key phrasing) with no mention of verse count or reference count as tie-break criteria.
- [ ] Confirm STEP 4 states 25 signals (not 28) and names literary analysis, religious art, and secular-materialist presuppositions among the example signals.
- [ ] Confirm the OUTPUT section's log-line template reads `ceiling=255`, not `ceiling=250`.

### Code-review checks
- [ ] **SR-1** — every edit is scoped to `skill.md`; no unrelated file was touched.
- [ ] **Plan dependency ordering** — verify Plans 2 (`wikipedia-v2-02-harvest-and-extraction.md`) and 6 (`wikipedia-v2-06-scoring-ranking-export.md`) are `✅ Completed` (or their code changes otherwise confirmed merged) before this plan's edit tasks were carried out — if not, the field/function names used in skill.md (`refQualityTier`, `hasPictureNarrow`/`hasPictureWide`, `DORMANT_FALLBACKS`, `net_score_from_signals`, `DETAIL_FIELDS`, `row_from_signals`, `detail_row_to_internal`) should be spot-checked against the as-shipped `scripts/extract.js` and `scripts/rank_engine.py` rather than trusted from the plan text alone.
- [ ] **Grep audit** — run the plan's Tier 1 smoke-test grep block (`setup/PLANS/New/wikipedia-v2-08-skill-documentation-update.md` → Deploy & verify → Tier 1) and confirm every `expect: 0 matches` line returns nothing and every `expect: >=1 match` line returns at least one hit.
- [ ] **Git tracking** — `git check-ignore -v "setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md"` reports no match (file is tracked); `git log -1 --stat` on the pushed commit shows only `skill.md` changed, not the plan file or this checklist.
