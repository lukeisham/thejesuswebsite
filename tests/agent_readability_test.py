# =============================================================================
#   THE JESUS WEBSITE — AGENT READABILITY TEST
#   File:    tests/agent_readability_test.py
#   Version: 1.1.0
#   Purpose: Simulates a headless agent crawl to verify structured data clarity.
#   Source:  guide_welcoming_robots.md §5
# =============================================================================

import os
import sqlite3
import json
import logging
import sys

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging for tests
logger = setup_logger(__file__, is_test=True)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, 'database', 'database.sqlite')

def test_record_structure_for_agents():
    """
    Validates that database records are "agent-ready" with clean JSON and sluggable IDs.
    """
    logger.info("Target: Data Structure Integrity Audit (LLM Compatibility)...")
    
    if not os.path.exists(DB_PATH):
        logger.error("FAILURE: Database missing. Cannot verify data readability.")
        return False

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Pull a sample record for structural anatomy check
        cursor.execute("SELECT * FROM records LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            logger.warning("No records found to audit.")
            return True
            
        # Verify critical "Discovery" fields for agents
        record = dict(row)
        checks = ['slug', 'title', 'era', 'primary_verse', 'description']
        
        missing = [c for c in checks if not record.get(c)]
        if missing:
            logger.error(f"FAILURE: Discovery fields missing in database: {missing}")
            return False
            
        # Verify JSON-blob parseability (biblio, metadata)
        try:
            if record.get('bibliography'):
                json.loads(record.get('bibliography'))
            logger.info("Check PASSED: Relational JSON blobs are valid and parseable.")
        except json.JSONDecodeError:
            logger.error("FAILURE: Corrupt JSON detected in record bibliography.")
            return False

        return True
    except Exception as e:
        logger.error(f"READABILITY ERROR: {str(e)}")
        return False

def test_instruction_clarity():
    """
    Verifies that the robot-instructions are present in the expected ROOT asset path.
    """
    logger.info("Target: Agent Instruction Availability...")
    instr_path = os.path.join(ROOT_DIR, "assets", "ai-instructions.txt")
    
    if os.path.exists(instr_path):
        logger.info("Check PASSED: ai-instructions.txt is correctly positioned.")
        return True
    else:
        logger.error("FAILURE: ai-instructions.txt is missing from assets/.")
        return False

def run_suite():
    logger.info("Initializing 'Welcoming Robots' Readability Audit...")
    
    r1 = test_record_structure_for_agents()
    r2 = test_instruction_clarity()
    
    if r1 and r2:
        logger.info("Agent Readability Audit: SUCCESS (Data is Agent-Friendly).")
    else:
        logger.error("Agent Readability Audit: DETECTED READABILITY BARRIERS.")

if __name__ == "__main__":
    run_suite()
