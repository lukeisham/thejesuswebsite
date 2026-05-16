# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: SHARED DEPENDENCIES
#   File:    admin/backend/routes/shared.py
#   Version: 1.0.0
#   Purpose: Common imports, models, DB helpers, and auth dependency used by
#            all route modules. Each route file imports from here to avoid
#            duplication.
# =============================================================================

import os
import sqlite3
import sys
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request
from pydantic import BaseModel

# -----------------------------------------------------------------------------
# Path hacks — needed so auth_utils and backend.* imports resolve from inside
# the routes/ subdirectory.
# -----------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))  # routes/ itself
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))  # admin/backend/

from auth_utils import AuthUtils  # noqa: E402

from backend.middleware.logger_setup import setup_logger  # noqa: E402

# -----------------------------------------------------------------------------
# Logger — one shared instance for all routes
# -----------------------------------------------------------------------------
logger = setup_logger(__file__)

# -----------------------------------------------------------------------------
# Database path
# -----------------------------------------------------------------------------
DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "database", "database.sqlite"
)


# -----------------------------------------------------------------------------
# DB Helpers
# -----------------------------------------------------------------------------
def get_db_connection():
    """Open a new SQLite connection with row_factory set to sqlite3.Row."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found.")
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def get_valid_columns(
    conn: Optional[sqlite3.Connection] = None,
) -> List[str]:
    """
    Return the list of column names in the 'records' table.
    If no connection is supplied, a temporary one is opened and closed.

    Used as a whitelist to prevent SQL injection in dynamic column-name
    interpolation (e.g. ORDER BY clauses).
    """
    close_after = False
    if conn is None:
        conn = get_db_connection()
        close_after = True

    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(records)")
    columns = [row[1] for row in cursor.fetchall()]

    if close_after:
        conn.close()

    return columns


# -----------------------------------------------------------------------------
# Pydantic Models — used by multiple route files
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


class BatchUpdateItem(BaseModel):
    slug: str
    data: Dict[str, Any]


class BulkReviewRecordsRequest(BaseModel):
    records: List[Dict[str, Any]]


class SnippetGenerateRequest(BaseModel):
    slug: str
    content: str


class MetadataGenerateRequest(BaseModel):
    slug: str
    content: str


class CreateResponseRequest(BaseModel):
    parent_slug: str
    title: str


class AgentRunRequest(BaseModel):
    pipeline: str  # 'academic_challenges' or 'popular_challenges'
    slug: str


class NewsCrawlRequest(BaseModel):
    """Request body for triggering a news crawl with sidebar data."""

    source_url: str | None = None
    search_terms: list[str] | None = None


# -----------------------------------------------------------------------------
# Auth Dependency — used by every protected route
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
