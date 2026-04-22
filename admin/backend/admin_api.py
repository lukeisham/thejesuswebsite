# =============================================================================
#   THE JESUS WEBSITE — ADMIN API
#   File:    admin/backend/admin_api.py
#   Version: 1.1.0
#   Purpose: Secure backend writing to SQLite. Includes Auth endpoints and CRUD.
# =============================================================================

import os
import sqlite3
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from pydantic import BaseModel
from typing import Dict, Any

import sys
# Add the project root to sys.path to allow absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from auth_utils import AuthUtils
from backend.middleware.rate_limiter import RateLimiterMiddleware

app = FastAPI(title="The Jesus Website API - Admin")
# Instantiate and add rate limiter (allows 30 requests per minute for admin actions)
app.add_middleware(RateLimiterMiddleware, requests_per_minute=30)

@app.get("/api/health")
async def health_check():
    """
    Public health check endpoint for monitoring infrastructure integrity.
    """
    return {"status": "ok", "service": "The Jesus Website Admin API"}


# Path to the primary SQLite database
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'database.sqlite')

# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    password: str

# -----------------------------------------------------------------------------
# Authentication Middleware / Dependency
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

# -----------------------------------------------------------------------------
# Authentication Endpoints
# -----------------------------------------------------------------------------
@app.post("/api/admin/login")
async def login(req: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host
    
    # Check Brute Force
    is_safe, msg = AuthUtils.check_brute_force(client_ip)
    if not is_safe:
        raise HTTPException(status_code=429, detail=msg)
    
    # Verify Password
    if AuthUtils.verify_password(req.password):
        AuthUtils.record_attempt(client_ip, True)
        
        # Generate JWT
        token = AuthUtils.create_access_token(data={"role": "admin"})
        
        # Set HttpOnly Cookie (secure=True in production behind HTTPS)
        response.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=43200 # 12 hours
        )
        return {"message": "Login successful"}
    else:
        AuthUtils.record_attempt(client_ip, False)
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/admin/logout")
async def logout(response: Response):
    # Overwrite cookie to invalidate it
    response.delete_cookie("admin_token")
    return {"message": "Logged out successfully"}

@app.get("/api/admin/verify")
async def verify_session(admin_data: dict = Depends(verify_token)):
    """
    Endpoint for frontend middleware to verify active session status.
    Returns 200 with admin data if token is valid (handled by verify_token dependency).
    """
    return {"authenticated": True, "user": admin_data}

# -----------------------------------------------------------------------------
# CRUD Operations (Protected SQLite Access)
# -----------------------------------------------------------------------------

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/admin/records")
async def get_all_records(admin_data: dict = Depends(verify_token)):
    """
    Fetches high-level record list for the Dashboard.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, slug, primary_verse, era, timeline FROM records")
        records = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/records/{record_id}")
async def get_single_record(record_id: str, admin_data: dict = Depends(verify_token)):
    """
    Fetches full data for a single record row.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        raise HTTPException(status_code=404, detail="Record not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_valid_columns():
    """
    Returns a set of valid column names in the 'records' table to prevent SQL injection.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(records)")
        columns = {row['name'] for row in cursor.fetchall()}
        conn.close()
        return columns
    except Exception:
        return set()

@app.post("/api/admin/records")
async def create_record(record_data: Dict[str, Any], admin_data: dict = Depends(verify_token)):
    """
    Dynamically inserts an arbitrary JSON dictionary mapping to the SQLite columns.
    Uses parameterized injection to stop SQLi.
    """
    try:
        valid_cols = get_valid_columns()
        # Filter and validate columns
        safe_data = {k: v for k, v in record_data.items() if k in valid_cols}
        
        if not safe_data:
            raise HTTPException(status_code=400, detail="No valid columns provided")

        conn = get_db_connection()
        cursor = conn.cursor()
        
        columns = ', '.join(safe_data.keys())
        placeholders = ', '.join(['?' for _ in safe_data])
        values = tuple(safe_data.values())
        
        cursor.execute(f"INSERT INTO records ({columns}) VALUES ({placeholders})", values)
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return {"message": "Record created successfully", "id": last_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create record: " + str(e))

@app.put("/api/admin/records/{record_id}")
async def update_record(record_id: str, record_data: Dict[str, Any], admin_data: dict = Depends(verify_token)):
    """
    Dynamically updates a record mapping arbitrary JSON payload to the SQLite columns.
    """
    try:
        valid_cols = get_valid_columns()
        # Filter and validate columns
        safe_data = {k: v for k, v in record_data.items() if k in valid_cols}

        if not safe_data:
             raise HTTPException(status_code=400, detail="No valid columns to update provided")

        conn = get_db_connection()
        cursor = conn.cursor()
        
        set_clause = ', '.join([f"{k} = ?" for k in safe_data.keys()])
        values = tuple(safe_data.values()) + (record_id,)
        
        cursor.execute(f"UPDATE records SET {set_clause} WHERE id = ?", values)
        conn.commit()
        conn.close()
        return {"message": "Record updated successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update record: " + str(e))

@app.delete("/api/admin/records/{record_id}")
async def delete_record(record_id: str, admin_data: dict = Depends(verify_token)):
    """
    Deletes a record.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()
        conn.close()
        return {"message": "Record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete record: " + str(e))
