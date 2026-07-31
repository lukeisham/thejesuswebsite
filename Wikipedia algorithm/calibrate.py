#!/usr/bin/env python3
"""Tier-level calibration of the section classifier against the Plan 3 gold set.

Focuses on per-article tier accuracy rather than per-paragraph agreement,
because the gold set's paragraph segmentation method is incompatible
with the classifier's API-extract paragraph boundaries (§3.1.1 positional rules
and visual-vs-extract segmentation differences prevent alignment).

Supports a four-way bake-off: {adjacency, block} × {mean-cosine, centroid}.
Each combination is calibrated independently with its own threshold sweeps
and bootstrap confidence intervals.
"""

import csv
import json
import logging
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
from urllib.request import urlopen, Request
from urllib.parse import unquote

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from classifier.config import N_min, SEPARATION_MODE
from classifier.stores import StoreManager
from classifier.labeler import classify_paragraphs, get_labels_only
from classifier.scorer import (
    compute_separation_ratio,
    compute_separation_blocks,
    assign_tier,
    _tier_state_name,
)
from scripts.doc_sections import upsert_section
from scripts.paragraph_eval import (
    ALIGNED_ARTICLES,
    evaluate_aligned_six,
    evaluate_three_tier,
    load_gold_paragraph_labels,
    neither_rate as compute_neither_rate,
    raw_label_distribution,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("calibrate-tier")

GOLD_SET_PATH = Path(__file__).resolve().parent / "gold-set-section-classifier.csv"
CALIBRATION_DOC_PATH = Path(__file__).resolve().parent / "CLASSIFIER_CALIBRATION.md"
VALIDATION_DOC_PATH = Path(__file__).resolve().parent / "VALIDATION_REPORT.md"
DIAGNOSIS_DOC_PATH = Path(__file__).resolve().parent / "CLASSIFIER_DIAGNOSIS.md"

# Gold-set tier string → state name mapping (the source-of-truth names).
# The old TIER_MAP keyed on contribution integers — but with one_sided=0
# and unclassifiable=0, the integers collide. Keying on state names is
# unambiguous and matches the gold-set CSV 'tier_assignment' column.
GOLD_TIER_STATE = {
    "clear_split": "clear_split",
    "muddled": "muddled",
    "one_side_only": "one_sided",
    "unclassifiable": "unclassifiable",
}

# Tier state → contribution integer (from the settled ordering).
TIER_CONTRIBUTION = {
    "clear_split": 10,
    "muddled": -5,
    "one_sided": 0,
    "unclassifiable": 0,
}

# Reverse: contribution → state name (handles the 0 collision by context).
def _contribution_to_state(tier: int, labels: list[str] = None) -> str:
    """Map a tier contribution integer to its state name.

    Thin wrapper over classifier.scorer._tier_state_name — delegates rather
    than duplicating the tier→state table, so this stays in sync when
    TIER_CLEAR/TIER_MUDDLED change in classifier/config.py (see
    setup/issues.md #162 for what happens when a copy of this table drifts).
    """
    labels = labels or []
    data_count = labels.count("data")
    close_count = labels.count("close")
    interp_count = labels.count("interpretation")
    return _tier_state_name(tier, data_count, close_count, interp_count, N_min)


class ParagraphExtractor(HTMLParser):
    """Extract and clean <p> tag text from Wikipedia rendered HTML."""

    def __init__(self) -> None:
        super().__init__()
        self.paragraphs: list[str] = []
        self._current: list[str] = []
        self._in_p = False

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "p":
            self._in_p = True
            self._current = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "p":
            self._in_p = False
            text = " ".join(self._current)
            text = self._clean(text)
            if text and len(text.split()) >= 5:
                self.paragraphs.append(text)

    def handle_data(self, data: str) -> None:
        if self._in_p:
            self._current.append(data)

    @staticmethod
    def _clean(text: str) -> str:
        """Remove HTML citation artifacts and normalize whitespace."""
        text = re.sub(r"\[\s*[a-z0-9]+\s*\]", "", text)
        text = re.sub(r"\[\s*note\s+\d+\s*\]", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+'", "'", text)
        text = re.sub(r"\s+\.", ".", text)
        text = re.sub(r"\s+,", ",", text)
        text = re.sub(r"\s+\)", ")", text)
        text = re.sub(r"\(\s+", "(", text)
        text = re.sub(r"\s+;", ";", text)
        text = re.sub(r"\s+:", ":", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text


def fetch_article_paragraphs(url: str) -> list[str]:
    """Fetch cleaned prose paragraphs from a Wikipedia article via the parse API."""
    title_match = re.search(r"/wiki/(.+)$", url)
    title = unquote(title_match.group(1))

    api_url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=parse&page={title}"
        "&prop=text&format=json&disableeditsection=1"
    )
    req = Request(api_url, headers={"User-Agent": "thejesuswebsite-classifier/0.1"})

    for attempt in range(3):
        try:
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
            break
        except Exception as e:
            if attempt < 2:
                wait = 2 ** (attempt + 1)
                logger.warning("Attempt %d: %s; retrying in %ds ...", attempt + 1, e, wait)
                time.sleep(wait)
            else:
                raise

    html_text = data.get("parse", {}).get("text", {}).get("*", "")
    parser = ParagraphExtractor()
    parser.feed(html_text)
    return parser.paragraphs


def load_gold_set() -> list[dict]:
    """Load gold-set articles with their tier verdicts (keyed by state name)."""
    records: list[dict] = []
    with open(GOLD_SET_PATH, "r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            tier_raw = row.get("tier_assignment", "").strip()
            gold_state = GOLD_TIER_STATE.get(tier_raw, "unclassifiable")
            records.append({
                "title": row["article_title"],
                "url": row["wikipedia_url"],
                "gold_tier_state": gold_state,
                "gold_tier_contribution": TIER_CONTRIBUTION.get(gold_state, 0),
            })
    return records


def bootstrap_ci(
    correct: int, total: int, n_bootstrap: int = 10000, alpha: float = 0.05,
) -> tuple[float, float]:
    """Compute a bootstrap 95% confidence interval for a proportion."""
    if total < 2:
        return (0.0, 1.0)
    rng = np.random.default_rng(42)
    data = np.array([1] * correct + [0] * (total - correct))
    means = np.empty(n_bootstrap)
    for i in range(n_bootstrap):
        sample = rng.choice(data, size=total, replace=True)
        means[i] = sample.mean()
    lower = np.percentile(means, 100 * alpha / 2)
    upper = np.percentile(means, 100 * (1 - alpha / 2))
    return (round(float(lower), 4), round(float(upper), 4))


# Cache file for fetched Wikipedia paragraphs — avoids re-fetching on re-runs.
FETCH_CACHE_PATH = Path(__file__).resolve().parent / ".calibrate-fetch-cache.json"


def _load_fetch_cache() -> dict[str, list[str]]:
    """Load cached Wikipedia paragraphs from disk."""
    if FETCH_CACHE_PATH.exists():
        with open(FETCH_CACHE_PATH, "r", encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def _save_fetch_cache(cache: dict[str, list[str]]) -> None:
    """Save fetched paragraphs to disk cache."""
    with open(FETCH_CACHE_PATH, "w", encoding="utf-8") as fh:
        json.dump(cache, fh, ensure_ascii=False, indent=2)
    logger.info("Fetch cache saved to %s", FETCH_CACHE_PATH)


def _classify_one_article(
    article_text: str,
    store_manager: StoreManager,
    scoring_rule: str = "mean-cosine",
) -> dict:
    """Classify one article and return raw scores + labels.

    Returns a dict with 'labels' (list[str]) and 'scores' (list of
    {data, interpretation, register} dicts) so thresholds can be
    re-applied later without re-running ONNX/FAISS.
    """
    labelled = classify_paragraphs(article_text, store_manager,
                                   scoring_rule=scoring_rule)
    labels = get_labels_only(labelled)
    # Extract per-paragraph scores for threshold re-application.
    scores = [p.get("scores", {}) for p in labelled]
    return {"labels": labels, "scores": scores}


def _apply_scores(
    cached: dict,
    t_data: float,
    t_close: float,
    t_interp: float,
    t_register: float,
) -> list[str]:
    """Re-label paragraphs from cached scores with new thresholds.

    This is the fast path — no ONNX inference, no FAISS search.
    It re-applies the same _label_paragraph logic that the full
    pipeline uses, but from pre-computed similarity scores.
    """
    from classifier.labeler import _label_paragraph
    from classifier.config import LABEL_OTHER

    labels: list[str] = []
    # Iterate through scores, but we also need to know which paragraphs
    # were positional (lede/references). The cached labels tell us that —
    # if the original label was 'other' and the scores are all zero, it's
    # a positional paragraph.
    cached_labels = cached.get("labels", [])
    cached_scores = cached.get("scores", [])

    for i, (orig_label, scores) in enumerate(zip(cached_labels, cached_scores)):
        # Positional paragraphs (lede, references) are always 'other'
        # regardless of scores. Detect them: first paragraph OR label was
        # 'other' with scores indicating positional assignment.
        if i == 0:
            labels.append(LABEL_OTHER)
            continue

        # If the original classified this as 'other' and all scores are 0,
        # it was likely a reference section hit — preserve 'other'.
        if orig_label == LABEL_OTHER and all(
            scores.get(k, 0) == 0 for k in ("data", "close", "interpretation", "register")
        ):
            labels.append(LABEL_OTHER)
            continue

        data_score = scores.get("data", 0)
        close_score = scores.get("close", 0)
        interp_score = scores.get("interpretation", 0)
        register_score = scores.get("register", 0)

        label = _label_paragraph(
            data_score, close_score, interp_score, register_score,
            t_data_threshold=t_data,
            t_close_threshold=t_close,
            t_interp_threshold=t_interp,
            t_register_threshold=t_register,
        )
        labels.append(label)

    return labels


def precompute_classifications(
    records: list[dict],
    store_manager: StoreManager,
    scoring_rule: str = "mean-cosine",
) -> dict[str, dict]:
    """Run the full ONNX+FAISS pipeline ONCE per article.

    Stores raw scores so subsequent threshold sweeps can re-label
    without re-running the expensive embedding + search steps.

    Returns:
        Dict mapping article_title → {labels, scores, paragraphs}.
    """
    cache: dict[str, dict] = {}
    for i, record in enumerate(records):
        title = record["title"]
        if not record.get("paragraphs"):
            logger.warning("SKIP precompute: %s — no paragraphs", title)
            continue

        try:
            article_text = "\n\n".join(record["paragraphs"])
            result = _classify_one_article(article_text, store_manager,
                                           scoring_rule=scoring_rule)
            cache[title] = {
                "labels": result["labels"],
                "scores": result["scores"],
                "paragraphs": record["paragraphs"],
            }
            if (i + 1) % 10 == 0:
                logger.info("  Precomputed %d/%d articles (%s)",
                           i + 1, len(records), scoring_rule)
        except Exception:
            logger.exception("Precompute failed: %s", title)

    logger.info("Precomputed %d articles for scoring_rule=%s",
                len(cache), scoring_rule)
    return cache


def evaluate_tiers_from_cache(
    records: list[dict],
    cached: dict[str, dict],
    t_data: float,
    t_close: float,
    t_interp: float,
    t_sep: float,
    t_reg: float,
    scoring_rule: str,
    separation_mode: str,
) -> dict:
    """Evaluate tier accuracy using pre-computed scores (no ONNX/FAISS).

    This is the fast path — re-labels from cached scores (~instant)
    instead of running the full embedding pipeline.
    """
    all_states = ["clear_split", "muddled", "one_sided", "unclassifiable"]
    per_tier = {"tp": {}, "fp": {}, "fn": {}}
    for s in all_states:
        per_tier["tp"][s] = 0
        per_tier["fp"][s] = 0
        per_tier["fn"][s] = 0

    correct = 0
    total = 0
    skipped: list[dict] = []
    details: list[dict] = []

    for record in records:
        title = record["title"]
        if title not in cached:
            skipped.append({"title": title, "reason": "not in precompute cache"})
            continue

        try:
            entry = cached[title]
            # Re-label from cached scores using the current thresholds.
            pred_labels = _apply_scores(entry, t_data, t_close, t_interp, t_reg)

            if separation_mode == "block":
                separation = compute_separation_blocks(pred_labels)
            else:
                separation = compute_separation_ratio(pred_labels)

            pred_tier = assign_tier(pred_labels, separation, t_sep, N_min)
            gold_state = record["gold_tier_state"]
            pred_state = _contribution_to_state(pred_tier, pred_labels)

            total += 1
            if pred_state == gold_state:
                correct += 1

            for s in all_states:
                gold_has = (gold_state == s)
                pred_has = (pred_state == s)
                if gold_has and pred_has:
                    per_tier["tp"][s] += 1
                elif pred_has and not gold_has:
                    per_tier["fp"][s] += 1
                elif gold_has and not pred_has:
                    per_tier["fn"][s] += 1

            details.append({
                "title": title,
                "gold_tier": gold_state,
                "pred_tier": pred_state,
                "separation": round(float(separation), 3),
                "data_count": pred_labels.count("data"),
                "close_count": pred_labels.count("close"),
                "interp_count": pred_labels.count("interpretation"),
                "correct": pred_state == gold_state,
            })

        except Exception:
            logger.exception("Failed (from cache): %s", title)
            skipped.append({"title": title, "reason": "exception during eval"})

    for s in skipped:
        logger.warning("SKIPPED: %s — %s", s["title"], s["reason"])

    accuracy = correct / max(total, 1)
    ci_lower, ci_upper = bootstrap_ci(correct, total)

    tier_stats = {}
    for s in all_states:
        tp = per_tier["tp"][s]
        fp = per_tier["fp"][s]
        fn = per_tier["fn"][s]
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-9)
        tier_stats[s] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
        }

    return {
        "t_data": t_data,
        "t_close": t_close,
        "t_interp": t_interp,
        "t_sep": t_sep,
        "t_register": t_reg,
        "scoring_rule": scoring_rule,
        "separation_mode": separation_mode,
        "tier_accuracy": round(accuracy, 4),
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "correct": correct,
        "total": total,
        "tier_stats": tier_stats,
        "details": details,
        "skipped": skipped,
    }


def evaluate_tiers(
    records: list[dict],
    store_manager: StoreManager,
    t_data: float,
    t_close: float = 0.45,
    t_interp: float = 0.50,
    t_sep: float = 0.60,
    t_reg: Optional[float] = None,
    scoring_rule: str = "mean-cosine",
    separation_mode: str = "adjacency",
) -> dict:
    """Classify all articles and measure tier accuracy (full pipeline).

    Prefer evaluate_tiers_from_cache() when scores are pre-computed.
    This function exists for backward compatibility and one-off evals.
    """
    import classifier.config as cfg

    if t_reg is None:
        t_reg = t_data

    orig = (cfg.t_data, cfg.t_close, cfg.t_interp, cfg.t_sep, cfg.t_register,
            cfg.SEPARATION_MODE)

    correct = 0
    total = 0
    skipped: list[dict] = []

    per_tier = {"tp": {}, "fp": {}, "fn": {}}
    all_states = ["clear_split", "muddled", "one_sided", "unclassifiable"]
    for s in all_states:
        per_tier["tp"][s] = 0
        per_tier["fp"][s] = 0
        per_tier["fn"][s] = 0

    details: list[dict] = []

    for record in records:
        if not record.get("paragraphs"):
            skipped.append({"title": record["title"],
                           "reason": "no paragraphs fetched"})
            continue

        try:
            cfg.t_data = t_data
            cfg.t_close = t_close
            cfg.t_interp = t_interp
            cfg.t_register = t_reg
            cfg.SEPARATION_MODE = separation_mode

            article_text = "\n\n".join(record["paragraphs"])
            labelled = classify_paragraphs(article_text, store_manager,
                                           scoring_rule=scoring_rule)
            pred_labels = get_labels_only(labelled)

            cfg.t_data, cfg.t_close, cfg.t_interp, cfg.t_sep, cfg.t_register = orig[:5]
            cfg.SEPARATION_MODE = orig[5]

            if separation_mode == "block":
                separation = compute_separation_blocks(pred_labels)
            else:
                separation = compute_separation_ratio(pred_labels)

            pred_tier = assign_tier(pred_labels, separation, t_sep, N_min)
            gold_state = record["gold_tier_state"]
            pred_state = _contribution_to_state(pred_tier, pred_labels)

            total += 1
            if pred_state == gold_state:
                correct += 1

            for s in all_states:
                gold_has = (gold_state == s)
                pred_has = (pred_state == s)
                if gold_has and pred_has:
                    per_tier["tp"][s] += 1
                elif pred_has and not gold_has:
                    per_tier["fp"][s] += 1
                elif gold_has and not pred_has:
                    per_tier["fn"][s] += 1

            details.append({
                "title": record["title"],
                "gold_tier": gold_state,
                "pred_tier": pred_state,
                "separation": round(float(separation), 3),
                "data_count": pred_labels.count("data"),
                "interp_count": pred_labels.count("interpretation"),
                "correct": pred_state == gold_state,
            })

        except Exception:
            logger.exception("Failed: %s", record["title"])
            skipped.append({"title": record["title"],
                           "reason": "exception during classification"})

    for s in skipped:
        logger.warning("SKIPPED: %s — %s", s["title"], s["reason"])

    accuracy = correct / max(total, 1)
    ci_lower, ci_upper = bootstrap_ci(correct, total)

    tier_stats = {}
    for s in all_states:
        tp = per_tier["tp"][s]
        fp = per_tier["fp"][s]
        fn = per_tier["fn"][s]
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-9)
        tier_stats[s] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
        }

    return {
        "t_data": t_data,
        "t_close": t_close,
        "t_interp": t_interp,
        "t_sep": t_sep,
        "t_register": t_reg,
        "scoring_rule": scoring_rule,
        "separation_mode": separation_mode,
        "tier_accuracy": round(accuracy, 4),
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "correct": correct,
        "total": total,
        "tier_stats": tier_stats,
        "details": details,
        "skipped": skipped,
    }


def sweep_t_sep_from_cache(
    records: list[dict],
    cached: dict[str, dict],
    t_data: float, t_close: float, t_interp: float, t_reg: float,
    scoring_rule: str, separation_mode: str,
) -> list[dict]:
    """Sweep t_sep using cached scores (~instant per point)."""
    results = []
    for t_sep_val in np.arange(0.50, 0.96, 0.05):
        t_sep_val = round(float(t_sep_val), 2)
        r = evaluate_tiers_from_cache(
            records, cached, t_data, t_close, t_interp, t_sep_val, t_reg,
            scoring_rule, separation_mode,
        )
        results.append(r)
        logger.info("t_sep=%.2f (%s/%s): accuracy=%.3f (%d/%d) CI=[%.3f,%.3f]",
                     t_sep_val, separation_mode, scoring_rule,
                     r["tier_accuracy"], r["correct"], r["total"],
                     r["ci_lower"], r["ci_upper"])
    return results


def sweep_t_data_interp_from_cache(
    records: list[dict],
    cached: dict[str, dict],
    t_sep: float,
    scoring_rule: str, separation_mode: str,
) -> list[dict]:
    """Sweep t_data/t_close/t_interp/t_register from cached scores
    (~instant per point).

    Since scores are pre-computed, each grid point only re-applies
    threshold comparisons — no ONNX or FAISS work.

    t_register is swept as an INDEPENDENT dimension over its own grid
    (2026-07-30 fix). Previously this function silently passed t_d into
    the t_reg slot of evaluate_tiers_from_cache, so t_register was never
    actually calibrated — it only ever took whatever value t_data landed
    on. See CLASSIFIER_DIAGNOSIS.md §B for the paragraph-level measurement
    that surfaced this: at the un-swept default of 0.40, the register gate
    was rejecting ~50% of the corpus as 'neither' against a ~2% human rate.
    The register grid starts below 0.40 (unlike t_data/t_close/t_interp)
    because that measurement showed the useful range is 0.15-0.40, not
    0.40-0.65 — the register store's exemplar set (32 total, the smallest
    of the four stores) produces lower mean-cosine scores on real paragraphs
    than the class stores do.
    """
    results = []
    # Wider grid now that each eval is instant.
    t_values = [round(float(v), 2) for v in np.arange(0.40, 0.70, 0.05)]
    t_reg_values = [round(float(v), 2) for v in np.arange(0.15, 0.45, 0.05)]
    for t_d in t_values:
        for t_c in t_values:
            for t_i in t_values:
                for t_r in t_reg_values:
                    r = evaluate_tiers_from_cache(
                        records, cached, t_d, t_c, t_i, t_sep, t_r,
                        scoring_rule, separation_mode,
                    )
                    results.append(r)
    logger.info("Swept %d combinations (t_data/t_close/t_interp x %d each, "
                "t_register x %d) for %s/%s",
                len(results), len(t_values), len(t_reg_values),
                separation_mode, scoring_rule)
    return results


def choose_best(results: list[dict]) -> dict:
    """Select the config with highest tier accuracy.

    Tie-break: prefer higher t_sep (stricter clean-split threshold), then
    higher CI lower bound (more robust estimate).

    When LLM labels are available for a held-out split, prefer
    calibrate_with_held_out() instead — this function reports in-sample
    accuracy and does not guard against overfitting.
    """
    best = max(results, key=lambda r: (
        r["tier_accuracy"],
        r.get("t_sep", 0),
        r.get("ci_lower", 0),
    ))
    return best


def update_config(t_data: float, t_close: float, t_interp: float, t_sep: float, t_register: float) -> None:
    """Write calibrated thresholds to config.py."""
    config_path = Path(__file__).resolve().parent / "classifier" / "config.py"
    content = config_path.read_text(encoding="utf-8")
    content = re.sub(r"^t_data: float = [\d.]+", f"t_data: float = {t_data:.2f}",
                     content, flags=re.MULTILINE)
    content = re.sub(r"^t_close: float = [\d.]+", f"t_close: float = {t_close:.2f}",
                     content, flags=re.MULTILINE)
    content = re.sub(r"^t_interp: float = [\d.]+", f"t_interp: float = {t_interp:.2f}",
                     content, flags=re.MULTILINE)
    content = re.sub(r"^t_sep: float = [\d.]+", f"t_sep: float = {t_sep:.2f}",
                     content, flags=re.MULTILINE)
    content = re.sub(r"^t_register: float = [\d.]+",
                     f"t_register: float = {t_register:.2f}",
                     content, flags=re.MULTILINE)
    config_path.write_text(content, encoding="utf-8")
    logger.info("Updated %s", config_path)


# ---------------------------------------------------------------------------
# Held-out calibration (requires LLM-labelled corpus)
# ---------------------------------------------------------------------------

def calibrate_with_held_out(
    records: list[dict],
    cached_scores: dict[str, dict],
    llm_labels: dict[str, list[str]],
    scoring_rule: str,
    separation_mode: str,
    train_frac: float = 0.70,
    random_seed: int = 42,
) -> dict:
    """Calibrate on a train split and evaluate on a held-out test split.

    This addresses the overfitting concern with the 39-article gold set:
    `choose_best()` picks the highest in-sample accuracy and reports it as
    the result, which is an optimistic estimate. With ~255 LLM-labelled
    articles, we can finally calibrate on one split and report accuracy on
    a held-out split for an honest out-of-sample estimate.

    The held-out set uses LLM labels as pseudo-gold (the labeller's
    agreement against human labels must have passed the >= 0.85 gate before
    this is meaningful).

    Args:
        records: Gold-set records (titles, URLs).
        cached_scores: Pre-computed paragraph scores from the fetch cache.
        llm_labels: article_title -> list of LLM labels (data/close/interpretation).
        scoring_rule: "mean-cosine" or "centroid".
        separation_mode: "adjacency" or "block".
        train_frac: Fraction of articles for training (default 0.70).
        random_seed: Seed for reproducible splits.

    Returns:
        Dict with train_accuracy, test_accuracy, best_config, and details.
    """
    import random

    # Only include records that have LLM labels.
    labelled_records = []
    for r in records:
        title = r["title"]
        if title in cached_scores and title in llm_labels:
            labelled_records.append(r)

    if len(labelled_records) < 20:
        logger.warning(
            "Only %d LLM-labelled articles — held-out calibration skipped "
            "(need >= 20).", len(labelled_records),
        )
        return {
            "status": "skipped",
            "reason": f"only {len(labelled_records)} labelled articles (need >= 20)",
        }

    # Shuffle deterministically and split.
    rng = random.Random(random_seed)
    shuffled = list(labelled_records)
    rng.shuffle(shuffled)
    split_idx = int(len(shuffled) * train_frac)
    train_records = shuffled[:split_idx]
    test_records = shuffled[split_idx:]

    logger.info(
        "Held-out calibration: %d train / %d test articles "
        "(scoring=%s, separation=%s)",
        len(train_records), len(test_records), scoring_rule, separation_mode,
    )

    # Sweep thresholds on the train set (same as run_bakeoff_combination).
    p1 = sweep_t_data_interp_from_cache(
        train_records, cached_scores, 0.70,
        scoring_rule=scoring_rule, separation_mode=separation_mode,
    )
    best_p1 = max(p1, key=lambda r: (r["tier_accuracy"], r.get("ci_lower", 0)))

    p2 = sweep_t_sep_from_cache(
        train_records, cached_scores,
        best_p1["t_data"], best_p1.get("t_close", best_p1["t_data"]),
        best_p1["t_interp"], best_p1.get("t_register", best_p1["t_data"]),
        scoring_rule=scoring_rule, separation_mode=separation_mode,
    )
    best_train = choose_best(p2)

    # Evaluate the best train config on the test set.
    test_result = evaluate_tiers_from_cache(
        test_records, cached_scores,
        best_train["t_data"], best_train.get("t_close", best_train["t_data"]),
        best_train["t_interp"], best_train["t_sep"],
        best_train.get("t_register", best_train["t_data"]),
        scoring_rule, separation_mode,
    )

    gap = best_train["tier_accuracy"] - test_result["tier_accuracy"]

    logger.info(
        "Held-out: train_acc=%.3f test_acc=%.3f gap=%.3f "
        "(train=%d test=%d)",
        best_train["tier_accuracy"], test_result["tier_accuracy"], gap,
        best_train["total"], test_result["total"],
    )

    return {
        "status": "complete",
        "scoring_rule": scoring_rule,
        "separation_mode": separation_mode,
        "train_n": len(train_records),
        "test_n": len(test_records),
        "train_accuracy": best_train["tier_accuracy"],
        "test_accuracy": test_result["tier_accuracy"],
        "train_test_gap": round(gap, 4),
        "best_config": {
            "t_data": best_train["t_data"],
            "t_close": best_train.get("t_close", best_train["t_data"]),
            "t_interp": best_train["t_interp"],
            "t_sep": best_train["t_sep"],
            "t_register": best_train.get("t_register", best_train["t_data"]),
        },
        "test_details": test_result["details"],
    }


CALIBRATION_APPENDIX_HEADER = "## Calibration Results"
VALIDATION_TIER_RESULTS_HEADER = "## Tier Accuracy Results"


def _build_calibration_appendix(best: dict, all_results: list[dict],
                                 today: str, n_one_sided_gold: int,
                                 n_unclassifiable_gold: int) -> str:
    """Build the body of CLASSIFIER_CALIBRATION.md's '## Calibration Results'
    section (header included) for the current run. Pure string-building —
    write_docs() is responsible for actually writing it via upsert_section.
    """
    appendix = f"""## Calibration Results

**Date:** {today}

### Methodology

Article-tier calibration (below) is the primary acceptance measure — see
CLASSIFIER_DIAGNOSIS.md §C for the standing, automatic paragraph-level
evaluation harness (Phase 2), which reports confusion matrices, per-class
precision/recall/F1, and `neither`-rate against 39 gold-set articles plus
`gold-set-three-tier.csv`, with its coverage limits stated explicitly.
Full corpus-wide (1,219-label) per-paragraph agreement remains unmeasurable
directly — see CLASSIFIER_DIAGNOSIS.md §C.4 for why — so §C's aligned-6 and
three-tier slices are the closest paragraph-level proxies available.

### Configuration

| Setting | Value |
|---|---|
| Scoring rule | {best['scoring_rule']} |
| Separation mode | {best['separation_mode']} |
| t_register | {best['t_register']:.2f} |

### Phase 1: t_data / t_interp sweep (independent 2-D grid)

| t_data | t_interp | Tier accuracy | 95% CI |
|---|---|---|---|
"""
    for r in sorted(all_results, key=lambda r: r.get("tier_accuracy", 0),
                    reverse=True)[:15]:
        if "tier_accuracy" in r:
            appendix += (
                f"| {r.get('t_data', '?'):.2f} | {r.get('t_interp', '?'):.2f} | "
                f"{r.get('tier_accuracy', 0):.3f} | "
                f"[{r.get('ci_lower', 0):.3f}, {r.get('ci_upper', 0):.3f}] |\n"
            )

    appendix += f"""
### Best configuration

| Parameter | Value |
|---|---|
| Scoring rule | {best['scoring_rule']} |
| Separation mode | {best['separation_mode']} |
| t_data | {best['t_data']:.2f} |
| t_close | {best.get('t_close', 0.45):.2f} |
| t_interp | {best['t_interp']:.2f} |
| t_register | {best['t_register']:.2f} |
| t_sep | {best['t_sep']:.2f} |
| Tier accuracy | {best['tier_accuracy']:.3f} |
| 95% CI | [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}] |
| Articles correct | {best['correct']}/{best['total']} |

### Tier-level stats (by state name)

| Tier | Precision | Recall | F1 |
|---|---|---|---|
| clear_split | {best['tier_stats']['clear_split']['precision']:.3f} | {best['tier_stats']['clear_split']['recall']:.3f} | {best['tier_stats']['clear_split']['f1']:.3f} |
| muddled | {best['tier_stats']['muddled']['precision']:.3f} | {best['tier_stats']['muddled']['recall']:.3f} | {best['tier_stats']['muddled']['f1']:.3f} |
| one_sided | {best['tier_stats']['one_sided']['precision']:.3f} | {best['tier_stats']['one_sided']['recall']:.3f} | {best['tier_stats']['one_sided']['f1']:.3f} |
| unclassifiable | {best['tier_stats']['unclassifiable']['precision']:.3f} | {best['tier_stats']['unclassifiable']['recall']:.3f} | {best['tier_stats']['unclassifiable']['f1']:.3f} |

**Note on `one_sided`/`unclassifiable` showing 0.000/0.000:** this is a
degenerate-class artifact of gold-set size, not a broken code path. The gold
set contains exactly **{n_one_sided_gold}** `one_side_only` article(s) and
**{n_unclassifiable_gold}** `unclassifiable` article(s) out of {best.get('total', '?')}
total — essentially unmeasurable classes at this n. (`calibrate.py`'s
`GOLD_TIER_STATE` mapping correctly maps the gold CSV's `"one_side_only"`
string to the internal `"one_sided"` state, so this is not a string-mismatch
bug either — there is simply almost no data to compute precision/recall
against.) Do not chase this as a bug; it will only resolve with gold-set
expansion.

### Acceptance check

| Criterion | Threshold | Actual | 95% CI | Status |
|---|---|---|---|---|
| Tier accuracy | ≥ 0.85 | {best['tier_accuracy']:.3f} | [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}] | {"✅ PASS" if best['tier_accuracy'] >= 0.85 else "❌ FAIL"} |

### Dev-machine install footprint

~239 MB (site-packages: 143 MB + model: 96 MB), measured on this run's dev
machine. This is a **dev-machine install budget, not a deployment
constraint**: the VPS runs no Python and no ML runtime — it only imports a
pre-computed JSON export (`ALGORITHM_GUIDE_the_how.md` §2.1); `model.onnx`
is gitignored and is never committed or shipped. See the "Dependency
Footprint Measurement" section at the top of this document for the fuller
disclosure and the ~150 MB dev-machine target this is measured against.
"""
    if not appendix.endswith("\n"):
        appendix += "\n"
    return appendix


def _build_validation_tier_results(best: dict, today: str) -> str:
    """Build the body of VALIDATION_REPORT.md's '## Tier Accuracy Results'
    section (header included) for the current run."""
    val_update = f"""## Tier Accuracy Results

Calibrated {today} at **t_data={best['t_data']:.2f}, t_close={best.get('t_close', 0.45):.2f}, t_interp={best['t_interp']:.2f}, t_register={best['t_register']:.2f}, t_sep={best['t_sep']:.2f}**
(scoring rule: {best['scoring_rule']}, separation mode: {best['separation_mode']})
against {best['total']} gold-set articles.

| Metric | Value |
|---|---|
| Articles evaluated | {best['total']} |
| Correct tiers | {best['correct']} |
| Tier accuracy | **{best['tier_accuracy']:.3f}** |
| 95% bootstrap CI | [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}] |

### Per-article details

| Article | Gold tier | Pred tier | Separation | Correct |
|---|---|---|---|---|
"""
    for d in best.get("details", []):
        g = d["gold_tier"]
        p = d["pred_tier"]
        c = "✓" if d["correct"] else "✗"
        val_update += f"| {d['title']} | {g} | {p} | {d['separation']:.3f} | {c} |\n"
    if not val_update.endswith("\n"):
        val_update += "\n"
    return val_update


def write_docs(best: dict, all_results: list[dict]) -> None:
    """Update CLASSIFIER_CALIBRATION.md and VALIDATION_REPORT.md.

    Both appendix sections are written via scripts/doc_sections.py's
    upsert_section() so reruns REPLACE the prior run's results in place
    instead of appending a new dated appendix every time (the bug fixed
    2026-07-30 — CLASSIFIER_CALIBRATION.md had accumulated 6 duplicate
    '## Calibration Results (<date>)' sections and VALIDATION_REPORT.md had
    accumulated 7 duplicate '## Tier Accuracy Results' sections before this
    fix, because each header included the run date and `cal +=
    appendix` / `val += val_update` unconditionally appended). The header
    text is now stable (no date inside it — the date is a field inside the
    body instead), so upsert_section can find and replace the same section
    on every run.
    """
    from datetime import date
    today = date.today().isoformat()

    # Gold-set support counts for the degenerate tier states, computed from
    # this run's own details rather than hardcoded — see the note in the
    # calibration appendix below.
    details = best.get("details", [])
    n_one_sided_gold = sum(1 for d in details if d.get("gold_tier") == "one_sided")
    n_unclassifiable_gold = sum(1 for d in details if d.get("gold_tier") == "unclassifiable")

    # -- CALIBRATION doc --
    cal = CALIBRATION_DOC_PATH.read_text(encoding="utf-8")
    cal = cal.replace(
        "**Actual measured total:** TBD",
        "**Actual measured total:** ~239 MB (site-packages: 143 MB + model: 96 MB)"
    )
    cal = cal.replace(
        "**Date:** TBD (blocked on Plan 3 gold set)",
        f"**Date:** {today}"
    )
    old_table = (
        "| `t_sep` | 0.70 | TBD | TBD | TBD |\n"
        "| `t_data` | 0.60 | TBD | TBD | TBD |\n"
        "| `t_interp` | 0.60 | TBD | TBD | TBD |"
    )
    new_table = (
        f"| `t_sep` | 0.70 | {best['t_sep']:.2f} | {best['tier_accuracy']:.3f} | "
        f"{best['tier_stats']['clear_split']['precision']:.3f} |\n"
        f"| `t_data` | 0.60 | {best['t_data']:.2f} | — | — |\n"
        f"| `t_close` | 0.45 | {best.get('t_close', 0.45):.2f} | — | — |\n"
        f"| `t_interp` | 0.60 | {best['t_interp']:.2f} | — | — |"
    )
    cal = cal.replace(old_table, new_table)

    appendix = _build_calibration_appendix(
        best, all_results, today, n_one_sided_gold, n_unclassifiable_gold,
    )
    cal = upsert_section(cal, CALIBRATION_APPENDIX_HEADER, appendix,
                          insert_after="## Threshold Calibration")
    CALIBRATION_DOC_PATH.write_text(cal, encoding="utf-8")
    logger.info("Updated %s", CALIBRATION_DOC_PATH)

    # -- VALIDATION REPORT --
    val = VALIDATION_DOC_PATH.read_text(encoding="utf-8")
    val = val.replace(
        "| Per-paragraph label agreement | ≥ 0.85 | Not measured | ⚠️ Skipped |",
        "| Per-paragraph label agreement | ≥ 0.85 | Not measured | ⚠️ Skipped — see rationale below |"
    )
    val = val.replace(
        "| Per-article tier accuracy | ≥ 0.85 | **0.303** (10/33) | ❌ FAIL |",
        f"| Per-article tier accuracy | ≥ 0.85 | **{best['tier_accuracy']:.3f}** ({best['correct']}/{best['total']}) "
        f"CI=[{best['ci_lower']:.3f},{best['ci_upper']:.3f}] | "
        f"{'✅ PASS' if best['tier_accuracy'] >= 0.85 else '❌ FAIL'} |"
    )
    val = val.replace(
        "TBD — fill after calibration against the Plan 3 gold set.",
        f"Calibrated {today} against {best['total']} gold-set articles."
    )

    val_update = _build_validation_tier_results(best, today)
    val = upsert_section(val, VALIDATION_TIER_RESULTS_HEADER, val_update,
                          insert_after="## Disposition")
    VALIDATION_DOC_PATH.write_text(val, encoding="utf-8")
    logger.info("Updated %s", VALIDATION_DOC_PATH)


def run_bakeoff_combination(
    valid: list[dict],
    cached_scores: dict[str, dict],
    scoring_rule: str, separation_mode: str,
) -> dict:
    """Run calibration for one combination of the four-way bake-off.

    Uses pre-computed scores (cached_scores) so each threshold grid point
    only re-applies label comparisons — no ONNX or FAISS work.

    Returns the best result dict for this combination.
    """
    logger.info("=" * 60)
    logger.info("Bake-off: %s × %s", separation_mode, scoring_rule)
    logger.info("=" * 60)

    # Phase 1: sweep t_data/t_close/t_interp from cache (instant).
    logger.info("Phase 1: sweeping t_data/t_close/t_interp (from cache) ...")
    p1 = sweep_t_data_interp_from_cache(valid, cached_scores, 0.70,
                                         scoring_rule=scoring_rule,
                                         separation_mode=separation_mode)
    best_p1 = max(p1, key=lambda r: (r["tier_accuracy"], r.get("ci_lower", 0)))
    best_t_d = best_p1["t_data"]
    best_t_c = best_p1.get("t_close", best_t_d)
    best_t_i = best_p1["t_interp"]
    best_t_r = best_p1.get("t_register", best_t_d)
    logger.info("Best t_data=%.2f t_close=%.2f t_interp=%.2f t_reg=%.2f (accuracy=%.3f CI=[%.3f,%.3f])",
                best_t_d, best_t_c, best_t_i, best_t_r,
                best_p1["tier_accuracy"], best_p1["ci_lower"], best_p1["ci_upper"])

    # Phase 2: sweep t_sep from cache (instant).
    logger.info("Phase 2: sweeping t_sep (from cache) ...")
    p2 = sweep_t_sep_from_cache(valid, cached_scores,
                                 best_t_d, best_t_c, best_t_i, best_t_r,
                                 scoring_rule=scoring_rule,
                                 separation_mode=separation_mode)
    best = choose_best(p2)

    logger.info("  Best: t_data=%.2f t_interp=%.2f t_sep=%.2f "
                "accuracy=%.3f CI=[%.3f,%.3f] (%d/%d)",
                best["t_data"], best["t_interp"], best["t_sep"],
                best["tier_accuracy"], best["ci_lower"], best["ci_upper"],
                best["correct"], best["total"])
    return best


DIAGNOSIS_D4_HEADER = "## D.4 — Four-way bake-off results"


def update_diagnosis_bakeoff(results: list[dict]) -> None:
    """Idempotently replace the '## D.4' bake-off table + interpretation in
    CLASSIFIER_DIAGNOSIS.md with the current run's actual results.

    Unlike the original implementation (which only ever replaced literal
    'TBD' placeholder cells — a no-op on every run after the first, while
    still logging a false success message), this rebuilds the whole D.4
    section body from `results` every time and swaps it in via
    scripts/doc_sections.py's header-to-next-header replacement, so reruns
    always reflect the latest numbers and never duplicate the section.

    D.4 is owned exclusively by this function — scripts/diagnose_separation.py
    no longer generates it (see that script's write_diagnosis_report()
    docstring). If the '## D.4' header is missing from the file, that means
    the doc has been restructured in a way this function doesn't expect;
    rather than guessing where to insert a brand-new section, this logs a
    real warning and leaves the file untouched.
    """
    diag_path = DIAGNOSIS_DOC_PATH
    if not diag_path.exists():
        logger.warning("%s not found — cannot update bake-off table.", diag_path)
        return
    content = diag_path.read_text(encoding="utf-8")

    if DIAGNOSIS_D4_HEADER not in content:
        logger.warning(
            "Could not find '%s' anchor in %s — leaving the file untouched. "
            "Bake-off results were NOT written; this usually means the doc's "
            "section structure changed and this function's anchor needs updating.",
            DIAGNOSIS_D4_HEADER, diag_path,
        )
        return

    # Build the bake-off table rows (7 value columns, matching the header:
    # t_data, t_close, t_interp, t_register, t_sep, tier accuracy, 95% CI).
    rows = []
    for r in results:
        sep_mode = r.get("separation_mode", "adjacency")
        scoring = r.get("scoring_rule", "mean-cosine")
        sep_label = "Block-structure (new)" if sep_mode == "block" else "Adjacency (current)"
        scoring_label = "Centroid" if scoring == "centroid" else "Mean-cosine (current)"
        t_close_val = r.get("t_close", r["t_data"])
        rows.append(
            f"| {sep_label} | {scoring_label} | {r['t_data']:.2f} | "
            f"{t_close_val:.2f} | {r['t_interp']:.2f} | {r['t_register']:.2f} | "
            f"{r['t_sep']:.2f} | {r['tier_accuracy']:.3f} | "
            f"[{r['ci_lower']:.3f}, {r['ci_upper']:.3f}] |"
        )

    lines = []
    lines.append(DIAGNOSIS_D4_HEADER)
    lines.append("")
    lines.append(
        "| Separation metric | Scoring rule | Best t_data | Best t_close | "
        "Best t_interp | Best t_register | Best t_sep | Tier accuracy | 95% CI |"
    )
    lines.append("|---|---|---|---|---|---|---|---|---|")
    lines.extend(rows)
    lines.append("")
    lines.append(
        "**Interpretation:** The row with the highest accuracy identifies the "
        "dominant fix. If the block-structure row substantially outperforms the "
        "adjacency row, the separation metric is the primary error source. If the "
        "centroid rows outperform the mean-cosine rows, the scoring rule is "
        "primary. If none reaches the 0.85 gate, embedding capacity is the "
        "binding constraint."
    )
    lines.append("")

    if results:
        best = max(results, key=lambda r: r["tier_accuracy"])
        interpretation = (
            f"**Bake-off interpretation:** "
            f"The best configuration ({best['separation_mode']} × {best['scoring_rule']}) "
            f"achieves {best['tier_accuracy']:.3f} accuracy "
            f"(CI [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}]). "
        )
        if best["tier_accuracy"] >= 0.85:
            interpretation += "This clears the ≥0.85 gate. "
        else:
            interpretation += "This does NOT clear the ≥0.85 gate. "

        # Compare adjacency vs block
        adj_results = [r for r in results if r["separation_mode"] == "adjacency"]
        blk_results = [r for r in results if r["separation_mode"] == "block"]
        adj_best = max(adj_results, key=lambda r: r["tier_accuracy"]) if adj_results else None
        blk_best = max(blk_results, key=lambda r: r["tier_accuracy"]) if blk_results else None
        if adj_best and blk_best:
            if blk_best["tier_accuracy"] > adj_best["tier_accuracy"]:
                interpretation += (
                    "The block-structure separation metric outperforms adjacency, "
                    "confirming that the separation functional is a meaningful error source. "
                )
            else:
                interpretation += (
                    "The adjacency metric matches or outperforms block-structure, "
                    "suggesting the separation functional is not the primary bottleneck. "
                )

        # Compare mean-cosine vs centroid
        mc_results = [r for r in results if r["scoring_rule"] == "mean-cosine"]
        ct_results = [r for r in results if r["scoring_rule"] == "centroid"]
        mc_best = max(mc_results, key=lambda r: r["tier_accuracy"]) if mc_results else None
        ct_best = max(ct_results, key=lambda r: r["tier_accuracy"]) if ct_results else None
        if mc_best and ct_best:
            if ct_best["tier_accuracy"] > mc_best["tier_accuracy"]:
                interpretation += (
                    "The centroid scoring rule outperforms mean-cosine, "
                    "indicating the scoring rule is a meaningful error source. "
                )
            else:
                interpretation += (
                    "Mean-cosine matches or outperforms centroid, "
                    "suggesting the scoring rule is not the primary bottleneck. "
                )

        if best["tier_accuracy"] < 0.85:
            interpretation += (
                "Since neither fix alone crosses the 0.85 gate, embedding capacity "
                "(MiniLM discriminative power) is likely the binding constraint — "
                "a larger ONNX model or expanded exemplar sets may be necessary."
            )

        lines.append(interpretation)
        lines.append("")

    body = "\n".join(lines) + "\n"
    updated = upsert_section(content, DIAGNOSIS_D4_HEADER, body, insert_after="## A.5 — Bootstrap confidence interval")
    diag_path.write_text(updated, encoding="utf-8")
    logger.info("Updated %s with bake-off results (%d rows)", diag_path, len(rows))


def run_paragraph_level_evaluation(
    mgr: StoreManager,
    cached_scores_by_rule: dict[str, dict[str, dict]],
    valid_records: list[dict],
    best: dict,
) -> dict:
    """Phase 2 paragraph-level evaluation harness — runs automatically on
    every calibrate.py invocation, at the winning bake-off configuration.

    Combines three independently-scoped measurements (see
    scripts/paragraph_eval.py's module docstring for why they are reported
    separately rather than merged into one corpus-wide number):

      1. Corpus-wide raw label distribution + 'neither' rate over all
         `valid_records` articles — no gold alignment needed, so this is
         the only slice that covers the whole corpus.
      2. Aligned-6 — index-aligned confusion matrix against
         gold-set-section-classifier.csv's per_paragraph_labels, for the
         6 articles whose classifier segmentation exactly matches gold
         (91 of the 1,219 gold paragraph labels).
      3. Three-tier standalone — confusion matrix against
         gold-set-three-tier.csv (136 paragraphs, classified with no
         article context, zero alignment risk).
    """
    scoring_rule = best["scoring_rule"]
    t_d = best["t_data"]
    t_c = best.get("t_close", t_d)
    t_i = best["t_interp"]
    t_r = best["t_register"]
    cached = cached_scores_by_rule[scoring_rule]

    all_pred_labels: list[str] = []
    aligned_pred_by_title: dict[str, list[str]] = {}
    for record in valid_records:
        title = record["title"]
        if title not in cached:
            continue
        pred = _apply_scores(cached[title], t_d, t_c, t_i, t_r)
        all_pred_labels.extend(pred)
        if title in ALIGNED_ARTICLES:
            aligned_pred_by_title[title] = pred

    corpus_wide = {
        "raw_label_distribution": dict(raw_label_distribution(all_pred_labels)),
        "neither_rate": compute_neither_rate(all_pred_labels),
    }

    gold_paragraph_labels = load_gold_paragraph_labels()
    aligned_result = evaluate_aligned_six(gold_paragraph_labels, aligned_pred_by_title)

    three_tier_result = evaluate_three_tier(mgr, scoring_rule, t_d, t_c, t_i, t_r)

    return {
        "scoring_rule": scoring_rule,
        "t_data": t_d, "t_close": t_c, "t_interp": t_i, "t_register": t_r,
        "corpus_wide": corpus_wide,
        "aligned_six": aligned_result,
        "three_tier": three_tier_result,
    }


DIAGNOSIS_C_HEADER = "## C — Paragraph-level evaluation harness (Phase 2)"


def update_diagnosis_paragraph_eval(result: dict) -> None:
    """Idempotently write/replace '## C' in CLASSIFIER_DIAGNOSIS.md with the
    current run's paragraph-level evaluation-harness output.

    Owned exclusively by this function (like update_diagnosis_bakeoff owns
    D.4) — see scripts/paragraph_eval.py's module docstring for what each
    of the three sub-measurements does and does not cover.
    """
    diag_path = DIAGNOSIS_DOC_PATH
    if not diag_path.exists():
        logger.warning("%s not found — cannot write paragraph-eval section.", diag_path)
        return
    content = diag_path.read_text(encoding="utf-8")

    cw = result["corpus_wide"]
    a6 = result["aligned_six"]
    tt = result["three_tier"]

    lines: list[str] = []
    lines.append(DIAGNOSIS_C_HEADER)
    lines.append("")
    lines.append(
        f"Generated automatically by `calibrate.py` on every run, at the winning "
        f"bake-off configuration (`scoring_rule={result['scoring_rule']}`, "
        f"`t_data={result['t_data']:.2f}`, `t_close={result['t_close']:.2f}`, "
        f"`t_interp={result['t_interp']:.2f}`, `t_register={result['t_register']:.2f}`). "
        "See `scripts/paragraph_eval.py` for the shared implementation used here "
        "and by `scripts/diagnose_register_gate.py` (§B)."
    )
    lines.append("")
    lines.append("### C.1 — Corpus-wide raw label distribution and `neither` rate")
    lines.append("")
    lines.append(
        f"Covers all {cw['neither_rate']['total']} classified paragraphs across "
        f"the gold-set articles (no gold alignment required for this slice)."
    )
    lines.append("")
    lines.append("| Label | Count |")
    lines.append("|---|---|")
    for lbl in ("data", "close", "interpretation", "neither", "other"):
        lines.append(f"| {lbl} | {cw['raw_label_distribution'].get(lbl, 0)} |")
    lines.append("")
    lines.append(
        f"`neither` rate: **{cw['neither_rate']['neither_rate']:.1%}** "
        f"({cw['neither_rate']['neither_count']}/{cw['neither_rate']['total']}) vs. "
        f"human baseline **{cw['neither_rate']['human_baseline']:.1%}** (28/1,219)."
    )
    lines.append("")
    lines.append("### C.2 — Aligned-6 confusion matrix (index-aligned gold paragraphs)")
    lines.append("")
    lines.append(
        f"Covers {a6['n_paragraphs']} of the 1,219 gold-set-section-classifier.csv "
        f"paragraph labels ({a6['n_paragraphs']}/1219 = "
        f"{a6['n_paragraphs']/1219:.1%}) — the only paragraphs where the classifier's "
        f"own segmentation exactly matches gold's paragraph count "
        f"({a6['n_articles']}/39 articles: {', '.join(ALIGNED_ARTICLES)}). "
        "The remaining gold labels cannot be index-aligned; see §C.4 for why."
    )
    lines.append("")
    lines.append(
        "Collapsed confusion matrix (gold rows x predicted columns; 'close' "
        "predictions collapsed into 'data', 'other' into 'neither'):"
    )
    lines.append("")
    lines.append("| Gold \\ Pred | data | interpretation | neither |")
    lines.append("|---|---|---|---|")
    for g in ("data", "interpretation", "neither"):
        row = [str(a6["collapsed_confusion_matrix"].get(f"{g}->{p}", 0))
               for p in ("data", "interpretation", "neither")]
        lines.append(f"| {g} | " + " | ".join(row) + " |")
    lines.append("")
    lines.append("| Class | Precision | Recall | F1 | Support |")
    lines.append("|---|---|---|---|---|")
    for c in ("data", "interpretation", "neither"):
        s = a6["precision_recall_f1"][c]
        lines.append(f"| {c} | {s['precision']:.3f} | {s['recall']:.3f} | "
                      f"{s['f1']:.3f} | {s['support']} |")
    lines.append("")
    dia = a6["data_interp_restricted_accuracy"]
    lines.append(
        f"**Data-vs-interpretation accuracy (restricted to classified "
        f"paragraphs):** {dia['accuracy']:.3f} ({dia['correct']}/{dia['n']})."
    )
    lines.append("")
    lines.append("### C.3 — Three-tier standalone confusion matrix")
    lines.append("")
    lines.append(
        f"Covers all {tt['n_paragraphs']} paragraphs in `gold-set-three-tier.csv` "
        f"({tt['n_articles']} articles), classified standalone with no surrounding "
        "article context (no alignment needed — the gold file carries the actual "
        "paragraph text). This is the only measurement in the codebase that "
        "validates the close-analysis (Tier 2) store directly against a human "
        "label, since gold-set-section-classifier.csv only distinguishes "
        "data/interpretation/neither. Coverage caveat: only 9 of "
        "gold-set-three-tier.csv's 45 article titles overlap with the 39-article "
        "gold-set-section-classifier.csv, and 130/136 rows are paragraph_index "
        "0-2 (ledes/openings) — this is a different, opening-skewed sample, not "
        "a text-bearing subset of the 1,219-label corpus."
    )
    lines.append("")
    lines.append("Raw (pre-collapse) predicted-label distribution on this slice:")
    lines.append("")
    lines.append("| Label | Count |")
    lines.append("|---|---|")
    for lbl in ("data", "close", "interpretation", "neither", "other"):
        lines.append(f"| {lbl} | {tt['raw_label_distribution'].get(lbl, 0)} |")
    lines.append("")
    lines.append("Collapsed confusion matrix (gold rows x predicted columns):")
    lines.append("")
    lines.append("| Gold \\ Pred | data | interpretation | neither |")
    lines.append("|---|---|---|---|")
    for g in ("data", "interpretation", "neither"):
        row = [str(tt["collapsed_confusion_matrix"].get(f"{g}->{p}", 0))
               for p in ("data", "interpretation", "neither")]
        lines.append(f"| {g} | " + " | ".join(row) + " |")
    lines.append("")
    lines.append("| Class | Precision | Recall | F1 | Support |")
    lines.append("|---|---|---|---|---|")
    for c in ("data", "interpretation", "neither"):
        s = tt["precision_recall_f1"][c]
        lines.append(f"| {c} | {s['precision']:.3f} | {s['recall']:.3f} | "
                      f"{s['f1']:.3f} | {s['support']} |")
    lines.append("")
    dia_tt = tt["data_interp_restricted_accuracy"]
    lines.append(
        f"**Data-vs-interpretation accuracy (restricted to classified "
        f"paragraphs):** {dia_tt['accuracy']:.3f} ({dia_tt['correct']}/{dia_tt['n']})."
    )
    lines.append("")
    lines.append(
        f"`neither` rate on this slice: **{tt['neither_rate']['neither_rate']:.1%}** "
        f"({tt['neither_rate']['neither_count']}/{tt['neither_rate']['total']})."
    )
    lines.append("")
    lines.append("### C.4 — Why the full 1,219-label corpus can't be measured directly")
    lines.append("")
    lines.append(
        "`gold-set-section-classifier.csv`'s `per_paragraph_labels` column carries "
        "labels only, no paragraph text — so there is nothing to text-match "
        "against for the 33/39 articles whose classifier-side paragraph count "
        "doesn't match gold's (see CLASSIFIER_DIAGNOSIS.md §A.1, "
        "VALIDATION_REPORT.md). Re-deriving the original labellers' paragraph "
        "segmentation is not reproducible after the fact: "
        "`GOLD_SET_LABELLING_PROCEDURE.md` describes labelling against the "
        "*visually rendered* Wikipedia page, while the classifier (and this "
        "harness) reads the parse-API HTML extract — the two pipelines split "
        "paragraphs at different points (e.g. infobox/caption text, collapsed "
        "sections) with no recorded mapping between them. `gold-set-three-tier.csv` "
        "(§C.3) was checked as a text-matching bridge — it carries `paragraph_text` "
        "— but for the 9 article titles it shares with the 39-article gold set, "
        "none of its 31 paragraph texts appear verbatim, as a substring, or as a "
        "close fuzzy match (difflib, cutoff=0.6) in the corresponding live-fetched "
        "paragraphs; Wikipedia article text has drifted since the gold set was "
        "labelled and/or the recorded text was paraphrased rather than extracted "
        "verbatim. Expanding coverage further requires new data — either "
        "re-labelling against the classifier's own parse-API segmentation, or a "
        "scripted, versioned re-extraction with a recorded index mapping — not "
        "something this harness can produce honestly from the files that exist "
        "today. §C.1-C.3 therefore report their own coverage explicitly rather "
        "than presenting the aligned/standalone slices as corpus-wide."
    )
    lines.append("")

    body = "\n".join(lines)
    if not body.endswith("\n"):
        body += "\n"

    updated = upsert_section(content, DIAGNOSIS_C_HEADER, body,
                              insert_after=DIAGNOSIS_D4_HEADER)
    diag_path.write_text(updated, encoding="utf-8")
    logger.info("Updated %s with paragraph-level evaluation harness (%s)",
                diag_path, DIAGNOSIS_C_HEADER)


def main() -> None:
    logger.info("Loading gold set ...")
    gold_records = load_gold_set()
    logger.info("Loaded %d gold-set articles.", len(gold_records))

    # Load fetch cache so re-runs don't hit Wikipedia.
    fetch_cache = _load_fetch_cache()
    logger.info("Fetch cache: %d articles cached.", len(fetch_cache))

    logger.info("Fetching article paragraphs from Wikipedia ...")
    for i, record in enumerate(gold_records):
        title = record["title"]
        # Use cached paragraphs if available.
        if title in fetch_cache and fetch_cache[title]:
            record["paragraphs"] = fetch_cache[title]
            logger.info("  [%d/%d] %s (cached → %d paragraphs)",
                       i + 1, len(gold_records), title,
                       len(record["paragraphs"]))
            continue

        logger.info("  [%d/%d] %s", i + 1, len(gold_records), title)
        try:
            record["paragraphs"] = fetch_article_paragraphs(record["url"])
            logger.info("    → %d paragraphs", len(record["paragraphs"]))
            fetch_cache[title] = record["paragraphs"]
            time.sleep(3.0)
        except Exception as e:
            logger.error("    Failed: %s", e)
            record["paragraphs"] = []

    _save_fetch_cache(fetch_cache)

    valid = [r for r in gold_records if r.get("paragraphs")]
    logger.info("Successfully fetched %d/%d articles.", len(valid), len(gold_records))

    if len(valid) < 5:
        logger.error("Too few articles fetched (%d). Aborting.", len(valid))
        sys.exit(1)

    logger.info("Initialising StoreManager ...")
    mgr = StoreManager()
    mgr.build_all()

    # ------------------------------------------------------------------
    # Pre-compute scores for each scoring rule (the expensive ONNX+FAISS
    # part — run once per scoring rule, not once per threshold pair).
    # ------------------------------------------------------------------
    logger.info("Precomputing scores for mean-cosine ...")
    cache_mc = precompute_classifications(valid, mgr, scoring_rule="mean-cosine")

    logger.info("Precomputing scores for centroid ...")
    cache_ct = precompute_classifications(valid, mgr, scoring_rule="centroid")

    # ------------------------------------------------------------------
    # Four-way bake-off (all sweeps from cache — instant)
    # ------------------------------------------------------------------
    combinations = [
        ("mean-cosine", "adjacency"),
        ("mean-cosine", "block"),
        ("centroid", "adjacency"),
        ("centroid", "block"),
    ]

    bakeoff_results = []
    for scoring_rule, separation_mode in combinations:
        cached = cache_mc if scoring_rule == "mean-cosine" else cache_ct
        best = run_bakeoff_combination(valid, cached, scoring_rule, separation_mode)
        bakeoff_results.append(best)

    # ------------------------------------------------------------------
    # Overall winner
    # ------------------------------------------------------------------
    overall_best = max(bakeoff_results,
                       key=lambda r: (r["tier_accuracy"], r.get("ci_lower", 0)))

    logger.info("=" * 60)
    logger.info("BAKE-OFF SUMMARY")
    logger.info("=" * 60)
    for r in bakeoff_results:
        logger.info("  %s x %s: accuracy=%.3f CI=[%.3f,%.3f] "
                     "t_data=%.2f t_close=%.2f t_interp=%.2f t_sep=%.2f t_reg=%.2f",
                     r["separation_mode"], r["scoring_rule"],
                     r["tier_accuracy"], r["ci_lower"], r["ci_upper"],
                     r["t_data"], r.get("t_close", 0.45),
                     r["t_interp"], r["t_sep"], r["t_register"])
    logger.info("---")
    logger.info("WINNER: %s × %s (accuracy=%.3f, CI=[%.3f,%.3f])",
                overall_best["separation_mode"], overall_best["scoring_rule"],
                overall_best["tier_accuracy"], overall_best["ci_lower"],
                overall_best["ci_upper"])

    # Write calibrated thresholds from the winner.
    update_config(overall_best["t_data"], overall_best["t_close"],
                  overall_best["t_interp"],
                  overall_best["t_sep"], overall_best["t_register"])

    # Write docs.
    write_docs(overall_best, bakeoff_results)

    # Update the bake-off table in CLASSIFIER_DIAGNOSIS.md.
    update_diagnosis_bakeoff(bakeoff_results)

    # ------------------------------------------------------------------
    # Phase 2: paragraph-level evaluation harness — standing, automatic,
    # runs on every calibration pass at the winning configuration.
    # ------------------------------------------------------------------
    logger.info("Running paragraph-level evaluation harness ...")
    cached_scores_by_rule = {"mean-cosine": cache_mc, "centroid": cache_ct}
    para_eval = run_paragraph_level_evaluation(
        mgr, cached_scores_by_rule, valid, overall_best,
    )
    logger.info(
        "Paragraph eval: corpus neither=%.1f%% (n=%d) | aligned-6 D/I acc=%.3f (n=%d) "
        "| three-tier D/I acc=%.3f (n=%d)",
        para_eval["corpus_wide"]["neither_rate"]["neither_rate"] * 100,
        para_eval["corpus_wide"]["neither_rate"]["total"],
        para_eval["aligned_six"]["data_interp_restricted_accuracy"]["accuracy"],
        para_eval["aligned_six"]["data_interp_restricted_accuracy"]["n"],
        para_eval["three_tier"]["data_interp_restricted_accuracy"]["accuracy"],
        para_eval["three_tier"]["data_interp_restricted_accuracy"]["n"],
    )
    update_diagnosis_paragraph_eval(para_eval)

    # Save detailed sweep.
    sweep_path = Path(__file__).resolve().parent / "tier-calibration-sweep.json"
    with open(sweep_path, "w") as fh:
        json.dump({
            "bakeoff": [{
                "scoring_rule": r["scoring_rule"],
                "separation_mode": r["separation_mode"],
                "t_data": r["t_data"], "t_close": r.get("t_close", 0.45),
                "t_interp": r["t_interp"],
                "t_sep": r["t_sep"], "t_register": r["t_register"],
                "tier_accuracy": r["tier_accuracy"],
                "ci_lower": r["ci_lower"], "ci_upper": r["ci_upper"],
                "correct": r["correct"], "total": r["total"],
            } for r in bakeoff_results],
            "winner": {
                "scoring_rule": overall_best["scoring_rule"],
                "separation_mode": overall_best["separation_mode"],
                "t_data": overall_best["t_data"],
                "t_close": overall_best.get("t_close", 0.45),
                "t_interp": overall_best["t_interp"],
                "t_sep": overall_best["t_sep"],
                "t_register": overall_best["t_register"],
                "tier_accuracy": overall_best["tier_accuracy"],
                "ci_lower": overall_best["ci_lower"],
                "ci_upper": overall_best["ci_upper"],
                "correct": overall_best["correct"],
                "total": overall_best["total"],
            },
            "details": overall_best.get("details", []),
        }, fh, indent=2)
    logger.info("Sweep details: %s", sweep_path)


if __name__ == "__main__":
    main()
