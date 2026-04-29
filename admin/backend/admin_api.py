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
import sys
import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel

# Add the project root to sys.path to allow absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from auth_utils import AuthUtils

from backend.middleware.rate_limiter import RateLimiterMiddleware
from backend.pipelines.image_processor import process_uploaded_png

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

        # Set HttpOnly Cookie (secure=True in production behind HTTPS)
        response.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,
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
async def get_all_records(admin_data: dict = Depends(verify_token)):
    """
    Fetches high-level record list for the Dashboard.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, slug, primary_verse, era, timeline FROM records"
        )
        records = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


def get_valid_columns():
    """
    Returns a set of valid column names in the 'records' table to prevent SQL injection.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(records)")
        columns = {row["name"] for row in cursor.fetchall()}
        conn.close()
        return columns
    except Exception:
        return set()


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
        picture_name = pathlib.Path(file.filename).name

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

        conn.commit()
        conn.close()

        return {
            "message": "Picture uploaded successfully",
            "picture_name": picture_name,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to upload picture: " + str(e)
        )


@app.delete("/api/admin/records/{record_id}/picture")
async def delete_record_picture(
    record_id: str,
    admin_data: dict = Depends(verify_token),
):
    """
    Clears picture data (name, bytes, thumbnail) from a record without deleting the record itself.
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
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to remove picture: " + str(e)
        )


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
    if not file.filename.endswith(".csv"):
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

    # Validation
    for index, row in enumerate(rows):
        row_num = index + 2  # 1-based index + header row

        # Check required fields
        title = row.get("title", "").strip()
        slug = row.get("slug", "").strip()

        if not title or not slug:
            errors.append(f"Row {row_num}: Missing 'title' or 'slug'")
            continue

        # Uniqueness check for slug
        cursor.execute("SELECT id FROM records WHERE slug = ?", (slug,))
        if cursor.fetchone():
            errors.append(f"Row {row_num}: Slug '{slug}' already exists")
            continue

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
        valid_cols = get_valid_columns()
        insert_data = {}
        for col in valid_cols:
            if col in row and row[col].strip():
                insert_data[col] = row[col].strip()

        # Generate ID and timestamps
        if "id" not in insert_data:
            insert_data["id"] = str(uuid.uuid4())

        now_iso = datetime.utcnow().isoformat() + "Z"
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
