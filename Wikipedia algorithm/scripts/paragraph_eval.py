#!/usr/bin/env python3
"""Shared paragraph-level evaluation harness (Phase 2).

Provides the confusion-matrix / precision-recall-F1 / restricted-accuracy
machinery used by BOTH `calibrate.py` (wired into every calibration run,
corpus-wide) and `scripts/diagnose_register_gate.py` (the register-gate
diagnostic), so the two scripts share one implementation instead of two
copies that can drift apart.

Two independent gold-comparison slices exist, because of the segmentation
mismatch documented in CLASSIFIER_DIAGNOSIS.md (§A / §C):

1. **Aligned-6** — the 6 gold-set articles (of 39 in
   `gold-set-section-classifier.csv`) whose classifier-side paragraph count
   happens to exactly match the gold paragraph count, so index-aligned
   comparison is valid. `gold-set-section-classifier.csv` carries NO
   paragraph text (only labels), so this alignment is the only route into
   its 1,219 labels — and it only reaches 91 of them (7.5%). See
   ALIGNED_ARTICLES below.

2. **Three-tier standalone** — `gold-set-three-tier.csv` carries the actual
   `paragraph_text` alongside a human `tier` (1=data, 2=close,
   3=interpretation) label. Because the text is present, these 136
   paragraphs can be classified *standalone* (fed straight to the four
   vector stores with no surrounding article, no positional lede/reference
   rule applied) and compared 1:1 against gold with **zero alignment risk**
   — no index-matching is needed at all. This is the largest and safest
   paragraph-level gold comparison available, and it is the only place in
   the codebase that can validate the close-analysis (Tier 2) store
   directly, since the aligned-6 gold labels only distinguish
   data/interpretation/neither.

   Coverage caveat: gold-set-three-tier.csv covers 45 article titles, only
   9 of which overlap with the 39-article gold-set-section-classifier.csv,
   and 130/136 of its rows are paragraph_index 0-2 (ledes/openings) — so it
   is a different, opening-skewed sample, not a text-bearing subset of the
   1,219-label set. Report coverage explicitly; do not imply it measures
   the same population as slice 1.

Neither slice can be scaled up to the full 1,219-label corpus without new
data: `gold-set-section-classifier.csv` has no text to align against, and
re-deriving the original labellers' paragraph segmentation (visual
rendered page, per GOLD_SET_LABELLING_PROCEDURE.md) from the API-extract
pipeline is not reproducible after the fact. See CLASSIFIER_DIAGNOSIS.md §C
for the full writeup of why this is a genuine (not merely inconvenient)
blocker.
"""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Iterable, Optional

ALGO_DIR = Path(__file__).resolve().parent.parent
THREE_TIER_PATH = ALGO_DIR / "gold-set-three-tier.csv"

# Raw classifier label space vs. the 3-class collapsed space the gold sets use.
RAW_CLASSES = ("data", "close", "interpretation", "neither", "other")
COLLAPSED_CLASSES = ("data", "interpretation", "neither")

# Tier integer (gold-set-three-tier.csv's 'tier' column) -> classifier label.
THREE_TIER_LABEL_MAP = {"1": "data", "2": "close", "3": "interpretation"}

# The 6 gold-set articles whose classifier segmentation exactly matches the
# gold paragraph count — see module docstring, slice 1.
ALIGNED_ARTICLES = [
    "Gospel of Luke", "Gospel of Matthew", "Women at the crucifixion",
    "Naked fugitive", "Jesus at Herod's court", "Arrest of Jesus",
]

HUMAN_NEITHER_RATE = 28 / 1219  # gold-set-section-classifier.csv, measured 2026-07-30.


def collapse_label(label: str) -> str:
    """Map the classifier's label space onto the gold set's 3-class space.

    'close' (Tier 2) collapses into 'data' (descriptive), matching the
    collapse `classifier/scorer.py` uses for the separation functional.
    'other' collapses into 'neither' since gold sets never use 'other'.
    """
    if label in ("data", "close"):
        return "data"
    if label == "interpretation":
        return "interpretation"
    return "neither"


def build_confusion_matrix(pairs: Iterable[tuple[str, str]]) -> Counter:
    """Build a Counter[(gold_label, pred_label)] from (gold, pred) pairs."""
    cm: Counter = Counter()
    for gold, pred in pairs:
        cm[(gold, pred)] += 1
    return cm


def collapse_confusion(cm: Counter) -> Counter:
    """Collapse a raw confusion matrix's predicted axis onto the 3-class space.

    The gold axis is left as-is (callers pass gold labels already in the
    3-class space for gold-set-section-classifier.csv comparisons, or in
    the {data, close, interpretation} space for three-tier comparisons —
    collapse_confusion() only touches the predicted side unless the gold
    label also happens to be 'close', in which case it is collapsed too so
    the two axes are directly comparable).
    """
    out: Counter = Counter()
    for (gold, pred), n in cm.items():
        out[(collapse_label(gold), collapse_label(pred))] += n
    return out


def precision_recall_f1(cm: Counter, classes: Iterable[str]) -> dict:
    """Per-class precision/recall/F1/support from a confusion Counter."""
    stats = {}
    for c in classes:
        tp = cm.get((c, c), 0)
        fp = sum(n for (gold, pred), n in cm.items() if pred == c and gold != c)
        fn = sum(n for (gold, pred), n in cm.items() if gold == c and pred != c)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)
              if (precision + recall) else 0.0)
        support = sum(n for (gold, _pred), n in cm.items() if gold == c)
        stats[c] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "support": support,
        }
    return stats


def data_interp_restricted_accuracy(cm: Counter) -> dict:
    """Data-vs-interpretation accuracy restricted to paragraphs that both:
      (a) the classifier actually gave a real class label (not neither/other), and
      (b) gold says data or interpretation (i.e. excludes gold 'neither').

    This is the headline read on embedding-model discrimination, uncoupled
    from the register gate: it only asks "of the paragraphs the pipeline
    was willing to classify as data or interpretation, how often did it
    pick the side gold agrees with?" `cm` must already be collapsed to the
    3-class space (see collapse_confusion()).
    """
    n = sum(v for (gold, pred), v in cm.items()
            if gold in ("data", "interpretation") and pred in ("data", "interpretation"))
    correct = sum(v for (gold, pred), v in cm.items()
                  if gold == pred and gold in ("data", "interpretation"))
    return {
        "n": n,
        "correct": correct,
        "accuracy": round(correct / n, 4) if n else 0.0,
    }


def raw_label_distribution(pred_labels: Iterable[str]) -> Counter:
    """Pre-collapse label distribution — keeps Tier-2 ('close') firing rate
    visible instead of silently folding it into 'data'."""
    return Counter(pred_labels)


def neither_rate(pred_labels: Iterable[str], human_baseline: float = HUMAN_NEITHER_RATE) -> dict:
    """'neither' rate vs. the 2.3% human gold rate (28/1,219, measured 2026-07-30)."""
    c = Counter(pred_labels)
    total = sum(c.values())
    rate = c.get("neither", 0) / total if total else 0.0
    return {
        "neither_rate": round(rate, 4),
        "human_baseline": round(human_baseline, 4),
        "total": total,
        "neither_count": c.get("neither", 0),
    }


GOLD_SECTION_CLASSIFIER_PATH = ALGO_DIR / "gold-set-section-classifier.csv"


def load_gold_paragraph_labels() -> dict[str, list[str]]:
    """Load per-article gold paragraph label sequences from
    gold-set-section-classifier.csv's `per_paragraph_labels` JSON column.

    Returns article_title -> ordered list of gold labels ('data',
    'interpretation', or 'neither'). Shared by calibrate.py (for the
    corpus-wide harness) and scripts/diagnose_register_gate.py so both read
    the same 1,219-label source the same way.
    """
    import json
    out: dict[str, list[str]] = {}
    with open(GOLD_SECTION_CLASSIFIER_PATH, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            labs = json.loads(row["per_paragraph_labels"])
            out[row["article_title"]] = [l["label"] for l in labs]
    return out


def load_three_tier_gold() -> list[dict]:
    """Load gold-set-three-tier.csv, mapping tier 1/2/3 -> data/close/interpretation.

    Returns a list of dicts with keys: article_title, paragraph_index, text,
    gold_label. Rows whose 'tier' value isn't 1/2/3 are skipped (there are
    none currently, but this keeps the loader honest if the file is
    extended with e.g. an explicit 'neither' tier later).
    """
    rows: list[dict] = []
    with open(THREE_TIER_PATH, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            gold_label = THREE_TIER_LABEL_MAP.get((row.get("tier") or "").strip())
            if gold_label is None:
                continue
            text = (row.get("paragraph_text") or "").strip()
            if not text:
                continue
            rows.append({
                "article_title": row["article_title"],
                "paragraph_index": row.get("paragraph_index", ""),
                "text": text,
                "gold_label": gold_label,
            })
    return rows


def classify_texts_standalone(
    texts: list[str],
    store_manager,
    scoring_rule: str,
    t_data: float,
    t_close: float,
    t_interp: float,
    t_register: float,
) -> list[str]:
    """Classify a list of paragraph texts with no surrounding article.

    Reuses `classifier.labeler.classify_paragraphs()` (so scoring logic is
    never duplicated) by prepending a throwaway placeholder paragraph so
    position 0 (which classify_paragraphs always forces to 'other' via the
    lede rule) absorbs the placeholder instead of a real gold paragraph.
    The real texts start at index 1 and are returned in the same order.

    This deliberately bypasses the lede/reference *positional* override for
    the real texts — correct here because gold-set-three-tier.csv paragraphs
    are hand-labelled data/close/interpretation, never 'other'; we are
    testing the embedding model's semantic discrimination, not the
    positional heuristic.
    """
    from classifier.labeler import classify_paragraphs, get_labels_only
    import classifier.config as cfg

    if not texts:
        return []

    orig = (cfg.t_data, cfg.t_close, cfg.t_interp, cfg.t_register)
    try:
        cfg.t_data, cfg.t_close, cfg.t_interp, cfg.t_register = (
            t_data, t_close, t_interp, t_register,
        )
        article_text = "\n\n".join(["Placeholder lede paragraph."] + texts)
        labelled = classify_paragraphs(article_text, store_manager, scoring_rule=scoring_rule)
    finally:
        cfg.t_data, cfg.t_close, cfg.t_interp, cfg.t_register = orig

    labels = get_labels_only(labelled)
    return labels[1:]


def evaluate_three_tier(
    store_manager,
    scoring_rule: str,
    t_data: float,
    t_close: float,
    t_interp: float,
    t_register: float,
) -> dict:
    """Run the standalone three-tier evaluation (slice 2, see module docstring).

    Groups by article so `classify_texts_standalone` is called once per
    article (batching all its paragraphs), not once per paragraph.
    """
    gold_rows = load_three_tier_gold()
    by_article: dict[str, list[dict]] = {}
    for row in gold_rows:
        by_article.setdefault(row["article_title"], []).append(row)

    pairs: list[tuple[str, str]] = []
    all_pred_labels: list[str] = []
    for title, rows in by_article.items():
        texts = [r["text"] for r in rows]
        preds = classify_texts_standalone(
            texts, store_manager, scoring_rule, t_data, t_close, t_interp, t_register,
        )
        for r, pred in zip(rows, preds):
            pairs.append((r["gold_label"], pred))
            all_pred_labels.append(pred)

    cm = build_confusion_matrix(pairs)
    collapsed = collapse_confusion(cm)

    return {
        "n_articles": len(by_article),
        "n_paragraphs": len(pairs),
        "raw_confusion_matrix": {f"{g}->{p}": v for (g, p), v in cm.items()},
        "raw_label_distribution": dict(raw_label_distribution(all_pred_labels)),
        "collapsed_confusion_matrix": {f"{g}->{p}": v for (g, p), v in collapsed.items()},
        "precision_recall_f1": precision_recall_f1(collapsed, COLLAPSED_CLASSES),
        "data_interp_restricted_accuracy": data_interp_restricted_accuracy(collapsed),
        "neither_rate": neither_rate(all_pred_labels),
    }


def evaluate_aligned_six(
    gold_paragraph_labels: dict[str, list[str]],
    pred_paragraph_labels: dict[str, list[str]],
    aligned_articles: list[str] = ALIGNED_ARTICLES,
) -> dict:
    """Slice 1: index-aligned comparison over the 6 exactly-matching articles.

    Args:
        gold_paragraph_labels: article_title -> list of gold labels (from
            gold-set-section-classifier.csv's per_paragraph_labels).
        pred_paragraph_labels: article_title -> list of predicted labels
            (raw label space) in the SAME order as the classifier emitted
            them for that article.
        aligned_articles: which article titles to include.
    """
    pairs: list[tuple[str, str]] = []
    all_pred_labels: list[str] = []
    for title in aligned_articles:
        gold = gold_paragraph_labels.get(title, [])
        pred = pred_paragraph_labels.get(title, [])
        for g, p in zip(gold, pred):
            pairs.append((g, p))
            all_pred_labels.append(p)

    cm = build_confusion_matrix(pairs)
    collapsed = collapse_confusion(cm)

    return {
        "n_articles": len(aligned_articles),
        "n_paragraphs": len(pairs),
        "raw_confusion_matrix": {f"{g}->{p}": v for (g, p), v in cm.items()},
        "raw_label_distribution": dict(raw_label_distribution(all_pred_labels)),
        "collapsed_confusion_matrix": {f"{g}->{p}": v for (g, p), v in collapsed.items()},
        "precision_recall_f1": precision_recall_f1(collapsed, COLLAPSED_CLASSES),
        "data_interp_restricted_accuracy": data_interp_restricted_accuracy(collapsed),
        "neither_rate": neither_rate(all_pred_labels),
    }


# ---------------------------------------------------------------------------
# Slice 3: LLM-labelled corpus evaluation
# ---------------------------------------------------------------------------

LABELS_CORPUS_PATH = ALGO_DIR / "labels-corpus.json"


def load_llm_labels() -> dict[str, list[str]]:
    """Load LLM labels from labels-corpus.json.

    Returns article_title -> ordered list of labels ("data", "close",
    "interpretation", or "other"). The labels are in the same paragraph
    order as the classifier's segmentation (both use .calibrate-fetch-cache.json).

    Returns an empty dict if the file does not exist (corpus not yet labelled).
    """
    if not LABELS_CORPUS_PATH.exists():
        return {}
    with open(LABELS_CORPUS_PATH, encoding="utf-8") as fh:
        data = json.load(fh)
    articles = data.get("articles", {})
    out: dict[str, list[str]] = {}
    for title, article in articles.items():
        labels = article.get("labels", [])
        # Normalise: accept common variations.
        valid = {"data", "close", "interpretation"}
        clean = []
        for label in labels:
            lc = str(label).strip('"').strip("'").lower()
            clean.append(lc if lc in valid else "other")
        out[title] = clean
    return out


def evaluate_llm_labels(
    pred_paragraph_labels: dict[str, list[str]],
    llm_labels: Optional[dict[str, list[str]]] = None,
) -> dict:
    """Slice 3: compare classifier paragraph labels against LLM labels.

    Unlike slices 1 and 2 (which compare against small gold sets), this
    compares the classifier's output against LLM labels for the full
    corpus — measuring agreement corpus-wide rather than on a small
    held-out sample.

    Args:
        pred_paragraph_labels: article_title -> list of classifier labels
            (raw label space) in paragraph order.
        llm_labels: article_title -> list of LLM labels. If None, loads
            from labels-corpus.json.
    """
    if llm_labels is None:
        llm_labels = load_llm_labels()

    if not llm_labels:
        return {
            "source": "llm_labels",
            "status": "unavailable",
            "note": "labels-corpus.json not found — run llm_label_corpus.py first",
        }

    pairs: list[tuple[str, str]] = []
    all_pred_labels: list[str] = []
    matched_articles = 0
    mismatched_lengths = 0

    for title, pred_labels in sorted(pred_paragraph_labels.items()):
        gold_labels = llm_labels.get(title)
        if gold_labels is None:
            continue
        if len(pred_labels) != len(gold_labels):
            mismatched_lengths += 1
            # Align on the shorter length — this can happen if the article
            # was edited between labelling and classification.
            min_len = min(len(pred_labels), len(gold_labels))
            pred_labels = pred_labels[:min_len]
            gold_labels = gold_labels[:min_len]
        for g, p in zip(gold_labels, pred_labels):
            pairs.append((g, p))
            all_pred_labels.append(p)
        matched_articles += 1

    cm = build_confusion_matrix(pairs)
    collapsed = collapse_confusion(cm)

    coverage_pct = round(matched_articles / max(len(pred_paragraph_labels), 1) * 100, 1)

    return {
        "source": "llm_labels",
        "n_articles_matched": matched_articles,
        "n_articles_total": len(pred_paragraph_labels),
        "coverage_pct": coverage_pct,
        "mismatched_lengths": mismatched_lengths,
        "n_paragraphs": len(pairs),
        "raw_confusion_matrix": {f"{g}->{p}": v for (g, p), v in cm.items()},
        "raw_label_distribution": dict(raw_label_distribution(all_pred_labels)),
        "collapsed_confusion_matrix": {f"{g}->{p}": v for (g, p), v in collapsed.items()},
        "precision_recall_f1": precision_recall_f1(collapsed, COLLAPSED_CLASSES),
        "data_interp_restricted_accuracy": data_interp_restricted_accuracy(collapsed),
        "neither_rate": neither_rate(all_pred_labels),
    }
