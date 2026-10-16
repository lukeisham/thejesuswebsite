"""Train the paragraph head on the LLM-labelled corpus and test it held out.

Run from the "Wikipedia algorithm" directory:

    python scripts/train_paragraph_head.py

Options:
  --interp-offset X   Force the interpretation intercept shift to X instead
                      of letting cross-validation choose it. A larger shift
                      raises interpretation recall and lowers its precision.

Steps:
  1. Read the LLM labels (labels-corpus.json) and the fetched paragraphs.
  2. Split the articles by a hash of the title. This is the same split that
     calibrate_held_out.py uses, so the two results are comparable.
  3. Choose the regularisation, the class weighting, the interpretation
     intercept shift, and t_sep using cross-validation on the train split
     only.
  4. Fit the head on the whole train split and measure it once on the test
     split.
  5. Write classifier/paragraph-head.json, paragraph-head-result.json, and
     section D.6 of CLASSIFIER_DIAGNOSIS.md.

The weights come from the train split only, so the test result stays
honest. Training on the whole corpus is a later step, after the gate
decision in issue #231.
"""

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np

ALGO_DIR = Path(__file__).resolve().parents[1]
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from calibrate import (  # noqa: E402
    DIAGNOSIS_DOC_PATH,
    StoreManager,
    _load_fetch_cache,
    _title_split_fraction,
    bootstrap_ci,
)
from classifier.config import (  # noqa: E402
    LABEL_CLOSE_ANALYSIS,
    LABEL_DATA,
    LABEL_INTERPRETATION,
    LABEL_OTHER,
    PARAGRAPH_HEAD_PATH,
    t_sep as DEFAULT_T_SEP,
)
from classifier.labeler import positional_flags, split_paragraphs  # noqa: E402
from classifier.llm_labels import load_llm_corpus  # noqa: E402
from classifier.paragraph_head import ParagraphHead  # noqa: E402
from classifier.scorer import score_article  # noqa: E402
from scripts.doc_sections import upsert_section  # noqa: E402
from scripts.head_training import (  # noqa: E402
    assign_folds,
    balanced_class_weights,
    fit_softmax_regression,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("train-paragraph-head")

RESULT_PATH = ALGO_DIR / "paragraph-head-result.json"
HELD_OUT_RESULT_PATH = ALGO_DIR / "held-out-calibration-result.json"
DIAGNOSIS_D5_HEADER = "## D.5 — Held-out validation (LLM-labelled corpus)"
DIAGNOSIS_D6_HEADER = "## D.6 — Trained paragraph head"

CLASSES = (LABEL_DATA, LABEL_CLOSE_ANALYSIS, LABEL_INTERPRETATION)
SPLIT_SEED = 42  # Same seed as calibrate_with_held_out().
TRAIN_FRACTION = 0.70
CV_SEED = 7
N_FOLDS = 5
# Regularisation: l2 = 1 / (C * n_rows), the scikit-learn convention.
C_GRID = (0.3, 1.0, 3.0)
CLASS_WEIGHT_GRID = ("none", "balanced")
# Shift added to the interpretation intercept after the fit. 0 = no shift.
INTERP_OFFSET_GRID = (0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0)
T_SEP_GRID = tuple(round(float(v), 2) for v in np.arange(0.50, 0.96, 0.05))


@dataclass(frozen=True)
class Article:
    """One LLM-labelled article, ready for training or testing."""

    title: str
    embeddings: np.ndarray  # shape (n_paragraphs, dim)
    llm_labels: list[str]
    positional: list[bool]
    gold_state: str
    aligned: bool  # True when llm_labels match the paragraphs by position


def build_articles(store_manager: StoreManager) -> tuple[list[Article], int]:
    """Embed every LLM-labelled article.

    Some articles have a different LLM label count than paragraph count.
    The labels of those articles cannot be matched to paragraphs by
    position, so they are marked `aligned=False`. Training and the
    paragraph metrics skip them. The tier test keeps them, because the tier
    test needs only the gold tier state of the whole article.

    Returns:
        Tuple (articles, number of articles that are not aligned).
    """
    llm_labels = load_llm_corpus()
    fetch_cache = _load_fetch_cache()
    embedder = store_manager.embedder

    articles: list[Article] = []
    not_aligned = 0
    for title, labels in llm_labels.items():
        paragraphs = fetch_cache.get(title)
        if paragraphs is None:
            continue
        split = split_paragraphs("\n\n".join(paragraphs))
        if not split:
            continue
        aligned = len(split) == len(labels)
        not_aligned += not aligned
        articles.append(Article(
            title=title,
            embeddings=embedder.embed_batch([p["text"] for p in split]),
            llm_labels=labels,
            positional=positional_flags(split),
            gold_state=score_article(labels)["tier_state"],
            aligned=aligned,
        ))
    logger.info("Embedded %d articles (%d not aligned with their labels).",
                len(articles), not_aligned)
    return articles, not_aligned


def training_rows(articles: list[Article]) -> tuple[np.ndarray, np.ndarray]:
    """Stack the body paragraphs of the articles into (features, class ids)."""
    features: list[np.ndarray] = []
    class_ids: list[int] = []
    for article in articles:
        if not article.aligned:
            continue
        for i, label in enumerate(article.llm_labels):
            if article.positional[i] or label not in CLASSES:
                continue
            features.append(article.embeddings[i])
            class_ids.append(CLASSES.index(label))
    return np.array(features), np.array(class_ids)


def fit_head(
    articles: list[Article], c_value: float, class_weight: str,
) -> ParagraphHead:
    """Fit a head on the body paragraphs of the given articles."""
    features, class_ids = training_rows(articles)
    weights = (
        balanced_class_weights(class_ids, len(CLASSES))
        if class_weight == "balanced" else None
    )
    coef, intercept = fit_softmax_regression(
        features, class_ids, len(CLASSES),
        l2=1.0 / (c_value * len(class_ids)), class_weights=weights,
    )
    return ParagraphHead(classes=CLASSES, coef=coef, intercept=intercept)


def predict_article_labels(head: ParagraphHead, article: Article) -> list[str]:
    """Label an article the way classify_paragraphs(scoring_rule="head") does."""
    labels = [LABEL_OTHER] * len(article.positional)
    body = [i for i, is_positional in enumerate(article.positional)
            if not is_positional]
    if body:
        for i, label in zip(body, head.predict_labels(article.embeddings[body])):
            labels[i] = label
    return labels


def tier_accuracy(
    articles: list[Article], predicted: dict[str, list[str]], t_sep: float,
) -> float:
    """Share of articles whose predicted tier state equals the gold state."""
    hits = sum(
        score_article(predicted[a.title], t_sep)["tier_state"] == a.gold_state
        for a in articles
    )
    return hits / len(articles)


def cross_validate(train: list[Article]) -> list[dict]:
    """Score every (C, class weight, interpretation shift, t_sep) choice.

    Each train article is predicted by a head that never saw it. The folds
    come from a hash of the title, so they do not depend on list order.
    """
    folds = assign_folds(
        [_title_split_fraction(a.title, CV_SEED) for a in train], N_FOLDS,
    )
    rows: list[dict] = []
    for c_value in C_GRID:
        for class_weight in CLASS_WEIGHT_GRID:
            predicted: dict[float, dict[str, list[str]]] = {
                offset: {} for offset in INTERP_OFFSET_GRID
            }
            for fold in range(N_FOLDS):
                fit_on = [a for a, f in zip(train, folds) if f != fold]
                held = [a for a, f in zip(train, folds) if f == fold]
                head = fit_head(fit_on, c_value, class_weight)
                for offset in INTERP_OFFSET_GRID:
                    shifted = head.with_intercept_shift(LABEL_INTERPRETATION, offset)
                    for article in held:
                        predicted[offset][article.title] = predict_article_labels(
                            shifted, article)
            start = len(rows)
            for offset in INTERP_OFFSET_GRID:
                for t_sep in T_SEP_GRID:
                    rows.append({
                        "c": c_value,
                        "class_weight": class_weight,
                        "interp_offset": offset,
                        "t_sep": t_sep,
                        "cv_tier_accuracy": round(
                            tier_accuracy(train, predicted[offset], t_sep), 4),
                    })
            logger.info("CV C=%.1f weight=%s: best tier accuracy %.3f",
                        c_value, class_weight,
                        max(r["cv_tier_accuracy"] for r in rows[start:]))
    return rows


def choose_config(cv_rows: list[dict], forced_offset: float | None = None) -> dict:
    """Pick the highest CV accuracy.

    Ties go to the smaller interpretation shift, then to the lower t_sep
    (the value already in classifier/config.py). When `forced_offset` is
    set, only rows with that shift can win.
    """
    rows = cv_rows
    if forced_offset is not None:
        rows = [r for r in cv_rows if r["interp_offset"] == forced_offset]
        if not rows:
            raise ValueError(
                f"--interp-offset {forced_offset} is not in the grid "
                f"{INTERP_OFFSET_GRID}.")
    return max(rows, key=lambda r: (
        r["cv_tier_accuracy"], -r["interp_offset"], -r["t_sep"]))


def paragraph_metrics(head: ParagraphHead, test: list[Article]) -> dict:
    """Paragraph-level accuracy, precision, and recall on the test split."""
    gold: list[str] = []
    pred: list[str] = []
    for article in test:
        if not article.aligned:
            continue
        labels = predict_article_labels(head, article)
        for i, is_positional in enumerate(article.positional):
            if not is_positional and article.llm_labels[i] in CLASSES:
                gold.append(article.llm_labels[i])
                pred.append(labels[i])
    gold_arr, pred_arr = np.array(gold), np.array(pred)
    metrics: dict = {
        "paragraphs": len(gold),
        "accuracy": round(float((gold_arr == pred_arr).mean()), 4),
        "majority_share": round(max(
            float((gold_arr == c).mean()) for c in CLASSES), 4),
        "per_class": {},
    }
    for cls in CLASSES:
        hit = int(((gold_arr == cls) & (pred_arr == cls)).sum())
        metrics["per_class"][cls] = {
            "recall": round(hit / max(int((gold_arr == cls).sum()), 1), 4),
            "precision": round(hit / max(int((pred_arr == cls).sum()), 1), 4),
        }
    return metrics


def confusion_counts(
    test: list[Article], predicted: dict[str, list[str]], t_sep: float,
) -> dict[str, int]:
    """Count (gold state, predicted state) pairs as 'gold->pred' keys."""
    counts: dict[str, int] = {}
    for article in test:
        state = score_article(predicted[article.title], t_sep)["tier_state"]
        key = f"{article.gold_state}->{state}"
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def offset_tradeoff(
    head: ParagraphHead, test: list[Article], t_sep: float,
) -> list[dict]:
    """Show what each interpretation shift would do on the test split.

    This is for information only. The test split never chooses the shift.
    """
    rows: list[dict] = []
    for offset in INTERP_OFFSET_GRID:
        shifted = head.with_intercept_shift(LABEL_INTERPRETATION, offset)
        predicted = {a.title: predict_article_labels(shifted, a) for a in test}
        interp = paragraph_metrics(shifted, test)["per_class"][LABEL_INTERPRETATION]
        rows.append({
            "interp_offset": offset,
            "test_tier_accuracy": round(tier_accuracy(test, predicted, t_sep), 4),
            "interp_recall": interp["recall"],
            "interp_precision": interp["precision"],
        })
    return rows


def read_baseline() -> dict | None:
    """Read the store-scoring baseline from the held-out result file."""
    if not HELD_OUT_RESULT_PATH.exists():
        return None
    with open(HELD_OUT_RESULT_PATH, "r", encoding="utf-8") as fh:
        held_out = json.load(fh)
    return {
        "test_accuracy": held_out["test_accuracy"],
        "test_ci_lower": held_out.get("test_ci_lower"),
        "test_ci_upper": held_out.get("test_ci_upper"),
    }


def write_weights(head: ParagraphHead, chosen: dict, result: dict) -> None:
    """Write the head weights and a small provenance block."""
    payload = {
        "classes": list(head.classes),
        "coef": np.round(head.coef, 6).tolist(),
        "intercept": np.round(head.intercept, 6).tolist(),
        "provenance": {
            "trained_on": date.today().isoformat(),
            "split": f"title hash, seed={SPLIT_SEED}, train fraction={TRAIN_FRACTION}",
            "train_articles": result["train_n"],
            "c": chosen["c"],
            "class_weight": chosen["class_weight"],
            "interp_offset": chosen["interp_offset"],
            "t_sep": chosen["t_sep"],
            "test_tier_accuracy": result["test_accuracy"],
        },
    }
    with open(PARAGRAPH_HEAD_PATH, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1)
    logger.info("Wrote %s", PARAGRAPH_HEAD_PATH)


def build_d6_section(result: dict) -> str:
    """Build section D.6 of CLASSIFIER_DIAGNOSIS.md (header included)."""
    para = result["test_paragraph_metrics"]
    base = result.get("baseline")
    rows = "\n".join(
        f"| {cls} | {m['recall']:.3f} | {m['precision']:.3f} |"
        for cls, m in para["per_class"].items()
    )
    tradeoff = "\n".join(
        f"| {r['interp_offset']} | {r['test_tier_accuracy']:.3f} | "
        f"{r['interp_recall']:.3f} | {r['interp_precision']:.3f} |"
        for r in result["offset_tradeoff"]
    )
    confusion = "\n".join(
        f"| `{key}` | {count} |" for key, count in result["confusion"].items()
    )
    baseline_row = (
        f"| Store-scoring baseline (§D.5) | {base['test_accuracy']:.3f} |\n"
        if base else ""
    )
    return f"""{DIAGNOSIS_D6_HEADER}

Generated by `scripts/train_paragraph_head.py` (issue #231). The head is a
linear classifier on the full paragraph embedding. It replaces the four
store scores with the 384 embedding values. It trains on the LLM labels of
the train split only. It uses the same title-hash split as §D.5, so the two
test results are comparable. The regularisation, the class weighting, and
`t_sep` come from {N_FOLDS}-fold cross-validation on the train split. The test
split is used once.

| Setting | Value |
|---|---|
| Train articles | {result['train_n']} |
| Test articles | {result['test_n']} |
| Articles not aligned with their labels (kept in the tier test, left out of training) | {result['not_aligned_articles']} |
| C | {result['chosen']['c']} |
| Class weighting | {result['chosen']['class_weight']} |
| Interpretation intercept shift | {result['chosen']['interp_offset']} |
| t_sep | {result['chosen']['t_sep']:.2f} |

| Metric | Value |
|---|---|
| Test tier accuracy (held-out) | {result['test_accuracy']:.3f} |
| Test accuracy 95% CI (bootstrap) | [{result['test_ci_lower']:.3f}, {result['test_ci_upper']:.3f}] |
| Cross-validation accuracy (train split) | {result['chosen']['cv_tier_accuracy']:.3f} |
| Train accuracy (in-sample) | {result['train_accuracy']:.3f} |
{baseline_row}| Always guess the most common tier | {result['majority_tier_accuracy']:.3f} |
| Activation gate | 0.850 |

Paragraph level, on the test split ({para['paragraphs']} paragraphs; the most
common class is {para['majority_share']:.3f} of them). Overall accuracy is
{para['accuracy']:.3f}.

| Class | Recall | Precision |
|---|---|---|
{rows}

Interpretation intercept shift, on the test split. A larger shift makes the
head call more paragraphs interpretation. Recall rises and precision falls.
The test split only reports this table. The shift in use comes from
cross-validation on the train split (or from `--interp-offset`).

| Shift | Test tier accuracy | Interpretation recall | Interpretation precision |
|---|---|---|---|
{tradeoff}

Test articles by (gold tier, predicted tier):

| Pair | Articles |
|---|---|
{confusion}

**Interpretation:** the gold tiers come from an LLM labeller, not from a
human, so this result measures agreement with that labeller. The gate is
not met if the test accuracy is below 0.850. Read the accuracy next to the
"always guess" row: when one tier is most of the corpus, the raw accuracy
is a weak measure. The head is not the default scoring rule. Activation is
a separate decision (issue #231).

"""


def update_diagnosis(result: dict) -> None:
    """Write or replace section D.6 right after section D.5."""
    if not DIAGNOSIS_DOC_PATH.exists():
        logger.warning("%s not found — cannot write §D.6.", DIAGNOSIS_DOC_PATH)
        return
    content = DIAGNOSIS_DOC_PATH.read_text(encoding="utf-8")
    content = upsert_section(
        content, DIAGNOSIS_D6_HEADER, build_d6_section(result),
        insert_after=DIAGNOSIS_D5_HEADER,
    )
    DIAGNOSIS_DOC_PATH.write_text(content, encoding="utf-8")
    logger.info("Updated %s with §D.6", DIAGNOSIS_DOC_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--interp-offset", type=float, default=None,
        help="Force the interpretation intercept shift (must be in the grid).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store_manager = StoreManager()
    articles, not_aligned = build_articles(store_manager)
    if len(articles) < 20:
        logger.error("Only %d usable articles (need >= 20).", len(articles))
        sys.exit(1)

    train = [a for a in articles
             if _title_split_fraction(a.title, SPLIT_SEED) < TRAIN_FRACTION]
    test = [a for a in articles
            if _title_split_fraction(a.title, SPLIT_SEED) >= TRAIN_FRACTION]
    logger.info("Split: %d train, %d test articles.", len(train), len(test))

    cv_rows = cross_validate(train)
    chosen = choose_config(cv_rows, args.interp_offset)
    logger.info("Chosen: %s", chosen)

    base_head = fit_head(train, chosen["c"], chosen["class_weight"])
    head = base_head.with_intercept_shift(
        LABEL_INTERPRETATION, chosen["interp_offset"])
    train_pred = {a.title: predict_article_labels(head, a) for a in train}
    test_pred = {a.title: predict_article_labels(head, a) for a in test}

    correct = round(tier_accuracy(test, test_pred, chosen["t_sep"]) * len(test))
    ci_lower, ci_upper = bootstrap_ci(correct, len(test))
    gold_counts: dict[str, int] = {}
    for a in test:
        gold_counts[a.gold_state] = gold_counts.get(a.gold_state, 0) + 1

    result = {
        "status": "complete",
        "train_n": len(train),
        "test_n": len(test),
        "not_aligned_articles": not_aligned,
        "chosen": chosen,
        "cv_grid": cv_rows,
        "train_accuracy": tier_accuracy(train, train_pred, chosen["t_sep"]),
        "test_accuracy": correct / len(test),
        "test_correct": correct,
        "test_ci_lower": ci_lower,
        "test_ci_upper": ci_upper,
        "majority_tier_accuracy": max(gold_counts.values()) / len(test),
        "test_paragraph_metrics": paragraph_metrics(head, test),
        "offset_tradeoff": offset_tradeoff(base_head, test, chosen["t_sep"]),
        "confusion": confusion_counts(test, test_pred, chosen["t_sep"]),
        "baseline": read_baseline(),
        "default_t_sep_in_config": DEFAULT_T_SEP,
    }
    logger.info(
        "Held-out: train_acc=%.3f test_acc=%.3f (%d/%d) CI=[%.3f,%.3f]",
        result["train_accuracy"], result["test_accuracy"], correct, len(test),
        ci_lower, ci_upper,
    )

    write_weights(head, chosen, result)
    with open(RESULT_PATH, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)
    logger.info("Wrote %s", RESULT_PATH)
    update_diagnosis(result)


if __name__ == "__main__":
    main()
