# Gold-Set Validation Notes

## 2026-08-04 — Gold-set data drift repaired

Three classes of data drift were repaired (see Issue #183 / plan `IssueFix-wikipedia-gold-set-drift-repair.md`):

1. **Classifier gold set**: Removed 3 articles ("List of gospels", "Four Evangelists", "Synoptic Gospels") that were deliberately excluded from the ranked-255 set in July 2026 top-up runs (Issue #165). Classifier gold set shrinks from 39 to 36 data rows.

2. **Vector-families gold set**: Removed 8 rows (6 unique article titles) excluded from the ranked-255 set in the same runs. Vector-families gold set shrinks from 197 to 189 rows post-removal.

3. **Negative-controls resolution**: Moved 3 in-scope articles ("Al-Eizariya (Bethany)", "I am (biblical term)", "Resurrection") from the negative-controls CSV to the vector-families gold set, since they were added to the ranked-255 set after the original negative-controls labelling. Negative-controls shrinks from 37 to 34 rows; vector-families grows to 192 rows.

### Tier-accuracy gate confidence-interval impact

The ≥0.85 tier-accuracy acceptance gate was already statistically underpowered at 33–39 scorable articles (±0.12 confidence radius at 95% confidence per Issue #155). Removing labelled rows from the gold set directly worsens this — the remaining 36 classifier rows produce approximately the same scorable count (the removed articles were all excluded for domain reasons, not scorable-status reasons, so the scorable fraction is roughly preserved at ~33/36).

**This plan does not solve the statistical-power problem.** Issue #155 remains open. The ≥0.85 tier-accuracy criterion cannot be reliably validated until the gold set expands significantly (beyond ~60 articles to bring the confidence radius below ±0.08).

### Validator fix

The gold-set validator (`tests/validate-gold-set.test.js`) had a silently-dead REPO_ROOT path bug (one `dirname()` too deep). This was fixed in the same commit, un-deading the validator so future drift is caught at commit time.
