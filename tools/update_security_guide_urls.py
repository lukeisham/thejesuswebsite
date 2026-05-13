#!/usr/bin/env python3
"""Update guide_security.md with the canonical list of external URL fields.

Reads the security guide, appends a new §9 listing every database column that
stores external URLs, their validation rules, and their data flow through the
dashboard editor / pipeline / frontend display pipeline.

Idempotent — if §9 already exists, it replaces it with the updated content.
Run from the project root:
    python tools/update_security_guide_urls.py
"""

import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE_PATH = os.path.join(ROOT, "documentation", "guides", "guide_security.md")

SECTION_HEADER = "## 9. External URL Field Inventory"

SECTION_BODY = (
    "\n"
    "All columns in the `records` table that store external URLs are listed below\n"
    "with their validation, dashboard editor status, and frontend display pathway.\n"
    "No other columns store URL data — the generic `url` column (formerly managed\n"
    "by `url_array_editor.js`) has been deprecated and is no longer read by either\n"
    "the API or any frontend code.\n"
    "\n"
    "| Column | Type | Dashboard Editor | Pipeline |"
    " Frontend Display | Validation |\n"
    "|:---|:---|:---|:---|:---|:---|\n"
    "| `bibliography` (website `url` field) | JSON Blob |"
    " MLA Widget (`mla_source_handler.js`) — per-row editable table with"
    " author, title, website, publisher, url, date fields | N/A — admin-edited |"
    " `sources_biblio_display.js` renders MLA-formatted citations with"
    " clickable links | Input is free-text; stored as JSON via"
    " parameterized queries |\n"
    "| `wikipedia_link` | JSON Blob"
    ' (e.g. `{"url": "...", "title": "..."}`) |'
    " None — read-only in dashboard. Link is populated by"
    " `pipeline_wikipedia.py` which fetches from Wikipedia REST API |"
    " **Pipeline-managed** — writes both `wikipedia_title` and"
    " `wikipedia_link` | `list_view_wikipedia.js` renders as clickable"
    " link with title | URL is sourced from Wikipedia API responses"
    " (percent-encoded by `requests` library); written via"
    " parameterized UPDATE |\n"
    "| `academic_challenge_link` | JSON Blob |"
    " Sidebar text input (`#challenge-link-input`) in Academic Challenges"
    " dashboard (`dashboard_challenge_academic.js`). Save/publish handlers"
    " include it in PUT body. | **Not written by pipeline** — admin-edited |"
    " `list_view_academic_challenges.js` renders as clickable link if"
    " present | Free-text input; stored as raw string via parameterized"
    " queries |\n"
    "| `popular_challenge_link` | JSON Blob |"
    " Same pattern as academic — sidebar text input in Popular Challenges"
    " dashboard (`dashboard_challenge_popular.js`) |"
    " **Not written by pipeline** — admin-edited |"
    " `list_view_popular_challenges.js` renders as clickable link if"
    " present | Free-text input; stored as raw string via parameterized"
    " queries |\n"
    "| `source_url` | TEXT (Flat Indexable) |"
    " News Sources sidebar editor (`news_sources_sidebar_handler.js`) —"
    " save URL button (`_handleSaveUrl()`) writes to `source_url` on"
    " `news_source` sub-type rows |"
    " **Read by pipeline** — `pipeline_news.py` `_collect_source_urls()`"
    " reads `source_url` to know which RSS feeds to crawl |"
    " Not directly displayed on frontend (used as crawl source) |"
    " Free-text input; stored via parameterized INSERT/UPDATE |\n"
    "| `news_item_link` | TEXT (Flat Indexable) |"
    " Read-only — displayed in the news articles dashboard table via"
    " `_buildNewsArticleRow()` |"
    " **Pipeline-managed** — `pipeline_news.py` writes `news_item_link`"
    " alongside `news_item_title` when inserting new articles."
    " Deduplication performed by `news_item_link` comparison. |"
    " `list_newsitem.js` and `news_snippet_display.js` render as clickable"
    " article links on the public blog/news pages |"
    " Sourced from crawled RSS feeds; deduplicated before INSERT;"
    " written via parameterized queries |\n"
    "| `url` [DEPRECATED] | JSON Blob |"
    " **None** — `url_array_editor.js` deleted 2026-05-13."
    " CSV bulk upload field mapping also removed. | N/A |"
    " **Removed** — `single_view.js` no longer renders"
    ' "External Reference" section.'
    " API no longer parses this column. |"
    " No active code reads or writes this column."
    " Existing data is orphaned in the database. |\n"
    "| `news_items` [DEPRECATED] | JSON Blob |"
    " **None** — no dashboard editor exists."
    " Modern pipeline writes `news_item_link` + `news_item_title` as"
    " individual columns. |"
    " **No longer written** — pipeline uses dedicated columns instead |"
    " **Removed** — legacy fallback code removed from `list_newsitem.js`"
    " and `news_snippet_display.js`."
    " Only `snippet`, `news_item_title`, and `news_item_link` are"
    " rendered. |"
    " No active code reads this column."
    " Existing data is orphaned fallback.\n"
    "\n"
    "### 9a. General URL Validation Rules\n"
    "\n"
    "- **Parameterized Queries:** All database writes involving URL columns use\n"
    "  SQLite placeholder syntax (`?`), preventing SQL injection regardless of\n"
    "  URL content.\n"
    "- **Free-Text Tolerance:** URL columns accept unrestricted text — there is\n"
    "  no client- or server-side URL format validation (e.g., protocol check,\n"
    "  domain validation). This is intentional: the admin is a single trusted\n"
    "  user, and URLs may include non-standard schemes or local paths.\n"
    "- **JSON Blob Integrity:** Columns stored as JSON (`bibliography`,\n"
    "  `wikipedia_link`, `academic_challenge_link`, `popular_challenge_link`) are\n"
    "  serialised via `JSON.stringify()` before transmission to the API, and\n"
    "  deserialised via `json.loads()` when served to the frontend. Malformed\n"
    "  JSON in the database is caught by `try/except` at the edge and silently\n"
    "  skipped.\n"
    "- **Pipeline-Sourced URLs:** URLs populated by pipelines (`wikipedia_link`,\n"
    "  `news_item_link`, `source_url` for reading) originate from trusted external\n"
    "  APIs (Wikipedia REST API, RSS feeds). Pipeline code percent-encodes query\n"
    "  parameters via the `requests` library and performs deduplication on insert.\n"
).lstrip()


def main():
    if not os.path.exists(GUIDE_PATH):
        print(f"ERROR: Guide not found at {GUIDE_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(GUIDE_PATH, "r") as f:
        content = f.read()

    # --- Idempotent: remove any existing §9 section ---
    # Match from the section header through to the next `## ` section or EOF
    pattern = r"\n" + re.escape(SECTION_HEADER) + r".*?(?=\n## |\Z)"
    if re.search(pattern, content, flags=re.DOTALL):
        content = re.sub(pattern, "", content, flags=re.DOTALL)
        # clean up trailing blank lines left by removal
        content = re.sub(r"\n{3,}", "\n\n", content)
        print("Existing §9 section removed.")

    # --- Append the new section ---
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    new_section = (
        f"\n{SECTION_HEADER}"
        f"\n<!-- Last updated: {timestamp} by"
        f" tools/update_security_guide_urls.py -->\n"
        f"{SECTION_BODY}\n"
    )
    content += new_section

    with open(GUIDE_PATH, "w") as f:
        f.write(content)

    print(f"Security guide updated: {GUIDE_PATH}")
    print("Section 9 — External URL Field Inventory appended.")


if __name__ == "__main__":
    main()
