"""Candidate gate metrics for the paragraph head (issue #231).

Called by train_agreement_head.py, which scores tier-state predictions against
tier-state targets. The gate is Cohen's kappa plus a floor on minority recall
(minority = every article whose target state is not clear_split). The pass
value and the floor are not set here; they are Luke's decision.

kappa and accuracy come from jev_pilot_report.py, so one definition of kappa
serves the labeller comparison and the gate.
"""

import numpy as np

from scripts.jev_pilot_report import accuracy, cohen_kappa

BOOTSTRAP_RESAMPLES = 2000
BOOTSTRAP_SEED = 42
MAJORITY_STATE = "clear_split"


def macro_f1(gold: list[str], predicted: list[str]) -> float:
    """Mean F1 over the labels that occur in `gold`. A label never predicted scores 0."""
    scores = []
    for label in sorted(set(gold)):
        hits = sum(g == label == p for g, p in zip(gold, predicted))
        precision = hits / max(predicted.count(label), 1)
        recall = hits / gold.count(label)
        scores.append(0.0 if hits == 0 else 2 * precision * recall / (precision + recall))
    return float(np.mean(scores))


def per_label_recall(gold: list[str], predicted: list[str]) -> dict[str, float]:
    """Recall of each label that occurs in `gold`."""
    return {
        label: round(sum(g == label == p for g, p in zip(gold, predicted)) / gold.count(label), 4)
        for label in sorted(set(gold))
    }


def bootstrap_interval(metric, gold: list[str], predicted: list[str]) -> tuple[float, float]:
    """95% bootstrap interval of metric(gold, predicted), resampling articles."""
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    n = len(gold)
    values = []
    for _ in range(BOOTSTRAP_RESAMPLES):
        pick = rng.integers(0, n, n)
        values.append(metric([gold[i] for i in pick], [predicted[i] for i in pick]))
    return round(float(np.percentile(values, 2.5)), 4), round(float(np.percentile(values, 97.5)), 4)


def minority_recall(gold: list[str], predicted: list[str]) -> float:
    """Recall over the articles whose gold state is not clear_split. 0.0 when there are none."""
    minority = [(g, p) for g, p in zip(gold, predicted) if g != MAJORITY_STATE]
    if not minority:
        return 0.0
    return sum(g == p for g, p in minority) / len(minority)


def gate_candidates(gold: list[str], predicted: list[str]) -> dict:
    """Candidate gate metrics for one set of tier-state predictions.

    "minority_recall" is the recall over articles whose gold state is not
    clear_split: the articles where a wrong state matters most. Its interval
    resamples articles, so it is wide when the minority is small.
    """
    return {
        "articles": len(gold),
        "tier_accuracy": round(accuracy(predicted, gold), 4),
        "macro_f1": round(macro_f1(gold, predicted), 4),
        "macro_f1_ci": bootstrap_interval(macro_f1, gold, predicted),
        "kappa": round(cohen_kappa(predicted, gold), 4),
        "kappa_ci": bootstrap_interval(lambda g, p: cohen_kappa(p, g), gold, predicted),
        "recall_by_state": per_label_recall(gold, predicted),
        "minority_recall": round(minority_recall(gold, predicted), 4),
        "minority_recall_ci": bootstrap_interval(minority_recall, gold, predicted),
    }
