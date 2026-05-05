# =============================================================================
#   THE JESUS WEBSITE — MODEL CONTEXT PROTOCOL (MCP) SERVER
#   File:    mcp_server.py
#   Version: 1.1.0
#   Purpose: Read-only external agent access to the SQLite archive.
# =============================================================================

import json
import logging
import os
import sqlite3

from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

try:
    from mcp.server.fastmcp import FastMCP  # type: ignore[import-unresolved]
except ImportError:
    # Generic mock-fallback wrapper if the 'mcp' protocol package isn't yet
    # installed in the active venv during build staging.
    logging.warning("mcp package not found. (Install via: pip install mcp)")

    class FastMCP:
        def __init__(self, name):
            self.name = name

        def tool(self):
            def decorator(func):
                return func

            return decorator

        def run(self, *args, **kwargs):
            print(
                f"Mock MCP Server '{self.name}' initialized. "
                f"Install 'mcp' module to run protocol fully."
            )


# Initialize standard AI Agent interface
mcp = FastMCP("The Jesus Website - Archival Read-Only Server")

# Root directory database resolution
DB_PATH = os.path.join(os.path.dirname(__file__), "database", "database.sqlite")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Ensure query returns associative dictionaries
    return conn


@mcp.tool()
def list_records() -> str:
    """
    List historically archived records currently validated on The Jesus Website.
    Returns core foundational JSON metadata mapped securely via Read-Only selection.
    """
    try:
        if not os.path.exists(DB_PATH):
            return json.dumps({"error": "External database not found. Server offline."})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Read-only explicit constraint
        cursor.execute("SELECT id, title, slug, era, timeline FROM records LIMIT 100")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return json.dumps(rows, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Database indexing failure: {str(e)}"})


@mcp.tool()
def get_record(slug: str) -> str:
    """
    Fetch the complete, unadulterated deep-dive JSON representation
    of a specific historical record.
    Args:
        slug: The precise url-friendly title
            (e.g. 'jesus-myth-theory')
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE slug = ? LIMIT 1", (slug,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return json.dumps(dict(row), indent=2)
        return json.dumps(
            {"error": f"Record strictly tied to slug '{slug}' not found."}
        )
    except Exception as e:
        return json.dumps({"error": f"Database query failure: {str(e)}"})


@mcp.tool()
def query_encyclopedia_by_era(era: str) -> str:
    """
    Retrieve all historical/geographical records for a defined era.
    Args:
        era: Era constraint (e.g., 'Life', 'PassionWeek', 'OldTestament')
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT title, slug, map_label FROM records WHERE era = ?",
            (era,),
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return json.dumps(rows, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Geospatial mapping query failed: {str(e)}"})


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Initialize Read-Only Protocol Server")
    parser.add_argument(
        "--transport",
        default="stdio",
        choices=["stdio", "sse"],
        help="MCP Transport System Mechanism",
    )
    args = parser.parse_args()

    # Executing the loop natively
    if args.transport == "stdio":
        mcp.run(transport="stdio")
    else:
        # Server-Sent Events designed for wide network remote AI Agent queries
        mcp.run(transport="sse")
