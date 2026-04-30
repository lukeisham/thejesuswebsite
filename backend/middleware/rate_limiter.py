# =============================================================================
#   THE JESUS WEBSITE — RATE LIMITER MIDDLEWARE
#   File:    backend/middleware/rate_limiter.py
#   Version: 1.1.1 (Patched)
#   Purpose: DDoS protection and API endpoint rate limiting (FastAPI).
# =============================================================================

import time
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Tuple

# In-memory store for tracking IP request counts
# For production clusters, swap this with Redis.
request_counts: Dict[str, Tuple[int, float]] = {}

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute

    async def dispatch(self, request: Request, call_next):
        # 1. SAFELY DETERMINE THE CLIENT IP
        # We check 'X-Forwarded-For' first (essential for Cloudflare/Nginx)
        # We then fall back to request.client.host if it exists (for direct local dev)
        # Finally, we default to '127.0.0.1' if the connection is a Unix Socket.
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Cloudflare often sends multiple IPs; the first one is the real client.
            ip_address = forwarded.split(",")[0].strip()
        else:
            # This is where the 'NoneType' crash happened. We check if client exists first.
            ip_address = request.client.host if request.client else "127.0.0.1"
        
        # 2. PATH EXCLUSIONS (Original Logic Kept)
        # Don't rate-limit local health checks or static assets
        if request.url.path.startswith(("/css/", "/js/", "/assets/", "/frontend/core/")):
            return await call_next(request)

        now = time.time()
        
        # 3. MEMORY CLEANUP (Original Logic Kept)
        # If the dictionary is getting large, purge old entries to prevent memory growth.
        if len(request_counts) > 10000:
            expired_ips = [ip for ip, (cnt, t) in request_counts.items() if now - t > 3600]
            for ip in expired_ips:
                del request_counts[ip]

        # 4. RATE LIMITING LOGIC (Original Logic Kept)
        # Initialize or fetch the request record for this IP
        if ip_address not in request_counts:
            request_counts[ip_address] = (1, now)
        else:
            count, first_request_time = request_counts[ip_address]
            
            # Reset window if a minute has passed
            if now - first_request_time > 60:
                request_counts[ip_address] = (1, now)
            else:
                # If within the window, check the count
                if count >= self.requests_per_minute:
                    # NOTE: We use JSONResponse here instead of raising HTTPException.
                    # Starlette's BaseHTTPMiddleware can struggle with raised exceptions.
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={"detail": "Rate limit exceeded. Please wait a minute and try again."}
                    )
                request_counts[ip_address] = (count + 1, first_request_time)

        response = await call_next(request)
        return response