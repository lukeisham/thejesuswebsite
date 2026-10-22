// Authentication middleware and session store.
// routes/passkey.js (and routes/dev-bypass.js) call createSession() after a
// verified login and set the token as an httpOnly cookie. requireAuth checks
// that cookie on every admin request; routes/auth.js reads it for /auth/me and
// /auth/logout through readToken(). Sessions and cookie parsing are hand-written
// because a new dependency needs sign-off (SR-2) and one cookie does not need
// one. The session lifetime and its effect on deploys are in
// setup/ARCHITECTURE/security.md.

const crypto = require("crypto");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

// token -> { userHandle, createdAt, expiresAt }
// Held in process memory only: a restart, including every deploy, ends all
// sessions. If this moves to disk, the guide row on sessions must change too.
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

/** Clear all sessions. Used by the test suite to isolate test files from
 * each other when they each start their own test server. Not exported to
 * production routes — only reachable via the internal exports object. */
function clearSessions() {
  sessions.clear();
}

/**
 * Read the session token from the request's Cookie header without a parser lib.
 * The header is attacker input: decodeURIComponent throws a URIError on a stray
 * "%", so a bad value returns null and the callers answer 401. It does not
 * console.warn, because any stranger can send this header and would fill the log.
 * @param {import('express').Request} req
 * @returns {string|null} The token, or null when absent or malformed.
 */
function readToken(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
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
module.exports.clearSessions = clearSessions;
module.exports.readToken = readToken;
module.exports._evictExpired = _evictExpired;
module.exports.SESSION_COOKIE = SESSION_COOKIE;
module.exports.SESSION_TTL_MS = SESSION_TTL_MS;
