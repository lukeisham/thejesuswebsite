# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: NEWS & BLOG
#   File:    admin/backend/routes/news.py
#   Version: 1.0.0
#   Purpose: Blog post listing/deletion, news items listing, and news crawl
#            trigger.
# =============================================================================

import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from .shared import get_db_connection, logger, verify_token

router = APIRouter()


@router.get("/api/admin/blogposts")
async def get_blogposts(admin_data: dict = Depends(verify_token)):
    """
    Returns all records where blogposts column is NOT NULL,
    ordered by created_at DESC. Consumed by plan_dashboard_blog_posts.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, slug, snippet, blogposts, created_at, updated_at, status
            FROM records
            WHERE blogposts IS NOT NULL
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


@router.get("/api/admin/news/items")
async def get_news_items(admin_data: dict = Depends(verify_token)):
    """
    Returns all records where news_items column is NOT NULL,
    ordered by created_at DESC. Consumed by plan_dashboard_news_sources.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, slug, snippet, news_items, news_sources,
                   news_search_term, created_at, updated_at, status
            FROM records
            WHERE news_items IS NOT NULL
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
async def trigger_news_crawl(admin_data: dict = Depends(verify_token)):
    """
    Triggers pipeline_news.py asynchronously.
    Returns 202 Accepted with status and started_at timestamp.
    """
    started_at = datetime.now(timezone.utc).isoformat()

    def _run_news_pipeline():
        """Run the news pipeline in a background thread."""
        try:
            from backend.pipelines.pipeline_news import (
                run_pipeline as run_news_pipeline,
            )

            result = run_news_pipeline()
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
