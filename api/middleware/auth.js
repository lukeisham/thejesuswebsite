// Authentication middleware and session store.
// A successful passkey assertion (see routes/passkey.js) mints a random token,
// returned to the browser as an httpOnly cookie and checked on each admin
// request. Sessions live in-process: no external session library is used
// (SR-2 — dependencies are for visual/display libraries only). For a single-admin
// VPS an in-memory map is sufficient; a restart simply forces a fresh login.

const crypto = require("crypto");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

// token -> { userHandle, createdAt, expiresAt }
const sessions = new Map();

/** Evict every session whose expiresAt has passed. */
function _evictExpired() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}

// Hourly sweep to prevent unbounded memory growth.
setInterval(_evictExpired, 60 * 60 * 1000).unref();

/** Mint a session for a verified user and return its opaque token. */
function createSession(userHandle) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(token, {
    userHandle,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return token;
}

/** Look up a live session, lazily expiring stale ones. */
function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

/** Destroy a session (logout). Returns true if one existed. */
function destroySession(token) {
  return sessions.delete(token);
}

/** Read the session token from the request's Cookie header without a parser lib. */
function readToken(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie
    ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1))
    : null;
}

/**
 * Express guard for admin-only routes. Attaches `req.user` on success and answers
 * 401 otherwise (JS-2: fail loudly — never let an unauthenticated request through).
 * Sets Cache-Control: no-store on every response because authenticated content
 * must never be served from a shared cache.
 */
function requireAuth(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  const token = readToken(req);
  if (!token) return sendError(res, ERRORS.MISSING_AUTH_TOKEN);
  const session = getSession(token);
  if (!session) return sendError(res, ERRORS.EXPIRED_SESSION);
  req.user = { handle: session.userHandle };
  next();
}

// The default export is the guard itself, so routes can write
// `const requireAuth = require('../middleware/auth')`. Session helpers used by
// the auth/passkey routes hang off it.
module.exports = requireAuth;
module.exports.createSession = createSession;
module.exports.getSession = getSession;
module.exports.destroySession = destroySession;
module.exports.readToken = readToken;
module.exports._evictExpired = _evictExpired;
module.exports.SESSION_COOKIE = SESSION_COOKIE;
module.exports.SESSION_TTL_MS = SESSION_TTL_MS;
