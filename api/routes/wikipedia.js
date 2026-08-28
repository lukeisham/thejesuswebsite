// Wikipedia HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const wikipediaModel = require('../models/wikipedia.model');
const requireAuth = require('../middleware/auth');
const rateLimit = require('../middleware/rate-limit');
const ERRORS = require('../lib/error-codes');
const { sendError } = require('../lib/error-handler');
const vectorSidecarClient = require('../lib/vector-sidecar-client');

const router = express.Router();

// Public family names the vector sidecar knows how to classify against.
// Mirrors vector-sidecar/families.py's FAMILY_STORE_MAP keys — keep in sync.
const SIGNAL_FAMILY_WHITELIST = new Set([
    'data-bucket',
    'interpretation-bucket',
    'register',
    'balanced-debate',
    'anti-supernatural',
    'ot-nt-discontinuity',
    'mythicist-framing',
    'jesus-seminar',
    'secular-materialist',
    'confessional-balance',
    'literary-analysis',
    'gnostic-over-emphasis',
]);

const SIGNAL_CHECK_MAX_TEXT_LENGTH = 2000;

// Public, unauthenticated, and triggers a Python-side embedding computation
// per request — rate-limited on top of the shared public-read budget applied
// in server.js.
const signalCheckLimit = rateLimit({ maxAttempts: 20, windowMs: 60_000 });

// GET /wikipedia — public list of published Wikipedia articles
router.get('/', (req, res) => {
    try {
        const items = wikipediaModel.getAllPublished();
        res.json(items);
    } catch (error) {
        console.error('GET /wikipedia failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// GET /wikipedia/admin — all articles regardless of publish state (admin only)
router.get('/admin', requireAuth, (req, res) => {
    try {
        const items = wikipediaModel.getAllAdmin();
        res.json(items);
    } catch (error) {
        console.error('GET /wikipedia/admin failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// GET /wikipedia/:slug — public single Wikipedia article by slug
router.get('/:slug', (req, res) => {
    try {
        const item = wikipediaModel.getBySlug(req.params.slug);
        if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND);
        res.json(item);
    } catch (error) {
        console.error('GET /wikipedia/:slug failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// POST /wikipedia/signal-check — classify arbitrary free text against a signal
// family's calibration exemplars via the Python sidecar. Public,
// unauthenticated: this is a live version of the offline scoring step
// (Wikipedia_alogrithm_refractor.md §3.4.1's nearest-neighbour-label rule),
// not an article lookup — the FAISS stores hold calibration exemplars, not
// per-article embeddings, so a caller expecting "related articles" is misusing
// this endpoint. No admin-only fields, no slug, nothing article-specific is
// involved.
router.post('/signal-check', signalCheckLimit, async (req, res) => {
    const { family, text } = req.body || {};

    if (typeof family !== 'string' || !SIGNAL_FAMILY_WHITELIST.has(family)) {
        return sendError(res, ERRORS.MISSING_BODY_FIELD, {
            field: 'family',
            allowed: Array.from(SIGNAL_FAMILY_WHITELIST),
        });
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
        return sendError(res, ERRORS.MISSING_BODY_FIELD, { field: 'text' });
    }

    if (text.length > SIGNAL_CHECK_MAX_TEXT_LENGTH) {
        return sendError(res, ERRORS.PAYLOAD_TOO_LARGE, {
            field: 'text',
            maxLength: SIGNAL_CHECK_MAX_TEXT_LENGTH,
        });
    }

    try {
        const result = await vectorSidecarClient.queryFamily(family, text);
        res.json(result);
    } catch (error) {
        if (error instanceof vectorSidecarClient.VectorSidecarError) {
            console.error('POST /wikipedia/signal-check sidecar failure:', error.message);
            return sendError(res, ERRORS[error.errorCode]);
        }
        console.error('POST /wikipedia/signal-check failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// POST /wikipedia — create new Wikipedia article (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug) {
            return sendError(res, ERRORS.MISSING_BODY_FIELD, { field: 'slug' });
        }
        const created = wikipediaModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /wikipedia failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// PUT /wikipedia/:id — update Wikipedia article (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = wikipediaModel.update(Number(req.params.id), req.body);
        if (!updated) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND);
        res.json(updated);
    } catch (error) {
        console.error('PUT /wikipedia/:id failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// DELETE /wikipedia — delete all Wikipedia articles (admin only)
router.delete('/', requireAuth, (req, res) => {
    try {
        const count = wikipediaModel.deleteAll();
        res.json({ deleted: count });
    } catch (error) {
        console.error('DELETE /wikipedia failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

// DELETE /wikipedia/:id — remove Wikipedia article (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = wikipediaModel.remove(Number(req.params.id));
        if (!removed) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND);
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /wikipedia/:id failed:', error);
        sendError(res, ERRORS.OBJECT_MAPPING_FAILURE);
    }
});

module.exports = router;
