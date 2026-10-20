// ESV passage proxy. Fetches passage text from the Crossway ESV API
// (https://api.esv.org) server-side so the ESV_API_KEY never reaches the
// browser. The in-memory cache has no expiry or invalidation, because passage
// text never changes. Its key is the lowercased, whitespace-collapsed reference,
// so spelling variants of one passage share one entry and one upstream call.
//
// Mounted at /esv by api/server.js behind publicReadLimit, because each uncached
// request costs an upstream ESV call. The only browser caller is getEsvPassage()
// in frontend/assets/js/api.js; renaming the path or the { reference, text }
// response breaks it. Guide: setup/ARCHITECTURE/esv-api.md.

const express = require("express");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

const ESV_ENDPOINT = "https://api.esv.org/v3/passage/text/";

// Without a limit, a hung upstream holds the request open indefinitely.
const ESV_TIMEOUT_MS = 5000;

const cache = new Map();

router.get("/passage", async (req, res) => {
  const reference = String(req.query.q || "").trim().replace(/\s+/g, " ");

  // Allowlist the reference BEFORE it is interpolated into the upstream URL —
  // book names, chapter:verse, ranges only. Without this gate the `q` param
  // would make this route an open proxy for arbitrary upstream requests.
  if (!reference || reference.length > 60 || !/^[\w\s.:,–-]+$/.test(reference)) {
    return sendValidationError(res, "q", ERRORS.INVALID_PASSAGE_FORMAT, {
      received: reference,
    });
  }

  if (!process.env.ESV_API_KEY) {
    return sendError(res, ERRORS.MISSING_ENV_VARIABLE);
  }

  const cacheKey = reference.toLowerCase();
  const cached = cache.get(cacheKey);
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
      // The key is attached here, server-side only. It must never reach the
      // client — a client-side fetch of the ESV API would embed this
      // credential in view-source for anyone to scrape.
      headers: { Authorization: `Token ${process.env.ESV_API_KEY}` },
      signal: AbortSignal.timeout(ESV_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      console.error(`GET /esv/passage: ESV API responded ${upstream.status} for "${reference}"`);
      return sendError(res, ERRORS.EXTERNAL_API_UPSTREAM_ERROR);
    }

    const body = await upstream.json();
    const text = (body.passages || []).join("\n").trim();
    if (!text) {
      return sendError(res, ERRORS.EXTERNAL_PASSAGE_NOT_FOUND, {
        reference,
      });
    }

    const result = { reference: body.canonical || reference, text };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error("GET /esv/passage failed:", error);

    // AbortSignal.timeout() rejects with a DOMException, not a TypeError.
    if (error.name === "TimeoutError" || error instanceof TypeError) {
      return sendError(res, ERRORS.EXTERNAL_API_NETWORK_ERROR);
    }

    if (error instanceof SyntaxError) {
      return sendError(res, ERRORS.JSON_PARSE_FAILURE);
    }

    sendError(res, ERRORS.EXTERNAL_API_UPSTREAM_ERROR);
  }
});

module.exports = router;
