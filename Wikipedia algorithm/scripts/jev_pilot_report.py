#!/usr/bin/env python3
"""Compare Jev, DeepSeek and the human tiers on the hand-labelled gold paragraphs.

Reads the two files that jev_pilot_label.py wrote. Prints accuracy against the
human labels, Cohen's kappa for each pair (kappa corrects for the larger share of
"data" that makes raw accuracy weak), a confusion matrix against the human
labels, and Jev's accuracy by confidence band.

Usage:
    python3 scripts/jev_pilot_report.py --jev jev.json --deepseek deepseek.json
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ALGO_DIR = Path(__file__).resolve().parent.parent
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from scripts.paragraph_eval import load_three_tier_gold

LABELS = ("data", "interpretation")
# Upper edges of the Jev confidence bands; the last band runs to 1.0.
CONFIDENCE_EDGES = (0.6, 0.8, 0.95)


def accuracy(first: list[str], second: list[str]) -> float:
    return sum(a == b for a, b in zip(first, second)) / len(first)


def cohen_kappa(first: list[str], second: list[str]) -> float:
    """Agreement beyond chance. 1 is perfect, 0 is what chance gives, below 0 is worse.

    Works for any label set, so train_agreement_head.py also uses it on tier states.
    """
    n = len(first)
    observed = accuracy(first, second)
    counts_a, counts_b = Counter(first), Counter(second)
    expected = sum(counts_a[label] * counts_b[label] for label in set(counts_a) | set(counts_b)) / (n * n)
    return 1.0 if expected == 1 else (observed - expected) / (1 - expected)


def confusion(human: list[str], predicted: list[str]) -> dict[tuple[str, str], int]:
    return dict(Counter(zip(human, predicted)))


def accuracy_by_confidence(human: list[str], records: list[dict]) -> list[tuple[str, int, float | None]]:
    """Return (band, paragraphs, accuracy) rows. Accuracy is None for an empty band."""
    bounds = (0.0, *CONFIDENCE_EDGES, 1.0001)
    rows = []
    for low, high in zip(bounds, bounds[1:]):
        hits = [
            record["label"] == gold
            for gold, record in zip(human, records)
            if low <= (record.get("confidence") or 0.0) < high
        ]
        label = f"{low:.2f}-{min(high, 1.0):.2f}"
        rows.append((label, len(hits), sum(hits) / len(hits) if hits else None))
    return rows


def load_labels(path: Path, expected: int) -> list[dict]:
    records = json.loads(path.read_text(encoding="utf-8"))["records"]
    if len(records) != expected:
        sys.exit(f"{path} has {len(records)} records, the gold set has {expected}")
    return records


def print_confusion(title: str, human: list[str], predicted: list[str]) -> None:
    cells = confusion(human, predicted)
    print(f"\n{title} (rows = human, columns = engine)")
    print(f"{'':16}" + "".join(f"{label:>16}" for label in LABELS))
    for gold in LABELS:
        print(f"{gold:16}" + "".join(f"{cells.get((gold, pred), 0):>16}" for pred in LABELS))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--jev", type=Path, required=True)
    parser.add_argument("--deepseek", type=Path, required=True)
    args = parser.parse_args()

    gold_rows = load_three_tier_gold()
    human = [row["gold_label"] for row in gold_rows]
    jev_records = load_labels(args.jev, len(human))
    deepseek_records = load_labels(args.deepseek, len(human))
    jev = [r["label"] for r in jev_records]
    deepseek = [r["label"] for r in deepseek_records]

    share = Counter(human)
    print(f"Paragraphs: {len(human)}  human mix: " + ", ".join(f"{k} {share[k]}" for k in LABELS))
    print(f"Always guess 'data': {share['data'] / len(human):.3f}\n")
    print(f"{'Pair':24}{'Accuracy':>10}{'Kappa':>10}")
    for name, first, second in (
        ("Jev vs human", jev, human),
        ("DeepSeek vs human", deepseek, human),
        ("Jev vs DeepSeek", jev, deepseek),
    ):
        print(f"{name:24}{accuracy(first, second):>10.3f}{cohen_kappa(first, second):>10.3f}")

    print_confusion("Jev", human, jev)
    print_confusion("DeepSeek", human, deepseek)

    print("\nJev accuracy by confidence band")
    for band, count, hit_rate in accuracy_by_confidence(human, jev_records):
        shown = "n/a" if hit_rate is None else f"{hit_rate:.3f}"
        print(f"  {band}  paragraphs {count:>3}  accuracy {shown}")

    both_wrong = sum(j != h and d != h for j, d, h in zip(jev, deepseek, human))
    print(f"\nBoth engines differ from the human on {both_wrong} paragraphs.")
    for row, h, j, d in zip(gold_rows, human, jev, deepseek):
        if j != h and d != h:
            print(f"  human {h:14} jev {j:14} deepseek {d:14} {row['article_title']} #{row['paragraph_index']}")


if __name__ == "__main__":
    main()
