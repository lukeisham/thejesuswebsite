#!/usr/bin/env python3

# =============================================================================
#
#   THE JESUS WEBSITE — DATABASE SEEDER
#   File:    tools/db_seeder.py
#   Version: 1.1.0
#   Purpose: Populate database.sqlite with development test records
#   Source:  data_schema.md  →  database.sql
#
#   USAGE:
#     Run from the project root:
#       python3 tools/db_seeder.py
#
#   BEHAVIOUR:
#     - Reads seed_data.sql and executes all INSERT statements.
#     - Uses INSERT OR IGNORE so it is safe to run repeatedly (idempotent).
#     - Prints a clear summary of records inserted vs already present.
#
# =============================================================================


# =============================================================================
# IMPORTS
# =============================================================================

import sqlite3
import os
import sys


# =============================================================================
# CONFIGURATION
# =============================================================================

# Resolve paths relative to this script, regardless of where it is invoked from.
# db_seeder.py lives in /tools/ so we go one level up to find /database/.
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR     = os.path.dirname(SCRIPT_DIR)
DB_PATH      = os.path.join(ROOT_DIR, "database", "database.sqlite")
SEED_PATH    = os.path.join(SCRIPT_DIR, "seed_data.sql")
SCHEMA_PATH  = os.path.join(ROOT_DIR, "database", "database.sql")


# =============================================================================
# HELPERS
# =============================================================================

def ensure_schema_exists(connection):
    """
    Apply database.sql schema to the database if the records table is absent.
    This guarantees the seeder can run even against a brand-new empty database.
    """
    cursor = connection.cursor()

    # Check whether the records table already exists.
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='records';"
    )
    table_exists = cursor.fetchone()

    if not table_exists:
        print("[schema]  records table not found — applying database.sql …")

        if not os.path.exists(SCHEMA_PATH):
            print(f"[error]   Schema file not found at: {SCHEMA_PATH}")
            sys.exit(1)

        with open(SCHEMA_PATH, "r", encoding="utf-8") as schema_file:
            schema_sql = schema_file.read()

        connection.executescript(schema_sql)
        print("[schema]  Schema applied successfully.")
    else:
        print("[schema]  records table already exists — skipping schema step.")


def count_records(connection):
    """Return the current number of rows in the records table."""
    cursor = connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM records;")
    return cursor.fetchone()[0]


def run_seed(connection):
    """
    Read seed_data.sql and execute all INSERT OR IGNORE statements.
    Returns the number of new rows inserted during this run.
    """
    if not os.path.exists(SEED_PATH):
        print(f"[error]   Seed file not found at: {SEED_PATH}")
        sys.exit(1)

    with open(SEED_PATH, "r", encoding="utf-8") as seed_file:
        seed_sql = seed_file.read()

    before = count_records(connection)

    # executescript commits automatically; use it for multi-statement SQL.
    connection.executescript(seed_sql)

    after = count_records(connection)
    inserted = after - before

    return inserted, before, after


# =============================================================================
# MAIN
# =============================================================================

def main():
    """
    Trigger:  Run this script directly.
    Function: Connect to database.sqlite, ensure schema exists, execute seed SQL.
    Output:   Printed summary of records inserted and current total.
    """

    print("=" * 60)
    print("  THE JESUS WEBSITE — DB SEEDER")
    print("=" * 60)
    print(f"[config]  Database : {DB_PATH}")
    print(f"[config]  Seed file: {SEED_PATH}")
    print()

    # Connect (creates the file if it does not exist).
    connection = sqlite3.connect(DB_PATH)

    try:
        ensure_schema_exists(connection)
        print()

        print("[seed]    Executing seed_data.sql …")
        inserted, before, after = run_seed(connection)
        print()

        print("=" * 60)
        print(f"  DONE")
        print(f"  Records before : {before}")
        print(f"  Records inserted: {inserted}")
        print(f"  Records total  : {after}")
        print("=" * 60)

    except sqlite3.Error as db_error:
        print(f"[error]   SQLite error: {db_error}")
        sys.exit(1)

    finally:
        connection.close()


if __name__ == "__main__":
    main()
