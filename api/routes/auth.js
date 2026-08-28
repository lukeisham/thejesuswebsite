// Auth HTTP routes — session status and logout. The login ceremony itself lives
// in passkey.js (WebAuthn); this file covers the surrounding session lifecycle.

const express = require("express");
const auth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /auth/me — who, if anyone, is logged in. Used by the admin shell on load.
router.get("/me", (req, res) => {
  try {
    // Never cache authentication state in a shared cache.
    res.setHeader("Cache-Control", "no-store");
    const token = auth.readToken(req);
    const session = token && auth.getSession(token);
    if (!session) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, handle: session.userHandle });
  } catch (error) {
    console.error("GET /auth/me failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /auth/logout — end the current session.
router.post("/logout", (req, res) => {
  try {
    const token = auth.readToken(req);
    if (token) auth.destroySession(token);
    res.clearCookie(auth.SESSION_COOKIE);
    res.status(204).end();
  } catch (error) {
    console.error("POST /auth/logout failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
