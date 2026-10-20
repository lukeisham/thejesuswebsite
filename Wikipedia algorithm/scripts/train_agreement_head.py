"""Train the two-class paragraph head on Jev labels and score it for the gate (issue #231).

Run from the "Wikipedia algorithm" directory, with the classifier venv (it has
numpy and onnxruntime):

    ../.venv-classifier/bin/python scripts/train_agreement_head.py \\
        --jev-labels /path/to/jev-corpus.json --label-rule jev

--jev-labels is the output of `jev_pilot_label.py --engine jev --source corpus`.
Jev labels every paragraph of the fetch cache, so they define the target of the
evaluation: an article's target is the tier state of its Jev labels.
--label-rule picks which paragraphs train the head:
  jev        Jev's label wherever Jev is confident (default).
  agreement  Jev and DeepSeek give the same label and Jev is confident.
  deepseek   Every DeepSeek label: a control for the labeller.
--deepseek-labels points at a labels-corpus.json other than the one beside this
script. The DeepSeek labels came from the old rubric and the agreement and
deepseek rules fold their "close" labels into data.

Steps:
  1. Embed every article of the fetch cache and take its target from the Jev labels.
  2. Split: choose the head settings by cross-validation on the train split, fit
     once, and score the test split. Settings maximise the kappa of the tier
     states (D-036), not their accuracy.
  3. Pool: cross-validate over all articles, choose the settings by pooled kappa,
     and score every article with a head that never saw it.
  4. Score the old head (classifier/paragraph-head.json), and an
     always-clear_split rule, on the same articles.
  5. Score each head on the human gold paragraphs (gold-set-three-tier.csv).

Writes paragraph-head-twoclass-<rule>.json (weights) and
paragraph-head-twoclass-<rule>-result.json. It does not touch
classifier/paragraph-head.json, which is the head that scoring_rule="head"
loads, and it does not write CLASSIFIER_DIAGNOSIS.md. The pooled kappa is the
best of the grid, so it is a little optimistic; the interval does not include
the choice of settings.
"""

import argparse
import json
import logging
import sys
from collections import Counter, defaultdict
from dataclasses import replace
from pathlib import Path

import numpy as np

ALGO_DIR = Path(__file__).resolve().parents[1]
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from calibrate import (  # noqa: E402
    StoreManager,
    _title_split_fraction,
)
from classifier import llm_labels  # noqa: E402
from classifier.config import LABEL_INTERPRETATION, LABEL_OTHER  # noqa: E402
from classifier.llm_labels import load_llm_corpus  # noqa: E402
from classifier.paragraph_head import (  # noqa: E402
    ParagraphHead,
    load_paragraph_head,
)
from classifier.scorer import score_article  # noqa: E402
from scripts.gate_metrics import (  # noqa: E402
    gate_candidates,
    macro_f1,
    per_label_recall,
)
from scripts.head_training import assign_folds  # noqa: E402
from scripts.jev_pilot_report import accuracy, cohen_kappa  # noqa: E402
from scripts.paragraph_eval import load_three_tier_gold  # noqa: E402
from scripts.train_paragraph_head import (  # noqa: E402
    CLASSES,
    CV_SEED,
    SPLIT_SEED,
    TRAIN_FRACTION,
    Article,
    build_articles,
    choose_config,
    confusion_counts,
    cross_validate,
    fit_head,
    fold_numbers,
    out_of_fold_heads,
    paragraph_metrics,
    predict_article_labels,
    predicted_states,
    tier_accuracy,
    two_class,
)

logger = logging.getLogger("train-agreement-head")

LABEL_RULES = ("jev", "agreement", "deepseek")
# Jev calls at 0.95 or higher were 98.8% right on the human gold; 0.8 keeps
# most agreed paragraphs and drops the coin-flip calls.
MIN_JEV_CONFIDENCE = 0.8
TOP_CONFIGS_SHOWN = 5


def load_jev_records(path: Path) -> dict[tuple[str, int], dict]:
    """Read the Jev corpus output into {(title, paragraph index): record}."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {(r["article_title"], r["paragraph_index"]): r for r in payload["records"]}


def group_jev_labels(jev: dict[tuple[str, int], dict]) -> dict[str, list[str]]:
    """Every Jev label of each article, in paragraph order.

    Raises:
        ValueError: If an article's paragraph indexes have a gap.
    """
    by_title: dict[str, dict[int, str]] = defaultdict(dict)
    for (title, index), record in jev.items():
        by_title[title][index] = record["label"]
    grouped = {}
    for title, labels in by_title.items():
        if sorted(labels) != list(range(len(labels))):
            raise ValueError(f"Jev labels of {title!r} skip a paragraph index.")
        grouped[title] = [labels[i] for i in range(len(labels))]
    return grouped


def agreed_labels(
    title: str, deepseek_labels: list[str], jev: dict[tuple[str, int], dict],
) -> list[str]:
    """DeepSeek's label where Jev agrees with confidence, else LABEL_OTHER.

    LABEL_OTHER is outside CLASSES, so training_rows() skips those paragraphs.
    A DeepSeek "close" counts as data when it is compared with Jev's label.
    """
    labels = []
    for index, deepseek_label in enumerate(deepseek_labels):
        record = jev.get((title, index))
        if record is None:
            raise ValueError(f"No Jev label for {title!r} paragraph {index}.")
        deepseek_label = two_class(deepseek_label)
        agrees = record["label"] == deepseek_label
        confident = (record.get("confidence") or 0.0) >= MIN_JEV_CONFIDENCE
        labels.append(deepseek_label if agrees and confident else LABEL_OTHER)
    return labels


def confident_jev_labels(
    title: str, n_paragraphs: int, jev: dict[tuple[str, int], dict],
) -> list[str]:
    """Jev's label where its confidence is high enough, else LABEL_OTHER."""
    labels = []
    for index in range(n_paragraphs):
        record = jev.get((title, index))
        if record is None:
            raise ValueError(f"No Jev label for {title!r} paragraph {index}.")
        confident = (record.get("confidence") or 0.0) >= MIN_JEV_CONFIDENCE
        labels.append(record["label"] if confident else LABEL_OTHER)
    return labels


def training_labels(
    title: str, deepseek_labels: list[str], jev: dict[tuple[str, int], dict], rule: str,
) -> list[str]:
    """Labels that train the head for one article under `rule`; LABEL_OTHER means skip."""
    match rule:
        case "agreement":
            return agreed_labels(title, deepseek_labels, jev)
        case "jev":
            return confident_jev_labels(title, len(deepseek_labels), jev)
        case "deepseek":
            return [two_class(label) for label in deepseek_labels]
        case _:
            raise ValueError(f"Unknown label rule {rule!r}; use one of {LABEL_RULES}.")


def agreement_stats(jev: dict[tuple[str, int], dict]) -> dict:
    """Count how often the two engines agree over the DeepSeek-labelled paragraphs.

    An article whose DeepSeek label count differs from its Jev label count has
    no position-for-position join, so it is counted apart and left out of the rest.
    """
    jev_counts = Counter(title for title, _ in jev)
    paragraphs = same = kept = 0
    mix: Counter = Counter()
    articles_kept = unjoinable = 0
    for title, deepseek_labels in load_llm_corpus().items():
        if jev_counts[title] != len(deepseek_labels):
            unjoinable += 1
            continue
        labels = agreed_labels(title, deepseek_labels, jev)
        paragraphs += len(labels)
        same += sum(
            jev[(title, i)]["label"] == two_class(d) for i, d in enumerate(deepseek_labels))
        survivors = [label for label in labels if label != LABEL_OTHER]
        kept += len(survivors)
        mix.update(survivors)
        articles_kept += bool(survivors)
    return {
        "deepseek_paragraphs": paragraphs,
        "unjoinable_articles": unjoinable,
        "same_label": same,
        "kept": kept,
        "articles_with_kept": articles_kept,
        "kept_mix": dict(mix),
    }


def training_articles(
    articles: list[Article],
    jev: dict[tuple[str, int], dict],
    deepseek: dict[str, list[str]],
    rule: str,
) -> list[Article]:
    """Copies of the articles whose llm_labels are the ones `rule` trains on.

    gold_state stays the Jev tier state, so cross-validation and the test
    split share one target. Under the agreement and deepseek rules an article
    whose DeepSeek labels do not match its paragraphs by position cannot train.
    """
    prepared = []
    for a in articles:
        if rule == "jev":
            labels = confident_jev_labels(a.title, len(a.llm_labels), jev)
        elif len(deepseek.get(a.title, [])) == len(a.positional):
            labels = training_labels(a.title, deepseek[a.title], jev, rule)
        else:
            prepared.append(replace(a, aligned=False))
            continue
        prepared.append(replace(a, llm_labels=labels))
    return prepared


def tier_states(head: ParagraphHead, articles: list[Article], t_sep: float) -> list[str]:
    """Tier state of each article when `head` labels its paragraphs."""
    return predicted_states(
        articles, {a.title: predict_article_labels(head, a) for a in articles}, t_sep)


def out_of_fold_states(
    articles: list[Article], heads: list[ParagraphHead], t_sep: float,
) -> list[str]:
    """Tier state of each article from the fold head that never saw it."""
    folds = fold_numbers(articles)
    predicted = {a.title: predict_article_labels(heads[f], a) for a, f in zip(articles, folds)}
    return predicted_states(articles, predicted, t_sep)


def human_gold_score(predicted: list[str], human: list[str]) -> dict:
    """Accuracy, kappa and recall of paragraph labels against the human gold."""
    return {
        "accuracy": round(accuracy(predicted, human), 4),
        "kappa": round(cohen_kappa(predicted, human), 4),
        "macro_f1": round(macro_f1(human, predicted), 4),
        "recall": per_label_recall(human, predicted),
        "predicted_mix": dict(Counter(predicted)),
    }


def score_on_human_gold(
    store_manager: StoreManager,
    split_head: ParagraphHead,
    fold_heads: list[ParagraphHead],
    old_head: ParagraphHead,
) -> dict:
    """Score the heads on the human-labelled gold paragraphs.

    "split_head" was fitted on the train split, so gold paragraphs of train
    articles were seen in training with Jev labels (never the human's); its
    score is also given for test-split articles alone. "pooled_out_of_fold"
    predicts each paragraph with the fold head that never saw its article.
    "old_head" was trained on the train split, on DeepSeek labels.
    """
    rows = load_three_tier_gold()
    human = [r["gold_label"] for r in rows]
    embeddings = store_manager.embedder.embed_batch([r["text"] for r in rows])
    in_test = [
        _title_split_fraction(r["article_title"], SPLIT_SEED) >= TRAIN_FRACTION for r in rows
    ]
    pooled_fold = assign_folds(
        [_title_split_fraction(r["article_title"], CV_SEED) for r in rows], len(fold_heads))
    pooled = [
        fold_heads[f].predict_labels(embeddings[i:i + 1])[0] for i, f in enumerate(pooled_fold)
    ]
    predictions = {
        "split_head": split_head.predict_labels(embeddings),
        "pooled_out_of_fold": pooled,
        "old_head": [two_class(p) for p in old_head.predict_labels(embeddings)],
        "always_data": ["data"] * len(rows),
    }
    results = {
        "paragraphs": len(rows),
        "paragraphs_in_test_articles": sum(in_test),
        "human_mix": dict(Counter(human)),
    }
    for name, predicted in predictions.items():
        results[name] = human_gold_score(predicted, human)
    test_pairs = [(h, p) for h, p, t in zip(human, predictions["split_head"], in_test) if t]
    results["split_head"]["accuracy_test_articles"] = round(
        accuracy([p for _, p in test_pairs], [h for h, _ in test_pairs]), 4)
    return results


def top_configs(cv_rows: list[dict]) -> list[dict]:
    """The best settings by pooled kappa, with the rows' tier accuracy beside it."""
    ranked = sorted(
        cv_rows, key=lambda r: (-r["cv_kappa"], r["interp_offset"], r["t_sep"]))
    return ranked[:TOP_CONFIGS_SHOWN]


def write_weights(head: ParagraphHead, chosen: dict, result: dict, path: Path) -> None:
    payload = {
        "classes": list(head.classes),
        "coef": np.round(head.coef, 6).tolist(),
        "intercept": np.round(head.intercept, 6).tolist(),
        "provenance": {
            "label_rule": result["label_rule"],
            "min_jev_confidence": MIN_JEV_CONFIDENCE,
            "split": f"title hash, seed={SPLIT_SEED}, train fraction={TRAIN_FRACTION}",
            "train_articles": result["train_n"],
            "train_paragraphs": result["train_paragraphs"],
            "c": chosen["c"],
            "class_weight": chosen["class_weight"],
            "interp_offset": chosen["interp_offset"],
            "t_sep": chosen["t_sep"],
            "test_kappa": result["split"]["new_head"]["kappa"],
        },
    }
    path.write_text(json.dumps(payload, indent=1), encoding="utf-8")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--jev-labels", type=Path, required=True)
    parser.add_argument("--deepseek-labels", type=Path)
    parser.add_argument("--label-rule", choices=LABEL_RULES, default="jev")
    args = parser.parse_args()
    weights_path = ALGO_DIR / f"paragraph-head-twoclass-{args.label_rule}.json"
    result_path = ALGO_DIR / f"paragraph-head-twoclass-{args.label_rule}-result.json"
    if args.deepseek_labels:
        # load_llm_corpus() is called with no path in agreement_stats() and below,
        # and it reads this module global when it runs.
        llm_labels.DEFAULT_CORPUS_PATH = args.deepseek_labels

    jev = load_jev_records(args.jev_labels)
    deepseek = load_llm_corpus()
    stats = agreement_stats(jev)
    logger.info("Agreement with DeepSeek: %s", stats)

    store_manager = StoreManager()
    articles, _ = build_articles(store_manager, group_jev_labels(jev))
    train = [a for a in articles if _title_split_fraction(a.title, SPLIT_SEED) < TRAIN_FRACTION]
    test = [a for a in articles if _title_split_fraction(a.title, SPLIT_SEED) >= TRAIN_FRACTION]
    logger.info("Split: %d train, %d test articles (%d in all).",
                len(train), len(test), len(articles))

    old_head = load_paragraph_head()
    old_t_sep = json.loads(
        (ALGO_DIR / "paragraph-head-result.json").read_text(encoding="utf-8"))["chosen"]["t_sep"]

    # Split evaluation: settings from the train split only, one test measurement.
    fit_train = training_articles(train, jev, deepseek, args.label_rule)
    train_paragraphs = sum(
        label in CLASSES for a in fit_train if a.aligned for label in a.llm_labels)
    chosen = choose_config(cross_validate(fit_train))
    logger.info("Split-chosen settings: %s", chosen)
    split_head = fit_head(fit_train, chosen["c"], chosen["class_weight"]).with_intercept_shift(
        LABEL_INTERPRETATION, chosen["interp_offset"])
    test_pred = {a.title: predict_article_labels(split_head, a) for a in test}
    test_gold = [a.gold_state for a in test]
    split = {
        "new_head": gate_candidates(test_gold, tier_states(split_head, test, chosen["t_sep"])),
        "old_head": gate_candidates(test_gold, tier_states(old_head, test, old_t_sep)),
        "always_clear_split": gate_candidates(test_gold, ["clear_split"] * len(test)),
        "gold_state_mix": dict(Counter(test_gold)),
        "confusion_new_head": confusion_counts(test, test_pred, chosen["t_sep"]),
        "paragraph_metrics_new_head": paragraph_metrics(split_head, test),
        "paragraph_metrics_old_head": paragraph_metrics(old_head, test),
    }

    # Pooled evaluation: every article scored by a head that never saw it.
    fit_all = training_articles(articles, jev, deepseek, args.label_rule)
    pooled_rows = cross_validate(fit_all)
    pooled_chosen = choose_config(pooled_rows)
    logger.info("Pooled-chosen settings: %s", pooled_chosen)
    fold_heads = out_of_fold_heads(
        fit_all, pooled_chosen["c"], pooled_chosen["class_weight"], pooled_chosen["interp_offset"])
    all_gold = [a.gold_state for a in articles]
    pooled = {
        "new_head": gate_candidates(
            all_gold, out_of_fold_states(articles, fold_heads, pooled_chosen["t_sep"])),
        "old_head": gate_candidates(all_gold, tier_states(old_head, articles, old_t_sep)),
        "always_clear_split": gate_candidates(all_gold, ["clear_split"] * len(articles)),
        "gold_state_mix": dict(Counter(all_gold)),
        "top_configs": top_configs(pooled_rows),
    }

    result = {
        "label_rule": args.label_rule,
        "min_jev_confidence": MIN_JEV_CONFIDENCE,
        "agreement": stats,
        "train_n": len(train),
        "test_n": len(test),
        "train_paragraphs": train_paragraphs,
        "chosen": chosen,
        "pooled_chosen": pooled_chosen,
        "old_head_t_sep": old_t_sep,
        "split": split,
        "pooled": pooled,
        "human_gold": score_on_human_gold(store_manager, split_head, fold_heads, old_head),
        "test_tier_accuracy_new_head": round(tier_accuracy(
            test, test_pred, chosen["t_sep"]), 4),
    }
    write_weights(split_head, chosen, result, weights_path)
    result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    logger.info("Split kappa: new %.3f  old %.3f", split["new_head"]["kappa"],
                split["old_head"]["kappa"])
    logger.info("Pooled kappa: new %.3f  old %.3f", pooled["new_head"]["kappa"],
                pooled["old_head"]["kappa"])
    logger.info("Wrote %s and %s", weights_path, result_path)


if __name__ == "__main__":
    main()
