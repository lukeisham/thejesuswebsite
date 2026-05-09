# Plan Issue Log

Cross-plan issue tracker. Issues discovered during plan execution that affect other plans or require cross-plan coordination.

---

## Issue Table

| # | Date | Plan | Severity | Description | Status |
|---|------|------|----------|-------------|--------|
| 1 | 2026-05-09 | split_challenge_academic_popular | Medium | Legacy files `admin/frontend/dashboard_challenge.html` and `js/4.0_ranked_lists/dashboard/dashboard_challenge.js` still exist on disk — T8 deletion was not completed. These files are no longer referenced by any script tag or module route but should be removed to prevent confusion. | Open |
| 2 | 2026-05-09 | split_challenge_academic_popular | Low | Sub-module header comments in `challenge_weighting_handler.js`, `challenge_list_display.js`, `challenge_ranking_calculator.js`, `insert_challenge_response.js`, and the per-mode overview scripts still reference `dashboard_challenge.js` as their trigger. These are cosmetic only (the sub-modules function correctly via the new orchestrators) but could confuse future developers. | Open |

---

## Resolution Notes

*(Add resolution notes here as issues are resolved)*
