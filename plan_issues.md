# Plan Issue Log

Cross-plan issue tracker. Issues discovered during plan execution that affect other plans or require cross-plan coordination.

---

## Issue Table

| # | Date | Plan | Severity | Description | Status |
|---|------|------|----------|-------------|--------|
| 1 | 2026-05-09 | split_challenge_academic_popular | Medium | Legacy files `admin/frontend/dashboard_challenge.html` and `js/4.0_ranked_lists/dashboard/dashboard_challenge.js` still exist on disk — T8 deletion was not completed. These files are no longer referenced by any script tag or module route but should be removed to prevent confusion. | Resolved — files deleted and pushed to main |
| 2 | 2026-05-09 | split_challenge_academic_popular | Low | Sub-module header comments in `challenge_weighting_handler.js`, `challenge_list_display.js`, `challenge_ranking_calculator.js`, `insert_challenge_response.js`, and the per-mode overview scripts still reference `dashboard_challenge.js` as their trigger. These are cosmetic only (the sub-modules function correctly via the new orchestrators) but could confuse future developers. | Resolved — trigger comments updated in T2 of `standardize_dashboard_buttons` |
| 3 | 2026-05-09 | fix_metadata_widget_persistence | High | Persistent UI misalignment and cross-scripting conflict in Metadata Widget due to legacy `metadata_handler.js` interference and browser caching. | Resolved — legacy script purged, cache-busters added, layout stabilized. |
| 4 | 2026-05-09 | standardize_dashboard_buttons | Low | `documentation/dashboard_refractor.md` referenced by `.agent/skills/generate_plan/SKILL.md` (§4 Terminal States) does not exist in the repository. The skill instructs the agent to "automatically trigger and execute the `documentation/dashboard_refractor.md` skill" after generating a plan, but the file is missing. This should either be created or the SKILL.md reference removed. | Resolved — dangling reference replaced in SKILL.md via T10 of `standardize_dashboard_buttons` |
| 5 | 2026-05-09 | standardize_dashboard_buttons | Low | Issue #2 (legacy `dashboard_challenge.js` references in sub-module header comments) is still open and affects 5 files in `js/4.0_ranked_lists/dashboard/`. These files will also be touched by T2 of `standardize_dashboard_buttons`. The cosmetic comment fixes could be folded into T2 as a cleanup opportunity. | Resolved — folded into T2 of `standardize_dashboard_buttons` |
| 6 | 2026-07-01 | wire_missing_fields_dashboard_modules | Medium | `description` field was incorrectly present in the `blog_post` schema box in `high_level_schema.md` — removed. Visual summary table also corrected (description now only applies to `record` type, not content types). | Resolved |
| 7 | 2026-07-01 | wire_missing_fields_dashboard_modules | Medium | All four dashboard modules (Context Essay, Historiography, Blog Posts, Challenge Response) were missing `iaa`/`pledius`/`manuscript` (external_refs_handler.js) and `url` (url_array_editor.js) fields. Both shared tools existed in `js/2.0_records/dashboard/` and were wired into the single-record page but never into the WYSIWYG modules. Now wired: HTML containers added to all 4 templates, orchestrators call `renderExternalRefs` + `renderUrlArrayEditor`, load handlers populate on fetch, save handlers collect on save. Also added `<script>` tags to `dashboard.html` shell for the two shared tools. | Resolved |

---

## Resolution Notes

- **2026-05-09:** Issue #1 resolved via commit `10037ba` — both legacy files deleted and pushed to `main`.
- **2026-05-09:** Issue #3 resolved — legacy `metadata_handler.js` deleted, all dashboard module calls purged, and cache-busting (?v=1.1.2) applied to `metadata_widget.js` and `metadata_widget.css`.
- **2026-05-09:** Issue #5 resolved — legacy comment fixes are now part of T2 in `standardize_dashboard_buttons`.
- **2026-05-09:** Issue #2 resolved — trigger comments updated in all 8 sub-module JS files to reference `dashboard_challenge_academic.js` or `dashboard_challenge_popular.js`.
- **2026-05-09:** Issue #4 resolved — dangling `documentation/dashboard_refractor.md` reference in `.agent/skills/generate_plan/SKILL.md` replaced with cross-reference to `detailed_module_sitemap.md` and `vibe_coding_rules.md`.
