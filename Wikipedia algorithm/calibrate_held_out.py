#!/usr/bin/env python3
"""Held-out validation of the section classifier against the LLM-labelled corpus.

`calibrate.py`'s `choose_best()` picks the highest in-sample tier accuracy over
all 33-39 hand-labelled gold-set articles with no held-out split — an
optimistic, statistically underpowered estimate (Issue #155). This script
wires up the already-written `calibrate_with_held_out()` against the
270-article LLM-labelled corpus (`labels-corpus.json`) to report an honest
out-of-sample accuracy instead, without hand-labelling a single new article.

Usage:
    python3 calibrate_held_out.py
"""

import json
import logging
import sys
from pathlib import Path

from calibrate import (
    DIAGNOSIS_DOC_PATH,
    TIER_CONTRIBUTION,
    StoreManager,
    _load_fetch_cache,
    bootstrap_ci,
    calibrate_with_held_out,
    precompute_classifications,
)
from classifier.llm_labels import load_llm_corpus
from classifier.scorer import score_article
from scripts.doc_sections import upsert_section

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("calibrate-held-out")

RESULT_PATH = Path(__file__).resolve().parent / "held-out-calibration-result.json"

# Reuse the current winning scoring_rule/separation_mode combo (see
# CLASSIFIER_DIAGNOSIS.md §D.4 and classifier/config.py) rather than
# re-running the four-way bake-off — re-litigating which combo wins is out
# of scope for a held-out validation run.
SCORING_RULE = "centroid"
SEPARATION_MODE = "adjacency"

# Mirrors calibrate_with_held_out()'s own "< 20 articles" skip contract.
MIN_LABELLED_ARTICLES = 20

DIAGNOSIS_D5_HEADER = "## D.5 — Held-out validation (LLM-labelled corpus)"
DIAGNOSIS_A4_ANCHOR = (
    "the reported tier accuracy (see §D.4) is an in-sample optimum, and the "
    "true out-of-sample accuracy could be lower."
)
DIAGNOSIS_A4_POINTER = " See §D.5 for the honest out-of-sample estimate against the LLM-labelled corpus."


def build_held_out_records(
    llm_labels: dict[str, list[str]],
    fetch_cache: dict[str, list[str]],
) -> list[dict]:
    """Build held-out records with gold tiers derived from LLM labels.

    Excludes any title present in `llm_labels` but absent from `fetch_cache`
    rather than crashing — `load_llm_corpus()` already filters most of these,
    but this guards against future callers passing an unfiltered dict.
    """
    records: list[dict] = []
    for title, labels in llm_labels.items():
        if title not in fetch_cache:
            continue
        scored = score_article(labels)
        records.append({
            "title": title,
            "paragraphs": fetch_cache[title],
            "gold_tier_state": scored["tier_state"],
            "gold_tier_contribution": TIER_CONTRIBUTION[scored["tier_state"]],
        })
    return records


def _build_diagnosis_section(result: dict, ci_lower: float, ci_upper: float) -> str:
    """Build the body of CLASSIFIER_DIAGNOSIS.md's '## D.5' section (header
    included) for the current held-out run. Pure string-building —
    update_diagnosis_held_out() is responsible for actually writing it."""
    best = result["best_config"]
    body = f"""{DIAGNOSIS_D5_HEADER}

Validates `calibrate.py`'s `calibrate_with_held_out()` against the
270-article LLM-labelled corpus (`labels-corpus.json`), replacing §D.4's
in-sample-only estimate with an honest 70/30 train/test split (seed=42).
Thresholds are swept on the train split only; the reported test accuracy
below is measured on articles the sweep never saw.

| Setting | Value |
|---|---|
| Scoring rule | {result['scoring_rule']} |
| Separation mode | {result['separation_mode']} |
| Train articles | {result['train_n']} |
| Test articles | {result['test_n']} |

| Metric | Value |
|---|---|
| Train accuracy (in-sample, train split) | {result['train_accuracy']:.3f} |
| Test accuracy (held-out) | {result['test_accuracy']:.3f} |
| Train − test gap | {result['train_test_gap']:.3f} |
| Test accuracy 95% CI (bootstrap) | [{ci_lower:.3f}, {ci_upper:.3f}] |

### Best train-split configuration

| Parameter | Value |
|---|---|
| t_data | {best['t_data']:.2f} |
| t_close | {best['t_close']:.2f} |
| t_interp | {best['t_interp']:.2f} |
| t_sep | {best['t_sep']:.2f} |
| t_register | {best['t_register']:.2f} |

**Interpretation:** the train-test gap measures overfitting to the threshold
sweep; a large gap means the in-sample bake-off numbers in §D.4 overstate
true accuracy. This run's `best_config` is **not** applied to
`classifier/config.py` — promoting held-out-derived thresholds to production
is a separate decision requiring its own re-verification against the
existing bake-off, not an automatic side effect of adding this validation
report.
"""
    if not body.endswith("\n"):
        body += "\n"
    if not body.endswith("\n\n"):
        body += "\n"
    return body


def update_diagnosis_held_out(result: dict, ci_lower: float, ci_upper: float) -> None:
    """Idempotently write/replace '## D.5' in CLASSIFIER_DIAGNOSIS.md
    (immediately after '## D.4') and extend §A.4's closing sentence to
    point at it, mirroring calibrate.py's update_diagnosis_bakeoff()."""
    diag_path = DIAGNOSIS_DOC_PATH
    if not diag_path.exists():
        logger.warning("%s not found — cannot write §D.5.", diag_path)
        return

    with open(diag_path, "r", encoding="utf-8") as fh:
        content = fh.read()

    body = _build_diagnosis_section(result, ci_lower, ci_upper)
    content = upsert_section(
        content, DIAGNOSIS_D5_HEADER, body,
        insert_after="## D.4 — Four-way bake-off results",
    )

    if DIAGNOSIS_A4_ANCHOR in content and DIAGNOSIS_A4_POINTER not in content:
        content = content.replace(
            DIAGNOSIS_A4_ANCHOR, DIAGNOSIS_A4_ANCHOR + DIAGNOSIS_A4_POINTER,
        )
    elif DIAGNOSIS_A4_ANCHOR not in content:
        logger.warning(
            "Could not find §A.4's closing sentence anchor in %s — leaving "
            "it untouched. This usually means the doc's wording changed and "
            "this anchor needs updating.",
            diag_path,
        )

    with open(diag_path, "w", encoding="utf-8") as fh:
        fh.write(content)
    logger.info("Updated %s with §D.5 held-out results", diag_path)


def main() -> None:
    logger.info("Loading LLM-labelled corpus ...")
    llm_labels = load_llm_corpus()
    if len(llm_labels) < MIN_LABELLED_ARTICLES:
        logger.error(
            "Only %d LLM-labelled articles available (need >= %d). "
            "Aborting rather than reporting a misleading number.",
            len(llm_labels), MIN_LABELLED_ARTICLES,
        )
        sys.exit(1)

    fetch_cache = _load_fetch_cache()
    records = build_held_out_records(llm_labels, fetch_cache)
    if len(records) < MIN_LABELLED_ARTICLES:
        logger.error(
            "Only %d LLM-labelled articles found in the fetch cache (need "
            ">= %d). Aborting rather than reporting a misleading number.",
            len(records), MIN_LABELLED_ARTICLES,
        )
        sys.exit(1)

    logger.info(
        "%d held-out records built (%d LLM-labelled articles, %d excluded "
        "for missing fetch-cache entries).",
        len(records), len(llm_labels), len(llm_labels) - len(records),
    )

    logger.info("Initialising StoreManager ...")
    mgr = StoreManager()
    mgr.build_all()

    logger.info("Precomputing %s scores ...", SCORING_RULE)
    cached_scores = precompute_classifications(records, mgr, scoring_rule=SCORING_RULE)

    result = calibrate_with_held_out(
        records, cached_scores, llm_labels,
        scoring_rule=SCORING_RULE, separation_mode=SEPARATION_MODE,
    )

    if result["status"] != "complete":
        logger.error(
            "Held-out calibration did not complete: %s", result.get("reason"),
        )
        sys.exit(1)

    test_details = result["test_details"]
    total = len(test_details)
    correct = sum(1 for d in test_details if d["correct"])
    ci_lower, ci_upper = bootstrap_ci(correct, total)

    logger.info(
        "Held-out: train_acc=%.3f test_acc=%.3f (%d/%d) gap=%.3f "
        "test_CI=[%.3f,%.3f]",
        result["train_accuracy"], result["test_accuracy"], correct, total,
        result["train_test_gap"], ci_lower, ci_upper,
    )

    output = {**result, "test_correct": correct, "test_total": total,
              "test_ci_lower": ci_lower, "test_ci_upper": ci_upper}
    with open(RESULT_PATH, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2)
    logger.info("Wrote %s", RESULT_PATH)

    update_diagnosis_held_out(result, ci_lower, ci_upper)


if __name__ == "__main__":
    main()
