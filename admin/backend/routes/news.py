# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: NEWS & BLOG
#   File:    admin/backend/routes/news.py
#   Version: 1.0.0
#   Purpose: Blog post listing/deletion, news items listing, and news crawl
#            trigger.
# =============================================================================

import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from .shared import NewsCrawlRequest, get_db_connection, logger, verify_token

router = APIRouter()


@router.get("/api/admin/blogposts")
async def get_blogposts(admin_data: dict = Depends(verify_token)):
    """
    Returns all blog post records, ordered by created_at DESC.
    Uses type discriminator with legacy fallback for pre-migration data.
    Consumed by plan_dashboard_blog_posts.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, slug, snippet, blogposts, created_at, updated_at, status
            FROM records
            WHERE type = 'blog_post' OR blogposts IS NOT NULL
            ORDER BY created_at DESC
            """
        )
        blogposts = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return blogposts
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch blog posts: " + str(e)
        )


@router.delete("/api/admin/records/{record_id}/blogpost")
async def delete_blogpost(record_id: str, admin_data: dict = Depends(verify_token)):
    """
    Sets the record's blogposts column to NULL (removes blog content
    without deleting the record). Returns 200 on success.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify the record exists
        cursor.execute("SELECT id FROM records WHERE id = ?", (record_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Record not found.")

        cursor.execute(
            "UPDATE records SET blogposts = NULL, updated_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), record_id),
        )
        conn.commit()
        conn.close()
        return {"message": "Blog post content removed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to remove blog post: " + str(e)
        )


@router.post("/api/admin/wikipedia/run", status_code=202)
async def trigger_wikipedia_pipeline(
    body: Optional[dict] = None,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers pipeline_wikipedia.py asynchronously.
    Accepts optional JSON body with "slug" field for single-record processing.
    If no slug provided, processes ALL records with wikipedia_search_term set.
    Returns 202 Accepted with status and started_at timestamp.
    """
    started_at = datetime.now(timezone.utc).isoformat()
    record_slug = (body or {}).get("slug", "") or ""

    def _run_wikipedia_pipeline():
        """Run the Wikipedia pipeline in a background thread."""
        try:
            from backend.pipelines.pipeline_wikipedia import run_pipeline

            if record_slug:
                # Look up the record by slug to get its ULID
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM records WHERE slug = ?", (record_slug,))
                row = cursor.fetchone()
                conn.close()

                if row:
                    result = run_pipeline(record_id=row["id"])
                    msg = f"Wikipedia pipeline done for slug '{record_slug}': {result}"
                    logger.info(msg)
                else:
                    msg = f"Wikipedia pipeline: slug '{record_slug}' not found."
                    logger.error(msg)
            else:
                result = run_pipeline()
                logger.info(f"Wikipedia pipeline completed (all records): {result}")
        except Exception as exc:
            logger.error(f"Wikipedia pipeline background task failed: {exc}")

    thread = threading.Thread(target=_run_wikipedia_pipeline, daemon=True)
    thread.start()

    return {
        "status": "accepted",
        "message": "Wikipedia pipeline triggered successfully.",
        "started_at": started_at,
        "record_slug": record_slug or None,
    }


@router.get("/api/admin/news/items")
async def get_news_items(admin_data: dict = Depends(verify_token)):
    """
    Returns records where type = 'news_article' OR news_items IS NOT NULL,
    ordered by created_at DESC. Uses a type discriminator to include
    news_article records even if news_items is NULL.
    Consumed by plan_dashboard_news_sources.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, slug, snippet, news_items, news_item_title,
                   news_item_link, news_sources, news_search_term,
                   last_crawled, source_url, keywords, parent_id,
                   created_at, updated_at, status, type, sub_type
            FROM records
            WHERE (type = 'news_article' OR news_items IS NOT NULL)
            ORDER BY created_at DESC
            """
        )
        news = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return news
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch news items: " + str(e)
        )


@router.post("/api/admin/news/crawl")
async def trigger_news_crawl(
    body: NewsCrawlRequest | None = None,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers pipeline_news.py asynchronously.
    Accepts optional JSON body with:
      - source_url (str): RSS/feed URL to crawl (from sidebar).
      - search_terms (list[str]): keywords to search for (from sidebar).
    If not provided, pipeline falls back to database values.
    Returns 202 Accepted with status and started_at timestamp.
    """
    started_at = datetime.now(timezone.utc).isoformat()

    # Extract optional parameters from request body
    source_url = body.source_url if body else None
    search_terms = body.search_terms if body else None

    def _run_news_pipeline():
        """Run the news pipeline in a background thread."""
        try:
            from backend.pipelines.pipeline_news import (
                run_pipeline as run_news_pipeline,
            )

            kwargs = {}
            if source_url is not None:
                kwargs["source_url"] = source_url
            if search_terms is not None:
                kwargs["search_terms"] = search_terms

            result = run_news_pipeline(**kwargs)
            # Log the result for retrieval via agent_logs or monitoring
            logger.info(f"News crawl completed: {result}")
        except Exception as exc:
            logger.error(f"News crawl background task failed: {exc}")

    thread = threading.Thread(target=_run_news_pipeline, daemon=True)
    thread.start()

    return {
        "status": "accepted",
        "message": "News crawl triggered successfully.",
        "started_at": started_at,
    }
