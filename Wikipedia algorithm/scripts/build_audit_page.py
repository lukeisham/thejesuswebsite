"""Build the labelling page for the audit sample (issue #231).

Run from the "Wikipedia algorithm" directory, after build_audit_sample.py:

    python scripts/build_audit_page.py

It reads audit/audit-articles.json (paragraph text only, no LLM labels) and
audit/claude-labels-first4.json (Claude's own labels) and puts them into audit/audit-labeller.template.html. The result is
audit/audit-labeller.html, a single file that can be published as an artifact.
"""

import json
from pathlib import Path

AUDIT_DIR = Path(__file__).resolve().parents[1] / "audit"
TEMPLATE = AUDIT_DIR / "audit-labeller.template.html"
ARTICLES = AUDIT_DIR / "audit-articles.json"
CLAUDE_LABELS = AUDIT_DIR / "claude-labels-first4.json"
OUT = AUDIT_DIR / "audit-labeller.html"
MARKER = "/*__DATA__*/"


def main() -> None:
    html = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in html:
        raise SystemExit(f"Marker {MARKER} not found in {TEMPLATE}")
    data = json.loads(ARTICLES.read_text(encoding="utf-8"))
    # Claude's own labels, shown beside the paragraphs it labelled. The LLM
    # corpus labels and the head labels are never put in the page.
    if CLAUDE_LABELS.exists():
        claude = json.loads(CLAUDE_LABELS.read_text(encoding="utf-8"))["articles"]
        for article in data["articles"]:
            if article["title"] in claude:
                article["claude"] = claude[article["title"]]
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # Keep "</script" and "<!--" from ending the data block early.
    payload = payload.replace("</", "<\\/").replace("<!--", "<\\!--")
    OUT.write_text(html.replace(MARKER, payload), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
