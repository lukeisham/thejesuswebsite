# =============================================================================
#   THE JESUS WEBSITE — ACADEMIC CHALLENGES PIPELINE
#   File:    backend/pipelines/pipeline_academic_challenges.py
#   Version: 1.1.0
#   Purpose: Analyzes and ranks academic historical debates and inserts to SQLite.
#
#   DATA MAPPING:
#     Source  →  External academic API (mock: Google Scholar / citation metrics).
#     Output  →  records.academic_challenge_rank (INTEGER, final computed rank).
#
#     Weight override is stored in records.academic_challenge_weight as a JSON blob:
#       {"multiplier": 1.5}  →  boosts raw citation_score by 1.5x before storing.
#     If the column is NULL or the JSON is malformed, multiplier defaults to 1.0.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each run overwrites the rank for every record.
#     It does not insert or delete rows — only updates existing ones.
# =============================================================================

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "database.sqlite"
)


def analyze_academic_consensus(challenge_slug: str):
    """
    Mock integration for fetching Google Scholar or peer-reviewed citation metrics
    evaluating the 'academic' weight of a historical challenge.

    In production, replace this with a real API call
    using backend/scripts/helper_api.py.
    Expected response shape: {"citation_score": <int>}
    """
    logger.info(f"Analyzing scholarly frequency for '{challenge_slug}'...")
    return {"citation_score": 85}


def run_pipeline():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Reads all records, computes academic ranking, and writes back to SQLite.
    Output:   Updated records.academic_challenge_rank for every row.
    """
    logger.info("Starting Academic Challenges Pipeline...")

    if not os.path.exists(DB_PATH):
        logger.error("Database not found! Aborting.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, slug, academic_challenge_weight FROM records WHERE slug IS NOT NULL"
    )
    records = cursor.fetchall()

    for row in records:
        record_id, slug, raw_weight = row

        # Parse the optional editorial weight override stored as a JSON blob
        multiplier = 1.0
        if raw_weight:
            try:
                weight_data = json.loads(raw_weight)
                multiplier = float(weight_data.get("multiplier", 1.0))
            except json.JSONDecodeError:
                pass

        metrics = analyze_academic_consensus(slug)
        final_rank = int(metrics["citation_score"] * multiplier)

        cursor.execute(
            """
            UPDATE records
            SET academic_challenge_rank = ?,
                updated_at = ?
            WHERE id = ?
        """,
            (final_rank, datetime.now(timezone.utc).isoformat(), record_id),
        )

    conn.commit()
    conn.close()
    logger.info("Academic Challenges Pipeline completed.")


if __name__ == "__main__":
    run_pipeline()
