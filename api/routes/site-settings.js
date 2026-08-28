// Site Settings HTTP routes. Public read returns the singleton row;
// the admin write is auth-guarded. All SQL lives in the model.

const express = require('express');
const siteSettingsModel = require('../models/site-settings.model');
const requireAuth = require('../middleware/auth');
const ERRORS = require('../lib/error-codes');
const { sendError } = require('../lib/error-handler');

const router = express.Router();

// GET /site-settings — public: current site branding (title, description, og_image)
router.get('/', (req, res) => {
  try {
    res.json(siteSettingsModel.get());
  } catch (error) {
    console.error('GET /site-settings failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /site-settings — update site branding (admin only)
router.put('/', requireAuth, (req, res) => {
  try {
    const updated = siteSettingsModel.update(req.body);
    if (!updated) return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: [] });
    res.json(updated);
  } catch (error) {
    console.error('PUT /site-settings failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
