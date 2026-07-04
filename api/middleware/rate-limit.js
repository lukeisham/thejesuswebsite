// In-memory rate limiter middleware factory.
// Uses only Node built-ins (SR-2: no external dependencies for non-visual concerns).
// Per-IP counters stored in a Map; resets on deploy (acceptable for a single-admin VPS).
//
// Usage:
//   const rateLimit = require('../middleware/rate-limit');
//   router.post('/endpoint', rateLimit({ maxAttempts: 5, windowMs: 60_000 }), handler);

/**
 * Create a rate-limiter middleware that tracks requests per IP.
 *
 * @param {{ maxAttempts: number, windowMs: number }} options
 * @returns {import('express').RequestHandler}
 */
function createRateLimiter({ maxAttempts, windowMs }) {
  // Keyed by IP: { count, resetAt (epoch ms) }
  const store = new Map();

  /** Evict expired entries from the store. */
  function _evictExpired() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  // Periodic sweep to prevent unbounded memory growth.
  const sweepTimer = setInterval(_evictExpired, windowMs);
  sweepTimer.unref();

  function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip;

    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(ip, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > maxAttempts) {
      return res.status(429).json({
        error: "Too many requests. Please wait before trying again.",
      });
    }

    next();
  }

  // Expose for direct testing.
  rateLimit._evictExpired = _evictExpired;

  return rateLimit;
}

module.exports = createRateLimiter;
