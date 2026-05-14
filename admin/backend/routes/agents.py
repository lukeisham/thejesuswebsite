# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: AGENTS
#   File:    admin/backend/routes/agents.py
#   Version: 1.0.0
#   Purpose: Agent run trigger and agent log retrieval endpoints.
# =============================================================================

import json
import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.scripts.agent_client import search_web

from .shared import AgentRunRequest, get_db_connection, logger, verify_token

router = APIRouter()


@router.post("/api/admin/agent/run", status_code=202)
async def trigger_agent_run(
    body: AgentRunRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers a DeepSeek agent pipeline for a specific record.
    Accepts JSON body: {"pipeline": "academic_challenges" | "popular_challenges",
    "slug": str}.

    The endpoint:
    1. Verifies admin session via auth_utils (done by Depends).
    2. Looks up the record's search terms from the appropriate column.
    3. Spawns the agent run asynchronously (returns 202 Accepted immediately).
    4. Returns {"run_id": int, "status": "running"}.
    """
    valid_pipelines = {
        "academic_challenges",
        "popular_challenges",
    }

    if body.pipeline not in valid_pipelines:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline. Must be one of: {', '.join(valid_pipelines)}.",
        )

    # Look up the record
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE slug = ?", (body.slug,))
        record = cursor.fetchone()

        if not record:
            conn.close()
            raise HTTPException(
                status_code=404, detail=f"Record with slug '{body.slug}' not found."
            )

        # Determine the search term column based on pipeline
        if body.pipeline == "academic_challenges":
            search_term_col = "academic_challenge_search_term"
        else:
            search_term_col = "popular_challenge_search_term"

        search_terms_raw = (
            record[search_term_col] if search_term_col in record.keys() else None
        )

        if not search_terms_raw:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"Record '{body.slug}' has no {search_term_col} set. "
                f"Set search terms before triggering an agent run.",
            )

        # Parse search terms (stored as JSON blob)
        try:
            search_terms_data = json.loads(search_terms_raw)
            if isinstance(search_terms_data, list):
                search_terms = " ".join(search_terms_data)
            elif isinstance(search_terms_data, dict):
                search_terms = " ".join(str(v) for v in search_terms_data.values())
            else:
                search_terms = str(search_terms_data)
        except (json.JSONDecodeError, TypeError):
            search_terms = str(search_terms_raw)

        conn.close()

        # Insert a 'running' row immediately and get its ID
        now = datetime.now(timezone.utc).isoformat()
        conn2 = get_db_connection()
        cursor2 = conn2.cursor()
        cursor2.execute(
            """
            INSERT INTO agent_run_log (pipeline, record_slug, status, started_at)
            VALUES (?, ?, 'running', ?)
            """,
            (body.pipeline, body.slug, now),
        )
        conn2.commit()
        run_id = cursor2.lastrowid
        conn2.close()

        # Spawn background thread
        def _run_agent():
            """Execute the agent pipeline in a background thread."""
            try:
                result = search_web(
                    search_terms=search_terms,
                    record_slug=body.slug,
                    pipeline=body.pipeline,
                    run_id=run_id,
                )
                found = result.get(
                    "articles_found",
                    len(result.get("articles", [])),
                )
                logger.info(f"Agent run {run_id} completed: {found} articles found.")
            except Exception as exc:
                logger.error(f"Agent run {run_id} failed: {exc}")

        thread = threading.Thread(target=_run_agent, daemon=True)
        thread.start()

        return {"run_id": run_id, "status": "running"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to trigger agent run: " + str(e)
        )


@router.get("/api/admin/agent/logs")
async def get_agent_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    pipeline: Optional[str] = Query(None),
    admin_data: dict = Depends(verify_token),
):
    """
    Returns paginated agent run history for the System dashboard monitor.

    Query params:
        limit: Max rows to return (1-200, default 50).
        offset: Number of rows to skip (default 0).
        pipeline: Optional filter by pipeline name.

    Returns array of agent_run_log rows ordered by started_at DESC.
    Each row includes all columns: id, pipeline, record_slug, status,
    trace_reasoning, articles_found, tokens_used, error_message,
    started_at, completed_at.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause and params
        where_clause = ""
        count_params = []
        if pipeline:
            where_clause = "WHERE pipeline = ?"
            count_params.append(pipeline)

        # Get total count first
        cursor.execute(
            f"SELECT COUNT(*) as total FROM agent_run_log {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        # Get paginated rows
        query = (
            f"SELECT * FROM agent_run_log {where_clause}"
            f" ORDER BY started_at DESC LIMIT ? OFFSET ?"
        )
        cursor.execute(query, count_params + [limit, offset])
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return {
            "data": rows,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch agent logs: " + str(e),
        )
