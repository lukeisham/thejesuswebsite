# =============================================================================
#   THE JESUS WEBSITE — SCHEMA MIGRATION
#   File:    tools/migrate_schema.py
#   Version: 1.0.0
#   Purpose: Apply incremental schema changes to the SQLite database.
#
#   TRIGGER:  Run manually or as part of plan_backend_infrastructure.
#   FUNCTION: Creates missing tables and indexes without disrupting existing data.
#   OUTPUT:   Updates database/database.sqlite schema in-place.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. All statements use IF NOT EXISTS.
# =============================================================================

import os
import sqlite3

# Determine the project root (two levels up from tools/)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "database", "database.sqlite")


def migrate():
    """Apply all pending schema migrations."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # --- system_config table ---
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS system_config (
            key         TEXT PRIMARY KEY,
            value       TEXT,
            updated_at  TEXT,
            updated_by  TEXT
        )
        """
    )

    # --- agent_run_log table ---
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS agent_run_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            pipeline        TEXT NOT NULL,
            record_slug     TEXT,
            status          TEXT NOT NULL DEFAULT 'running',
            trace_reasoning TEXT,
            articles_found  INTEGER DEFAULT 0,
            tokens_used     INTEGER DEFAULT 0,
            error_message   TEXT,
            started_at      TEXT NOT NULL,
            completed_at    TEXT
        )
        """
    )

    # --- agent_run_log indexes ---
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_agent_run_log_pipeline "
        "ON agent_run_log (pipeline)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_agent_run_log_status ON agent_run_log (status)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_agent_run_log_started_at "
        "ON agent_run_log (started_at)"
    )

    # --- resource_lists table (defined in database.sql but missing from live DB) ---
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS resource_lists (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            list_name   TEXT NOT NULL,
            record_slug TEXT NOT NULL,
            position    INTEGER NOT NULL DEFAULT 0,
            UNIQUE(list_name, record_slug)
        )
        """
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_resource_lists_list_position "
        "ON resource_lists (list_name, position)"
    )

    conn.commit()

    # --- Verify ---
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print("Tables in database:", tables)

    for table in ["system_config", "agent_run_log", "resource_lists"]:
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [(r[1], r[2]) for r in cursor.fetchall()]
        print(f"  {table} columns: {cols}")

    conn.close()
    print("\nMigration complete — all tables and indexes verified.")


if __name__ == "__main__":
    migrate()
