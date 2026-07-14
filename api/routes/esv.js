// ESV passage proxy. Fetches passage text from the Crossway ESV API
// (https://api.esv.org) server-side so the ESV_API_KEY never reaches the
// browser. Responses are cached in-memory — passage text never changes.

const express = require("express");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

const ESV_ENDPOINT = "https://api.esv.org/v3/passage/text/";

// reference -> { reference, text }
const cache = new Map();

// GET /esv/passage?q=Luke 1:1-3 — plain passage text for a single reference
router.get("/passage", async (req, res) => {
  const reference = String(req.query.q || "").trim();

  // Book names, chapter:verse, ranges — nothing else needs to pass through.
  if (!reference || reference.length > 60 || !/^[\w\s.:,–-]+$/.test(reference)) {
    return res.status(400).json({ error: "Invalid passage reference." });
  }

  if (!process.env.ESV_API_KEY) {
    return res
      .status(503)
      .json({ error: "ESV API is not configured (ESV_API_KEY missing)." });
  }

  const cached = cache.get(reference);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      q: reference,
      "include-headings": "false",
      "include-footnotes": "false",
      "include-verse-numbers": "false",
      "include-short-copyright": "false",
      "include-passage-references": "false",
    });
    const upstream = await fetch(`${ESV_ENDPOINT}?${params}`, {
      headers: { Authorization: `Token ${process.env.ESV_API_KEY}` },
    });

    if (!upstream.ok) {
      console.error(`ESV API responded ${upstream.status} for "${reference}"`);
      return sendError(res, ERRORS.EXTERNAL_API_UPSTREAM_ERROR);
    }

    const body = await upstream.json();
    const text = (body.passages || []).join("\n").trim();
    if (!text) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "passage",
        reference,
      });
    }

    const result = { reference: body.canonical || reference, text };
    cache.set(reference, result);
    res.json(result);
  } catch (error) {
    console.error("GET /esv/passage failed:", error);

    // Network-level failures: DNS, TCP, TLS, timeout
    if (error instanceof TypeError) {
      return sendError(res, ERRORS.EXTERNAL_API_NETWORK_ERROR);
    }

    // JSON parse failure on response body
    if (error instanceof SyntaxError) {
      return sendError(res, ERRORS.JSON_PARSE_FAILURE);
    }

    // Unexpected errors: generic upstream failure
    sendError(res, ERRORS.EXTERNAL_API_UPSTREAM_ERROR);
  }
});

module.exports = router;
