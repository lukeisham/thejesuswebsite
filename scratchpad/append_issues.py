#!/usr/bin/env python3
"""Append rows to setup/Issues.md for wikipedia-v2-09 discoveries.

Per the plan's Completion Protocol: use a script for markdown edits, never
manual find/replace, to avoid corrupting the tracked issues table.
"""
import pathlib

ISSUES_PATH = pathlib.Path("/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Issues.md")

ROWS = [
    (
        146,
        "setup/PLANS/New/wikipedia-v2-09-vps-vector-store-serving.md",
        "Discovered while implementing wikipedia-v2-09-vps-vector-store-serving.md: the plan's draft "
        "assumed the FAISS stores under `setup/Wikipedia algorithm v2/vector-stores/` hold per-article "
        "embeddings (mapping a sidecar-returned id back to a Wikipedia article via `wikipediaModel.getBySlug`), "
        "but they actually hold hand-authored calibration exemplars per family (a few dozen reference passages "
        "each, per Wikipedia_alogrithm_refractor.md §3.4.1's nearest-neighbour-label rule) — there is no "
        "per-article embedding store anywhere in Plans 1-8. \"Find Wikipedia articles related to this one\" is "
        "not buildable from existing data. Resolved by asking the user: repurposed the endpoint as a live "
        "signal-classify tool (`POST /wikipedia/signal-check`, free text + family in, nearest exemplar + fire/"
        "no-fire verdict out) instead of a related-articles lookup. A genuine related-articles feature would "
        "need a new per-article embedding pipeline — not attempted here, would need its own plan.",
        "warning",
        "wikipedia-v2-09-vps-vector-store-serving.md",
        "2026-07-29",
        "resolved",
    ),
    (
        147,
        ".gitignore, vector-sidecar/",
        "Discovered while implementing wikipedia-v2-09-vps-vector-store-serving.md: the plan's draft placed the "
        "sidecar's FastAPI source at `setup/Wikipedia algorithm v2/vector-sidecar/` and its own \"Push to GitHub\" "
        "task assumed that path was an ordinary tracked repo file. It is not — `.gitignore`'s `/setup/*` blanket "
        rule only re-includes `!/setup/Wikipedia algorithm` (the legacy directory, singular, no "v2")
        "gitignore gap Plan 4 already found for `requirements.txt`/`.python-version`. Anything under "
        "`setup/Wikipedia algorithm v2/vector-sidecar/` would have been silently gitignored, so the sidecar code "
        "would never have reached GitHub or the VPS via the plan's own deploy path. Resolved by moving the "
        "sidecar to a top-level `vector-sidecar/` directory (sibling to `api/`, `mcp-server/`, `scripts/`), which "
        "is tracked normally.",
        "bug",
        "wikipedia-v2-09-vps-vector-store-serving.md",
        "2026-07-29",
        "resolved",
    ),
    (
        148,
        "api/routes/wikipedia.js",
        "Per wikipedia-v2-09-vps-vector-store-serving.md's own Error notification section: the new "
        "`POST /wikipedia/signal-check` route uses the current canonical `sendError`/`error-codes.js` pattern, "
        "but every other route already in `api/routes/wikipedia.js` (GET /, GET /admin, GET /:slug, POST /, "
        "PUT /:id, DELETE /, DELETE /:id) still uses the older raw `res.status(500).json({ error: '...' })` "
        "pattern. Retrofitting those routes to the encoding layer is out of scope for this plan (unbundled scope "
        "creep per SR-1) — logged here per the plan's own instruction rather than silently left unmentioned.",
        "JS-2",
        "wikipedia-v2-09-vps-vector-store-serving.md",
        "2026-07-29",
        "open",
    ),
]

with ISSUES_PATH.open("a", encoding="utf-8") as fh:
    for row_id, location, description, issue_type, plan_filename, date, status in ROWS:
        fh.write(
            f"| {row_id} | {location} | {description} | {issue_type} | {plan_filename} | {date} | {status} |\n"
        )

print(f"Appended {len(ROWS)} rows to {ISSUES_PATH}")
