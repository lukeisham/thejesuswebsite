# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: AUTH
#   File:    admin/backend/routes/auth.py
#   Version: 1.0.0
#   Purpose: Login, logout, and session verification endpoints.
# =============================================================================

import os

from fastapi import APIRouter, Depends, Request, Response

from .shared import AuthUtils, HTTPException, LoginRequest, logger, verify_token

router = APIRouter()


# -----------------------------------------------------------------------------
# Authentication Endpoints
# -----------------------------------------------------------------------------
@router.post("/api/admin/login")
async def login(req: LoginRequest, request: Request, response: Response):
    # FIXED: Added check for Cloudflare headers and guarded against NoneType client
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else "unknown"
    )

    # Check Brute Force
    is_safe, msg = AuthUtils.check_brute_force(client_ip)
    if not is_safe:
        raise HTTPException(status_code=429, detail=msg)

    # Verify Password
    if AuthUtils.verify_password(req.password):
        AuthUtils.record_attempt(client_ip, True)

        # Generate JWT
        token = AuthUtils.create_access_token(data={"role": "admin"})

        # Set HttpOnly Cookie
        # secure=True in production behind HTTPS; set COOKIE_SECURE=true in .env
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        response.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=cookie_secure,
            max_age=43200,  # 12 hours
        )
        return {"message": "Login successful"}
    else:
        AuthUtils.record_attempt(client_ip, False)
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/api/admin/logout")
async def logout(response: Response):
    # Overwrite cookie to invalidate it
    response.delete_cookie("admin_token")
    return {"message": "Logged out successfully"}


@router.get("/api/admin/verify")
async def verify_session(admin_data: dict = Depends(verify_token)):
    """
    Endpoint for frontend middleware to verify active session status.
    Returns 200 with admin data if token is valid (handled by verify_token dependency).
    """
    return {"authenticated": True, "user": admin_data}
