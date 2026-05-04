# =============================================================================
#   THE JESUS WEBSITE — NEWS PIPELINE
#   File:    backend/pipelines/pipeline_news.py
#   Version: 1.1.0
#   Purpose: Crawls, ranks, and inserts current archaeological or
#            historical news events.
#
#   DATA MAPPING:
#     Source  →  RSS feeds or external News APIs
#                 (mock: hardcoded sample item).
#     Output  →  records.news_items (JSON blob) on the record
#                 WHERE slug = 'global-news-feed'.
#
#     The news_items blob is a JSON array of objects with shape:
#       [{"title": str, "timestamp": ISO-8601 str, "url": str}]
#
#   QUIRK:
#     This pipeline targets a single "anchor" record with slug='global-news-feed'.
#     If no record has that slug, the UPDATE silently affects 0 rows (no error).
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each run replaces the news_items blob with fresh data.
# =============================================================================

import json
import os
import sqlite3
import sys
from datetime import datetime

# Ensure package context is recognized when running directly from CLI
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "database.sqlite"
)


def process_news_feeds():
    """
    Mock integration for polling RSS feeds or external News APIs for
    archaeological and historical findings relevant to the database records.

    In production, replace with live RSS/API calls via backend/scripts/helper_api.py.
    Expected return shape: [{"title": str, "timestamp": ISO-8601 str, "url": str}]
    """
    logger.info("Polling verified Historical News Sources...")
    return [
        {
            "title": "New findings at Pool of Siloam",
            "timestamp": "2026-03-20T00:00:00Z",
            "url": "https://example.com/news/siloam-2026",
        }
    ]


def run_pipeline():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Polls news sources and writes a fresh JSON blob to the news anchor record.
    Output:   Updated records.news_items for slug='global-news-feed'.
    """
    logger.info("Starting News Aggregation Pipeline...")

    if not os.path.exists(DB_PATH):
        logger.error("Database not found! Aborting.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # In a fully realized system, this updates the specific "news_items" JSON blob
    # of a specialized Record ID driving the general News page feed.
    fresh_news = process_news_feeds()
    news_blob = json.dumps(fresh_news)

    # E.g. where slug='global-news-feed' or similar root record tracking news.
    cursor.execute(
        """
        UPDATE records
        SET news_items = ?,
            updated_at = ?
        WHERE slug = 'global-news-feed'
    """,
        (news_blob, datetime.utcnow().isoformat()),
    )

    conn.commit()
    conn.close()
    logger.info("News Aggregation Pipeline completed.")


if __name__ == "__main__":
    run_pipeline()
