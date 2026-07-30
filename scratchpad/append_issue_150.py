#!/usr/bin/env python3
import pathlib

ISSUES_PATH = pathlib.Path("/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Issues.md")

row = (
    150,
    "setup/Website_guide.md",
    "Investigated at the user's request re: why wikipedia-v2-08-skill-documentation-update.md's blocker "
    "on wikipedia-v2-09-vps-vector-store-serving.md resolved. Found Plan 8's \"VPS vector store serving\" "
    "subsection of the Wikipedia Ranking Pipeline documented Plan 9's ORIGINAL DRAFT design "
    "(`GET /api/wikipedia/related?slug=&family=`, mapping sidecar result IDs back to article fields, cache "
    "keyed on slug+family, sync-vector-sidecar.sh described as pushing Python source) rather than the "
    "as-shipped implementation (`POST /wikipedia/signal-check`, body `{family, text}`, no article mapping — "
    "repurposed after discovering the FAISS stores hold calibration exemplars, not per-article embeddings; "
    "cache keyed on family+text+k; sync-vector-sidecar.sh only manages venv+pm2 since the code now deploys "
    "via git). Plan 8 was apparently completed using Plan 9's draft text before Plan 9's implementation "
    "corrected course. Resolved: rewrote the affected paragraph in Website_guide.md to match the real, "
    "live-verified endpoint and deploy mechanics. Also noted in passing (not fixed, cosmetic only): Plan 8's "
    "own Tier 1 smoke test specified case-sensitive greps for \"algorithm lifecycle\"/\"skill interaction\"/"
    "\"vector embedding database\" that return 0 matches against the actual sentence-case headings "
    "(\"Algorithm lifecycle\", etc.) — content is correct and complete, just not literally matching the "
    "smoke test's exact-case grep pattern; the checkbox was marked complete without the literal command "
    "actually passing.",
    "bug",
    "wikipedia-v2-08-skill-documentation-update.md",
    "2026-07-29",
    "resolved",
)

with ISSUES_PATH.open("a", encoding="utf-8") as fh:
    fh.write(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]} | {row[5]} | {row[6]} |\n")

print("Appended row 150")
