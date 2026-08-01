# Wikipedia Ranking — Operator Guide

What to say to an LLM to operate the scoring pipeline. For how it works, see
`ALGORITHM_GUIDE_the_what.md` and `ALGORITHM_GUIDE_the_how.md`.

---

## 1. 🔧 Adjusting a signal weight

**Say:** *"Change [signal name / row number] weight to [new value]."*

Six places must move together. An LLM following `skill.md` STEP 0b will touch
all of them — name the files if you want to be explicit:

1. 📖 **`ALGORITHM_GUIDE_the_what.md` §9** — the weight value. Single source of truth.
2. 🔍 **`scripts/extract.js`** — only if the change alters what counts as a hit.
3. 🧮 **`scripts/rank_engine.py`** — the scoring formula. For row 3, also `classifier/config.py`, `classifier/llm_labels.py` (LLM-to-bucket-labels conversion), and `labels-corpus.json` (the LLM-labelled corpus). Regenerate bucket labels with `python3 scripts/export_bucket_labels.py`.
4. 📐 **`vector-family-thresholds.yaml`** — for any vector-scored signal.
5. 🏅 **Gold-set CSVs** — re-verify acceptance gates against frozen labels.
6. 🗂️ **`vector-stores/`** — only if the store's firing criteria change, not just its weight.

**Then:**
```
python3 "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" rescore
```
Re-harvests and rescores every article under the new rubric. Resumable via `.rescore-progress.jsonl`.

---

## 2. 📋 Adding or removing articles

**Say:**
- ➕ *"Add [title] to the Wikipedia list."*
- ➖ *"Remove [title] but it can come back."*
- 🚫 *"Exclude [title] permanently."*

The skill crawls, harvests, scores, and rewrites all list files together.
You'll get a review gate before anything is written.

⚠️ The list is **fixed** — nothing auto-adds. A `check` run never mutates it.

📦 **Deploy path:** `scoring-export.json` → `git push` → `deploy.sh` (not `wiki-bulk-paste.txt`).

---

## 3. 🐛 Spot-checking and reporting bugs

### 🔎 Spot-check an article

1. Open `Wikipedia Articles - Scoring Detail.csv`, find the article.
2. Compare each signal's **contribution** against its **cap**. Full cap where it
   shouldn't fire = **false positive**. Zero where it should = **silent failure**.
3. The grid on `/debate/wikipedia.html` makes this visual — blue = fired,
   grey = didn't. Mismatches are candidates.
4. For vector signals, check raw counts in the CSV: non-zero raw + zero capped =
   threshold too strict; zero raw + non-zero capped = dormant fallback firing.

### 🚨 False positive

Signal fired when it shouldn't have.

| Signal | Example |
|---|---|
| `manuscripts` | +6 on an article naming no manuscripts |
| `balanced_debate` | Full credit when only one side is cited |
| `data_interp_split` | +10 on an article that's actually muddled (should be -5) |
| `religious_art` | Firing on a parable (should be gated to 0) |

**Report:** *"Row 1 (manuscripts) is +6 on 'X' but it names no manuscripts — false positive."*

### 🤫 Silent failure

Signal didn't fire when it should have. Harder to spot — no error, just grey.

| Signal | Example |
|---|---|
| `bible_verses` | 0 on an article quoting multiple verses |
| `ante_nicene` | 0 when Irenaeus/Tertullian are named |
| `arch_site` | +2 on a location with an archaeological find (should be +8) |
| `commentaries` | 0 on a teaching article citing commentaries |

**Report:** *"Row 4 (commentaries) is 0 on 'Sermon on the Mount' but it cites commentaries — silent failure."*

### 📝 What happens next

Logged as a row in `setup/issues.md` (file, description, rule, date, status).

- **Obvious fix** (typo, missing keyword): fix + log as `resolved`.
- **Needs digging** (thresholds, classifier): log as `open` with the article URL.

### 🩺 Check first

- `PENDING_SIGNAL_KEYS` in `api/scripts/import-wikipedia-scoring.js` — grey on a pending signal is expected.
- `vector-family-thresholds.yaml` — `precision: 0.0` = dormant fallback, not broken.
- `setup/issues.md` — may already be logged.
- `classifier/config.py` — muddled scores -5 (the worst outcome), one_sided/unclassifiable score 0. This is the settled target weight (propagated 2026-07-31), not a bug. The classifier's own tier accuracy (0.641) is still below its 0.85 gate — see `setup/issues.md` #163.