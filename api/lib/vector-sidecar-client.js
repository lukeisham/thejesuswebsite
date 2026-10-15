// Centralized helper for calling the Python vector sidecar (JS-5: one place
// for this fetch, not ad-hoc calls scattered across routes). The sidecar
// serves Plan 4/5's FAISS stores for live signal classification — see
// Wikipedia algorithm/vector-sidecar/app.py and setup/PLANS/.../wikipedia-v2-09-vps-vector-store-serving.md.
//
// Sidecar is localhost-only (127.0.0.1), so this module never needs auth.

const SIDECAR_BASE_URL =
  process.env.VECTOR_SIDECAR_URL || "http://127.0.0.1:8901";
const TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Global cap on sidecar calls, shared by all clients (issue #242). The
// per-IP rate limit on /wikipedia/signal-check does not stop many IPs at
// once. At most MAX_IN_FLIGHT calls run; up to MAX_QUEUED more wait their
// turn; any request past that gets VECTOR_SIDECAR_BUSY at once.
const MAX_IN_FLIGHT = 2;
const MAX_QUEUED = 8;
let inFlight = 0;
const waiting = [];

function acquireSlot() {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  if (waiting.length >= MAX_QUEUED) {
    return Promise.reject(
      new VectorSidecarError(
        "VECTOR_SIDECAR_BUSY",
        `Vector sidecar is busy (${MAX_IN_FLIGHT} running, ${MAX_QUEUED} waiting).`,
      ),
    );
  }
  // The slot passes straight from releaseSlot() to the next waiter, so
  // inFlight does not change on hand-over.
  return new Promise((resolve) => waiting.push(resolve));
}

function releaseSlot() {
  const next = waiting.shift();
  if (next) next();
  else inFlight -= 1;
}

// In-memory response cache, keyed on `${family}::${text}::${k}`.
// Same eviction pattern as middleware/rate-limit.js's sweep timer.
const cache = new Map();

function _evictExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

const sweepTimer = setInterval(_evictExpired, CACHE_TTL_MS);
sweepTimer.unref();

/** Error thrown by queryFamily; `errorCode` names an error-codes.js key. */
class VectorSidecarError extends Error {
  constructor(errorCode, message) {
    super(message);
    this.name = "VectorSidecarError";
    this.errorCode = errorCode;
  }
}

function cacheKey(family, text, k) {
  return `${family}::${text}::${k}`;
}

/**
 * Query the vector sidecar's /query endpoint for a family + text.
 * Caches identical (family, text, k) requests for CACHE_TTL_MS.
 *
 * @param {string} family
 * @param {string} text
 * @param {number} [k]
 * @returns {Promise<object>} the sidecar's parsed JSON response
 * @throws {VectorSidecarError} with errorCode one of
 *   VECTOR_SIDECAR_UNREACHABLE | VECTOR_SIDECAR_TIMEOUT | VECTOR_SIDECAR_MALFORMED_RESPONSE |
 *   VECTOR_SIDECAR_BUSY
 */
async function queryFamily(family, text, k = 5) {
  const key = cacheKey(family, text, k);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  await acquireSlot();
  try {
    return await fetchAndCache(key, family, text, k);
  } finally {
    releaseSlot();
  }
}

async function fetchAndCache(key, family, text, k) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${SIDECAR_BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family, text, k }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new VectorSidecarError(
        "VECTOR_SIDECAR_TIMEOUT",
        `Vector sidecar request timed out after ${TIMEOUT_MS}ms.`,
      );
    }
    throw new VectorSidecarError(
      "VECTOR_SIDECAR_UNREACHABLE",
      `Vector sidecar unreachable: ${error.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new VectorSidecarError(
      "VECTOR_SIDECAR_MALFORMED_RESPONSE",
      `Vector sidecar returned HTTP ${response.status}.`,
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new VectorSidecarError(
      "VECTOR_SIDECAR_MALFORMED_RESPONSE",
      "Vector sidecar response was not valid JSON.",
    );
  }

  if (
    !data ||
    typeof data.family !== "string" ||
    typeof data.store !== "string" ||
    !Array.isArray(data.results) ||
    !data.verdict
  ) {
    throw new VectorSidecarError(
      "VECTOR_SIDECAR_MALFORMED_RESPONSE",
      "Vector sidecar response did not match the expected shape.",
    );
  }

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

module.exports = {
  queryFamily,
  VectorSidecarError,
  MAX_IN_FLIGHT,
  MAX_QUEUED,
  _cache: cache,
  _evictExpired,
};
