#!/usr/bin/env python3
"""Compute exact ranking impact of a candidate Signal 3 weight change.

The corpus is capped at ~300 articles, so the ranking impact of any
candidate weight is computable exactly rather than estimated. This script
takes a candidate weight for `clear_split` (all other tier states held at 0)
and emits before/after net_score and rank position per article, plus the
count and identity of articles whose rank moves.

Usage:
    python3 scripts/rank_diff.py [--weight WEIGHT]

    Default weight is 10 (the settled target, propagated 2026-07-31). Pass
    --weight 3 to compare against the interim reduced-weight scheme that
    shipped 2026-07-30, for verification that propagation didn't silently
    change more than the tier weights themselves.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Optional

ALGO_DIR = Path(__file__).resolve().parent.parent
SCORING_CSV = ALGO_DIR / "Wikipedia Articles - Scoring Detail.csv"
EXPORT_JSON = ALGO_DIR / "scoring-export.json"

# Weights under the current (settled target, propagated 2026-07-31) scheme
# and the interim scheme it replaced (live 2026-07-30 to 2026-07-31).
CURRENT_WEIGHTS = {"clear_split": 10, "muddled": -5, "one_sided": 0, "unclassifiable": 0}
PRIOR_WEIGHTS = {"clear_split": 3, "muddled": 0, "one_sided": 0, "unclassifiable": 0}


def load_scoring_detail() -> list[dict]:
    """Load articles from Wikipedia Articles - Scoring Detail.csv."""
    rows = []
    with open(SCORING_CSV, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rows.append(row)
    return rows


def signal3_contribution(row: dict, weights: dict[str, int]) -> int:
    """Compute Signal 3 contribution for one article under a given weight scheme."""
    tier_raw = row.get("data_interp_tier", "")
    tier = tier_raw.strip().strip('"') if tier_raw else "unclassifiable"
    return weights.get(tier, 0)


def compute_rankings(rows: list[dict], weights: dict[str, int]) -> list[dict]:
    """Compute net_score and rank for every article under a given weight scheme.

    The CSV's net_score column includes Signal 3 under whatever weights were
    active when it was exported. To compare schemes, we subtract the CSV's
    recorded s3 contribution and add the candidate scheme's contribution.

    Articles are sorted by net_score descending. Ties are broken by
    alphabetical title (stable, deterministic).
    """
    scored = []
    for row in rows:
        title = row.get("title", "").strip().strip('"')
        url = row.get("url", "").strip().strip('"')
        try:
            csv_net_score = float(row.get("net_score", "0"))
        except (ValueError, TypeError):
            csv_net_score = 0.0

        # The CSV stores the per-article Signal 3 contribution as computed
        # when the CSV was exported. Extract it so we can swap it out.
        try:
            csv_s3_raw = row.get("data_interp_split_contribution", "0")
            csv_s3 = int(float(csv_s3_raw.strip().strip('"') or "0"))
        except (ValueError, TypeError):
            csv_s3 = 0

        new_s3 = signal3_contribution(row, weights)

        # Recompute: remove the old Signal 3 contribution, add the new one.
        net_score = csv_net_score - csv_s3 + new_s3

        scored.append({
            "title": title,
            "url": url,
            "net_score": net_score,
            "data_interp_tier": row.get("data_interp_tier", "").strip().strip('"'),
            "s3_contribution": new_s3,
            "csv_s3_contribution": csv_s3,
        })

    # Sort by net_score descending, tie-break alphabetically by title.
    scored.sort(key=lambda a: (-a["net_score"], a["title"].lower()))

    for i, article in enumerate(scored, start=1):
        article["rank"] = i

    return scored


def diff_rankings(
    before: list[dict],
    after: list[dict],
    candidate_weight: int,
) -> dict:
    """Compare before/after rankings and summarise the differences."""
    before_by_title = {a["title"]: a for a in before}
    after_by_title = {a["title"]: a for a in after}

    moved: list[dict] = []
    score_changes: list[dict] = []

    for title, after_article in after_by_title.items():
        before_article = before_by_title.get(title)
        if before_article is None:
            continue

        rank_delta = before_article["rank"] - after_article["rank"]
        score_delta = after_article["net_score"] - before_article["net_score"]

        # Round to avoid floating-point noise.
        score_delta = round(score_delta, 6)

        record = {
            "title": title,
            "before_score": before_article["net_score"],
            "after_score": after_article["net_score"],
            "score_delta": score_delta,
            "before_rank": before_article["rank"],
            "after_rank": after_article["rank"],
            "rank_delta": rank_delta,
            "tier": after_article["data_interp_tier"],
            "old_s3_contrib": before_article["s3_contribution"],
            "new_s3_contrib": after_article["s3_contribution"],
        }

        if score_delta != 0:
            score_changes.append(record)

        if rank_delta != 0:
            moved.append(record)

    return {
        "candidate_weight": candidate_weight,
        "total_articles": len(after),
        "articles_with_score_change": len(score_changes),
        "articles_with_rank_change": len(moved),
        "score_changes": sorted(score_changes, key=lambda r: abs(r["score_delta"]), reverse=True),
        "rank_changes": sorted(moved, key=lambda r: abs(r["rank_delta"]), reverse=True),
    }


def print_summary(diff: dict) -> None:
    """Print a human-readable summary of the ranking diff."""
    print(f"\n{'=' * 70}")
    print(f"  Ranking Diff — Signal 3 candidate weight: +{diff['candidate_weight']}")
    print(f"{'=' * 70}")
    print(f"  Total articles:                {diff['total_articles']}")
    print(f"  Articles with score change:    {diff['articles_with_score_change']}")
    print(f"  Articles with rank change:     {diff['articles_with_rank_change']}")
    print()

    if diff["score_changes"]:
        print(f"  Score changes (largest |Δ| first):")
        for r in diff["score_changes"][:20]:
            direction = "+" if r["score_delta"] > 0 else ""
            print(
                f"    {direction}{r['score_delta']:>5.0f}  "
                f"#{r['after_rank']:>3} (was #{r['before_rank']:>3})  "
                f"tier={r['tier']:<15}  {r['title']}"
            )
        if len(diff["score_changes"]) > 20:
            print(f"    ... and {len(diff['score_changes']) - 20} more.")

    if diff["rank_changes"]:
        print(f"\n  Rank changes (largest |Δ| first):")
        for r in diff["rank_changes"]:
            direction = "↑" if r["rank_delta"] > 0 else "↓"
            print(
                f"    {direction}{abs(r['rank_delta']):>3}  "
                f"#{r['after_rank']:>3} ← #{r['before_rank']:>3}  "
                f"{r['title']}"
            )
    else:
        print("  No rank changes.")

    print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compute exact ranking impact of a candidate Signal 3 weight."
    )
    parser.add_argument(
        "--weight",
        type=int,
        default=10,
        help="Candidate clear_split weight (default: 10, the live target value).",
    )
    parser.add_argument(
        "--prior",
        action="store_true",
        help="Diff against the interim +3/0/0/0 scheme instead of the current target weights.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output the full diff as JSON instead of a human-readable summary.",
    )
    args = parser.parse_args()

    candidate_weights = {
        "clear_split": args.weight,
        "muddled": 0,
        "one_sided": 0,
        "unclassifiable": 0,
    }

    baseline_weights = PRIOR_WEIGHTS if args.prior else CURRENT_WEIGHTS

    # Load articles.
    rows = load_scoring_detail()
    if not rows:
        print("ERROR: No articles found in Scoring Detail CSV.", file=sys.stderr)
        sys.exit(1)

    # Compute before/after rankings.
    before = compute_rankings(rows, baseline_weights)
    after = compute_rankings(rows, candidate_weights)

    # Diff.
    diff = diff_rankings(before, after, args.weight)

    if args.json:
        print(json.dumps(diff, indent=2, default=str))
    else:
        print_summary(diff)


if __name__ == "__main__":
    main()
