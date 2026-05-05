# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: LISTS
#   File:    admin/backend/routes/lists.py
#   Version: 1.0.0
#   Purpose: Resource list management endpoints (resource_lists table).
# =============================================================================

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from .shared import ListItem, get_db_connection, verify_token

router = APIRouter()


@router.get("/api/admin/lists/{list_name}")
async def get_list(list_name: str, admin_data: dict = Depends(verify_token)):
    """
    Fetches all entries for a named resource list, joined to records for titles.
    Returns a JSON array ordered by position.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT rl.record_slug, r.title, rl.position
            FROM resource_lists rl
            LEFT JOIN records r ON rl.record_slug = r.slug
            WHERE rl.list_name = ?
            ORDER BY rl.position ASC
        """,
            (list_name,),
        )
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/lists/{list_name}")
async def update_list(
    list_name: str, items: List[ListItem], admin_data: dict = Depends(verify_token)
):
    """
    Replaces the entire content of a named resource list.
    Accepts a JSON array of {record_slug, position} objects.
    Deletes removed slugs first, then upserts via INSERT OR REPLACE.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Delete entries whose slugs are not in the incoming list
        if items:
            slug_placeholders = ",".join(["?" for _ in items])
            cursor.execute(
                f"DELETE FROM resource_lists "
                f"WHERE list_name = ? AND record_slug NOT IN ({slug_placeholders})",
                [list_name] + [item.record_slug for item in items],
            )
        else:
            # Empty list: clear all entries for this list_name
            cursor.execute(
                "DELETE FROM resource_lists WHERE list_name = ?", (list_name,)
            )

        # Upsert each incoming entry
        for item in items:
            cursor.execute(
                """
                INSERT OR REPLACE INTO resource_lists (list_name, record_slug, position)
                VALUES (?, ?, ?)
            """,
                (list_name, item.record_slug, item.position),
            )

        conn.commit()
        conn.close()
        return {
            "message": f"List '{list_name}' updated successfully",
            "count": len(items),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update list: " + str(e))
