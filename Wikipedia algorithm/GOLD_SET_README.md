# Gold Set — README

**Purpose.** Hand-labelled ground-truth data for calibrating the vector-embedding signal stores
in Plans 4–5 of the v2 ranking refactor (`Wikipedia_alogrithm_refractor.md`). Thresholds
(`t_fire`, `t_strong`, `t_sep`, the Passion margin, §3.4.1) are fitted against these labels, not
guessed — see §11 of the refactor spec for why an unlabelled or self-labelled approach doesn't
work. **Labels here are frozen**: once recorded, a calibrated store's disagreement with a label
means the store gets revised, never the label.

## The three files

| File | What it holds |
|---|---|
| `gold-set-section-classifier.csv` | Per-paragraph data/interpretation/neither labels + an article-level tier, for the §3.1.1 classifier — the dominant signal in the rubric, calibrated first and held to the strictest standard (§11.2). |
| `gold-set-vector-families.csv` | Per-article signal-fires judgement (+ tier where applicable) for each of the 10 vector-embedding families (§3.1.2–§3.1.10), drawn from the ranked-255 pool. |
| `gold-set-negative-controls.csv` | Cases from the out-of-scope candidate pool where the OLD keyword detector would misfire but the new semantic judgement disagrees — the specific defects this refactor exists to fix (§11.1). |

Full schemas, enums, and detection-per-family rules: `GOLD_SET_LABELLING_PROCEDURE.md`.
Category-flag reference (six boolean flags that gate/modify signals): `CATEGORY_FLAGS_VALIDATION.md`.

## Validation

```bash
node --test "Wikipedia algorithm/tests/validate-gold-set.test.js"
```

Checks structural integrity only (valid enums, no duplicate rows, title membership against
`database/scoring-export.json`/`candidate-pool.tsv`, non-empty notes/reason fields, old vs. new
detector disagreement in every negative control) — it does not and cannot judge whether an
individual label is semantically correct. Exit code 0 means the files are well-formed, not that
every label is right.

## Scope of this pass (read before trusting row counts)

This gold set's first pass (2026-07-28) is a **deliberately scaled-down real pilot**, not the
plan's full target scale. It contains genuine labels from real Wikipedia reads — nothing here is
fabricated — but at reduced volume:

| | Plan's full target | This pilot pass (actual) |
|---|---|---|
| Classifier set | 40 articles | **40 articles** (met in full — this number can't be scaled down, it's the minimum stated) |
| Vector-family positive rows | 20–30 per family (200–300 total) | **200 total**, 13–28 per family (all ≥12) |
| Negative controls | ≥5 per family (≥50 total) | **37 total**, 1–8 per family (three families — `mythicist-framing`, `jesus-seminar`, `secular-materialist` — came back with only 1–2: the labelling agents verified the full ~15-candidate out-of-scope pool for each and reported honestly that few or no keyword-detector-vs-truth mismatches actually exist in that sample, rather than padding the count with weak rows) |

Extending any file to the full target is future work — append more rows following
`GOLD_SET_LABELLING_PROCEDURE.md`'s method, re-run the validator, and the row-count sanity checks
in `validate-gold-set.test.js` will confirm when a family clears the fuller bar.

**Resolved data quirk (2026-07-28):** the classifier set originally included both "Historical
reliability of the Gospels" and "Historicity of the Gospels" — two ranked-255 entries that
rendered byte-identical article content (a Wikipedia-side duplicate). Per the project owner's
decision, "Historical reliability of the Gospels" was removed from `database/scoring-export.json`
(rankings renumbered 1–254, `meta.article_count` updated to 254), added to
`excluded-titles.txt`, and its rows dropped from `gold-set-section-classifier.csv` (40→39) and
`gold-set-vector-families.csv` (200→197, 3 rows across mythicist-framing/jesus-seminar/
confessional-balance). "Historicity of the Gospels" was kept. See `setup/Issues.md` #140.

## Provenance

Article selection (which articles) was done mechanically from `database/scoring-export.json` (the
ranked-255 export — substitutes for a missing `Wikipedia Articles.csv`, see `setup/Issues.md`) and
`candidate-pool.tsv`. The qualitative labelling itself was done by independent agents each reading
real article content via WebFetch, one per classifier chunk or vector family. See "Provenance of
this pilot pass" at the end of `GOLD_SET_LABELLING_PROCEDURE.md` for the full account.
