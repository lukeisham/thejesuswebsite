"""Compare the human audit labels with the LLM labels and the head (issue #231).

Run from the "Wikipedia algorithm" directory:

    python scripts/compare_audit_labels.py --labels DIR

DIR holds one JSON file per article, as saved from the labelling page
(`labels/<slug>.json`, fields: title, labels, note). Only the files in the
directory are read. The audit sample (audit/audit-sample.json) supplies the
LLM labels, the head labels, and the group of each article.

Reports:
  1. Paragraph agreement of the human with the LLM and with the head, on
     three classes and on two classes (data+close together, versus
     interpretation). The tier rule uses the two-class view.
  2. The human-LLM confusion table.
  3. Article tiers for articles the human labelled completely.
  4. Paragraph agreement by group (random, disagree, rare), because only
     the random group is an unbiased sample.
  5. A bootstrap 95% interval over articles for the random group.
"""

import argparse
import json
import random
import sys
from collections import Counter
from pathlib import Path

ALGO_DIR = Path(__file__).resolve().parents[1]
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from classifier.scorer import score_article  # noqa: E402

SAMPLE_PATH = ALGO_DIR / "audit" / "audit-sample.json"
CLASSES = ("data", "close", "interpretation")
BOOT_ROUNDS = 5000
BOOT_SEED = 3


def two_class(label: str) -> str:
    return "interpretation" if label == "interpretation" else "descriptive"


def load_rows(labels_dir: Path, sample: dict) -> list[dict]:
    """One row per labelled body paragraph: human, llm, head, article info."""
    rows: list[dict] = []
    for path in sorted(labels_dir.rglob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        info = sample["articles"].get(doc.get("title"))
        if info is None:
            continue
        for key, human in doc.get("labels", {}).items():
            i = int(key)
            if info["positional"][i]:
                continue
            rows.append({
                "title": doc["title"],
                "groups": info["groups"],
                "human": human,
                "llm": info["llm_labels"][i],
                "head": info["head_labels"][i],
            })
    return rows


def agreement(rows: list[dict], other: str, collapse: bool = False) -> tuple[int, int]:
    """(agreeing, total) over rows the human gave a class to."""
    usable = [r for r in rows if r["human"] in CLASSES]
    fix = two_class if collapse else (lambda x: x)
    hits = sum(fix(r["human"]) == fix(r[other]) for r in usable)
    return hits, len(usable)


def pct(hits: int, total: int) -> str:
    return f"{hits}/{total} = {hits / total:.1%}" if total else "n/a"


def bootstrap_by_article(rows: list[dict], other: str, collapse: bool) -> tuple[float, float] | None:
    """95% interval that resamples whole articles, not paragraphs."""
    by_article: dict[str, list[dict]] = {}
    for r in rows:
        by_article.setdefault(r["title"], []).append(r)
    articles = list(by_article.values())
    if len(articles) < 5:
        return None
    rng = random.Random(BOOT_SEED)
    rates = []
    for _ in range(BOOT_ROUNDS):
        pick = [rng.choice(articles) for _ in articles]
        hits = total = 0
        for group in pick:
            h, t = agreement(group, other, collapse)
            hits += h
            total += t
        if total:
            rates.append(hits / total)
    rates.sort()
    return rates[int(0.025 * len(rates))], rates[int(0.975 * len(rates))]


def human_tiers(labels_dir: Path, sample: dict, t_sep: float) -> list[dict]:
    """Tier from the human labels, for articles labelled completely."""
    out = []
    for path in sorted(labels_dir.rglob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        info = sample["articles"].get(doc.get("title"))
        if info is None:
            continue
        body = [i for i, pos in enumerate(info["positional"]) if not pos]
        given = doc.get("labels", {})
        if any(str(i) not in given for i in body):
            continue
        labels = []
        for i, pos in enumerate(info["positional"]):
            if pos:
                labels.append("other")
            else:
                h = given[str(i)]
                labels.append(h if h in CLASSES else "neither")
        out.append({
            "title": doc["title"],
            "groups": info["groups"],
            "human": score_article(labels, t_sep)["tier_state"],
            "llm": info["llm_tier_body"],
            "llm_raw": info["llm_tier"],
            "head": info["head_tier"],
            "note": doc.get("note", ""),
        })
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--labels", type=Path, required=True)
    args = parser.parse_args()

    sample = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    rows = load_rows(args.labels, sample)
    if not rows:
        sys.exit("No labelled paragraphs found.")
    titles = {r["title"] for r in rows}
    unsure = sum(r["human"] == "unsure" for r in rows)
    print(f"Articles with labels: {len(titles)}; labelled paragraphs: {len(rows)} "
          f"({unsure} marked unsure, left out of the rates).\n")

    print("1. Paragraph agreement (human vs ...)")
    for other in ("llm", "head"):
        print(f"   {other:5s} 3 classes: {pct(*agreement(rows, other))}"
              f"   2 classes: {pct(*agreement(rows, other, True))}")

    print("\n2. Human (rows) vs LLM (columns)")
    counts = Counter((r["human"], r["llm"]) for r in rows if r["human"] in CLASSES)
    print("   " + " " * 15 + "".join(f"{c:>16s}" for c in CLASSES))
    for h in CLASSES:
        print(f"   {h:15s}" + "".join(f"{counts[(h, c)]:>16d}" for c in CLASSES))
    for c in CLASSES:
        h_total = sum(counts[(c, x)] for x in CLASSES)
        l_total = sum(counts[(x, c)] for x in CLASSES)
        print(f"   {c}: the human gave {h_total}, the LLM gave {l_total} on these paragraphs")

    print("\n3. Article tiers (articles the human labelled completely)")
    tiers = human_tiers(args.labels, sample, sample["t_sep"])
    for t in tiers:
        flag = "" if t["human"] == t["llm"] else "   <-- human and LLM differ"
        print(f"   {t['title'][:38]:38s} human={t['human']:14s} llm={t['llm']:14s} "
              f"head={t['head']:14s} groups={','.join(t['groups'])}{flag}")
    if tiers:
        print(f"   Tier agreement: human vs llm {sum(t['human'] == t['llm'] for t in tiers)}/{len(tiers)}, "
              f"human vs head {sum(t['human'] == t['head'] for t in tiers)}/{len(tiers)}")

    print("\n4. Paragraph agreement by group, human vs llm (3 classes / 2 classes)")
    for group in ("random", "disagree", "rare"):
        sub = [r for r in rows if group in r["groups"]]
        print(f"   {group:9s} {pct(*agreement(sub, 'llm')):20s} {pct(*agreement(sub, 'llm', True))}"
              f"   ({len({r['title'] for r in sub})} articles)")

    print("\n5. Random group only, 95% interval over articles (human vs llm)")
    sub = [r for r in rows if "random" in r["groups"]]
    for label, collapse in (("3 classes", False), ("2 classes", True)):
        ci = bootstrap_by_article(sub, "llm", collapse)
        rate = pct(*agreement(sub, "llm", collapse))
        print(f"   {label}: {rate}"
              + (f"   95% interval [{ci[0]:.1%}, {ci[1]:.1%}]" if ci
                 else "   (fewer than 5 random articles: no interval yet)"))

    notes = [(t["title"], t["note"]) for t in tiers if t["note"]]
    if notes:
        print("\nNotes you wrote:")
        for title, note in notes:
            print(f"   {title}: {note}")


if __name__ == "__main__":
    main()
