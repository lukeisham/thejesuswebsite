// Dev-only auth bypass — mints a real admin session on the developer's local
// machine so coding agents can exercise admin editors without a passkey ceremony.
//
// THIS MUST NEVER RUN IN PRODUCTION. The entire module is only loaded by
// server.js when process.env.ADMIN_DEV_BYPASS === "1" at boot, so on the VPS
// (where the flag is absent) this code is never require()d into the process.
// Additionally, every gate inside the handler fails closed (404/403) if any
// condition is wrong — see the threat model in setup/PLANS/New/ for details.
//
// JS-4: comments explain *why* each gate exists — a future reader must
// understand this is deliberately dangerous code.

const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /auth/dev-login
 *
 * Multi-gated, fail-closed handler that mints a real admin session *only* when
 * called from the local machine with the correct secrets and no proxy in the
 * request path. Every gate fails with 404 or 403 so that a misconfigured
 * production deployment reveals as little as possible.
 */
router.get("/dev-login", async (req, res) => {
  try {
    // ── Gate 1: Refuse in production (NODE_ENV === "production") ──────────
    // Independent, hard kill-switch that cannot be overridden by any env flag.
    // Even if ADMIN_DEV_BYPASS is accidentally set on the VPS, this gate
    // returns 404 so the route appears to not exist from the outside.
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found." });
    }

    // ── Gate 2: Refuse when the bypass flag is not explicitly enabled ─────
    // This module is already only require()d when the flag is set, but the
    // gate doubles as a runtime assertion in case of future refactoring that
    // changes the conditional mount.
    if (process.env.ADMIN_DEV_BYPASS !== "1") {
      return res.status(404).json({ error: "Not found." });
    }

    // ── Gate 3: Refuse any proxied request ────────────────────────────────
    // On the VPS nginx always sets X-Forwarded-For. If this header is
    // present, the request came through a reverse proxy — meaning it is NOT
    // a direct loopback connection from the developer's own machine. This is
    // the critical defense against the proxy-topology problem: because we
    // set app.set("trust proxy", 1) in server.js, req.ip alone cannot
    // distinguish a remote attacker from a local request when nginx is in
    // the path.  Rejecting ANY forwarded-for header ensures the request hit
    // the Express process directly, which on the VPS never happens.
    if (req.headers["x-forwarded-for"]) {
      return res
        .status(403)
        .json({ error: "Proxied requests are not allowed for dev login." });
    }

    // ── Gate 4: Refuse non-loopback TCP peers ─────────────────────────────
    // req.socket.remoteAddress is the raw TCP peer, unaffected by trust-proxy.
    // Only loopback addresses are accepted — IPv4, IPv6, and IPv4-mapped IPv6.
    const remoteAddr = req.socket.remoteAddress;
    const LOOPBACK = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
    if (!LOOPBACK.includes(remoteAddr)) {
      return res
        .status(403)
        .json({ error: "Dev login is only available from localhost." });
    }

    // ── Gate 5: Verify the shared dev-bypass secret ───────────────────────
    // Defense-in-depth: even if a future change weakens the network-topology
    // checks above, the caller must still present a random secret that only
    // lives in the gitignored local .env file. If the secret is unset or
    // empty in the environment, refuse immediately.
    const expectedSecret = process.env.ADMIN_DEV_BYPASS_SECRET;
    if (!expectedSecret || typeof expectedSecret !== "string" || expectedSecret.length === 0) {
      console.error(
        "dev-bypass: ADMIN_DEV_BYPASS_SECRET is missing or empty — refusing login.",
      );
      return res
        .status(403)
        .json({ error: "Dev bypass secret not configured." });
    }
    const providedSecret = req.headers["x-dev-bypass-secret"];
    if (providedSecret !== expectedSecret) {
      return res
        .status(403)
        .json({ error: "Invalid dev bypass secret." });
    }

    // ── All gates passed — mint a real session ────────────────────────────
    const handle = "dev-agent";
    const token = auth.createSession(handle);
    res.cookie(auth.SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false, // local dev is always plain HTTP
      path: "/",
      maxAge: auth.SESSION_TTL_MS,
    });
    res.json({ authenticated: true, handle });
  } catch (error) {
    console.error("GET /auth/dev-login failed:", error);
    res.status(500).json({ error: "Dev login failed." });
  }
});

module.exports = router;
