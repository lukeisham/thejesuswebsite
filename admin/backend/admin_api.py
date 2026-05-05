# =============================================================================
#   THE JESUS WEBSITE — ADMIN API
#   File:    admin/backend/admin_api.py
#   Version: 1.1.0
#   Purpose: Secure backend writing to SQLite. Includes Auth endpoints and CRUD.
# =============================================================================

import csv
import io
import json
import os
import pathlib
import sqlite3
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from pydantic import BaseModel

# Add the project root to sys.path to allow absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from auth_utils import AuthUtils

from backend.middleware.logger_setup import setup_logger
from backend.middleware.rate_limiter import RateLimiterMiddleware
from backend.pipelines.image_processor import process_uploaded_png
from backend.scripts.agent_client import search_web
from backend.scripts.metadata_generator import generate_metadata
from backend.scripts.snippet_generator import generate_snippet

# Initialize central logging to /logs
logger = setup_logger(__file__)

app = FastAPI(title="The Jesus Website API - Admin")
# Instantiate and add rate limiter (allows 30 requests per minute for admin actions)
app.add_middleware(RateLimiterMiddleware, requests_per_minute=30)


@app.get("/api/health")
async def health_check():
    """
    Public health check endpoint for monitoring infrastructure integrity.
    """
    return {"status": "ok", "service": "The Jesus Website Admin API"}


# Path to the primary SQLite database
DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "database.sqlite"
)


# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    password: str


class ListItem(BaseModel):
    record_slug: str
    position: int


class DiagramTreeUpdateItem(BaseModel):
    """A single node's parent_id update."""

    id: str
    parent_id: str | None = None


class DiagramTreeUpdateRequest(BaseModel):
    """Batch of parent_id updates submitted by the diagram editor."""

    updates: List[DiagramTreeUpdateItem]


# -----------------------------------------------------------------------------
# Authentication Middleware / Dependency
# -----------------------------------------------------------------------------
async def verify_token(request: Request):
    """
    Dependency to protect routes. Reads JWT from HttpOnly cookie.
    """
    token = request.cookies.get("admin_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    payload = AuthUtils.decode_access_token(token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


# -----------------------------------------------------------------------------
# Authentication Endpoints
# -----------------------------------------------------------------------------
@app.post("/api/admin/login")
async def login(req: LoginRequest, request: Request, response: Response):
    # FIXED: Added check for Cloudflare headers and guarded against NoneType client
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else "unknown"
    )

    # Check Brute Force
    is_safe, msg = AuthUtils.check_brute_force(client_ip)
    if not is_safe:
        raise HTTPException(status_code=429, detail=msg)

    # Verify Password
    if AuthUtils.verify_password(req.password):
        AuthUtils.record_attempt(client_ip, True)

        # Generate JWT
        token = AuthUtils.create_access_token(data={"role": "admin"})

        # Set HttpOnly Cookie
        # secure=True in production behind HTTPS; set COOKIE_SECURE=true in .env
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        response.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=cookie_secure,
            max_age=43200,  # 12 hours
        )
        return {"message": "Login successful"}
    else:
        AuthUtils.record_attempt(client_ip, False)
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/api/admin/logout")
async def logout(response: Response):
    # Overwrite cookie to invalidate it
    response.delete_cookie("admin_token")
    return {"message": "Logged out successfully"}


@app.get("/api/admin/verify")
async def verify_session(admin_data: dict = Depends(verify_token)):
    """
    Endpoint for frontend middleware to verify active session status.
    Returns 200 with admin data if token is valid (handled by verify_token dependency).
    """
    return {"authenticated": True, "user": admin_data}


# -----------------------------------------------------------------------------
# CRUD Operations (Protected SQLite Access)
# -----------------------------------------------------------------------------


def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/api/admin/records")
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


class BatchUpdateItem(BaseModel):
    slug: str
    data: Dict[str, Any]


@app.put("/api/admin/records/batch")
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


@app.get("/api/admin/records/{record_id}")
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


def get_valid_columns(conn=None):
    """
    Returns a set of valid column names in the 'records' table to prevent SQL injection.
    Accepts an optional existing connection to avoid opening redundant connections.
    """
    own_conn = False
    try:
        if conn is None:
            conn = get_db_connection()
            own_conn = True
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(records)")
        columns = {row["name"] for row in cursor.fetchall()}
        return columns
    except Exception:
        return set()
    finally:
        if own_conn and conn:
            conn.close()


@app.post("/api/admin/records")
async def create_record(
    record_data: Dict[str, Any], admin_data: dict = Depends(verify_token)
):
    """
    Dynamically inserts an arbitrary JSON dictionary mapping to the SQLite columns.
    Uses parameterized injection to stop SQLi.
    """
    try:
        valid_cols = get_valid_columns()
        # Filter and validate columns
        safe_data = {k: v for k, v in record_data.items() if k in valid_cols}

        if not safe_data:
            raise HTTPException(status_code=400, detail="No valid columns provided")

        conn = get_db_connection()
        cursor = conn.cursor()

        columns = ", ".join(safe_data.keys())
        placeholders = ", ".join(["?" for _ in safe_data])
        values = tuple(safe_data.values())

        cursor.execute(
            f"INSERT INTO records ({columns}) VALUES ({placeholders})", values
        )
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return {"message": "Record created successfully", "id": last_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to create record: " + str(e)
        )


@app.put("/api/admin/records/{record_id}")
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


@app.delete("/api/admin/records/{record_id}")
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


@app.post("/api/admin/records/{record_id}/picture")
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


@app.delete("/api/admin/records/{record_id}/picture")
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


# -----------------------------------------------------------------------------
# List Management Endpoints (resource_lists table)
# -----------------------------------------------------------------------------


@app.get("/api/admin/lists/{list_name}")
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


@app.put("/api/admin/lists/{list_name}")
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


# -----------------------------------------------------------------------------
# Diagram Tree Endpoints (parent_id relationships)
# -----------------------------------------------------------------------------


@app.get("/api/admin/diagram/tree")
async def get_diagram_tree(admin_data: dict = Depends(verify_token)):
    """
    Fetches all records as a flat node list for the diagram tree editor.
    The frontend assembles this into a recursive tree by grouping on parent_id.
    NOTE: parent_id may be null for root nodes.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, parent_id FROM records ORDER BY title")
        nodes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/diagram/tree")
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


@app.post("/api/admin/bulk-upload")
async def bulk_upload_records(
    file: UploadFile = File(...), admin_data: dict = Depends(verify_token)
):
    """
    Handles CSV upload, parses, validates, and bulk inserts into the database.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Read and parse CSV
    content = await file.read()

    # 5MB size limit
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

    try:
        # Decode content
        text_content = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text_content))
    except Exception as e:
        logger.error(f"CSV bulk upload failed: {e}")
        raise HTTPException(
            status_code=400,
            detail="Failed to parse CSV file: Invalid encoding or format",
        )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get valid enums and fields
    valid_eras = {
        "PreIncarnation",
        "OldTestament",
        "EarlyLife",
        "Life",
        "GalileeMinistry",
        "JudeanMinistry",
        "PassionWeek",
        "Post-Passion",
    }
    valid_timelines = {
        "PreIncarnation",
        "OldTestament",
        "EarlyLifeUnborn",
        "EarlyLifeBirth",
        "EarlyLifeInfancy",
        "EarlyLifeChildhood",
        "LifeTradie",
        "LifeBaptism",
        "LifeTemptation",
        "GalileeCallingTwelve",
        "GalileeSermonMount",
        "GalileeMiraclesSea",
        "GalileeTransfiguration",
        "JudeanOutsideJudea",
        "JudeanMissionSeventy",
        "JudeanTeachingTemple",
        "JudeanRaisingLazarus",
        "JudeanFinalJourney",
        "PassionPalmSunday",
        "PassionMondayCleansing",
        "PassionTuesdayTeaching",
        "PassionWednesdaySilent",
        "PassionMaundyThursday",
        "PassionMaundyLastSupper",
        "PassionMaundyGethsemane",
        "PassionMaundyBetrayal",
        "PassionFridaySanhedrin",
        "PassionFridayCivilTrials",
        "PassionFridayCrucifixionBegins",
        "PassionFridayDarkness",
        "PassionFridayDeath",
        "PassionFridayBurial",
        "PassionSaturdayWatch",
        "PassionSundayResurrection",
        "PostResurrectionAppearances",
        "Ascension",
        "OurResponse",
        "ReturnOfJesus",
    }
    valid_map_labels = {"Overview", "Empire", "Levant", "Judea", "Galilee", "Jerusalem"}
    valid_gospel_categories = {"event", "location", "person", "theme", "object"}

    errors = []
    valid_records = []
    seen_slugs = set()  # Track slugs within this batch to catch duplicates
    valid_cols = get_valid_columns(conn)  # Reuse the existing connection

    # Pre-fetch all existing slugs from DB into a set for O(1) lookup
    cursor.execute("SELECT slug FROM records")
    existing_slugs = {row["slug"] for row in cursor.fetchall()}

    # Validation
    for index, row in enumerate(rows):
        row_num = index + 2  # 1-based index + header row

        # Check required fields
        title = row.get("title", "").strip()
        slug = row.get("slug", "").strip()

        if not title or not slug:
            errors.append(f"Row {row_num}: Missing 'title' or 'slug'")
            continue

        # Uniqueness check for slug — against DB and within-batch
        if slug in existing_slugs:
            errors.append(f"Row {row_num}: Slug '{slug}' already exists in database")
            continue
        if slug in seen_slugs:
            errors.append(
                f"Row {row_num}: Slug '{slug}' is a duplicate within this CSV"
            )
            continue
        seen_slugs.add(slug)

        # Enum validation
        era = row.get("era", "")
        if era and era.strip() and era.strip() not in valid_eras:
            errors.append(f"Row {row_num}: Invalid era '{era}'")
            continue

        timeline = row.get("timeline", "")
        if timeline and timeline.strip() and timeline.strip() not in valid_timelines:
            errors.append(f"Row {row_num}: Invalid timeline '{timeline}'")
            continue

        map_label = row.get("map_label", "")
        if (
            map_label
            and map_label.strip()
            and map_label.strip() not in valid_map_labels
        ):
            errors.append(f"Row {row_num}: Invalid map_label '{map_label}'")
            continue

        gospel_category = row.get("gospel_category", "")
        if (
            gospel_category
            and gospel_category.strip()
            and gospel_category.strip() not in valid_gospel_categories
        ):
            errors.append(f"Row {row_num}: Invalid gospel_category '{gospel_category}'")
            continue

        # Primary verse JSON validation
        primary_verse = row.get("primary_verse", "")
        if primary_verse and primary_verse.strip():
            try:
                json.loads(primary_verse.strip())
            except json.JSONDecodeError:
                errors.append(f"Row {row_num}: Invalid JSON in primary_verse")
                continue

        # Prepare for insertion
        insert_data = {}
        for col in valid_cols:
            if col in row and row[col].strip():
                insert_data[col] = row[col].strip()

        # Generate ID and timestamps
        if "id" not in insert_data:
            insert_data["id"] = str(uuid.uuid4())

        now_iso = datetime.now(timezone.utc).isoformat()
        if "created_at" not in insert_data:
            insert_data["created_at"] = now_iso
        if "updated_at" not in insert_data:
            insert_data["updated_at"] = now_iso

        valid_records.append(insert_data)

    if errors:
        conn.close()
        return {"success": False, "errors": errors, "created": 0}

    if not valid_records:
        conn.close()
        return {
            "success": False,
            "errors": ["No valid records found in CSV"],
            "created": 0,
        }

    # Bulk insertion
    try:
        for record in valid_records:
            columns = ", ".join(record.keys())
            placeholders = ", ".join(["?" for _ in record])
            values = tuple(record.values())
            cursor.execute(
                f"INSERT INTO records ({columns}) VALUES ({placeholders})", values
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=500, detail=f"Database insertion error: {str(e)}"
        )

    conn.close()

    return {
        "success": True,
        "message": f"Successfully created {len(valid_records)} records.",
        "created": len(valid_records),
        "errors": [],
    }


class BulkReviewRecordsRequest(BaseModel):
    records: list[dict]


@app.post("/api/admin/bulk-upload/commit")
async def bulk_upload_commit(
    payload: BulkReviewRecordsRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Phase 2 of bulk upload: commit reviewed records as draft.
    Receives a JSON payload with a `records` array of field dicts.
    Each record is inserted with status='draft'. Validates required fields
    and enum values server-side before insertion.
    """
    records = payload.records
    if not records:
        raise HTTPException(status_code=400, detail="No records provided")

    # Valid enum sets (mirrors bulk_upload_records)
    valid_eras = {
        "PreIncarnation",
        "OldTestament",
        "EarlyLife",
        "Life",
        "GalileeMinistry",
        "JudeanMinistry",
        "PassionWeek",
        "Post-Passion",
    }
    valid_timelines = {
        "PreIncarnation",
        "OldTestament",
        "EarlyLifeUnborn",
        "EarlyLifeBirth",
        "EarlyLifeInfancy",
        "EarlyLifeChildhood",
        "LifeTradie",
        "LifeBaptism",
        "LifeTemptation",
        "GalileeCallingTwelve",
        "GalileeSermonMount",
        "GalileeMiraclesSea",
        "GalileeTransfiguration",
        "JudeanOutsideJudea",
        "JudeanMissionSeventy",
        "JudeanTeachingTemple",
        "JudeanRaisingLazarus",
        "JudeanFinalJourney",
        "PassionPalmSunday",
        "PassionMondayCleansing",
        "PassionTuesdayTeaching",
        "PassionWednesdaySilent",
        "PassionMaundyThursday",
        "PassionMaundyLastSupper",
        "PassionMaundyGethsemane",
        "PassionMaundyBetrayal",
        "PassionFridaySanhedrin",
        "PassionFridayCivilTrials",
        "PassionFridayCrucifixionBegins",
        "PassionFridayDarkness",
        "PassionFridayDeath",
        "PassionFridayBurial",
        "PassionSaturdayWatch",
        "PassionSundayResurrection",
        "PostResurrectionAppearances",
        "Ascension",
        "OurResponse",
        "ReturnOfJesus",
    }
    valid_map_labels = {"Overview", "Empire", "Levant", "Judea", "Galilee", "Jerusalem"}
    valid_gospel_categories = {"event", "location", "person", "theme", "object"}

    conn = get_db_connection()
    cursor = conn.cursor()
    valid_cols = get_valid_columns(conn)  # Reuse the existing connection

    # Pre-fetch existing slugs and track in-batch duplicates
    cursor.execute("SELECT slug FROM records")
    existing_slugs = {row["slug"] for row in cursor.fetchall()}
    seen_slugs = set()

    errors = []
    valid_records = []

    for index, row in enumerate(records):
        row_num = index + 1
        title = row.get("title", "").strip()
        slug = row.get("slug", "").strip()

        if not title:
            errors.append(f"Row {row_num}: Missing 'title'")
            continue

        # Slug uniqueness check — against DB and within-batch
        if slug and slug in existing_slugs:
            errors.append(f"Row {row_num}: Slug '{slug}' already exists in database")
            continue
        if slug and slug in seen_slugs:
            errors.append(
                f"Row {row_num}: Slug '{slug}' is a duplicate within this batch"
            )
            continue
        if slug:
            seen_slugs.add(slug)

        # Enum validation
        era = row.get("era", "")
        if era and era.strip() and era.strip() not in valid_eras:
            errors.append(f"Row {row_num}: Invalid era '{era}'")
            continue

        timeline = row.get("timeline", "")
        if timeline and timeline.strip() and timeline.strip() not in valid_timelines:
            errors.append(f"Row {row_num}: Invalid timeline '{timeline}'")
            continue

        map_label = row.get("map_label", "")
        if (
            map_label
            and map_label.strip()
            and map_label.strip() not in valid_map_labels
        ):
            errors.append(f"Row {row_num}: Invalid map_label '{map_label}'")
            continue

        gospel_category = row.get("gospel_category", "")
        if (
            gospel_category
            and gospel_category.strip()
            and gospel_category.strip() not in valid_gospel_categories
        ):
            errors.append(f"Row {row_num}: Invalid gospel_category '{gospel_category}'")
            continue

        # Build insert data
        insert_data = {}
        for col in valid_cols:
            if col in row and row[col] and str(row[col]).strip():
                insert_data[col] = str(row[col]).strip()

        # Force status to draft
        insert_data["status"] = "draft"

        # Generate ID and timestamps
        if "id" not in insert_data:
            insert_data["id"] = str(uuid.uuid4())

        now_iso = datetime.now(timezone.utc).isoformat()
        if "created_at" not in insert_data:
            insert_data["created_at"] = now_iso
        if "updated_at" not in insert_data:
            insert_data["updated_at"] = now_iso

        valid_records.append(insert_data)

    if not valid_records:
        conn.close()
        return {
            "success": False,
            "errors": errors if errors else ["No valid records to insert"],
            "created": 0,
        }

    # Bulk insertion
    created = 0
    try:
        for record in valid_records:
            columns = ", ".join(record.keys())
            placeholders = ", ".join(["?" for _ in record])
            values = tuple(record.values())
            cursor.execute(
                f"INSERT INTO records ({columns}) VALUES ({placeholders})", values
            )
            created += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=500, detail=f"Database insertion error: {str(e)}"
        )

    conn.close()

    return {
        "success": True,
        "message": f"Successfully created {created} records as draft.",
        "created": created,
        "errors": errors,
    }


# =============================================================================
# T4 — System Config & Health Endpoints
# =============================================================================


@app.get("/api/admin/system/config")
async def get_system_config(admin_data: dict = Depends(verify_token)):
    """
    Returns all rows from system_config as a JSON object of key/value pairs.
    Consumed by plan_dashboard_system and plan_dashboard_news_sources.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_config ORDER BY key")
        rows = cursor.fetchall()
        conn.close()

        # Build a flat key/value dict
        config = {row["key"]: row["value"] for row in rows}
        return config
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch system config: " + str(e)
        )


@app.put("/api/admin/system/config")
async def update_system_config(
    body: Dict[str, Any], admin_data: dict = Depends(verify_token)
):
    """
    Upserts system_config key/value pairs.
    Accepts a JSON body of key/value pairs. Each key is upserted individually.
    Returns 200 on success.
    """
    if not body:
        raise HTTPException(status_code=400, detail="Request body must not be empty.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()

        for key, value in body.items():
            key_str = str(key)
            value_str = str(value) if value is not None else None
            cursor.execute(
                """
                INSERT INTO system_config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (key_str, value_str, now),
            )

        conn.commit()
        conn.close()
        return {
            "message": "System config updated successfully",
            "keys": list(body.keys()),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to update system config: " + str(e),
        )


@app.get("/api/admin/health_check")
async def health_check_admin(admin_data: dict = Depends(verify_token)):
    """
    Returns system health including DeepSeek API status, VPS CPU/memory,
    database status, and uptime. Consumed by plan_dashboard_system.
    """
    import time as time_module

    health: Dict[str, Any] = {
        "status": "ok",
        "service": "The Jesus Website Admin API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # --- Database check ---
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM records")
        record_count = cursor.fetchone()["count"]
        conn.close()
        health["database"] = {"status": "connected", "record_count": record_count}
    except Exception as e:
        health["database"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    # --- DeepSeek API check ---
    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
    if deepseek_key:
        health["deepseek_api"] = {"status": "configured"}
    else:
        health["status"] = "degraded"  # mark overall health as degraded
        health["deepseek_api"] = {
            "status": "unavailable",
            "error": "DEEPSEEK_API_KEY not set in .env",
        }

    # --- VPS resource usage (best-effort, available on Linux/macOS) ---
    try:
        import psutil

        cpu_percent = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        health["resources"] = {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(mem.total / (1024**3), 1),
                "used_gb": round(mem.used / (1024**3), 1),
                "percent": mem.percent,
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 1),
                "used_gb": round(disk.used / (1024**3), 1),
                "percent": disk.percent,
            },
            "uptime_seconds": time_module.time() - psutil.boot_time(),
        }
    except ImportError:
        health["resources"] = {
            "status": "unavailable",
            "error": "psutil not installed — install with: pip install psutil",
        }
    except Exception as e:
        health["resources"] = {"status": "error", "error": str(e)}

    return health


@app.get("/api/admin/mcp/health")
async def mcp_health(admin_data: dict = Depends(verify_token)):
    """
    Proxies MCP server status (online/offline/degraded, tool count, error count,
    last request timestamp). Consumed by plan_dashboard_system.

    The MCP server is expected to run on a local port (e.g. 8001) or be
    configured via MCP_SERVER_URL in .env. If unreachable, returns degraded status.
    """
    mcp_url = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8001/health")

    try:
        import requests as req

        resp = req.get(mcp_url, timeout=5)
        if resp.status_code == 200:
            mcp_data = resp.json()
            return {
                "status": "online",
                "mcp": mcp_data,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
        else:
            return {
                "status": "degraded",
                "mcp": {"http_status": resp.status_code},
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        return {
            "status": "offline",
            "mcp": {"error": str(e)},
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }


# =============================================================================
# T4a — System Dashboard Action Endpoints
#   Added by: plan_system_api_endpoints (resolves plan_issues.md #12)
#   These endpoints are called by js/7.0_system/dashboard/test_execution_logic.js
#   and js/7.0_system/dashboard/agent_generation_controls.js.
# =============================================================================


@app.post("/api/admin/tests/run")
async def run_test_suite(
    suite: str = Query("all"),
    admin_data: dict = Depends(verify_token),
):
    """
    Spawns test suites as subprocesses and returns their output.

    Query params:
        suite — 'all' (default), 'api', 'agent', or 'port'

    Suite-to-script mapping:
        all   → port_test.py + security_audit.py + agent_readability_test.py
        api   → port_test.py + security_audit.py
        agent → agent_readability_test.py
        port  → port_test.py

    Returns { status, results: [{ name, passed, message }], summary }.
    Consumed by test_execution_logic.js in the System dashboard.
    """
    valid_suites = {"all", "api", "agent", "port"}
    if suite not in valid_suites:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid suite. Must be one of: {', '.join(sorted(valid_suites))}.",
        )

    # Determine which test scripts to run
    tests_dir = os.path.join(os.path.dirname(__file__), "..", "..", "tests")
    script_map = {
        "port_test.py": "Port Availability",
        "security_audit.py": "Security Baseline Audit",
        "agent_readability_test.py": "Agent Readability",
    }

    scripts_to_run = []
    if suite in ("all", "api", "port"):
        scripts_to_run.append("port_test.py")
    if suite in ("all", "api"):
        scripts_to_run.append("security_audit.py")
    if suite in ("all", "agent"):
        scripts_to_run.append("agent_readability_test.py")

    results = []
    passed_count = 0
    total_count = len(scripts_to_run)

    for script in scripts_to_run:
        script_path = os.path.join(tests_dir, script)
        script_label = script_map.get(script, script)

        if not os.path.exists(script_path):
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": f"Test script not found: {script_path}",
                }
            )
            continue

        try:
            proc = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.join(os.path.dirname(__file__), "..", ".."),
            )
            passed = proc.returncode == 0
            if passed:
                passed_count += 1

            # Collect the last few meaningful lines of output for the message
            output_lines = [
                line.strip()
                for line in (proc.stdout + proc.stderr).splitlines()
                if line.strip()
            ]
            # Take up to 5 most relevant lines (look for SUCCESS/FAILURE/ERROR
            # keywords first, then fall back to the last lines)
            keyword_lines = [
                line
                for line in output_lines
                if any(
                    kw in line.upper()
                    for kw in (
                        "SUCCESS",
                        "FAILURE",
                        "ERROR",
                        "PASSED",
                        "FAIL",
                        "STABLE",
                        "VULNERABILITIES",
                    )
                )
            ]
            message_lines = keyword_lines if keyword_lines else output_lines[-5:]
            message = "; ".join(message_lines) if message_lines else "(no output)"

            results.append(
                {
                    "name": script_label,
                    "passed": passed,
                    "message": message,
                }
            )
        except subprocess.TimeoutExpired:
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": "Test timed out after 30 seconds.",
                }
            )
        except Exception as exc:
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": f"Subprocess error: {exc}",
                }
            )

    summary = f"{passed_count}/{total_count} test suites passed"
    return {
        "status": "completed"
        if passed_count == total_count
        else "completed_with_failures",
        "results": results,
        "summary": summary,
    }


@app.post("/api/admin/docs/open")
async def open_docs_editor(admin_data: dict = Depends(verify_token)):
    """
    PLACEHOLDER — returns 501 Not Implemented.
    The frontend handleViewEditDocs() already handles non-2xx responses
    gracefully via its catch block and surfaceError().

    Future plan: implement a documentation editing session that returns
    a URL to a live docs editor.
    """
    raise HTTPException(
        status_code=501,
        detail="Documentation editor is not yet implemented.",
    )


@app.post("/api/admin/agents/generate")
async def generate_agents(admin_data: dict = Depends(verify_token)):
    """
    PLACEHOLDER — returns 501 Not Implemented.
    The frontend handleGenerateAgents() already handles non-2xx responses
    gracefully via its catch block and surfaceError().

    Future plan: implement an agent generation workflow that spawns new
    AI agents based on architectural documentation and returns a count
    of agents created.
    """
    raise HTTPException(
        status_code=501,
        detail="Agent generation workflow is not yet implemented.",
    )


@app.post("/api/admin/services/restart")
async def restart_services(admin_data: dict = Depends(verify_token)):
    """
    Initiates a restart of the admin.service systemd unit.

    Design: The endpoint returns HTTP 200 immediately, then spawns a
    daemon thread that sleeps 1 second (allowing the HTTP response to
    flush to the client) before running `sudo systemctl restart admin.service`.

    The frontend handleRestartServices() waits 3 seconds after receiving
    the response before calling location.reload(), which gives the systemd
    unit enough time to cycle.

    Consumed by agent_generation_controls.js in the System dashboard.
    """

    def _do_restart():
        """Daemon thread: wait for response to flush, then restart."""
        import time as _time

        _time.sleep(1.0)
        try:
            subprocess.run(
                ["sudo", "systemctl", "restart", "admin.service"],
                capture_output=True,
                text=True,
                timeout=5,
            )
        except Exception as exc:
            logger.error(f"Service restart failed: {exc}")

    thread = threading.Thread(target=_do_restart, daemon=True)
    thread.start()

    return {
        "message": "Services restart initiated.",
        "service": "admin.service",
    }


# =============================================================================
# T5 — Essay, Historiography & Snippet/Metadata Trigger Endpoints
# =============================================================================


@app.get("/api/admin/essays")
async def get_essays(
    admin_data: dict = Depends(verify_token),
):
    """
    Returns all records where type column contains 'essay', ordered by title.
    Consumed by plan_dashboard_essay_historiography.

    Note: The 'type' field is not a dedicated column in the current schema.
    Essay records are identified by having non-NULL context_essays or
    theological_essays columns, or by the slug pattern.
    For forward compatibility, this endpoint checks for records whose slug
    matches known essay patterns or has essay content populated.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Essay records are those with essay content or essay-related slugs
        cursor.execute(
            """
            SELECT id, title, slug, snippet, created_at, updated_at, status,
                   context_essays, theological_essays, spiritual_articles
            FROM records
            WHERE context_essays IS NOT NULL
               OR theological_essays IS NOT NULL
               OR spiritual_articles IS NOT NULL
               OR slug LIKE '%essay%'
            ORDER BY title ASC
            """
        )
        essays = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return essays
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch essays: " + str(e))


@app.get("/api/admin/historiography")
async def get_historiography(admin_data: dict = Depends(verify_token)):
    """
    Returns the single record where slug = 'historiography'. 404 if missing.
    Consumed by plan_dashboard_essay_historiography.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE slug = ?", ("historiography",))
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404, detail="Historiography record not found."
            )

        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch historiography: " + str(e)
        )


class SnippetGenerateRequest(BaseModel):
    slug: str
    content: str


@app.post("/api/admin/snippet/generate")
async def trigger_snippet_generation(
    body: SnippetGenerateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers snippet_generator.py for a record.
    Accepts JSON body with slug and content. Returns the generated snippet string.
    Consumed by the shared snippet_generator.js dashboard tool.
    """
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty.")

    try:
        snippet = generate_snippet(content=body.content, slug=body.slug)
        return {"snippet": snippet, "slug": body.slug}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail="DeepSeek API error: " + str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to generate snippet: " + str(e)
        )


class MetadataGenerateRequest(BaseModel):
    slug: str
    content: str


@app.post("/api/admin/metadata/generate")
async def trigger_metadata_generation(
    body: MetadataGenerateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers metadata_generator.py for a record.
    Accepts JSON body with slug and content. Returns keywords and meta_description.
    Consumed by the shared metadata_handler.js dashboard tool.
    """
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty.")

    try:
        result = generate_metadata(content=body.content, slug=body.slug)
        return {
            "keywords": result["keywords"],
            "meta_description": result["meta_description"],
            "slug": body.slug,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail="DeepSeek API error: " + str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to generate metadata: " + str(e)
        )


# =============================================================================
# T6 — Blog & News Endpoints
# =============================================================================


@app.get("/api/admin/blogposts")
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


@app.delete("/api/admin/records/{record_id}/blogpost")
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


@app.get("/api/admin/news/items")
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


@app.post("/api/admin/news/crawl")
async def trigger_news_crawl(admin_data: dict = Depends(verify_token)):
    """
    Triggers pipeline_news.py asynchronously.
    Returns 202 Accepted with status and started_at timestamp.
    """
    started_at = datetime.now(timezone.utc).isoformat()

    def _run_news_pipeline():
        """Run the news pipeline in a background thread."""
        try:
            project_root = os.path.join(os.path.dirname(__file__), "..", "..")
            subprocess.run(
                [sys.executable, "-m", "backend.pipelines.pipeline_news"],
                cwd=project_root,
                capture_output=True,
                timeout=300,  # 5-minute timeout
            )
        except Exception as exc:
            logger.error(f"News crawl background task failed: {exc}")

    thread = threading.Thread(target=_run_news_pipeline, daemon=True)
    thread.start()

    return {
        "status": "accepted",
        "message": "News crawl triggered successfully.",
        "started_at": started_at,
    }


# =============================================================================
# T7 — Challenge Response Endpoints
# =============================================================================


class CreateResponseRequest(BaseModel):
    parent_slug: str
    title: str


@app.post("/api/admin/responses", status_code=201)
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
            INSERT INTO records (id, title, slug, challenge_id, status,
                                 created_at, updated_at, responses)
            VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)
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
        except (json.JSONDecodeError, TypeError):
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


@app.get("/api/admin/responses")
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
            WHERE challenge_id IS NOT NULL
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


@app.get("/api/admin/responses/{response_id}")
async def get_single_response(
    response_id: str, admin_data: dict = Depends(verify_token)
):
    """
    Returns a single response record by ID.
    404 if not found or if it's not a response type (challenge_id is NULL).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM records WHERE id = ? AND challenge_id IS NOT NULL",
            (response_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Response not found or is not a response record.",
            )

        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch response: " + str(e)
        )


# =============================================================================
# T8 — Agent Run Endpoint
# =============================================================================


class AgentRunRequest(BaseModel):
    pipeline: str  # 'academic_challenges' or 'popular_challenges'
    slug: str


@app.post("/api/admin/agent/run", status_code=202)
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
        "wikipedia_pipeline",
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


# =============================================================================
# T9 — Agent Logs Endpoint
# =============================================================================


@app.get("/api/admin/agent/logs")
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
