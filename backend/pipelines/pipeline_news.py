# =============================================================================
#   THE JESUS WEBSITE — NEWS PIPELINE
#   File:    backend/pipelines/pipeline_news.py
#   Version: 1.2.0
#   Purpose: Crawls, ranks, and inserts current archaeological or
#            historical news events. Reads search keywords and source URLs
#            from the database, fetches each source, extracts matching items,
#            and saves results to the anchor record (slug='global-news-feed').
#
#   TRIGGER:
#     - Run directly via CLI: python -m backend.pipelines.pipeline_news
#     - Triggered by POST /api/admin/news/crawl (admin_api.py)
#
#   DATA MAPPING:
#     Input   →  records with news_sources populated (source URLs)
#                records with news_search_term populated (search keywords)
#                system_config key 'news_keywords' (global fallback keywords)
#     Output  →  records.news_items (JSON blob) on the record
#                WHERE slug = 'global-news-feed'.
#
#     The news_items blob is a JSON array of objects with shape:
#       [{"title": str, "timestamp": ISO-8601 str, "url": str}]
#
#   ERROR HANDLING (T9):
#     - Source Unreachable: ConnectionError/Timeout → "Unable to connect"
#     - Feed Parse Failed: non-200 or unparseable → "Failed to retrieve"
#     - No Matching Items: zero matches → "No news items found"
#     - Script Timeout: overall timeout → "Crawler timed out"
#     - Database Write Failed: SQLite exception → "Failed to save"
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each run replaces the news_items blob with fresh data.
#
#   QUIRKS:
#     - RSS/Atom feeds vary in format. This pipeline attempts to parse common
#       feed structures (RSS 2.0, Atom) and falls back to generic JSON APIs.
#     - If no sources have search keywords, the pipeline falls back to the
#       global 'news_keywords' config in system_config table.
#     - Sources that fail are skipped gracefully; successful results are still saved.
# =============================================================================

import json
import os
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Ensure package context is recognized when running directly from CLI
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from backend.middleware.logger_setup import setup_logger
from backend.scripts.helper_api import make_request

# Initialize central logging to /logs
logger = setup_logger(__file__)

# -----------------------------------------------------------------------------
# CONSTANTS
# -----------------------------------------------------------------------------

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "database.sqlite"
)

ANCHOR_SLUG = "global-news-feed"
PIPELINE_TIMEOUT_SECONDS = 240  # 4 minutes total allowed runtime
DEFAULT_USER_AGENT = "TheJesusWebsite/1.0.0 (https://github.com/thejesuswebsite; bot)"


# =============================================================================
# MAIN PIPELINE ENTRY POINT
# =============================================================================


def run_pipeline():
    """
    Trigger:  Run directly via CLI or via admin_api.py background thread.
    Function: Gathers search keywords and source URLs from the database,
              crawls each source, extracts matching news items, and writes
              the combined results to the anchor record.
    Output:   Updated records.news_items for slug='global-news-feed'.
              Errors are logged and surfaced via structured return value.
    """
    start_time = time.time()
    logger.info("=== News Aggregation Pipeline Started ===")

    if not os.path.exists(DB_PATH):
        logger.error("Database not found! Aborting.")
        return {"error": "Database not found at: " + DB_PATH}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # ---- Step 1: Collect search keywords ----
        keywords = _collect_search_keywords(conn)
        if not keywords:
            logger.warning("No search keywords found in any source or global config.")
            return {
                "error": (
                    "Error: No news items found matching the current search keywords."
                ),
                "items_collected": 0,
            }

        logger.info(f"Search keywords collected: {len(keywords)} keywords")

        # ---- Step 2: Collect source URLs ----
        sources = _collect_source_urls(conn)
        if not sources:
            logger.warning("No news sources configured in the database.")
            return {
                "error": (
                    "Error: No news sources configured. "
                    "Add sources in the News Sources dashboard."
                ),
                "items_collected": 0,
            }

        logger.info(f"News sources collected: {len(sources)} URLs")

        # ---- Step 3: Crawl each source and collect matching items ----
        all_items = []
        failed_sources = []

        for source in sources:
            source_url = source.get("url", "")
            source_name = source.get("name", source_url)

            if not source_url:
                continue

            # Check for pipeline timeout
            elapsed = time.time() - start_time
            if elapsed > PIPELINE_TIMEOUT_SECONDS:
                logger.warning(
                    f"Pipeline timed out after {PIPELINE_TIMEOUT_SECONDS}s. "
                    f"Collected {len(all_items)} items from processed sources."
                )
                all_items.append(
                    {
                        "title": (
                            f"[Pipeline Timeout] Partial crawl: "
                            f"{len(all_items)} items collected "
                            f"before timeout."
                        ),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "url": "",
                    }
                )
                break

            try:
                items = _crawl_source(source_url, source_name, keywords)
                if items:
                    all_items.extend(items)
                    logger.info(f"  [{source_name}] Found {len(items)} matching items.")
                else:
                    logger.info(f"  [{source_name}] No matching items found.")
            except Exception as exc:
                logger.error(f"  [{source_name}] Crawl failed: {exc}")
                failed_sources.append(source_name)

        # ---- Step 4: Check results ----
        if not all_items:
            logger.warning("No news items found matching the current search keywords.")
            return {
                "error": (
                    "Error: No news items found matching the current search keywords."
                ),
                "items_collected": 0,
                "failed_sources": failed_sources,
            }

        # ---- Step 5: Save to anchor record ----
        try:
            news_blob = json.dumps(all_items, ensure_ascii=False)
            cursor = conn.cursor()

            # Upsert: create the record if it doesn't exist
            cursor.execute("SELECT id FROM records WHERE slug = ?", (ANCHOR_SLUG,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE records
                    SET news_items = ?, updated_at = ?
                    WHERE slug = ?
                    """,
                    (news_blob, datetime.now(timezone.utc).isoformat(), ANCHOR_SLUG),
                )
            else:
                # Create the anchor record if missing
                from ulid import ULID

                record_id = str(ULID())
                cursor.execute(
                    """
                    INSERT INTO records (
                        id, title, slug, news_items,
                        created_at, updated_at, status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        "Global News Feed",
                        ANCHOR_SLUG,
                        news_blob,
                        datetime.now(timezone.utc).isoformat(),
                        datetime.now(timezone.utc).isoformat(),
                        "draft",
                    ),
                )

            conn.commit()
            logger.info(
                f"Saved {len(all_items)} news items to anchor record '{ANCHOR_SLUG}'."
            )

            result = {
                "status": "success",
                "items_collected": len(all_items),
                "sources_crawled": len(sources) - len(failed_sources),
                "sources_failed": len(failed_sources),
            }
            if failed_sources:
                result["failed_sources"] = failed_sources

            return result

        except sqlite3.Error as db_err:
            logger.error(f"Database write failed: {db_err}")
            return {
                "error": (
                    "Error: Failed to save news items to the "
                    "database. Write error on 'global-news-feed'."
                ),
                "items_collected": len(all_items),
            }

    except Exception as exc:
        logger.error(f"Pipeline unexpected error: {exc}")
        return {"error": f"News crawler error: {exc}"}

    finally:
        conn.close()
        elapsed = time.time() - start_time
        logger.info(f"=== News Aggregation Pipeline Completed in {elapsed:.1f}s ===")


# =============================================================================
# INTERNAL HELPERS
# =============================================================================


def _collect_search_keywords(conn):
    """
    Collects search keywords from all records that have news_search_term
    populated. Falls back to system_config 'news_keywords' if no per-record
    keywords are found.

    Args:
        conn: SQLite connection with row_factory set.

    Returns:
        list[str]: Deduplicated list of lowercase search keywords.
    """
    keywords = set()
    cursor = conn.cursor()

    # Collect from per-record news_search_term fields
    cursor.execute(
        "SELECT news_search_term FROM records "
        "WHERE news_search_term IS NOT NULL AND news_search_term != ''"
    )
    rows = cursor.fetchall()

    for row in rows:
        try:
            terms_data = json.loads(row["news_search_term"])
            if isinstance(terms_data, list):
                for term in terms_data:
                    if isinstance(term, str) and term.strip():
                        keywords.add(term.strip().lower())
            elif isinstance(terms_data, str):
                for term in terms_data.split(","):
                    if term.strip():
                        keywords.add(term.strip().lower())
            elif isinstance(terms_data, dict):
                for val in terms_data.values():
                    if isinstance(val, str) and val.strip():
                        keywords.add(val.strip().lower())
        except (json.JSONDecodeError, TypeError):
            # Plain comma-separated string fallback
            raw = row["news_search_term"]
            if raw and isinstance(raw, str):
                for term in raw.split(","):
                    if term.strip():
                        keywords.add(term.strip().lower())

    # Fallback: check system_config for global 'news_keywords'
    if not keywords:
        cursor.execute("SELECT value FROM system_config WHERE key = 'news_keywords'")
        row = cursor.fetchone()
        if row and row["value"]:
            try:
                global_terms = json.loads(row["value"])
                if isinstance(global_terms, list):
                    for term in global_terms:
                        if isinstance(term, str) and term.strip():
                            keywords.add(term.strip().lower())
            except (json.JSONDecodeError, TypeError):
                pass

    return sorted(keywords)


def _collect_source_urls(conn):
    """
    Collects source URLs from all records that have news_sources populated.

    Args:
        conn: SQLite connection with row_factory set.

    Returns:
        list[dict]: List of source objects with 'url' and 'name' keys.
    """
    sources = []
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, title, slug, news_sources FROM records "
        "WHERE news_sources IS NOT NULL AND news_sources != ''"
    )
    rows = cursor.fetchall()

    for row in rows:
        try:
            source_data = json.loads(row["news_sources"])
            url = source_data.get("url") or source_data.get("source_url") or ""
            name = (
                source_data.get("name")
                or source_data.get("label")
                or row["title"]
                or row["slug"]
                or url
            )
            if url:
                sources.append({"url": url, "name": name})
        except (json.JSONDecodeError, TypeError):
            # Treat the raw value as a URL
            raw = row["news_sources"]
            if raw and isinstance(raw, str) and raw.startswith("http"):
                sources.append(
                    {
                        "url": raw,
                        "name": row["title"] or row["slug"] or raw,
                    }
                )

    return sources


def _crawl_source(source_url, source_name, keywords):
    """
    Crawls a single news source URL (RSS feed or JSON API), extracts items
    whose titles match any of the given keywords.

    Args:
        source_url (str):  The URL of the RSS feed or news API endpoint.
        source_name (str): Human-readable name of the source (for logging).
        keywords (list[str]): List of lowercase search keywords to match against.

    Returns:
        list[dict]: Matching news items in the standard shape:
            [{"title": str, "timestamp": ISO-8601 str, "url": str}]

    Raises:
        ConnectionError: If the source is unreachable.
        ValueError: If the feed cannot be parsed.
    """
    # ---- Fetch the source ----
    response = make_request(source_url, method="GET")

    if response is None:
        raise ConnectionError(
            f"Error: Unable to connect to news source '{source_url}'. "
            f"Check network or source availability."
        )

    # ---- Parse the response ----
    items = []

    # Route: JSON dict or XML string/bytes
    if isinstance(response, dict):
        # JSON API response — look for common news API shapes
        if response:
            items = _parse_json_feed(response, source_url, keywords)
    elif isinstance(response, (str, bytes)):
        # RSS/Atom XML feed — parse with ElementTree
        if response:
            items = _parse_rss_feed(response, source_url, keywords)
    else:
        logger.info(f"  [{source_name}] Unexpected response type: {type(response)}")

    # Only raise if BOTH parsers returned zero items
    if not items:
        raise ValueError(
            f"Error: Failed to retrieve news feed from '{source_url}'. "
            f"Status: response parsed but no items extracted."
        )

    return items


def _parse_rss_feed(raw_text, source_url, keywords):
    """
    Parses an RSS 2.0 or Atom XML feed, extracting items that match keywords.

    RSS 2.0 structure:
      <rss version="2.0"><channel><item>
        <title>...</title><link>...</link><pubDate>...</pubDate>
      </item></channel></rss>

    Atom structure:
      <feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <title>...</title><link href="..."/><published>...</published>
      </entry></feed>

    Args:
        raw_text (str|bytes): Raw XML response body.
        source_url (str): The originating source URL (for error context).
        keywords (list[str]): Lowercase keywords to match.

    Returns:
        list[dict]: Matching items in standard shape.
    """
    items = []

    # ElementTree handles both str and bytes input
    try:
        root = ET.fromstring(raw_text)
    except ET.ParseError as exc:
        logger.warning(f"  XML parse error for '{source_url}': {exc}")
        return items

    # ---- Detect feed type and collect candidate elements ----
    # RSS 2.0: <item> elements anywhere under <channel>
    # Atom:    <entry> elements (handle namespace {http://www.w3.org/2005/Atom})
    candidates = []

    # Try RSS <item> elements first
    rss_items = root.findall(".//item")
    if rss_items:
        candidates = rss_items
    else:
        # Try Atom <entry> — may have namespace
        # Strip namespace by searching for local tag 'entry'
        atom_entries = []
        for el in root.iter():
            tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if tag == "entry":
                atom_entries.append(el)
        candidates = atom_entries

    # ---- Extract fields from each candidate ----
    for el in candidates:
        # Strip namespaces from child tags for lookup
        def _child_text(parent, *tag_names):
            """Return the text content of the first child matching any tag name."""
            for child in parent:
                child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if child_tag in tag_names:
                    return child.text or ""
            return ""

        def _child_attr(parent, *tag_names, attr="href"):
            """Return the attribute value of the first child matching any tag name."""
            for child in parent:
                child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if child_tag in tag_names:
                    return child.get(attr) or ""
            return ""

        title = _child_text(el, "title")
        url = _child_text(el, "link") or _child_attr(el, "link", attr="href") or ""
        timestamp = _child_text(el, "pubDate", "published", "updated", "date") or ""

        if not title:
            continue

        # Check if any keyword matches the title (case-insensitive)
        title_lower = title.lower()
        matches = any(kw in title_lower for kw in keywords)

        if matches:
            items.append(
                {
                    "title": title,
                    "timestamp": _normalize_timestamp(timestamp),
                    "url": url or "",
                    "source": source_url,
                }
            )

    return items


def _parse_json_feed(data, source_url, keywords):
    """
    Parses a JSON news API response, extracting items that match keywords.

    Handles common news API shapes:
      - {"articles": [{"title": ..., "publishedAt": ..., "url": ...}]}
      - {"items": [{"title": ..., "timestamp": ..., "link": ...}]}
      - [{"title": ..., "date": ..., "url": ...}]

    Args:
        data (dict|list): The parsed JSON response.
        source_url (str): The originating source URL (for error context).
        keywords (list[str]): Lowercase keywords to match.

    Returns:
        list[dict]: Matching items in standard shape.
    """
    items = []

    # Normalize to a list of candidate items
    candidates = []
    if isinstance(data, list):
        candidates = data
    elif isinstance(data, dict):
        # Try common wrapper keys
        for key in ("articles", "items", "news", "results", "data", "posts"):
            if key in data and isinstance(data[key], list):
                candidates = data[key]
                break
        if not candidates:
            # Maybe the dict itself is a feed descriptor
            candidates = [data]

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue

        title = (
            candidate.get("title")
            or candidate.get("headline")
            or candidate.get("name")
            or ""
        )
        url = (
            candidate.get("url") or candidate.get("link") or candidate.get("href") or ""
        )
        timestamp = (
            candidate.get("publishedAt")
            or candidate.get("timestamp")
            or candidate.get("date")
            or candidate.get("published")
            or candidate.get("created_at")
            or datetime.now(timezone.utc).isoformat()
        )

        if not title:
            continue

        # Check if any keyword matches the title (case-insensitive)
        title_lower = title.lower()
        matches = any(kw in title_lower for kw in keywords)

        if matches:
            items.append(
                {
                    "title": title,
                    "timestamp": _normalize_timestamp(timestamp),
                    "url": url or "",
                    "source": source_url,
                }
            )

    return items


def _normalize_timestamp(raw_timestamp):
    """
    Converts various timestamp formats to ISO-8601.

    Args:
        raw_timestamp (str): Raw timestamp from the feed.

    Returns:
        str: ISO-8601 formatted timestamp string.
    """
    if not raw_timestamp:
        return datetime.now(timezone.utc).isoformat()

    # Already ISO-8601
    if isinstance(raw_timestamp, str) and "T" in raw_timestamp:
        return raw_timestamp

    # Try common formats
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
    ):
        try:
            dt = datetime.strptime(str(raw_timestamp), fmt)
            return dt.isoformat()
        except ValueError:
            continue

    # Fallback: return as-is or use current time
    return str(raw_timestamp)


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    result = run_pipeline()
    if result:
        if "error" in result:
            logger.error(f"Pipeline finished with error: {result['error']}")
            print(json.dumps(result))
            sys.exit(1)
        else:
            logger.info(f"Pipeline finished successfully: {result}")
            print(json.dumps(result))
    else:
        logger.error("Pipeline returned no result.")
        sys.exit(1)
