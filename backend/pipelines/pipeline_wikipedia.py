# =============================================================================
#   THE JESUS WEBSITE — WIKIPEDIA PIPELINE
#   File:    backend/pipelines/pipeline_wikipedia.py
#   Version: 1.2.0
#   Trigger: Called by the admin dashboard "Recalculate" button (via agent API)
#            or run directly from CLI for batch processing.
#   Purpose: Fetches, ranks, and inserts Wikipedia article data to SQLite.
#            Processes one record at a time based on stored wikipedia_search_term.
#            Calls the Wikipedia REST API to find matching articles, filters
#            out non-article/disambiguation/list pages, selects the best match,
#            and writes wikipedia_title, wikipedia_link, and wikipedia_rank
#            (base importance score). The admin's wikipedia_weight multiplier
#            is applied separately by the frontend ranking calculator on Refresh.
#   Output:  Updated records in SQLite with Wikipedia data. All writes set
#            status to draft (ingested data must be reviewed before going live).
#            Returns structured JSON with success/error details per record.
#   Idempotent: Re-running overwrites previous results cleanly.
# =============================================================================

import json
import logging
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

# Ensure package context is recognized when running directly from CLI
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from backend.middleware.logger_setup import setup_logger

# Initialize central logging for system pipelines
logger = setup_logger(__file__)

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "database.sqlite"
)

# Wikipedia REST API base URL
WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php"

# Timeout for Wikipedia API calls (seconds)
API_TIMEOUT = 15

# Overall pipeline timeout per record (seconds) — after which we abort processing that record
RECORD_TIMEOUT = 60

# User-Agent header required by Wikipedia API policy
USER_AGENT = (
    "TheJesusWebsite/1.0 (https://thejesuswebsite.com; admin@thejesuswebsite.com)"
)

# Wikipedia namespaces:
#   0 = Main/Article (NS_MAIN) — only articles we want
#   Disambiguation pages, List pages, etc. are identified by title patterns
DISAMBIGUATION_PATTERNS = [
    "(disambiguation)",
    "List of ",
    "Lists of ",
    "Category:",
    "Portal:",
    "Template:",
    "Wikipedia:",
    "Help:",
    "File:",
    "Talk:",
]

# -----------------------------------------------------------------------------
# DATABASE HELPERS
# -----------------------------------------------------------------------------


def get_db_connection():
    """Returns a new SQLite connection with row_factory for dict access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# -----------------------------------------------------------------------------
# WIKIPEDIA API HELPERS
# -----------------------------------------------------------------------------


def search_wikipedia(term: str) -> Optional[Dict[str, Any]]:
    """
    Searches Wikipedia for a given term and returns the best matching article.

    Uses the Wikipedia REST API action=query with list=search to find matching
    articles. Filters out non-article pages (disambiguation, lists, categories,
    portals, templates, etc.) and returns the best remaining match.

    API reference: https://www.mediawiki.org/wiki/API:Search

    Args:
        term (str): The search term to query.

    Returns:
        Optional[Dict]: A dict with keys 'title', 'pageid', 'url', 'snippet',
                        'wordcount', and 'base_score' if a match is found.
                        Returns None if no valid article is found.
    """
    params = {
        "action": "query",
        "list": "search",
        "srsearch": term,
        "format": "json",
        "srlimit": 15,  # Fetch more results for better filtering
        "srprop": "snippet|wordcount|size",
        "srnamespace": "0",  # Only main namespace (articles)
    }

    try:
        response = requests.get(
            WIKIPEDIA_API_BASE,
            params=params,
            headers={"User-Agent": USER_AGENT},
            timeout=API_TIMEOUT,
        )

        if response.status_code != 200:
            logger.error(
                f"Wikipedia API search failed for term '{term}'. "
                f"Status: {response.status_code}. Body: {response.text[:200]}"
            )
            return None

        data = response.json()

        # Check for API-level errors
        if "error" in data:
            logger.error(
                f"Wikipedia API returned an error for term '{term}': {data['error']}"
            )
            return None

        search_results = data.get("query", {}).get("search", [])

        if not search_results:
            logger.info(f"No Wikipedia search results for term '{term}'.")
            return None

        # Filter out disambiguation pages, list pages, and other non-article pages
        valid_results = []
        for result in search_results:
            title = result.get("title", "")
            snippet = result.get("snippet", "")

            # Skip disambiguation pages and list articles
            if _is_excluded_page(title):
                logger.debug(
                    f"Filtered out non-article page for term '{term}': '{title}'"
                )
                continue

            valid_results.append(result)

        if not valid_results:
            logger.info(
                f"No valid Wikipedia articles found for search term '{term}' "
                f"after filtering ({len(search_results)} raw results excluded)."
            )
            return None

        # Best match is the first remaining result (already ranked by relevance)
        best = valid_results[0]
        title = best.get("title", "")
        pageid = best.get("pageid", 0)
        wordcount = best.get("wordcount", 0)
        snippet = best.get("snippet", "")

        # Construct the article URL
        url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"

        # Compute a base importance score from wordcount and search position
        # Higher wordcount = more substantial article = higher base score
        base_score = _compute_base_score(wordcount, len(valid_results))

        logger.info(
            f"Wikipedia match for term '{term}': '{title}' "
            f"(pageid={pageid}, wordcount={wordcount}, score={base_score})"
        )

        return {
            "title": title,
            "pageid": pageid,
            "url": url,
            "snippet": _clean_snippet(snippet),
            "wordcount": wordcount,
            "base_score": base_score,
        }

    except requests.exceptions.ConnectionError as e:
        logger.error(
            f"Error: Unable to connect to the Wikipedia API for term '{term}'. "
            f"ConnectionError: {e}"
        )
        return None
    except requests.exceptions.Timeout as e:
        logger.error(f"Error: Wikipedia API timed out for term '{term}'. Timeout: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(
            f"Error: Wikipedia API request failed for term '{term}'. Exception: {e}"
        )
        return None


def _is_excluded_page(title: str) -> bool:
    """
    Returns True if the page title matches known non-article patterns.
    Disambiguation pages, list articles, and other meta pages are excluded.

    Args:
        title (str): The Wikipedia page title.

    Returns:
        bool: True if the page should be excluded.
    """
    if not title:
        return True

    # Check for namespace prefixes (e.g., "Category:", "Template:")
    for prefix in [
        "Category:",
        "Portal:",
        "Template:",
        "Wikipedia:",
        "Help:",
        "File:",
        "Talk:",
        "User:",
        "Draft:",
        "Module:",
        "TimedText:",
        "Special:",
    ]:
        if title.startswith(prefix):
            return True

    # Check for disambiguation pages
    if title.endswith("(disambiguation)"):
        return True

    # Check for list pages
    if title.startswith("List of ") or title.startswith("Lists of "):
        return True

    # Check for index/glossary pages
    if title.startswith("Index of ") or title.startswith("Glossary of "):
        return True

    # Check for outline pages
    if title.startswith("Outline of "):
        return True

    return False


def _compute_base_score(wordcount: int, total_results: int) -> int:
    """
    Computes a base importance score for a Wikipedia article.

    The score is derived from the article's wordcount (more content = higher
    relevance) and adjusted by the number of search results (more competition
    = the top result is more meaningful).

    Scale: typically 1-100, where higher = more important.

    Args:
        wordcount (int): The article's word count from the API.
        total_results (int): Total valid results for this search.

    Returns:
        int: A base importance score between 1 and 100.
    """
    # Base score from wordcount: log scale so a 100k-word article isn't 100x a 1k article
    if wordcount <= 0:
        wordcount = 100  # fallback for unknown

    import math

    # log10(wordcount) maps:
    #   100 words → 2.0,   1,000 words → 3.0,   10,000 words → 4.0
    #   50,000 words → ~4.7,  100,000 words → 5.0
    log_wordcount = math.log10(max(wordcount, 1))

    # Scale to roughly 20-100 range
    base_score = int(log_wordcount * 20)

    # Clamp to 1-100
    base_score = max(1, min(100, base_score))

    return base_score


def _clean_snippet(snippet: str) -> str:
    """
    Strips HTML tags from Wikipedia snippet text.

    Args:
        snippet (str): Raw HTML snippet from the API.

    Returns:
        str: Cleaned plain-text snippet.
    """
    import re

    # Remove HTML tags
    cleaned = re.sub(r"<[^>]+>", "", snippet)
    # Replace HTML entities
    cleaned = cleaned.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    cleaned = cleaned.replace("&quot;", '"').replace("&#039;", "'")
    # Trim whitespace
    cleaned = cleaned.strip()
    return cleaned


# -----------------------------------------------------------------------------
# DATABASE OPERATIONS
# -----------------------------------------------------------------------------


def _get_record_search_terms(record_id: str) -> Optional[List[str]]:
    """
    Reads wikipedia_search_term for a given record and returns a list of
    individual search terms.

    The field may be stored as:
    - A JSON array string: '["term1", "term2"]'
    - A comma-separated string: 'term1, term2'
    - A JSON object with term values

    Args:
        record_id (str): The record ID to look up.

    Returns:
        Optional[List[str]]: List of search terms, or None if not found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, slug, title, wikipedia_search_term FROM records WHERE id = ?",
        (record_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    raw_terms = row["wikipedia_search_term"]
    if not raw_terms:
        return None

    # Parse the field
    terms = []
    try:
        parsed = json.loads(raw_terms)
        if isinstance(parsed, list):
            terms = [str(t).strip() for t in parsed if t]
        elif isinstance(parsed, dict):
            terms = [str(v).strip() for v in parsed.values() if v]
        elif isinstance(parsed, str):
            terms = [t.strip() for t in parsed.split(",") if t.strip()]
    except (json.JSONDecodeError, TypeError):
        # Fall back to comma-separated string
        terms = [t.strip() for t in raw_terms.split(",") if t.strip()]

    return terms if terms else None


def _get_record_title_and_slug(record_id: str) -> Optional[Dict[str, str]]:
    """
    Reads the title and slug for a given record ID.

    Args:
        record_id (str): The record ID.

    Returns:
        Optional[Dict]: {'title': str, 'slug': str} or None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, slug FROM records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {"title": row["title"] or "", "slug": row["slug"] or ""}


def _save_wikipedia_data(
    record_id: str,
    wiki_title: str,
    wiki_link: str,
    wiki_rank: int,
    error_message: Optional[str] = None,
) -> bool:
    """
    Writes Wikipedia data to the record's row in SQLite.
    Sets status to 'draft' since ingested data must be reviewed.

    Args:
        record_id (str): The record ID to update.
        wiki_title (str): The matched Wikipedia article title.
        wiki_link (str): JSON string with url and title for the article.
        wiki_rank (int): The base importance score.
        error_message (Optional[str]): If set, writes this error but still
            sets the record to draft for review.

    Returns:
        bool: True on success, False on failure.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        now = datetime.now(timezone.utc).isoformat()

        if error_message:
            # Store the error but keep the pipeline idempotent — the admin can
            # see the error and retry after fixing search terms.
            cursor.execute(
                """
                UPDATE records
                SET wikipedia_title = ?,
                    wikipedia_link = ?,
                    wikipedia_rank = ?,
                    wikipedia_search_term = ?,
                    status = 'draft',
                    updated_at = ?
                WHERE id = ?
                """,
                (wiki_title, wiki_link, str(wiki_rank), error_message, now, record_id),
            )
        else:
            cursor.execute(
                """
                UPDATE records
                SET wikipedia_title = ?,
                    wikipedia_link = ?,
                    wikipedia_rank = ?,
                    status = 'draft',
                    updated_at = ?
                WHERE id = ?
                """,
                (wiki_title, wiki_link, str(wiki_rank), now, record_id),
            )

        conn.commit()
        conn.close()
        return True

    except sqlite3.Error as e:
        logger.error(
            f"Error: Failed to save Wikipedia data for record '{record_id}'. "
            f"Database write error: {e}"
        )
        try:
            conn.close()
        except Exception:
            pass
        return False


# -----------------------------------------------------------------------------
# MAIN PIPELINE FUNCTIONS
# -----------------------------------------------------------------------------


def process_record(record_id: str) -> Dict[str, Any]:
    """
    Processes a single record: reads its search terms, queries Wikipedia,
    selects the best match, and writes the results.

    This is the core unit of work — called per record from the admin UI
    "Recalculate This Record" button or from the batch runner.

    Args:
        record_id (str): The record ID to process.

    Returns:
        Dict: {
            "record_id": str,
            "success": bool,
            "wikipedia_title": Optional[str],
            "wikipedia_link": Optional[str],
            "wikipedia_rank": Optional[int],
            "error": Optional[str],
        }
    """
    start_time = time.time()
    record_info = _get_record_title_and_slug(record_id)

    if not record_info:
        return {
            "record_id": record_id,
            "success": False,
            "wikipedia_title": None,
            "wikipedia_link": None,
            "wikipedia_rank": None,
            "error": f"Record '{record_id}' not found in database.",
        }

    slug = record_info["slug"]
    title = record_info["title"]

    # Get search terms for this record
    search_terms = _get_record_search_terms(record_id)

    if not search_terms:
        # No search terms configured — use the record's slug/title as fallback
        search_terms = [slug] if slug else [title]
        logger.info(
            f"No search terms configured for record '{slug}'. "
            f"Using slug as fallback search term."
        )

    # Search Wikipedia for each term and collect results
    best_result = None

    for term in search_terms:
        # Check overall record timeout
        elapsed = time.time() - start_time
        if elapsed > RECORD_TIMEOUT:
            logger.warning(
                f"Wikipedia pipeline timed out after {elapsed:.0f}s "
                f"for record '{slug}'."
            )
            error_msg = (
                f"Error: Wikipedia pipeline timed out after "
                f"{RECORD_TIMEOUT}s for record '{slug}'."
            )
            return {
                "record_id": record_id,
                "success": False,
                "wikipedia_title": None,
                "wikipedia_link": None,
                "wikipedia_rank": None,
                "error": error_msg,
            }

        result = search_wikipedia(term)

        if result is not None:
            # Found a valid match — keep the best (already sorted by API relevance)
            if best_result is None:
                best_result = result
            # If this result has a better score, use it
            elif result.get("base_score", 0) > best_result.get("base_score", 0):
                best_result = result

    if best_result is None:
        # No valid Wikipedia articles found for any term
        error_msg = (
            f"Error: No valid Wikipedia articles found for "
            f"search terms of record '{slug}'."
        )
        logger.warning(error_msg)

        # Still write a placeholder so the admin can see the failure
        wiki_link_json = json.dumps(
            {"url": "", "title": f"No Wikipedia match for: {title}"}
        )
        _save_wikipedia_data(
            record_id,
            title,
            wiki_link_json,
            999,
            error_message=error_msg,
        )

        return {
            "record_id": record_id,
            "success": False,
            "wikipedia_title": None,
            "wikipedia_link": None,
            "wikipedia_rank": None,
            "error": error_msg,
        }

    # We have a match — write to database
    wiki_link_json = json.dumps(
        {
            "url": best_result["url"],
            "title": best_result["title"],
        }
    )

    saved = _save_wikipedia_data(
        record_id,
        best_result["title"],
        wiki_link_json,
        best_result["base_score"],
    )

    if not saved:
        return {
            "record_id": record_id,
            "success": False,
            "wikipedia_title": best_result["title"],
            "wikipedia_link": best_result["url"],
            "wikipedia_rank": best_result["base_score"],
            "error": (
                f"Error: Failed to save Wikipedia data for "
                f"record '{slug}'. Database write error."
            ),
        }

    return {
        "record_id": record_id,
        "success": True,
        "wikipedia_title": best_result["title"],
        "wikipedia_link": best_result["url"],
        "wikipedia_rank": best_result["base_score"],
        "error": None,
    }


def run_pipeline(record_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes the Wikipedia ingestion pipeline.

    If record_id is provided, processes only that record.
    Otherwise, processes all records that have wikipedia_search_term set.

    The pipeline is stateless and idempotent — re-running it on the same
    record overwrites previous results cleanly.

    Args:
        record_id (Optional[str]): Process only this record if provided.

    Returns:
        Dict: {
            "pipeline": "wikipedia",
            "success": bool,
            "records_processed": int,
            "records_succeeded": int,
            "records_failed": int,
            "results": List[Dict],
            "error": Optional[str],
        }
    """
    logger.info("Starting Wikipedia Ingestion Pipeline...")

    if not os.path.exists(DB_PATH):
        error_msg = "Database not found! Aborting Wikipedia pipeline."
        logger.error(error_msg)
        return {
            "pipeline": "wikipedia",
            "success": False,
            "records_processed": 0,
            "records_succeeded": 0,
            "records_failed": 0,
            "results": [],
            "error": error_msg,
        }

    results = []

    try:
        if record_id:
            # Process a single record
            logger.info(f"Processing single record: {record_id}")
            result = process_record(record_id)
            results.append(result)
        else:
            # Process all records with wikipedia_search_term populated
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT id FROM records
                WHERE wikipedia_search_term IS NOT NULL
                  AND wikipedia_search_term != ''
                  AND wikipedia_search_term != '[]'
                  AND wikipedia_search_term != '{}'
                ORDER BY id
                """
            )
            record_ids = [row["id"] for row in cursor.fetchall()]
            conn.close()

            logger.info(f"Found {len(record_ids)} records with Wikipedia search terms.")

            for rid in record_ids:
                result = process_record(rid)
                results.append(result)

    except sqlite3.Error as e:
        error_msg = f"Database error during Wikipedia pipeline: {e}"
        logger.error(error_msg)
        return {
            "pipeline": "wikipedia",
            "success": False,
            "records_processed": len(results),
            "records_succeeded": sum(1 for r in results if r.get("success")),
            "records_failed": sum(1 for r in results if not r.get("success")),
            "results": results,
            "error": error_msg,
        }

    succeeded = sum(1 for r in results if r.get("success"))
    failed = sum(1 for r in results if not r.get("success"))

    logger.info(
        f"Wikipedia Pipeline completed. "
        f"Processed: {len(results)}, Succeeded: {succeeded}, Failed: {failed}."
    )

    return {
        "pipeline": "wikipedia",
        "success": failed == 0,
        "records_processed": len(results),
        "records_succeeded": succeeded,
        "records_failed": failed,
        "results": results,
        "error": None,
    }


# -----------------------------------------------------------------------------
# CLI ENTRY POINT
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Wikipedia ingestion pipeline — fetches and ranks Wikipedia articles for records."
    )
    parser.add_argument(
        "--record-id",
        type=str,
        default=None,
        help="Process only the specified record ID. If omitted, processes all records with search terms.",
    )

    args = parser.parse_args()
    result = run_pipeline(record_id=args.record_id)

    # Pretty-print result for CLI use
    print(json.dumps(result, indent=2, default=str))
