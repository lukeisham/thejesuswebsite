# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: APP FACTORY
#   File:    admin/backend/routes/__init__.py
#   Version: 1.0.0
#   Purpose: Creates the FastAPI app and registers all route sub-modules.
#            This replaces the monolithic admin_api.py as the app entry point.
# =============================================================================

import os
import sys

from fastapi import FastAPI

# Ensure project root is on sys.path so that backend.* imports resolve
# from inside the admin/backend/routes/ package, especially when uvicorn
# spawns worker subprocesses.
_project_root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
_project_root = os.path.abspath(_project_root)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse

from backend.middleware.rate_limiter import RateLimiterMiddleware  # noqa: E402

MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024  # 10 MB

CSRF_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CSRF_EXEMPT_PATHS = frozenset({"/api/admin/login", "/api/admin/logout", "/api/health"})


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (max 10 MB)"},
            )
        return await call_next(request)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        if request.method in CSRF_SAFE_METHODS:
            return await call_next(request)
        if request.url.path in CSRF_EXEMPT_PATHS:
            return await call_next(request)
        if not request.url.path.startswith("/api/admin/"):
            return await call_next(request)

        cookie_token = request.cookies.get("csrf_token", "")
        header_token = request.headers.get("x-csrf-token", "")

        if not cookie_token or not header_token or cookie_token != header_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing or invalid"},
            )

        return await call_next(request)


def create_app() -> FastAPI:
    """
    Build and return the fully-configured Admin API FastAPI app.

    Registers all route sub-modules in the order they were previously
    defined in admin_api.py. Includes the public health-check endpoint
    and the rate-limiter middleware.
    """
    app = FastAPI(title="The Jesus Website API - Admin")

    # --- Middleware ---
    # Body size: reject payloads over 10 MB before they hit route handlers
    app.add_middleware(BodySizeLimitMiddleware)
    # CSRF: validates X-CSRF-Token header matches csrf_token cookie on mutating requests
    app.add_middleware(CSRFMiddleware)
    # Rate limiter: 30 requests per minute for admin actions
    app.add_middleware(RateLimiterMiddleware, requests_per_minute=30)

    # --- Public health check ---
    @app.get("/api/health")
    async def health_check():
        """Public health check endpoint for monitoring infrastructure integrity."""
        return {"status": "ok", "service": "The Jesus Website Admin API"}

    # --- Route modules ---
    from . import (
        agents,  # noqa: F811
        auth,  # noqa: F811
        bulk,  # noqa: F811
        diagram,  # noqa: F811
        essays,  # noqa: F811
        lists,  # noqa: F811
        news,  # noqa: F811
        records,  # noqa: F811
        responses,  # noqa: F811
        system,  # noqa: F811
    )

    app.include_router(auth.router)
    app.include_router(records.router)
    app.include_router(lists.router)
    app.include_router(diagram.router)
    app.include_router(bulk.router)
    app.include_router(system.router)
    app.include_router(essays.router)
    app.include_router(news.router)
    app.include_router(responses.router)
    app.include_router(agents.router)

    return app
