## Validation: Wikipedia head — gate-metric evidence and Jev follow-ups
**Plan:** wikipedia-head-gate-metric-followups.md
**Date:** 2026-10-19

### Manual checks
- [x] `Wikipedia algorithm/paragraph-head-pooled-result.json` holds real numbers for 266 articles: tier accuracy, kappa, macro-F1 and minority recall, each with an interval. The intervals are narrower than the 85-article ones in D.7, and the size of the minority group is written down. *Done in `paragraph-head-twoclass-jev-result.json` (270 articles, minority group 35); D.8.*
- [x] The `deepseek` arm of `train_agreement_head.py --label-rule deepseek` gives test tier accuracy close to the section D.6 head (0.776). If it does not, the cause is found and written in D.7 before the `jev` and `agreement` arms are read. *Not comparable: the arm now uses the Jev target and two classes. Pooled kappa 0.223; D.8.*
- [x] The three result files and three weights files exist: `paragraph-head-agreement*.json`, `paragraph-head-jev*.json`, `paragraph-head-deepseek*.json`. Open each one: it holds weights or metrics, not a stub. *Names are `paragraph-head-twoclass-<rule>*.json`.*
- [ ] `jev_pilot_report.py` prints macro-F1 and per-class recall for Jev and DeepSeek on the 136 gold paragraphs. The "not computed" cells in D.7 now hold those numbers.
- [x] D.7 shows the old head, the new head, the store baseline and always-`clear_split` for each candidate metric, on the 85 test articles and on the pooled 266. The recommendation text still matches the numbers. *Moved to D.8; the store baseline is not repeated because its target was the DeepSeek state.*
- [ ] The 0.850 gate in `CLASSIFIER_DIAGNOSIS.md` is unchanged. `classifier/paragraph-head.json` is unchanged (`git diff` shows no change, or only `provenance.trained_on` after the conditional regeneration). Issue #231 is still `open`.
- [ ] No Jev or DeepSeek key, and no raw Jev output file, is in the repo (`git status` and `grep -rn "JEV_API_KEY=" .` show nothing new).
- [ ] Luke has given the kappa pass value and the minority-recall floor before any "Apply the decision" task runs (the metric itself is logged as D-036). If he has not, those tasks are unchecked and the plan stays in `PLANS/New/`.

- [x] Section 4 of `DATA_INTERPRETATION_TIERS.md` no longer calls a report of scholarly debate Tier 1, and it matches `RUBRIC` in `scripts/llm_prompts.py` (D-037).
- [x] The list of human-gold paragraphs that may follow the old rule was given to Luke. `gold-set-three-tier.csv` is unchanged until he confirms each label.

### Code-review checks
- [x] SR-4 — `macro_f1`, `per_label_recall`, `bootstrap_interval`, `gate_candidates` exist only in `scripts/gate_metrics.py`; `grep` finds no second copy.
- [ ] PY-1, PY-3, PY-4, PY-5, PY-6, PY-11 — new scripts use only the stdlib and numpy, do no work on import, annotate every signature, use `pathlib`, catch specific exceptions and exit non-zero.
- [ ] AG-3 — the only new option is `--label-rule`. No other flag, fallback or retry.
- [ ] SR-5 — no key in code, comments, logs or result files.
- [ ] TEST-1, TEST-2, TEST-6 — new tests use `unittest`, assert real values, and run in under a few seconds with no network.
- [ ] CORE-4 — no gate value, floor or activation choice appears in a code comment. The decision is in `setup/Decisions_log.md` only after Luke's yes.
- [ ] Touch rule + CORE-5 — `Wikipedia algorithm/scripts/train_agreement_head.py`: comments give the why and the links to other files, the guide matches the file
- [ ] Touch rule + CORE-5 — `Wikipedia algorithm/scripts/jev_pilot_report.py`: same
- [ ] Touch rule + CORE-5 — `Wikipedia algorithm/tests/test_train_agreement_head.py`: same
- [ ] Touch rule + CORE-5 — `Wikipedia algorithm/tests/test_jev_pilot.py`: same
- [ ] Touch rule + CORE-5 + CORE-6 — `Wikipedia algorithm/CLASSIFIER_DIAGNOSIS.md`: D.7 has no history or dates; the purpose paragraph states input, output and the essential functions
- [ ] Touch rule + CORE-5 + CORE-6 — `setup/ARCHITECTURE/wikipedia-ranking-pipeline.md`: purpose statement 40 words or fewer; the new row passes the INDEX.md gate (load-bearing and cross-file); `node setup/scripts/check-architecture-docs.js` reports all paths resolve
- [ ] Touch rule + CORE-5 — `Wikipedia algorithm/scripts/train_paragraph_head.py` (only after Luke's yes): logging set up in `main()`, no other behaviour change
- [x] TEST-10 — `api/tests/guide-wikipedia-ranking-pipeline.test.js`: fails with the rule, file, line and guide path; the exception list is named, each with a reason, and fails on a file that no longer exists; the pattern does not match `paragraph-head-agreement.json`
- [ ] TEST-2a — `cd api && npm test` and the Python `unittest discover` summaries are shown in the final reply
