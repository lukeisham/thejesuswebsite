# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: CHALLENGE RESPONSES
#   File:    admin/backend/routes/responses.py
#   Version: 1.0.0
#   Purpose: Create, list, and retrieve challenge response records.
# =============================================================================

import json
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException

from .shared import (
    CreateResponseRequest,
    get_db_connection,
    verify_token,
)

router = APIRouter()


@router.post("/api/admin/responses", status_code=201)
async def create_response(
    body: CreateResponseRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Creates a draft challenge response linked to a parent challenge.
    Accepts JSON body with parent_slug and title.
    Inserts a new record with status='draft' and links to the parent challenge
    via the challenge_id column. Returns 201 with the new record's id and slug.
    Consumed by plan_dashboard_challenge_response and plan_dashboard_challenge.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify parent challenge exists
        cursor.execute(
            "SELECT id, slug, responses FROM records WHERE slug = ?",
            (body.parent_slug,),
        )
        parent = cursor.fetchone()
        if not parent:
            conn.close()
            raise HTTPException(
                status_code=404,
                detail=f"Parent challenge with slug '{body.parent_slug}' not found.",
            )

        # Generate new record ID and slug
        new_id = str(uuid.uuid4())
        new_slug = f"response-{body.parent_slug}-{new_id[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        # Insert the new response record
        cursor.execute(
            """
            INSERT INTO records (id, title, slug, challenge_id, type, status,
                                 created_at, updated_at, responses)
            VALUES (?, ?, ?, ?, 'challenge_response', 'draft', ?, ?, ?)
            """,
            (
                new_id,
                body.title,
                new_slug,
                parent["id"],
                now,
                now,
                json.dumps([]),
            ),
        )

        # Update the parent record's responses JSON array to include this new response
        existing_responses = parent["responses"]
        try:
            response_list = json.loads(existing_responses) if existing_responses else []
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning("Corrupted responses JSON on parent %s: %s", parent["id"], exc)
            response_list = []

        response_list.append(
            {"id": new_id, "title": body.title, "slug": new_slug, "status": "draft"}
        )
        cursor.execute(
            "UPDATE records SET responses = ?, updated_at = ? WHERE id = ?",
            (json.dumps(response_list), now, parent["id"]),
        )

        conn.commit()
        conn.close()

        return {
            "id": new_id,
            "slug": new_slug,
            "title": body.title,
            "parent_slug": body.parent_slug,
            "status": "draft",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to create response: " + str(e)
        )


@router.get("/api/admin/responses")
async def get_responses(admin_data: dict = Depends(verify_token)):
    """
    Returns all records where challenge_id IS NOT NULL (i.e., response records),
    ordered by created_at DESC. Consumed by plan_dashboard_challenge_response.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, slug, challenge_id, snippet, responses,
                   created_at, updated_at, status
            FROM records
            WHERE (type = 'challenge_response' OR challenge_id IS NOT NULL)
            ORDER BY created_at DESC
            """
        )
        responses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return responses
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch responses: " + str(e)
        )
