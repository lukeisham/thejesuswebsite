# =============================================================================
#   THE JESUS WEBSITE — RATE LIMITER MIDDLEWARE
#   File:    backend/middleware/rate_limiter.py
#   Version: 1.1.0
#   Purpose: DDoS protection and API endpoint rate limiting (FastAPI).
# =============================================================================

import time
from fastapi import Request, HTTPException, status
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
        # Determine the client IP
        ip_address = request.client.host
        
        # Don't rate-limit local health checks or static assets
        if request.url.path.startswith(("/css/", "/assets/", "/frontend/core/")):
            return await call_next(request)

        now = time.time()
        
        # Basic cleanup: if the dictionary is getting large, purge old entries
        # to prevent memory growth (Robustness Improvement)
        if len(request_counts) > 10000:
            expired_ips = [ip for ip, (cnt, t) in request_counts.items() if now - t > 3600]
            for ip in expired_ips:
                del request_counts[ip]

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
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please wait a minute and try again."
                    )
                request_counts[ip_address] = (count + 1, first_request_time)

        response = await call_next(request)
        return response
