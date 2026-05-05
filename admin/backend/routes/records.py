# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: RECORDS
#   File:    admin/backend/routes/records.py
#   Version: 1.0.0
#   Purpose: CRUD endpoints for records (create, read, update, delete, batch,
#            picture upload/delete).
# =============================================================================

import pathlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.pipelines.image_processor import process_uploaded_png

from .shared import (
    BatchUpdateItem,
    get_db_connection,
    get_valid_columns,
    logger,
    verify_token,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# CRUD Operations (Protected SQLite Access)
# -----------------------------------------------------------------------------
@router.get("/api/admin/records")
async def get_all_records(
    admin_data: dict = Depends(verify_token),
    sort: str = "created_at",
    offset: int = 0,
    limit: int = 50,
):
    """
    Fetches paginated, sortable record list for the Dashboard.

    Query parameters:
      sort   — Column name to ORDER BY (validated against schema).
               Defaults to "created_at". Falls back to "created_at"
               if the requested column doesn't exist.
      offset — Row offset for pagination (default 0).
      limit  — Max rows to return (default 50, clamped to 1-500).
    """
    try:
        conn = get_db_connection()
        valid_cols = get_valid_columns(conn)

        # Validate and sanitise sort column
        sort_col = sort if sort in valid_cols else "created_at"
        # Clamp limit to a safe range
        safe_limit = max(1, min(limit, 500))
        safe_offset = max(0, offset)

        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM records ORDER BY {sort_col} ASC LIMIT ? OFFSET ?",
            (safe_limit, safe_offset),
        )
        records = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/records/batch")
async def batch_update_records(
    body: List[BatchUpdateItem],
    admin_data: dict = Depends(verify_token),
):
    """
    Batch-updates multiple records in a single transaction.
    Accepts a JSON array of {"slug": str, "data": {column: value}} objects.
    Each object's data is filtered against valid columns to prevent SQL injection.
    Matches records by slug (not ULID) since challenge operations use slugs.
    Returns count of successfully updated records. If any update fails,
    the entire transaction is rolled back.
    """
    if not body:
        return {"message": "No updates provided", "count": 0}

    conn = None
    try:
        conn = get_db_connection()
        valid_cols = get_valid_columns(conn)
        cursor = conn.cursor()
        updated = 0

        cursor.execute("BEGIN TRANSACTION")

        for item in body:
            safe_data = {k: v for k, v in item.data.items() if k in valid_cols}
            if not safe_data:
                continue

            set_clause = ", ".join([f"{k} = ?" for k in safe_data.keys()])
            values = tuple(safe_data.values()) + (item.slug,)
            cursor.execute(f"UPDATE records SET {set_clause} WHERE slug = ?", values)
            if cursor.rowcount > 0:
                updated += 1

        conn.commit()
        conn.close()
        return {
            "message": f"{updated} record(s) updated successfully",
            "count": updated,
        }

    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        raise HTTPException(
            status_code=500,
            detail="Batch update failed, all changes rolled back: " + str(e),
        )


@router.get("/api/admin/records/{record_id}")
async def get_single_record(record_id: str, admin_data: dict = Depends(verify_token)):
    """
    Fetches full data for a single record row.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        raise HTTPException(status_code=404, detail="Record not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/admin/records")
async def create_record(
    record_data: Dict[str, Any],
    admin_data: dict = Depends(verify_token),
):
    """
    Creates a new record. Dynamically maps the valid JSON payload to columns.
    """
    try:
        valid_cols = get_valid_columns()
        # Only keep fields that map to existing columns
        safe_data = {k: v for k, v in record_data.items() if k in valid_cols}

        if "id" not in safe_data:
            safe_data["id"] = str(uuid.uuid4())

        now_iso = datetime.now(timezone.utc).isoformat()
        if "created_at" not in safe_data:
            safe_data["created_at"] = now_iso
        if "updated_at" not in safe_data:
            safe_data["updated_at"] = now_iso

        conn = get_db_connection()
        cursor = conn.cursor()

        columns = ", ".join(safe_data.keys())
        placeholders = ", ".join(["?" for _ in safe_data])
        values = tuple(safe_data.values())

        cursor.execute(
            f"INSERT INTO records ({columns}) VALUES ({placeholders})", values
        )
        conn.commit()
        conn.close()
        return {"message": "Record created successfully", "id": safe_data["id"]}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to create record: " + str(e)
        )


@router.put("/api/admin/records/{record_id}")
async def update_record(
    record_id: str,
    record_data: Dict[str, Any],
    admin_data: dict = Depends(verify_token),
):
    """
    Dynamically updates a record mapping arbitrary JSON payload to the SQLite columns.
    """
    try:
        valid_cols = get_valid_columns()
        # Filter and validate columns
        safe_data = {k: v for k, v in record_data.items() if k in valid_cols}

        if not safe_data:
            raise HTTPException(
                status_code=400, detail="No valid columns to update provided"
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        set_clause = ", ".join([f"{k} = ?" for k in safe_data.keys()])
        values = tuple(safe_data.values()) + (record_id,)

        cursor.execute(f"UPDATE records SET {set_clause} WHERE id = ?", values)
        conn.commit()
        conn.close()
        return {"message": "Record updated successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to update record: " + str(e)
        )


@router.delete("/api/admin/records/{record_id}")
async def delete_record(record_id: str, admin_data: dict = Depends(verify_token)):
    """
    Deletes a record.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()
        conn.close()
        return {"message": "Record deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to delete record: " + str(e)
        )


@router.post("/api/admin/records/{record_id}/picture")
async def upload_record_picture(
    record_id: str,
    file: UploadFile = File(...),
    admin_data: dict = Depends(verify_token),
):
    """
    Handles PNG upload, resizes/compresses via image_processor, and saves to DB.
    """
    if file.content_type != "image/png":
        raise HTTPException(status_code=400, detail="Only PNG images are allowed")

    try:
        raw_bytes = await file.read()
        processed = process_uploaded_png(raw_bytes)

        # Sanitise filename
        picture_name = pathlib.Path(file.filename or "upload.png").name

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE records
            SET picture_name = ?,
                picture_bytes = ?,
                picture_thumbnail = ?
            WHERE id = ?
        """,
            (
                picture_name,
                processed["picture_bytes"],
                processed["picture_thumbnail"],
                record_id,
            ),
        )

        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Record not found")

        conn.commit()
        conn.close()

        return {
            "message": "Picture uploaded successfully",
            "picture_name": picture_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Picture upload failed for record {record_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload picture")


@router.delete("/api/admin/records/{record_id}/picture")
async def delete_record_picture(
    record_id: str,
    admin_data: dict = Depends(verify_token),
):
    """
    Clears picture data (name, bytes, thumbnail) from a record
    without deleting the record itself.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE records
            SET picture_name = NULL,
                picture_bytes = NULL,
                picture_thumbnail = NULL
            WHERE id = ?
        """,
            (record_id,),
        )

        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Record not found")

        conn.commit()
        conn.close()

        return {"message": "Picture removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Picture delete failed for record {record_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove picture")
