// Analytics HTTP routes. The POST endpoint is public (the site records its own
// page views); the dashboard reads are admin-only. All SQL lives in the model.

const express = require("express");
const crypto = require("crypto");
const analyticsModel = require("../models/analytics.model");
const requireAuth = require("../middleware/auth");
const rateLimit = require("../middleware/rate-limit");
const uaParser = require("../services/ua-parser");
const geoip = require("../services/geoip");

const router = express.Router();

const analyticsPostLimit = rateLimit({ maxAttempts: 30, windowMs: 60_000 });

const MAX_FIELD_LENGTHS = { page: 500, referrer: 500, session_id: 100 };

// POST /analytics — record a page view. Called from the public site on each load.
router.post("/", analyticsPostLimit, (req, res) => {
  try {
    if (!req.body.page || typeof req.body.page !== "string") {
      return res
        .status(400)
        .json({ error: "page is required and must be a string." });
    }

    // JS-2: cap field lengths before they reach the database.
    for (const field of ["page", "referrer", "session_id"]) {
      const value = req.body[field];
      if (
        typeof value === "string" &&
        value.length > MAX_FIELD_LENGTHS[field]
      ) {
        return res.status(400).json({ error: field + " is too long." });
      }
    }

    // ── Server-side enrichment: device info from user-agent ────────────
    const ua = req.get("user-agent") || null;
    let device = { device_type: null, browser: null, os: null };
    if (ua) {
      try {
        device = uaParser.parse(ua);
      } catch {
        // Parser failure must never block the page view (JS-2)
      }
    }

    // ── Server-side enrichment: country from IP ────────────────────────
    let geo = { country: null };
    try {
      geo = geoip.lookup(req.ip);
    } catch {
      // GeoIP lookup failure must never block the page view (JS-2)
    }

    // ── Server-side enrichment: bot detection ──────────────────────────
    let isBot = 0;
    try {
      isBot = uaParser.isBot(ua) ? 1 : 0;
    } catch {
      // Bot detection failure must never block the page view (JS-2)
    }

    // ── Server-side enrichment: search terms from referrer ─────────────
    let searchTerms = null;
    try {
      searchTerms = uaParser.parseSearchTerms(req.body.referrer || null);
    } catch {
      // Search-term parsing failure must never block the page view (JS-2)
    }

    analyticsModel.record({
      page: req.body.page,
      referrer: req.body.referrer || null,
      user_agent: ua,
      // JS-2: hash the IP server-side — never trust a client-supplied ip_hash.
      ip_hash: crypto.createHash("sha256").update(req.ip).digest("hex"),
      session_id: req.body.session_id || null,
      device_type: device.device_type,
      browser: device.browser,
      os: device.os,
      country: geo.country,
      is_bot: isBot,
      search_terms: searchTerms,
    });
    res.status(204).end();
  } catch (error) {
    console.error("POST /analytics failed:", error);
    res.status(500).json({ error: "Failed to record view." });
  }
});

// GET /analytics/summary — totals, optionally since ?since=ISO_DATE (admin only)
router.get("/summary", requireAuth, (req, res) => {
  try {
    res.json(analyticsModel.getSummary(req.query.since || null));
  } catch (error) {
    console.error("GET /analytics/summary failed:", error);
    res.status(500).json({ error: "Failed to load summary." });
  }
});

// GET /analytics/top-pages (admin only)
router.get("/top-pages", requireAuth, (req, res) => {
  try {
    res.json(
      analyticsModel.getTopPages(Math.min(Number(req.query.limit) || 20, 100)),
    );
  } catch (error) {
    console.error("GET /analytics/top-pages failed:", error);
    res.status(500).json({ error: "Failed to load top pages." });
  }
});

// GET /analytics/top-referrers (admin only)
// Accepts ?external=true to exclude same-site referrers (thejesuswebsite.org).
router.get("/top-referrers", requireAuth, (req, res) => {
  try {
    const external = req.query.external === "true";
    res.json(
      analyticsModel.getTopReferrers(
        Math.min(Number(req.query.limit) || 20, 100),
        external,
      ),
    );
  } catch (error) {
    console.error("GET /analytics/top-referrers failed:", error);
    res.status(500).json({ error: "Failed to load referrers." });
  }
});

// GET /analytics — aggregate dashboard data (admin only)
// Accepts ?days=7|30|90, defaults to 30. Returns { stats, pageViews, referrers }.
router.get("/", requireAuth, (req, res) => {
  try {
    const daysParam = req.query.days;
    let days = 30;

    if (daysParam !== undefined) {
      days = Number(daysParam);
      if (![7, 30, 90].includes(days)) {
        return res.status(400).json({ error: "days must be 7, 30, or 90." });
      }
    }

    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();
    const summary = analyticsModel.getSummary(since);
    const pageViews = analyticsModel.getTopPagesWithTrend(days, 5);
    const referrers = analyticsModel.getTopReferrers(20);

    const stats = [
      { label: "Total Page Views", value: summary.total_views },
      { label: "Unique Sessions", value: summary.unique_sessions },
      { label: "Top Page", value: pageViews[0]?.views || 0 },
      { label: "Top Referrer", value: referrers[0]?.count || 0 },
    ];

    res.json({ stats, pageViews, referrers });
  } catch (error) {
    console.error("GET /analytics failed:", error);
    res.status(500).json({ error: "Failed to load analytics." });
  }
});

// GET /analytics/recent (admin only)
router.get("/recent", requireAuth, (req, res) => {
  try {
    res.json(
      analyticsModel.getRecent(Math.min(Number(req.query.limit) || 50, 200)),
    );
  } catch (error) {
    console.error("GET /analytics/recent failed:", error);
    res.status(500).json({ error: "Failed to load recent activity." });
  }
});

// GET /analytics/top-countries (admin only)
router.get("/top-countries", requireAuth, (req, res) => {
  try {
    res.json(
      analyticsModel.getTopCountries(
        req.query.since || null,
        Math.min(Number(req.query.limit) || 10, 50),
      ),
    );
  } catch (error) {
    console.error("GET /analytics/top-countries failed:", error);
    res.status(500).json({ error: "Failed to load countries." });
  }
});

// GET /analytics/device-breakdown (admin only)
router.get("/device-breakdown", requireAuth, (req, res) => {
  try {
    res.json(analyticsModel.getDeviceBreakdown(req.query.since || null));
  } catch (error) {
    console.error("GET /analytics/device-breakdown failed:", error);
    res.status(500).json({ error: "Failed to load device breakdown." });
  }
});

// GET /analytics/search-terms (admin only)
// Returns top search terms grouped by search_terms, ordered by count DESC.
router.get("/search-terms", requireAuth, (req, res) => {
  try {
    res.json(
      analyticsModel.getSearchTerms(
        req.query.since || null,
        Math.min(Number(req.query.limit) || 20, 100),
      ),
    );
  } catch (error) {
    console.error("GET /analytics/search-terms failed:", error);
    res.status(500).json({ error: "Failed to load search terms." });
  }
});

// GET /analytics/bot-stats (admin only)
// Returns { human: N, bot: N, bot_breakdown: [{ name, count }] }.
router.get("/bot-stats", requireAuth, (req, res) => {
  try {
    res.json(analyticsModel.getBotStats(req.query.since || null));
  } catch (error) {
    console.error("GET /analytics/bot-stats failed:", error);
    res.status(500).json({ error: "Failed to load bot stats." });
  }
});

module.exports = router;
