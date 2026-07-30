#!/usr/bin/env python3
"""Separation-metric diagnostic: for each scorable gold-set article, emit the
human tier label, the human label sequence, the current `compute_separation_ratio()`
value, the transition count, and whether the human `clear_split` verdict is
consistent with the current metric.

Purpose: isolate metric error from embedding error. By running the separation
metric on the *human* gold labels (no model inference), we answer the question:
does the current adjacency-based metric measure what the human labels encode?

Any article the humans called `clear_split` that scores below `t_sep=0.60` on
its own gold labels is a pure metric failure, not an embedding failure.
"""

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from classifier.scorer import compute_separation_ratio
from scripts.doc_sections import upsert_section, upsert_preamble


GOLD_SET_PATH = Path(__file__).resolve().parent.parent / "gold-set-section-classifier.csv"
DIAGNOSIS_OUTPUT_PATH = Path(__file__).resolve().parent.parent / "CLASSIFIER_DIAGNOSIS.md"


def load_gold_set() -> list[dict]:
    """Load gold-set records with human labels and tier verdicts."""
    records: list[dict] = []
    with open(GOLD_SET_PATH, "r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            labels_raw = row.get("per_paragraph_labels", "[]")
            try:
                para_entries = json.loads(labels_raw)
                # Each entry: {"para_num": N, "label": "...", "confidence": ...}
                labels = [e["label"] for e in para_entries]
            except (json.JSONDecodeError, KeyError, TypeError):
                labels = []

            tier = row.get("tier_assignment", "").strip()
            records.append({
                "title": row["article_title"],
                "url": row.get("wikipedia_url", ""),
                "human_tier": tier,
                "human_labels": labels,
            })
    return records


def compute_transition_count(labels: list[str]) -> int:
    """Count adjacent transitions between 'data' and 'interpretation' labels
    (excluding 'other' and 'neither' just as compute_separation_ratio does)."""
    class_labels = [l for l in labels if l in ("data", "interpretation")]
    transitions = 0
    for i in range(len(class_labels) - 1):
        if class_labels[i] != class_labels[i + 1]:
            transitions += 1
    return transitions


def diagnose(records: list[dict], t_sep: float = 0.60) -> dict:
    """Run the separation metric on human gold labels and classify mismatches.

    Returns:
        Dict with summary metrics, per-article details, and mismatch counts.
    """
    results: list[dict] = []
    clear_split_count = 0
    clear_split_mismatch_count = 0

    for r in records:
        labels = r["human_labels"]
        sep = compute_separation_ratio(labels)
        transitions = compute_transition_count(labels)
        human_tier = r["human_tier"]

        mismatch = False
        if human_tier == "clear_split" and sep < t_sep:
            mismatch = True
            clear_split_mismatch_count += 1
        if human_tier == "clear_split":
            clear_split_count += 1

        # Count class-bearing and total paragraphs.
        class_labels = [l for l in labels if l in ("data", "interpretation")]
        data_count = labels.count("data")
        interp_count = labels.count("interpretation")

        results.append({
            "title": r["title"],
            "human_tier": human_tier,
            "separation": round(sep, 4),
            "transitions": transitions,
            "total_paragraphs": len(labels),
            "data_count": data_count,
            "interp_count": interp_count,
            "class_count": len(class_labels),
            "metric_failure": mismatch,
        })

    return {
        "t_sep": t_sep,
        "total_articles": len(records),
        "articles_with_labels": len([r for r in records if r["human_labels"]]),
        "clear_split_count": clear_split_count,
        "clear_split_mismatch_count": clear_split_mismatch_count,
        "mismatch_rate": round(
            clear_split_mismatch_count / max(clear_split_count, 1), 4
        ),
        "details": sorted(results, key=lambda r: (-r["metric_failure"], r["separation"])),
    }


def write_diagnosis_report(diag: dict, output_path: Path) -> None:
    """Idempotently update CLASSIFIER_DIAGNOSIS.md with this diagnostic's
    measurement results.

    This generator owns the file preamble and sections A.1, A.3, A.4, A.5.
    It must NOT touch any other section: `scripts/diagnose_register_gate.py`
    owns '## B', and `calibrate.py`'s `update_diagnosis_bakeoff()` owns
    '## D.4' (this script only ever originated a TBD-placeholder version of
    D.4 historically; the real numbers are populated and kept up to date by
    calibrate.py, so ownership belongs there now — ownership is per
    top-level '## ' section, tracked via scripts/doc_sections.py's
    header-to-next-header replacement so reruns can't duplicate or wipe
    another generator's section).
    """
    existing = output_path.read_text(encoding="utf-8") if output_path.exists() else ""

    preamble_lines = []
    preamble_lines.append("# Classifier Diagnosis")
    preamble_lines.append("")
    preamble_lines.append(f"**Date:** (see git log)")
    preamble_lines.append(f"**Gold set articles:** {diag['total_articles']}")
    preamble_lines.append(f"**Articles with human labels:** {diag['articles_with_labels']}")
    preamble_lines.append("")
    preamble = "\n".join(preamble_lines) + "\n"

    a1 = []
    a1.append("## A.1 — Separation-metric diagnostic (human labels only)")
    a1.append("")
    a1.append("This diagnostic runs `compute_separation_ratio()` on the **human** gold-set")
    a1.append("labels — no model inference is involved. It answers: does the current")
    a1.append("adjacency-based metric measure what the human labels encode?")
    a1.append("")
    a1.append(f"| Metric | Value |")
    a1.append(f"|---|---|")
    a1.append(f"| t_sep threshold | {diag['t_sep']:.2f} |")
    a1.append(f"| Articles with `clear_split` human tier | {diag['clear_split_count']} |")
    a1.append(
        f"| `clear_split` articles that fail t_sep on own gold labels | "
        f"{diag['clear_split_mismatch_count']} |"
    )
    a1.append(
        f"| Metric/label mismatch rate | "
        f"{diag['mismatch_rate']:.1%} ({diag['clear_split_mismatch_count']}/"
        f"{diag['clear_split_count']}) |"
    )
    a1.append("")

    if diag["clear_split_mismatch_count"] > 0:
        a1.append(
            f"**Finding:** {diag['clear_split_mismatch_count']} of "
            f"{diag['clear_split_count']} human `clear_split` articles fail the "
            f"current t_sep={diag['t_sep']:.2f} threshold on their **own gold labels**. "
            f"This is a pure metric failure — the adjacency measure does not capture "
            f"what the human labellers meant by a 'clean split'."
        )
    else:
        a1.append(
            "**Finding:** All human `clear_split` articles pass the current "
            f"t_sep={diag['t_sep']:.2f} threshold on their own gold labels. The metric "
            "and the labelling construct are consistent — whatever accuracy gap remains "
            "is downstream of this metric (embedding or thresholding). See §D.4 for the "
            "currently measured tier accuracy."
        )
    a1.append("")

    a1.append("### Per-article details")
    a1.append("")
    a1.append(
        "| Article | Human tier | Separation | Transitions | Data | Interp | "
        "Total | Metric failure? |"
    )
    a1.append(
        "|---|---|---|---|---|---|---|---|"
    )
    for d in diag["details"]:
        fail = "❌ YES" if d["metric_failure"] else "✓"
        a1.append(
            f"| {d['title']} | {d['human_tier']} | {d['separation']:.4f} | "
            f"{d['transitions']} | {d['data_count']} | {d['interp_count']} | "
            f"{d['total_paragraphs']} | {fail} |"
        )
    a1.append("")
    a1_body = "\n".join(a1) + "\n"

    a3 = []
    a3.append("## A.3 — Register-store gate audit")
    a3.append("")
    a3.append(
        "**Current implementation (`classifier/labeler.py`, `_label_paragraph()`):** "
        "the register score is applied as a single **class-independent** gate, checked "
        "before the per-class comparisons even run:"
    )
    a3.append("")
    a3.append("```python")
    a3.append("if register_score < t_register_threshold:")
    a3.append("    return LABEL_NEITHER")
    a3.append("")
    a3.append("is_data = data_score >= t_data_threshold")
    a3.append("is_close = close_score >= t_close_threshold")
    a3.append("is_interp = interp_score >= t_interp_threshold")
    a3.append("```")
    a3.append("")
    a3.append(
        "A paragraph must clear `t_register` to be considered class-bearing at all; if "
        "it does, the data/close/interpretation labels are then decided independently "
        "by their own thresholds. This is class-independent by design — it is a prose-"
        "quality gate, not a per-class confirmation."
    )
    a3.append("")
    a3.append(
        "**History:** an older version of this function instead compared the same "
        "`register_score` against both `t_data` and `t_interp` "
        "(`is_data = data_score >= t_data and register_score >= t_data`; "
        "`is_interp = interp_score >= t_interp and register_score >= t_interp`). With "
        "`t_data == t_interp` those two gates were logically identical, so the "
        "'per-class register confirmation' the config docstring described never "
        "actually existed. That double-comparison has been replaced by the single "
        "class-independent gate shown above."
    )
    a3.append("")
    a3.append(
        "**The gate's real defect was never this mechanism — it was exemplar coverage.** "
        "`scripts/diagnose_register_gate.py` (§B) measured the register gate's actual "
        "failures directly against the gold-set paragraph labels: only **1.0%** of "
        "failures came from the nearest-neighbour-negative rule (a mislabelled or "
        "overly-broad negative exemplar); **49.8%** were plain mean-cosine-below-"
        "threshold, because the register store has only 32 exemplars (20 positive / "
        "12 negative) versus 80+ for each of the other three stores. See §B for the "
        "full paragraph-level before/after measurement."
    )
    a3.append("")
    a3_body = "\n".join(a3) + "\n"

    a4 = []
    a4.append("## A.4 — Calibration sweep coverage gaps")
    a4.append("")
    a4.append(
        "`calibrate.py`'s `sweep_t_data_interp_from_cache()` sweeps `t_data`, `t_close`, "
        "`t_interp`, and `t_register` as four **independent** grids (nested loops, each "
        "over its own `np.arange(...)`), not a tied pair — asymmetric thresholds (e.g. "
        "`t_data=0.60, t_interp=0.45`) are explored and are in fact what the current "
        "winning configuration uses. (An earlier version of this diagnostic, when the "
        "sweep really was 1-D and the classes were swept as a tied pair, is what this "
        "section originally described — verify against the current function body before "
        "trusting this claim on a future rerun, since the sweep implementation can "
        "change independently of this doc.)"
    )
    a4.append("")
    a4.append(
        "`calibrate.py`'s `choose_best()` maximises accuracy over all "
        f"{diag['total_articles']} gold-set articles with **no held-out set** — the "
        "reported tier accuracy (see §D.4) is an in-sample optimum, and the true "
        "out-of-sample accuracy could be lower."
    )
    a4.append("")
    a4_body = "\n".join(a4) + "\n"

    a5 = []
    a5.append("## A.5 — Bootstrap confidence interval")
    a5.append("")
    a5.append(
        f"At n={diag['total_articles']} gold-set articles, a Wilson-score 95% CI band "
        "for a proportion near 0.5 is roughly ±0.15 — the sample is small enough that "
        "tier accuracy alone is a noisy signal. §D.4 reports the actual bootstrap 95% "
        "CI for the current calibrated configuration (computed directly by "
        "`calibrate.py`'s `bootstrap_ci()`, which is more precise than this generic "
        "approximation); read the accuracy number there alongside its CI rather than "
        "as a point estimate."
    )
    a5.append("")
    a5.append(
        "**Implication for the ≥0.85 gate:** even a future calibration run that reports "
        f"0.85 should be read against its own CI at this sample size (n={diag['total_articles']}) "
        "— the 0.85 gate should be interpreted alongside the CI, and gold-set expansion "
        "should be scoped as a prerequisite for any activation decision."
    )
    a5.append("")
    a5_body = "\n".join(a5) + "\n"

    new_text = upsert_preamble(existing, preamble)
    new_text = upsert_section(new_text, "## A.1 — Separation-metric diagnostic (human labels only)",
                               a1_body, insert_after=None)
    new_text = upsert_section(new_text, "## A.3 — Register-store gate audit",
                               a3_body,
                               insert_after="## A.1 — Separation-metric diagnostic (human labels only)")
    new_text = upsert_section(new_text, "## A.4 — Calibration sweep coverage gaps",
                               a4_body, insert_after="## A.3 — Register-store gate audit")
    new_text = upsert_section(new_text, "## A.5 — Bootstrap confidence interval",
                               a5_body, insert_after="## A.4 — Calibration sweep coverage gaps")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(new_text, encoding="utf-8")
    print(f"Updated diagnosis report at {output_path} (sections: preamble, A.1, A.3, A.4, A.5)")


def main() -> None:
    records = load_gold_set()
    print(f"Loaded {len(records)} gold-set records.")

    scorable = [r for r in records if r["human_labels"]]
    print(f"  {len(scorable)} records have human paragraph labels.")

    diag = diagnose(scorable)
    print(f"\nDiagnosis summary:")
    print(f"  clear_split articles: {diag['clear_split_count']}")
    print(f"  metric/label mismatches: {diag['clear_split_mismatch_count']}")
    print(f"  mismatch rate: {diag['mismatch_rate']:.1%}")

    if diag["clear_split_mismatch_count"] > 0:
        print(f"\n  ⚠️  Metric/label mismatch detected: "
              f"{diag['clear_split_mismatch_count']} human 'clear_split' "
              f"articles fail the current adjacency metric on their own gold labels.")
        print(f"  → The separation metric does not measure what the human labels encode.")
    else:
        print(f"\n  ✓ No metric/label mismatch — all human 'clear_split' articles "
              f"pass the current adjacency metric.")
        print(f"  → The 0.303 accuracy problem is downstream (embedding or thresholding).")

    print(f"\nPer-article details:")
    for d in diag["details"]:
        flag = " *** METRIC FAILURE ***" if d["metric_failure"] else ""
        print(f"  {d['title']:<40} tier={d['human_tier']:<16} "
              f"sep={d['separation']:.4f}  transitions={d['transitions']}"
              f"{flag}")

    write_diagnosis_report(diag, DIAGNOSIS_OUTPUT_PATH)


if __name__ == "__main__":
    main()
