# =============================================================================
#   THE JESUS WEBSITE — POPULAR CHALLENGES PIPELINE
#   File:    backend/pipelines/pipeline_popular_challenges.py
#   Version: 1.1.0
#   Purpose: Analyzes and ranks popular public queries and inserts to SQLite.
#
#   DATA MAPPING:
#     Source  →  Search trend APIs (mock: Google Trends / LLM metric analysis).
#     Output  →  records.popular_challenge_rank (INTEGER, final computed rank).
#
#     Weight override is stored in records.popular_challenge_weight as a JSON blob:
#       {"multiplier": 2.0}  →  doubles the raw trend_score before storing.
#     If the column is NULL or the JSON is malformed, multiplier defaults to 1.0.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each run overwrites the rank for every record.
#     It does not insert or delete rows — only updates existing ones.
# =============================================================================

import os
import sqlite3
import json
import sys
from datetime import datetime

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'database.sqlite')

def analyze_search_trends(challenge_slug: str):
    """
    Mock integration for fetching Google Trends or external LLM metric analysis.
    Evaluates the 'popular' search volume indicating current cultural relevance.

    In production, replace with a live API call via backend/scripts/helper_api.py.
    Expected response shape: {"trend_score": <int>}
    """
    logger.info(f"Analyzing search momentum for '{challenge_slug}'...")
    return {"trend_score": 500}

def run_pipeline():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Reads all records, computes popular ranking, and writes back to SQLite.
    Output:   Updated records.popular_challenge_rank for every row.
    """
    logger.info("Starting Popular Challenges Pipeline...")
    
    if not os.path.exists(DB_PATH):
        logger.error("Database not found! Aborting.")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Fetch records designed as popular challenges
    cursor.execute("SELECT id, slug, popular_challenge_weight FROM records WHERE slug IS NOT NULL")
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
                
        metrics = analyze_search_trends(slug)
        final_rank = int(metrics["trend_score"] * multiplier)
        
        cursor.execute("""
            UPDATE records 
            SET popular_challenge_rank = ?,
                updated_at = ?
            WHERE id = ?
        """, (final_rank, datetime.utcnow().isoformat(), record_id))
        
    conn.commit()
    conn.close()
    logger.info("Popular Challenges Pipeline completed.")

if __name__ == "__main__":
    run_pipeline()
