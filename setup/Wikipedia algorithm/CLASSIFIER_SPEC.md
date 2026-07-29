# Classifier Integration Specification

Reference for maintaining and extending the section classifier.

## 1. The Three Vector Stores

The classifier builds exactly three FAISS vector stores, all serving the
data/interpretation split detection (§3.1.1):

| Store | Purpose | Positive exemplars | Negative exemplars |
|---|---|---|---|
| `data-bucket` | Information/Data semantics | Background, historical context, accounts, archaeological findings, primary sources, concrete narration | Analytical summaries, scholarly debate, evaluative statements that superficially look like data |
| `interpretation-bucket` | Context/Interpretation semantics | Scholarly debate, historiography, analysis, meaning, significance, methodology terms, contrastive markers | Passages that cite interpretation terms but remain descriptive — reporting scholarly views without engaging debate |
| `register` | Linguistic register shift | Past-tense concrete narration, specific entities/dates/places, neutral/factive verbs | Ambiguous register, mixed tense/specificity, abstract hedging |

Each store has its own positive and negative exemplar sets in
`exemplars/`. See the exemplar files for the complete seed passages.

## 2. Paragraph-Labelling Algorithm

### Step 1: Split article into paragraphs
Articles are split on double-newline boundaries. The first paragraph is
tagged as the lede. Paragraphs are indexed 0-based.

### Step 2: Embed and query
Each paragraph is embedded using the shared MiniLM ONNX model (mean-pooled,
L2-normalized). The embedding is queried against all three stores, retrieving
the top-5 nearest exemplars per store (inner-product similarity).

### Step 3: Apply nearest-neighbour-label rule (§3.4.1)
Per store:
- If the nearest neighbour is a **negative** exemplar → **score = 0** (regardless of cosine similarity)
- Otherwise → **score = mean cosine of positive exemplars in the top-5**

### Step 4: Assign labels
A paragraph is labelled:
- **`data`** — `data_score ≥ t_data` AND `register_score ≥ t_data`
- **`interpretation`** — `interp_score ≥ t_interp` AND `register_score ≥ t_interp`
- **`neither`** — clears neither threshold
- **`other`** — positional assignment (lede, reference sections)

If both thresholds are met, the stronger score wins.

### Thresholds
| Parameter | Default | Calibrated | Description |
|---|---|---|---|
| `t_data` | 0.60 | After calibration | Minimum similarity for data labelling |
| `t_interp` | 0.60 | After calibration | Minimum similarity for interpretation labelling |
| `t_sep` | 0.70 | After calibration | Clean-split threshold for tier assignment |
| `N_min` | 3 | — | Minimum class-bearing paragraphs for classification |
| `k` | 5 | — | Nearest neighbours to retrieve per store |

## 3. Separation Ratio

```
transitions = count of adjacent differing class-bearing labels
separation  = 1 - (transitions / (class_bearing_paragraphs - 1))
```

`other` and `neither` labels are excluded from the count. Fewer than 2
class-bearing paragraphs → separation = 0.0.

The ratio is always in [0.0, 1.0]:
- 1.0 = one contiguous block of data and one of interpretation (or all one class)
- 0.0 = alternating data/interpretation throughout

## 4. Tier Assignment Logic

| Condition | Row-3 contribution |
|---|---|
| Both classes present AND `separation ≥ t_sep` | **+10** (clear split) |
| Both classes present AND `separation < t_sep` | **−3** (muddled) |
| Only one class present | **−5** (one-sided) |
| Fewer than `N_min` class-bearing paragraphs | **0** (unclassifiable) |

## 5. Positional Assignment

Two elements are assigned positionally, never by the classifier:

- **Lede** (first paragraph) → always `other`
- **Reference/bibliography section** (paragraphs matching "References",
  "Notes", "Footnotes", "Bibliography", "Further reading", "External links",
  "See also", or containing mostly citation-like text) → always `other`

Once a reference section is detected, all subsequent paragraphs are also
tagged `other`.

## 6. Regenerating Stores

Stores are regenerable build artifacts. To rebuild from exemplars:

```python
from classifier.stores import StoreManager
mgr = StoreManager()
mgr.force_rebuild()
```

Or to build only if they don't exist:

```python
mgr.build_all()
```

## 7. Output Schema: `bucket-labels.json`

```json
{
  "article_title": {
    "paragraphs": ["data", "interpretation", "other", "data", ...],
    "separation": 0.85,
    "tier": 10
  }
}
```

### Key types
| Key | Type | Description |
|---|---|---|
| `paragraphs` | `list[str]` | Per-paragraph labels, in document order |
| `separation` | `float` | Separation ratio in [0.0, 1.0] |
| `tier` | `int` | Row-3 contribution: +10, −3, −5, or 0 |

Downstream plans should validate that every expected article_id is present
and that `tier` is one of the four defined values.

## 8. How Plans 5 and 6 Consume the Labels

**Plan 5 (vector signal families):** Reads `paragraphs` to determine which
paragraphs belong to the interpretation bucket for placement-sensitive
families (Jesus Seminar, mythicist, confessional balance, balanced debate's
interpretation-only scan, Gnostic tier placement).

**Plan 6 (scoring/export):** Reads `tier` for the row-3 contribution in the
final net_score sum. The `separation` field is recorded but not used directly
in scoring — it exists for debugging and validation.

## 9. Cross-plan Store Boundary

This plan builds **exactly three** stores. The nine signal-family stores
(balanced-debate, anti-supernatural, OT–NT-discontinuity, mythicist-framing,
jesus-seminar, secular-materialist, confessional-balance, literary-analysis,
gnostic-over-emphasis) are Plan 5's responsibility. Both sets of stores share
the `vector-stores/` directory and the same ONNX/FAISS pipeline pattern.

Plan 5 must not assume its stores exist because this plan ran. This plan must
not assume Plan 5's stores exist for anything it does.
