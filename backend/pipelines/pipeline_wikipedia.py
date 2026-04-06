# =============================================================================
#   THE JESUS WEBSITE — WIKIPEDIA PIPELINE
#   File:    backend/pipelines/pipeline_wikipedia.py
#   Version: 1.1.0
#   Purpose: Fetches, ranks, and inserts Wikipedia mention data to SQLite.
# =============================================================================

import os
import sqlite3
import json
import logging
import sys
from datetime import datetime

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging for system pipelines
logger = setup_logger(__file__)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'database.sqlite')

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def fetch_wikipedia_metrics(target_slug: str):
    """
    Simulated function to fetch and rank Wikipedia references for a given slug.
    In a real scenario, this would hit the Wikipedia REST API to count mentions
    or pageviews to gauge historical relevance strictly neutrally.
    """
    logger.info(f"Fetching Wikipedia metrics for '{target_slug}'...")
    # Mock return
    return {"raw_rank_score": 100, "wiki_link": f"https://en.wikipedia.org/wiki/{target_slug}"}

def run_pipeline():
    """
    Executes the ingestion and ranking pipeline algorithm.
    """
    logger.info("Starting Wikipedia Ingestion Pipeline...")
    
    if not os.path.exists(DB_PATH):
        logger.error("Database not found! Aborting.")
        return
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Fetch all records that participate in the Wiki Rank system
    cursor.execute("SELECT id, slug, wikipedia_weight FROM records WHERE slug IS NOT NULL")
    records = cursor.fetchall()
    
    for row in records:
        record_id, slug, raw_weight = row
        
        # Parse administrative weight override from the CMS Editor
        weight_multiplier = 1.0
        if raw_weight:
            try:
                weight_data = json.loads(raw_weight)
                weight_multiplier = float(weight_data.get("multiplier", 1.0))
            except json.JSONDecodeError:
                pass
                
        # Fetch external API data
        metrics = fetch_wikipedia_metrics(slug)
        
        # Calculate Final Rank
        final_rank = int(metrics["raw_rank_score"] * weight_multiplier)
        
        # Example JSON Link formatting
        wiki_link_json = json.dumps({"url": metrics["wiki_link"], "title": f"Wikipedia: {slug.replace('-', ' ').title()}"})
        
        # Update Record in SQLite
        cursor.execute("""
            UPDATE records 
            SET wikipedia_rank = ?,
                wikipedia_link = ?,
                updated_at = ?
            WHERE id = ?
        """, (final_rank, wiki_link_json, datetime.utcnow().isoformat(), record_id))
        
    conn.commit()
    conn.close()
    
    logger.info("Wikipedia Pipeline completed successfully.")

if __name__ == "__main__":
    run_pipeline()
