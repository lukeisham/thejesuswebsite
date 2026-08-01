# Section Classifier — Wikipedia v2 Ranking Pipeline

Offline Python tool that semantically labels every Wikipedia article body
paragraph as **data**, **interpretation**, or **neither**, computes the
separation ratio, and assigns the row-3 tier contribution.

> **Entry point note (2026-07-31):** the operational entry point for the
> whole Wikipedia list (check/add/exclude/rescore) is the skill
> `setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md`, which remains active
> and was rewritten to match the current fixed-canonical-list lifecycle. The
> criteria/pipeline reference docs are `ALGORITHM_GUIDE_the_what.md` (what
> qualifies for the list and the authoritative §9 weights table) and
> `ALGORITHM_GUIDE_the_how.md` (the technical pipeline and per-signal
> detection methods) in this folder — the old `Wikipedia Articles -
> Reference.md` no longer exists. For plain "what do I say to make X happen"
> instructions (adjust a weight, add/remove an article, report a scoring
> error), see `OPERATOR_GUIDE.md`.

## Quickstart

### 1. Create a virtual environment and install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Download the MiniLM ONNX model

```bash
cd setup/Wikipedia\ algorithm\ v2/classifier
python download_model.py
```

This downloads a quantized ONNX export of `all-MiniLM-L6-v2` (~23 MB) plus
its `vocab.txt` (~110 KB) into `classifier/model/`. This is a **one-time**
setup step.

### 3. Run the unit tests

```bash
python -m pytest classifier/tests/ -v
```

All three test suites (separation ratio, tier assignment, positional
assignment) are deterministic and require no model. They must pass before
any store-building or gold-set validation.

### 4. Build the vector stores

```bash
python -c "
from classifier.stores import StoreManager
mgr = StoreManager()
mgr.build_all()
"
```

This embeds the seed exemplars, builds three FAISS indexes, and saves them
to `vector-stores/`.

### 5. Classify an article

```python
from classifier.stores import StoreManager
from classifier.labeler import classify_paragraphs, get_labels_only
from classifier.scorer import score_article

mgr = StoreManager()
mgr.build_all()

with open("path/to/article.txt") as f:
    text = f.read()

labelled = classify_paragraphs(text, mgr)
labels = get_labels_only(labelled)
result = score_article(labels)

print(f"Tier: {result['tier']:+d}")
print(f"Separation: {result['separation']:.3f}")
print(f"Labels: {labels}")
```

### 6. Export bucket labels

```
python3 scripts/export_bucket_labels.py
```

## Directory structure

```
classifier/
├── __init__.py          # Package init
├── config.py            # Thresholds, constants, paths
├── tokenizer.py         # Hand-rolled WordPiece tokenizer (no huggingface)
├── stores.py            # FAISS store management + ONNX inference
├── labeler.py           # Paragraph classification logic
├── scorer.py            # Separation ratio + tier assignment
├── export.py            # bucket-labels.json export
├── download_model.py    # One-time model download script
├── model/               # Vendored ONNX model + vocab.txt
│   ├── model.onnx
│   └── vocab.txt
└── tests/
    ├── __init__.py
    ├── test_separation.py
    ├── test_tiers.py
    └── test_positional.py

../exemplars/
├── data-bucket-positive.jsonl
├── data-bucket-negative.jsonl
├── interpretation-bucket-positive.jsonl
├── interpretation-bucket-negative.jsonl
├── register-positive.jsonl
└── register-negative.jsonl

../vector-stores/          # FAISS indexes + sidecars (regenerable)
├── data-bucket.index
├── data-bucket.jsonl
├── interpretation-bucket.index
├── interpretation-bucket.jsonl
├── register.index
└── register.jsonl
```

## Regenerating vector stores

Whenever an exemplar file changes, regenerate the stores:

```python
from classifier.stores import StoreManager
mgr = StoreManager()
mgr.force_rebuild()
```

## Dependency footprint

- `onnxruntime` ~75 MB
- `numpy` ~34 MB
- `faiss-cpu` ~69 MB
- Vendored model ~23 MB **if quantized** (the currently vendored export is
  full FP32, ~87–96 MB — see below)
- **This table's ~201 MB total assumes a quantized model and is not the
  measured figure.** For the actual dev-machine install size, see
  `CLASSIFIER_CALIBRATION.md`'s "Dependency Footprint Measurement" section,
  which reports ~235–265 MB (two measurements, different methodology/dates,
  reconciled there).

No `torch`, `sentence-transformers`, `lancedb`, `scikit-learn`, or
`tokenizers` are installed.
