// Test-setup helpers — shared across test files for session isolation and
// environment consistency.
//
// The auth middleware stores sessions in a module-level Map (auth.js:16).
// Because multiple test files create sessions for auth-guarded tests ("admin",
// "test", etc.) and run in the same Node process, sessions from one test file
// can leak into the next — causing intermittent 401-vs-404 assertion failures
// when a stale token from File A happens to match a guard check in File B.
//
// Call clearAuthSessions() in a top-level beforeEach or beforeAll hook in any
// test file that creates or checks sessions.

const requireAuth = require("../../middleware/auth");

function clearAuthSessions() {
  requireAuth.clearSessions();
}

module.exports = { clearAuthSessions };
