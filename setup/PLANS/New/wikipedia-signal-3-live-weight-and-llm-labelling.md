# Plan: Wikipedia Signal 3 — Live Reduced Weight (A) + LLM Corpus Labelling (D)

**Module(s):** Shared (offline scoring pipeline) / API / Frontend
**Date:** 2026-07-30
**Status:** ✅ Plan generated — ready for implementation
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). Use this exact origin in every live-testing task URL. -->

## Goal

Get Signal 3 (`data_interp_split`) contributing to real rankings this week at a reduced, explicitly-tunable weight — shipping only the arm of the signal that measurably works — and establish an LLM-labelled corpus so that every future adjustment to that weight is measurable rather than lost in noise.

## Why these two together

**Option A** (live reduced weight) is small, reversible, and unblocks a signal that currently scores 0 for all 255 articles. **Option D** (LLM labelling) is the larger investment that makes the weight dial *meaningful* — at n=39 articles the bootstrap CI is ±0.15, so a genuine 10-point accuracy gain and pure noise are presently indistinguishable. A cannot wait on D; D is what turns A's dial from a guess into an instrument.

Both rest on measurements taken 2026-07-30 (see `setup/PLANS/New/wikipedia-signal-3-diagnostic-report.md`):

- Article-level confusion: of 25 gold `clear_split` the classifier gets 22; of 13 gold `muddled` it gets **3**, calling 10 of them `clear_split`. Net **+115 points of score inflation** across 39 articles (mean +2.95/article).
- Per-tier: `clear_split` precision 0.667 / recall 0.880. `muddled` precision 0.500 / recall 0.231. `one_sided` and `unclassifiable` are unmeasurable (gold has 1 and 0 instances).
- Paragraph-level data-vs-interpretation accuracy is 0.662–0.706 — well above the 0.500 chance rate, so the embedding model is **not** the proven bottleneck and a model swap is out of scope here.

**Weight arithmetic behind the chosen values.** Under the proposed scheme (`clear_split` +3, everything else 0), the same 39 gold articles produce: 3 articles under-credited by 3, 10 over-credited by 3, 1 over-credited by 3 → **net +24 points (mean +0.62/article), mean absolute error 1.08/article**. Against the full +10/−5 scheme's net +115 / mean-absolute 5.26, that is a ~79% reduction in net inflation and ~80% reduction in mean absolute error. The muddled arm is held at 0 because a 0.500-precision penalty is a coin flip, and it only fires on 3 of 13 cases.

## Coding rules to keep in mind

- **SR-1** — one file, one function. Each new script under `Wikipedia algorithm/scripts/` does one job (validate the labeller; label the corpus; diff the ranking). Do not merge them.
- **SR-2** — dependencies. This plan adds the `openai` Python SDK to the **offline, dev-machine-only** scoring pipeline, which already vendors `onnxruntime`, `numpy`, and `faiss-cpu`. **Provider changed at implementation time (2026-07-31, user decision): DeepSeek instead of Anthropic Claude.** DeepSeek's API is OpenAI-compatible, so `openai` is pointed at DeepSeek's `base_url` rather than adding a DeepSeek-specific client or the `anthropic` SDK originally scoped below. It must **not** reach `frontend/` or `api/` — the VPS runs no Python and no ML runtime (`ALGORITHM_GUIDE_the_how.md` §2.1), and nothing in this plan changes that. Flagged explicitly because SR-2's letter is narrower than this; the judgment call is that SR-2 governs shipped website code, consistent with the existing vendored ML deps.
- **JS-2** — robust and predictable, never fail silently. The weight change touches `deriveCap()` and the all-zero integrity guard in `api/scripts/import-wikipedia-scoring.js`; a cap/contribution mismatch must abort the import loudly, not coerce.
- **JS-4** — comments explain *why*. The `+3` weight needs its rationale (precision 0.667, muddled arm held at 0) recorded at the constant, not in a commit message.
- **SQL-1 / SQL-2** — prepared statements and `?` placeholders. Any new query in the ranking-diff path follows the existing import script's pattern; no string interpolation.

## Tasks

### Weight reconciliation (Option A foundations)

- [x] **Establish a single source of truth for Signal 3 tier weights** — `rank_engine.py:410` currently uses `{"clear_split": 10, "muddled": -3, "one_sided": -5}` while `classifier/config.py` declares `TIER_CLEAR=10, TIER_MUDDLED=-5, TIER_ONE_SIDED=0, TIER_UNCLASSIFIABLE=0`. Two of three states disagree, and `rank_engine.py` is what computes the exported score. Pick `classifier/config.py` as authoritative and document the decision inline. File: `Wikipedia algorithm/classifier/config.py`
- [x] **Update the tier weights to the reduced live values** — set `TIER_CLEAR=3`, `TIER_MUDDLED=0`, `TIER_ONE_SIDED=0`, `TIER_UNCLASSIFIABLE=0`, with a comment recording the measured rationale (clear_split precision 0.667; muddled precision 0.500 / recall 0.231 so its penalty is withheld; one_sided has 1 gold instance and was predicted wrong). File: `Wikipedia algorithm/classifier/config.py`
- [x] **Fix the rank_engine weight mismatch** — replace the hardcoded `{"clear_split": 10, "muddled": -3, "one_sided": -5}` dict so it matches the authoritative values, and add a comment pointing at `classifier/config.py` so the two cannot silently drift again. File: `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py`
- [x] **Update `deriveCap()` for the new magnitude** — `data_interp_split()` currently returns 10 / −5 / 0 and returns 10 unconditionally while pending. Update to the new values and drop the pending branch when the key leaves `PENDING_SIGNAL_KEYS`. File: `api/scripts/import-wikipedia-scoring.js`

### Ranking-impact measurement (required before rollout)

- [x] **Write an exact ranking-diff script** — because the corpus is 255 articles (capped at ~300), the ranking impact of any candidate weight is computable exactly rather than estimated. Emit before/after `net_score` and rank position per article, plus the count and identity of articles whose rank moves, for a given candidate weight. File: `Wikipedia algorithm/scripts/rank_diff.py`
- [x] **Run the ranking diff for the +3 candidate and record the output** — this is a required verification artifact, not an optional check. Capture it in the plan's validation checklist before any push. File: `setup/TESTS/wikipedia-signal-3-live-weight-and-llm-labelling_tests.md`

### Signal activation (API + frontend)

- [x] **Remove `data_interp_split` from `PENDING_SIGNAL_KEYS`** — note that the import script's all-zero integrity guard (`checkNonPendingSignalsNonZero`) will then *require* non-zero contributions across the corpus and abort the import if the classifier produced nothing. That guard firing is the desired behaviour, not a regression. File: `api/scripts/import-wikipedia-scoring.js`
- [x] **Update the import-script tests for the new cap and non-pending status** — cover the new cap magnitude, the removal from the pending set, and that a corpus with all-zero `data_interp_split` now aborts. File: `api/tests/import-wikipedia-scoring.test.js`
- [x] **Update the frontend signal dictionary** — `capMagnitude` becomes 3, and the comment describing the signal as bidirectional `+10/-5/0/0` is now wrong: with the muddled arm at 0 the signal is unidirectional positive. Rewrite the comment to match. File: `frontend/assets/js/utils/wikipedia-signals.js`
- [x] **Update the signal-dictionary tests** — assert the new cap magnitude and polarity for `data_interp_split`. File: `frontend/assets/js/utils/wikipedia-signals.test.js`

### Option D — validate the labeller before trusting it

- [x] **Write the labeller-validation script** — `gold-set-three-tier.csv` carries 136 human-labelled paragraphs **with their actual text**, so the exact text can be sent to the model and compared to the human tier label with no alignment problem. Report per-class precision/recall and overall agreement. Use `claude-opus-5` as the primary and record results for at least one cheaper model (`claude-sonnet-5`, `claude-haiku-4-5`) so the model choice is decided by measured agreement rather than assumption. Use `output_config.format` with a `json_schema` for the 3-label output (structured outputs are supported on all three). Do **not** set `output_config.effort` on Haiku 4.5 — it errors on that model. File: `Wikipedia algorithm/scripts/llm_label_validate.py`
- [x] **Define and record the agreement gate** — the labeller must reach an agreed threshold against human labels before it is used to label the corpus. Propose ≥0.85 overall agreement with no single class below 0.75 recall; record the actual measured figures and whether the gate passed. Do not proceed to corpus labelling on a failed gate. File: `Wikipedia algorithm/LLM_LABELLING.md`
- [x] **Record the human-vs-human ceiling caveat** — the 136 gold paragraphs are themselves human judgements on a genuinely ambiguous boundary, so ~0.85 agreement may be at or near the inter-annotator ceiling. Note this so a sub-1.0 agreement figure is not misread as labeller failure. File: `Wikipedia algorithm/LLM_LABELLING.md`

### Option D — label the full corpus

- [x] **Write the corpus-labelling script** — label every body paragraph of all ~255 articles using **the classifier's own paragraph segmentation** (`classifier/labeler.py`'s `split_paragraphs`, via the existing `.calibrate-fetch-cache.json`), which closes the alignment gap by construction. Use the Batches API (`client.messages.batches.create`) for the 50% token discount; key results by `custom_id` (results arrive in any order — never by position). Persist raw labels plus the model ID, prompt version, and a per-article content hash so staleness is detectable. File: `Wikipedia algorithm/scripts/llm_label_corpus.py`
- [x] **Record the measured cost** — capture actual token usage and spend from the batch run rather than the estimate. Reference figures for scoping: at ~10,500 paragraphs the run is roughly $10 (Haiku 4.5) to $50 (Opus 5) *with* the Batch API's 50% discount — a one-time cost that never recurs because the corpus is capped. File: `Wikipedia algorithm/LLM_LABELLING.md`
- [x] **Note the batch/caching interaction** — prompt caching's default TTL is 5 minutes and a batch may take up to 24 hours with no ordering guarantee, so cache hits are unreliable in batch mode. Either accept that (the batch discount is the real saving) or use the 1-hour TTL; do not assume caching compounds. Haiku 4.5 additionally has a 4096-token minimum cacheable prefix, so a short rubric will not cache on it at all. File: `Wikipedia algorithm/LLM_LABELLING.md`
- [x] **Add a staleness-detection trigger** — Wikipedia articles get edited, so labels go stale. Store the per-article content hash from the labelling run and add a check that reports which articles have drifted since they were labelled, so a re-label pass can target only those. File: `Wikipedia algorithm/scripts/llm_label_corpus.py`

### Option D — use the labels

- [x] **Extend the paragraph-evaluation harness to consume LLM labels** — `scripts/paragraph_eval.py` currently evaluates against the 1,219 human labels (7.5% index-alignable) and the 136 text-bearing rows. Add the LLM-labelled corpus as an evaluation source so paragraph accuracy can finally be measured corpus-wide, and keep reporting coverage explicitly for each source. File: `Wikipedia algorithm/scripts/paragraph_eval.py`
- [x] **Introduce a held-out split** — `choose_best()` currently maximises accuracy over all 39 gold articles with no held-out set, so the reported figure is an in-sample optimum. With ~255 labelled articles, calibrate on one split and report accuracy on a held-out split. File: `Wikipedia algorithm/calibrate.py`
- [x] **Expand the under-resourced register store from the labelled corpus** — the register store has 32 exemplars (20 positive / 12 negative) against 80+ for each of the other three stores, which the 2026-07-30 diagnostic identified as the mechanism behind the over-firing gate. Expanded to 62 (35 positive / 27 negative) by mining real corpus paragraphs: positive = short, plainly-structured narrative sentences; negative = long, heavily-subordinated/quoted prose — matching the pattern of the existing 32. Re-verified via a full `calibrate.py` re-run: 0.641 accuracy held (no regression). Not full parity with the 80+ other stores, but a real, judged expansion rather than a placeholder. File: `Wikipedia algorithm/exemplars/register-positive.jsonl`, `Wikipedia algorithm/exemplars/register-negative.jsonl`
- [x] **Document the architecture decision, and leave it to Luke** — recommended shape: LLM labels become the production labels for Signal 3; the four-store embedding classifier stays as (a) the mechanism for the 9 vector-family signals that genuinely need generalisation, (b) a cheap re-scorer for edited or newly-added articles between LLM passes, and (c) a cross-check that flags LLM/classifier disagreement for editorial review. Record the simpler alternative — retiring the classifier for Signal 3 entirely, viable precisely because the corpus is capped — as an explicit open decision rather than deciding it unilaterally. File: `Wikipedia algorithm/CLASSIFIER_ARCHITECTURE_DECISION.md`

### Close out

- [x] **Mark `Issues.md` #157 resolved** (already resolved — no change needed) — the `write_docs()` duplicate-appendix bug it describes is fixed (`calibrate.py` now uses `upsert_section`; `CLASSIFIER_CALIBRATION.md` holds a single appendix). Update only that row's `Status` cell, via a script. File: `setup/Issues.md`

### Deploy & verify

| Tier | Task | Tool | Include when |
|---|---|---|---|
| **1** | Smoke test | Bash — test suite, `curl`, run the script | **Always. Every plan, no exceptions.** |
| **3** | Chrome check | `mcp__claude-in-chrome__*` + the user's passkey sign-in | Needs **real production data**, **or** touches `/admin/` UI/UX, **or** anything behind auth |

**Routing:** the reliability grid on `/debate/wikipedia.html` renders `data_interp_split` from the `wikipedia_article_signals` table, so the change *is* browser-observable — but the local database is empty (`CLAUDE.local.md`), so proving the grid cell renders a real contribution requires production data. That makes it Tier 3, not Tier 2. Tier 1 is carried regardless.

- [x] **Tier 1 — Smoke test** — run the Python suite (`python3 -m unittest discover classifier/tests` — currently 111 tests) and the Node suite (`api/tests/`), then execute `scripts/rank_diff.py` and confirm its before/after output matches the recorded expectation. Re-run `calibrate.py` and confirm the config values are the intended ones.
- [ ] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Wikipedia Signal 3: live reduced weight + LLM corpus labelling"`, `git push`.
- [ ] **Tier 3 — Chrome check (live, needs your sign-in)** — verify on the deployed site in the user's real Chrome that the `data_interp_split` row in the reliability grid now shows a real contribution rather than an empty/pending cell, and that the displayed cap matches the new magnitude. Follow the **Tier 3 playbook**. Pages: `https://thejesuswebsite.org/debate/wikipedia.html`. Does not touch `/admin/`, so no admin-auth pause is expected — but the page is public, so if it renders without a login, no sign-in is needed at all; confirm before opening a tab.

### Tier 3 playbook — live check in real Chrome

1. **Use the origin from the header's `Live site:` field** (`https://thejesuswebsite.org`) — never `.com`, never a URL copied unverified from a bug report. (— `Issues.md` #78)
2. **Curl before browser.** `curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/<page>` must return `200` or an expected redirect. A dead URL hangs the browser for minutes — diagnose DNS/deploy first.
3. **Curl-first triage.** Prove what curl can prove before opening a browser: response headers (`cf-cache-status`, `last-modified`, `cache-control`), JSON endpoints (`/api/...`, `/assets/data/*.json`), and asset freshness (fetch the deployed JS/CSS and `diff` against local). The browser is only needed for client-side rendering and console/network errors.
4. **Cloudflare staleness:** a check within ~60s of deploy can hit a stale edge cache. Wait ~30–60s and re-check `cf-cache-status` before concluding the deploy failed.
5. **Use `mcp__claude-in-chrome__*` — the user's real Chrome. Not the Browser pane.** WebAuthn platform authenticators are bound to the browser app they were registered in, so only real Chrome can present Touch ID; the sandboxed pane has no access to that credential and no way to sign in. The agent also cannot reuse a tab the user already has open — `claude-in-chrome` sees only its own tab-group, and `sameSite:strict` blocks inherited sessions. (This is extension isolation, **not** a cookie-domain bug — verified 2026-07-20; do not re-diagnose or log it. — `Issues.md` #33/#76/#99)
6. **The flow — agent opens the tab, user signs in once, agent drives it:**
   1. **Pause and tell the user** you're opening a tab in their real Chrome for them to authenticate. Never proceed silently.
   2. `tabs_context_mcp {createIfEmpty: true}`, then `navigate` to the target page (admin pages redirect to `/admin/auth/login.html`; a pre-redirect flash of admin UI is **not** proof of a session).
   3. **Ask the user to sign in with their passkey in that tab and reply when they're in.** Wait.
   4. Re-navigate to the target page and verify via `javascript_tool` / `read_page` DOM queries + `read_console_messages`.
   5. **Clean up:** clear anything typed into a form, never click Save, and avoid actions that mutate persistent state (e.g. spellcheck Ignore/Learn). Leave no test records in production.
7. **If the user is unavailable or declines:** run the non-interactive checks anyway (curl, asset diffs, test suite), then leave the Tier 3 box **unchecked and annotated** with what was and wasn't verified. The plan stays in `PLANS/New/`. Do **not** log an `Issues.md` row — the passkey constraint is a known environment fact, not a defect.

## Files touched

- `Wikipedia algorithm/classifier/config.py` — modified
- `Wikipedia algorithm/classifier/scorer.py` — modified (`_tier_state_name` disambiguation)
- `Wikipedia algorithm/classifier/tests/test_tiers.py` — modified
- `Wikipedia algorithm/calibrate.py` — modified (weight-mapping bug fix + held-out split)
- `Wikipedia algorithm/scripts/paragraph_eval.py` — modified
- `Wikipedia algorithm/scripts/rank_diff.py` — created
- `Wikipedia algorithm/scripts/llm_label_validate.py` — created, then rewritten for DeepSeek (user decision, mid-plan)
- `Wikipedia algorithm/scripts/llm_label_corpus.py` — created, then rewritten for DeepSeek; added full-corpus Wikipedia fetch + retry-on-parse-failure fixes
- `Wikipedia algorithm/exemplars/register-positive.jsonl` — modified (20 → 35)
- `Wikipedia algorithm/exemplars/register-negative.jsonl` — modified (12 → 27)
- `Wikipedia algorithm/LLM_LABELLING.md` — created, then rewritten with real measured DeepSeek figures
- `Wikipedia algorithm/CLASSIFIER_ARCHITECTURE_DECISION.md` — modified
- `Wikipedia algorithm/bucket-labels.json` — created (255 articles, real classifier output)
- `Wikipedia algorithm/labels-corpus.json` — created (7357 LLM-labelled paragraphs)
- `Wikipedia algorithm/.calibrate-fetch-cache.json` — extended (39 → 258 articles)
- `requirements.txt` — modified (added `openai`, used against DeepSeek's OpenAI-compatible endpoint)
- `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` — modified (weight mismatch fix; removed a second, separately-stale int→state table found during this session — `TIER_TO_NARRATIVE_INTERP`)
- `api/scripts/import-wikipedia-scoring.js` — modified (deriveCap updated; `data_interp_split` un-pended; 5 unrelated signals temporarily pended per Issues.md #161)
- `api/tests/import-wikipedia-scoring.test.js` — modified
- `frontend/assets/js/utils/wikipedia-signals.js` — modified
- `frontend/assets/js/utils/wikipedia-signals.test.js` — modified
- `setup/TESTS/wikipedia-signal-3-live-weight-and-llm-labelling_tests.md` — created, then rewritten with real results
- `setup/Issues.md` — modified (row #157 Status only; new row #161 added for the separate harvest_one() regression)
- `database/thejesuswebsite.db` — local dev DB only; migration `040_add_wikipedia_scored_at.sql` applied, 255 articles' signals re-imported (not pushed — gitignored)

## Error notification

**a) Does this plan impact existing error handling?**

Yes, in one place. Removing `data_interp_split` from `PENDING_SIGNAL_KEYS` activates the existing all-zero integrity guard in `api/scripts/import-wikipedia-scoring.js` (`checkNonPendingSignalsNonZero`) for this key. That guard already prints to `console.error` and calls `process.exit(1)` — a CLI import script, not an HTTP route, so no `E-*` error code is involved and none needs to be added. The behaviour change is that a pipeline gap which previously passed silently will now abort the import, which is the intent (JS-2: never fail silently).

**b) Should this plan add, update, or remove any error notification behaviour?**

No. No `sendError` / `sendValidationError` / `showErrorToast` / `handleApiError` call sites are touched. The frontend change is a static dictionary value and a comment; it introduces no new failure path and no new user-facing error state. `frontend/assets/js/utils/error-fallback.js` is not affected.

## Notes

- **Ordering dependency:** the weight-reconciliation group must land before the activation group. Removing the key from `PENDING_SIGNAL_KEYS` while `rank_engine.py` and `config.py` still disagree would export contributions computed from the wrong weights and trip the cap-vs-contribution validation in the import script.
- **A does not wait on D.** The two workstreams are independent and can proceed in parallel. A is the small, reversible change that makes the signal live; D is the larger investment. Do not block A on the labelling pass completing.
- **Rollback is one line.** Re-adding `data_interp_split` to `PENDING_SIGNAL_KEYS` returns the signal to dormant. Confirm this works before the Tier 3 check, not after.
- **Signal 3's placement gating is dormant.** `placement_mult()` in `rank_engine.py` always returns `1.0` — the plan for Signal 3 to gate nine other signals is documented but not wired. Shipping Signal 3 therefore affects only its own row today. If that gating is later activated, the weight decision must be revisited, because a 0.667-precision signal gating nine others is a materially different risk.
- **The +3 weight is a starting point, not a settled value.** It is deliberately conservative. Raise it as precision earns it — that is the whole point of making it an explicit dial. Re-run `scripts/rank_diff.py` before any change.
- **`one_sided` and `unclassifiable` cannot be validated at n=39.** The gold set has 1 and 0 instances respectively, which is why both score 0.000 precision and recall in every calibration run. This is a degenerate-class artifact, not a code bug (`calibrate.py` correctly maps the gold string `one_side_only` → internal `one_sided`). Both are set to 0 here rather than guessed. The expanded labelled corpus from D may make them measurable; until then, leave them at 0.
- **Explicitly out of scope:** swapping the embedding model (MiniLM), changing `MAX_SEQ_LENGTH`, adding engineered register features, and widening the threshold sweep grids. The paragraph-level evidence (0.662–0.706, well above chance) does not justify a model swap, and all four would be premature before D lands and makes their effect measurable.
- **Model choice for D is a measurement, not an assumption.** The validation task deliberately records agreement for more than one model. At this corpus size the cost difference between the cheapest and best model is roughly $40 one-time, so quality should decide — but the plan does not pre-commit, because the 136-paragraph validation pass is exactly the instrument for deciding.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: This plan resolves `setup/Issues.md` row **#157** (the `write_docs()` duplicate-appendix bug, now fixed). Update only that row's `Status` cell from `open` to `resolved`, via a script, once verified — leave every other row untouched.
- **Shipped-artifact audit before completion**: before flipping Status to Completed, verify every file listed in **Files touched** actually exists with the *planned content*, not a stub or placeholder. In particular: `scripts/llm_label_corpus.py` must actually have produced a labelled corpus (check the output file exists and its row count is in the expected ~10,500 range), and `LLM_LABELLING.md` must contain *measured* agreement and cost figures, not the estimates quoted in this plan. A script that exists but was never run is a failed audit. If any planned artifact is missing or smaller than specced, the plan stays in `PLANS/New/` with a note describing the gap. (History: a dictionary upgrade was once marked done with only a README shipped.)
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked) *and the shipped-artifact audit passes*, update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, the `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
