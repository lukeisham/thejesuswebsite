# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: APP FACTORY
#   File:    admin/backend/routes/__init__.py
#   Version: 1.0.0
#   Purpose: Creates the FastAPI app and registers all route sub-modules.
#            This replaces the monolithic admin_api.py as the app entry point.
# =============================================================================

from fastapi import FastAPI

from .shared import RateLimiterMiddleware


def create_app() -> FastAPI:
    """
    Build and return the fully-configured Admin API FastAPI app.

    Registers all route sub-modules in the order they were previously
    defined in admin_api.py. Includes the public health-check endpoint
    and the rate-limiter middleware.
    """
    app = FastAPI(title="The Jesus Website API - Admin")

    # --- Middleware ---
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
