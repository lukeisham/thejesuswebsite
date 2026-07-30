#!/usr/bin/env python3
import pathlib

ISSUES_PATH = pathlib.Path("/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Issues.md")

row = (
    149,
    "scripts/sync-vector-sidecar.sh",
    "Discovered while running the live VPS deploy for wikipedia-v2-09-vps-vector-store-serving.md: "
    "`pm2 start venv/bin/uvicorn ...` crash-looped in production (`SyntaxError: Invalid or unexpected "
    "token` on the file's shebang line) because pm2 defaults to the `node` interpreter for scripts with "
    "no recognized file extension, so it tried to execute the Python `uvicorn` binary as JavaScript. "
    "Resolved (commit 6d881a7): added `--interpreter none` to the `pm2 start` invocation in "
    "`scripts/sync-vector-sidecar.sh`, so pm2 execs the file directly via its own shebang instead of "
    "guessing an interpreter. Verified live: `pm2 describe thejesuswebsite-vector-sidecar` now shows "
    "`status: online`, `restarts: 0`, and `POST https://thejesuswebsite.org/api/wikipedia/signal-check` "
    "returns real results.",
    "bug",
    "wikipedia-v2-09-vps-vector-store-serving.md",
    "2026-07-29",
    "resolved",
)

with ISSUES_PATH.open("a", encoding="utf-8") as fh:
    fh.write(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]} | {row[5]} | {row[6]} |\n")

print("Appended row 149")
