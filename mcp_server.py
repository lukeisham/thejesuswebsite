# =============================================================================
#   THE JESUS WEBSITE — MODEL CONTEXT PROTOCOL (MCP) SERVER
#   File:    mcp_server.py
#   Version: 1.2.0
#   Purpose: Read-only external agent access to the SQLite archive.
#            Provides filtered, type-safe, column-excluded access to the
#            `records` table. Explicitly excludes `system_data` type,
#            the `users` column, and the `system_config`/`agent_run_log`
#            tables (no tools reference them).
# =============================================================================

import json
import os
import sqlite3

# Real FastMCP import — no mock fallback. If mcp is not installed,
# the import will fail hard with a clear ModuleNotFoundError.
from mcp.server.fastmcp import FastMCP  # type: ignore[import-unresolved]

from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

# Initialize standard AI Agent interface
mcp = FastMCP("The Jesus Website - Archival Read-Only Server")

# Root directory database resolution
DB_PATH = os.path.join(os.path.dirname(__file__), "database", "database.sqlite")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Ensure query returns associative dictionaries
    return conn


# Public-safe column list for list_records — excludes `users` column.
# system_config and agent_run_log tables are never queried by any tool.
_LIST_RECORDS_COLUMNS = [
    "id",
    "title",
    "slug",
    "era",
    "timeline",
    "type",
    "status",
    "created_at",
]


@mcp.tool()
def list_records() -> str:
    """
    List historically archived records currently validated on The Jesus Website.
    Returns core foundational JSON metadata mapped securely via Read-Only selection.
    Filters out system_data type records and excludes the users column.
    """
    try:
        if not os.path.exists(DB_PATH):
            return json.dumps({"error": "External database not found. Server offline."})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Read-only explicit constraint — exclude system_data type and users column
        columns = ", ".join(_LIST_RECORDS_COLUMNS)
        cursor.execute(
            f"SELECT {columns} FROM records WHERE type NOT IN ('system_data') LIMIT 100"
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return json.dumps(rows, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Database indexing failure: {str(e)}"})


# Public-safe column list for get_record — excludes `users` column.
# Includes all public content columns needed for deep-dive display.
_GET_RECORD_COLUMNS = [
    "id",
    "title",
    "slug",
    "snippet",
    "body",
    "type",
    "status",
    "era",
    "timeline",
    "map_label",
    "geo_id",
    "gospel_category",
    "picture_name",
    "created_at",
    "updated_at",
    "bibliography",
    "context_links",
    "iaa",
    "pledius",
    "manuscript",
    "url",
    "page_views",
    "parent_id",
    "metadata_json",
]


@mcp.tool()
def get_record(slug: str) -> str:
    """
    Fetch the complete, unadulterated deep-dive JSON representation
    of a specific historical record.
    Args:
        slug: The precise url-friendly title
            (e.g. 'jesus-myth-theory')
    Notes:
        - Uses explicit column list (no SELECT *) to exclude `users` column.
        - Filters out system_data type even if slug somehow matches.
        - system_config and agent_run_log tables are never queried.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        columns = ", ".join(_GET_RECORD_COLUMNS)
        cursor.execute(
            f"SELECT {columns} FROM records "
            "WHERE slug = ? AND type NOT IN ('system_data') "
            "LIMIT 1",
            (slug,),
        )
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
            "SELECT title, slug, map_label FROM records "
            "WHERE era = ? AND type NOT IN ('system_data')",
            (era,),
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return json.dumps(rows, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Geospatial mapping query failed: {str(e)}"})


@mcp.tool()
def search_records(query: str) -> str:
    """
    Perform keyword-based lookup across public record titles and snippets.
    Args:
        query: Free-text keyword to search for in title and snippet fields.
    Returns:
        Up to 20 results with id, title, slug, type, snippet (first 200 chars),
        and created_at. Filters out system_data type and excludes users column.
    Notes:
        Uses parameterised LIKE queries to prevent SQL injection.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        search_pattern = f"%{query}%"
        cursor.execute(
            "SELECT id, title, slug, type, snippet, created_at "
            "FROM records "
            "WHERE (title LIKE ? OR snippet LIKE ?) "
            "AND type NOT IN ('system_data') "
            "LIMIT 20",
            (search_pattern, search_pattern),
        )
        rows = []
        for row in cursor.fetchall():
            record = dict(row)
            # Truncate snippet to first 200 characters for response brevity
            if record.get("snippet") and len(record["snippet"]) > 200:
                record["snippet"] = record["snippet"][:200]
            rows.append(record)
        conn.close()

        return json.dumps(rows, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Search query failed: {str(e)}"})


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
