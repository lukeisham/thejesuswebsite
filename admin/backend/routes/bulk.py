# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: BULK UPLOAD
#   File:    admin/backend/routes/bulk.py
#   Version: 1.0.0
#   Purpose: CSV bulk upload (Phase 1: validate/parse) and bulk commit
#            (Phase 2: insert reviewed records as draft).
# =============================================================================

import csv
import io
import json
from datetime import datetime, timezone

import ulid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .shared import (
    BulkReviewRecordsRequest,
    get_db_connection,
    get_valid_columns,
    logger,
    verify_token,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Shared enum sets — used by both bulk_upload_records and bulk_upload_commit
# ---------------------------------------------------------------------------
VALID_ERAS = {
    "PreIncarnation",
    "OldTestament",
    "EarlyLife",
    "Life",
    "GalileeMinistry",
    "JudeanMinistry",
    "PassionWeek",
    "Post-Passion",
}

VALID_TIMELINES = {
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

VALID_MAP_LABELS = {"Overview", "Empire", "Levant", "Judea", "Galilee", "Jerusalem"}
VALID_GOSPEL_CATEGORIES = {"event", "location", "person", "theme", "object"}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/api/admin/bulk-upload")
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
        if era and era.strip() and era.strip() not in VALID_ERAS:
            errors.append(f"Row {row_num}: Invalid era '{era}'")
            continue

        timeline = row.get("timeline", "")
        if timeline and timeline.strip() and timeline.strip() not in VALID_TIMELINES:
            errors.append(f"Row {row_num}: Invalid timeline '{timeline}'")
            continue

        map_label = row.get("map_label", "")
        if (
            map_label
            and map_label.strip()
            and map_label.strip() not in VALID_MAP_LABELS
        ):
            errors.append(f"Row {row_num}: Invalid map_label '{map_label}'")
            continue

        gospel_category = row.get("gospel_category", "")
        if (
            gospel_category
            and gospel_category.strip()
            and gospel_category.strip() not in VALID_GOSPEL_CATEGORIES
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

        # --- Server-side defaults: ensure records are visible on the public site ---
        if "type" not in insert_data:
            insert_data["type"] = "record"
        insert_data["status"] = "draft"

        # Generate ID and timestamps
        if "id" not in insert_data:
            insert_data["id"] = str(ulid.new())

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


@router.post("/api/admin/bulk-upload/commit")
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

    if len(records) > 500:
        raise HTTPException(
            status_code=400,
            detail=f"Batch too large: {len(records)} records exceeds the 500-record limit",
        )

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
        if era and era.strip() and era.strip() not in VALID_ERAS:
            errors.append(f"Row {row_num}: Invalid era '{era}'")
            continue

        timeline = row.get("timeline", "")
        if timeline and timeline.strip() and timeline.strip() not in VALID_TIMELINES:
            errors.append(f"Row {row_num}: Invalid timeline '{timeline}'")
            continue

        map_label = row.get("map_label", "")
        if (
            map_label
            and map_label.strip()
            and map_label.strip() not in VALID_MAP_LABELS
        ):
            errors.append(f"Row {row_num}: Invalid map_label '{map_label}'")
            continue

        gospel_category = row.get("gospel_category", "")
        if (
            gospel_category
            and gospel_category.strip()
            and gospel_category.strip() not in VALID_GOSPEL_CATEGORIES
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

        # --- Server-side defaults: ensure records are visible on the public site ---
        if "type" not in insert_data:
            insert_data["type"] = "record"

        # Generate ID and timestamps
        if "id" not in insert_data:
            insert_data["id"] = str(ulid.new())

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
