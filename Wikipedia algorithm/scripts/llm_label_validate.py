#!/usr/bin/env python3
"""Validate an LLM as a paragraph-tier labeller against the human gold set.

Sends the exact paragraph text from gold-set-three-tier.csv (136 text-bearing
rows) to a DeepSeek model and compares the predicted tier (data / close /
interpretation) against the human label. Reports per-class precision/recall
and overall agreement, then records whether the model passes the gate
(>= 0.85 overall agreement, no single class below 0.75 recall).

Usage:
    python3 scripts/llm_label_validate.py [--model MODEL_ID]

    Default model is deepseek-v4-flash (cheapest capable model). Use
    --model deepseek-v4-pro to test the higher-capability alternative.

Requires:
    pip install openai   (DeepSeek's API is OpenAI-compatible)
    DEEPSEEK_API_KEY environment variable set.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter
from pathlib import Path

ALGO_DIR = Path(__file__).resolve().parent.parent
THREE_TIER_PATH = ALGO_DIR / "gold-set-three-tier.csv"

DEEPSEEK_BASE_URL = "https://api.deepseek.com"

TIER_MAP = {"1": "data", "2": "close", "3": "interpretation"}

# Shared labelling prompts — single source of truth so this script and
# llm_label_corpus.py cannot drift apart (llm_prompts.py).
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))
from scripts.llm_prompts import SYSTEM_PROMPT, RUBRIC


def load_gold_paragraphs() -> list[dict]:
    """Load the 136 text-bearing rows from gold-set-three-tier.csv."""
    rows = []
    with open(THREE_TIER_PATH, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            tier_raw = (row.get("tier") or "").strip()
            gold_label = TIER_MAP.get(tier_raw)
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


def label_paragraphs_batch(
    client,
    model_id: str,
    paragraphs: list[dict],
    batch_size: int = 10,
) -> list[dict]:
    """Label paragraphs in batches to stay within token limits.

    Each batch sends up to `batch_size` paragraphs in a single API call.
    Returns paragraphs with a 'pred_label' key added.
    """
    results = []
    for i in range(0, len(paragraphs), batch_size):
        batch = paragraphs[i : i + batch_size]
        texts = [p["text"] for p in batch]

        # Build the user message: rubric + numbered paragraphs.
        lines = [RUBRIC, ""]
        for j, text in enumerate(texts, start=1):
            lines.append(f"[{j}] {text}")
        user_message = "\n".join(lines)

        import openai

        try:
            pred_labels: list[str] = []
            for retry_attempt in range(2):  # one retry on empty/unparseable response
                response = client.chat.completions.create(
                    model=model_id,
                    # deepseek-v4-flash/pro are reasoning models; hidden reasoning_content
                    # shares this budget with the visible JSON answer (see llm_label_corpus.py).
                    max_tokens=4096,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                )
                raw = (response.choices[0].message.content or "").strip()
                try:
                    parsed = json.loads(raw)
                    pred_labels = [str(x).strip().lower() for x in parsed.get("labels", [])]
                except (json.JSONDecodeError, AttributeError):
                    pred_labels = []
                if len(pred_labels) == len(batch):
                    break

            # Normalise and validate.
            valid_labels = {"data", "close", "interpretation"}
            for j, pred in enumerate(pred_labels):
                if j >= len(batch):
                    break
                pred_clean = pred.strip('"').strip("'").lower()
                if pred_clean not in valid_labels:
                    pred_clean = "other"  # unparseable
                batch[j]["pred_label"] = pred_clean

            # If we got fewer predictions than paragraphs, fill remainder.
            for j in range(len(pred_labels), len(batch)):
                batch[j]["pred_label"] = "other"

        except openai.OpenAIError as exc:
            print(f"  ERROR batch {i // batch_size + 1}: {exc}", file=sys.stderr)
            for p in batch:
                p["pred_label"] = "error"

        results.extend(batch)
        if (i + batch_size) % 50 == 0 or i + batch_size >= len(paragraphs):
            print(f"  ... {min(i + batch_size, len(paragraphs))}/{len(paragraphs)} paragraphs labelled")

    return results


def compute_metrics(results: list[dict]) -> dict:
    """Compute per-class precision/recall/F1 and overall agreement."""
    classes = ["data", "close", "interpretation"]
    cm: Counter = Counter()

    for r in results:
        gold = r["gold_label"]
        pred = r.get("pred_label", "other")
        cm[(gold, pred)] += 1

    correct = sum(v for (g, p), v in cm.items() if g == p)
    total = len(results)
    agreement = correct / max(total, 1)

    per_class = {}
    for c in classes:
        tp = cm.get((c, c), 0)
        fp = sum(n for (gold, pred), n in cm.items() if pred == c and gold != c)
        fn = sum(n for (gold, pred), n in cm.items() if gold == c and pred != c)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        support = sum(n for (gold, _), n in cm.items() if gold == c)
        per_class[c] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "support": support,
        }

    # Build the confusion matrix as a readable dict.
    confusion = {}
    for (g, p), n in sorted(cm.items()):
        confusion[f"{g}->{p}"] = n

    # Gate check.
    gate_passed = agreement >= 0.85
    min_recall = min(per_class[c]["recall"] for c in classes)
    if min_recall < 0.75:
        gate_passed = False

    return {
        "model_id": "see_metadata",
        "n_paragraphs": total,
        "n_correct": correct,
        "overall_agreement": round(agreement, 3),
        "gate_passed": gate_passed,
        "gate_criteria": {
            "overall_agreement_min": 0.85,
            "per_class_recall_min": 0.75,
            "actual_overall": round(agreement, 3),
            "actual_min_recall": round(min_recall, 3),
        },
        "per_class": per_class,
        "confusion_matrix": confusion,
        "errors": [
            {
                "article_title": r["article_title"],
                "paragraph_index": r.get("paragraph_index", ""),
                "gold": r["gold_label"],
                "pred": r.get("pred_label", "other"),
                "text_preview": r["text"][:120],
            }
            for r in results
            if r["gold_label"] != r.get("pred_label", "other")
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate an LLM paragraph-tier labeller against human gold labels."
    )
    parser.add_argument(
        "--model",
        default="deepseek-v4-flash",
        help="DeepSeek model ID (default: deepseek-v4-flash).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Paragraphs per API call (default: 10).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output full results as JSON.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Load gold data and print stats without calling the API.",
    )
    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: DEEPSEEK_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    paragraphs = load_gold_paragraphs()
    print(f"Loaded {len(paragraphs)} gold paragraphs from gold-set-three-tier.csv")
    gold_dist = Counter(p["gold_label"] for p in paragraphs)
    for label, count in gold_dist.most_common():
        print(f"  {label}: {count}")

    if args.dry_run:
        print("\nDry run — no API calls made.")
        return

    # Import openai only when needed (avoids import error on dry runs).
    try:
        from openai import OpenAI
    except ImportError:
        print(
            "ERROR: openai package not installed. Run: pip install openai",
            file=sys.stderr,
        )
        sys.exit(1)

    client = OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)
    model_id = args.model
    print(f"\nLabelling with model: {model_id}")
    print(f"Batch size: {args.batch_size} paragraphs per call\n")

    results = label_paragraphs_batch(client, model_id, paragraphs, args.batch_size)

    metrics = compute_metrics(results)
    metrics["model_id"] = model_id
    metrics["batch_size"] = args.batch_size

    if args.json:
        print(json.dumps(metrics, indent=2))
    else:
        print(f"\n{'=' * 60}")
        print(f"  Validation Results — {model_id}")
        print(f"{'=' * 60}")
        print(f"  Paragraphs:          {metrics['n_paragraphs']}")
        print(f"  Correct:             {metrics['n_correct']}")
        print(f"  Overall agreement:   {metrics['overall_agreement']:.3f}")
        print(f"  Gate passed:         {'YES' if metrics['gate_passed'] else 'NO'}")
        print()
        print("  Per-class metrics:")
        for c in ["data", "close", "interpretation"]:
            s = metrics["per_class"][c]
            print(
                f"    {c:<16}  prec={s['precision']:.3f}  "
                f"rec={s['recall']:.3f}  f1={s['f1']:.3f}  "
                f"support={s['support']}"
            )
        print()
        print(f"  Errors: {len(metrics['errors'])}")
        for err in metrics["errors"][:10]:
            print(
                f"    gold={err['gold']:<16} pred={err['pred']:<16}  "
                f"\"{err['text_preview']}...\""
            )
        if len(metrics["errors"]) > 10:
            print(f"    ... and {len(metrics['errors']) - 10} more.")

    # Gate decision.
    if not metrics["gate_passed"]:
        print(
            "\n⚠️  GATE FAILED — do not proceed to corpus labelling. "
            "The labeller does not meet the >= 0.85 agreement / >= 0.75 "
            "per-class recall threshold against human labels.",
            file=sys.stderr,
        )
        sys.exit(1)
    else:
        print("\n✅ GATE PASSED — labeller meets the agreement threshold.")


if __name__ == "__main__":
    main()
