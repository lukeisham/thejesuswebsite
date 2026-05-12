# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: DIAGRAM TREE
#   File:    admin/backend/routes/diagram.py
#   Version: 1.0.0
#   Purpose: Diagram tree endpoints (parent_id relationships).
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException

from .shared import (
    DiagramTreeUpdateRequest,
    get_db_connection,
    verify_token,
)

router = APIRouter()


@router.get("/api/admin/diagram/tree")
async def get_diagram_tree(admin_data: dict = Depends(verify_token)):
    """
    Fetches all records as a flat node list for the diagram tree editor.
    The frontend assembles this into a recursive tree by grouping on parent_id.
    NOTE: parent_id may be null for root nodes.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, parent_id, primary_verse FROM records ORDER BY title")
        nodes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/diagram/tree")
async def update_diagram_tree(
    body: DiagramTreeUpdateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Batch-updates parent_id relationships for the diagram tree editor.
    Validates all IDs exist, detects direct circular references, and
    commits all changes in a single transaction.
    NOTE: Rejects updates that would create a circular reference (A -> B and B -> A).
    """
    if not body.updates:
        return {"message": "No updates provided", "updated": 0}

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --- 1. Validate all submitted IDs exist in the records table ---
        submitted_ids = [item.id for item in body.updates]
        placeholders = ",".join(["?" for _ in submitted_ids])
        cursor.execute(
            f"SELECT id FROM records WHERE id IN ({placeholders})", submitted_ids
        )
        existing_ids = {row["id"] for row in cursor.fetchall()}

        missing_ids = [i for i in submitted_ids if i not in existing_ids]
        if missing_ids:
            conn.close()
            raise HTTPException(
                status_code=422,
                detail=f"Record(s) not found: {', '.join(missing_ids)}",
            )

        # --- 2. Fetch current parent_id values for all nodes ---
        cursor.execute("SELECT id, parent_id FROM records")
        current_map = {row["id"]: row["parent_id"] for row in cursor.fetchall()}

        # --- 3. Build combined map (current data overlaid with proposed updates) ---
        proposed_map = dict(current_map)
        for item in body.updates:
            proposed_map[item.id] = item.parent_id

        # --- 4. Detect direct circular references ---
        for item in body.updates:
            if item.parent_id is not None and item.parent_id in proposed_map:
                # Check if B's proposed parent is A (direct 2-node cycle)
                if proposed_map.get(item.parent_id) == item.id:
                    conn.close()
                    raise HTTPException(
                        status_code=422,
                        detail=f"Circular reference detected: "
                        f"'{item.id}' <-> '{item.parent_id}'. "
                        f"Rejecting update.",
                    )

        # --- 5. Batch-update parent_id inside a transaction ---
        try:
            cursor.execute("BEGIN TRANSACTION")
            for item in body.updates:
                cursor.execute(
                    "UPDATE records SET parent_id = ? WHERE id = ?",
                    (item.parent_id, item.id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Transaction failed, all changes rolled back."
            )
        finally:
            conn.close()

        return {
            "message": "Diagram tree updated successfully",
            "updated": len(body.updates),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
