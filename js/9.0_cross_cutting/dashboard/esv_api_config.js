// =============================================================================
//   THE JESUS WEBSITE — ESV BIBLE API CONFIGURATION (PLACEHOLDER)
//   File:    js/9.0_cross_cutting/dashboard/esv_api_config.js
//   Version: 1.0.0
//   Owner:   plan_relocate_shared_widgets_to_cross_cutting (9.0 Cross-Cutting)
//   Purpose: Shared configuration and helper for the ESV Bible API
//            (api.esv.org). The API key is stored server-side in .env as
//            ESV_KEY and exposed via /api/admin/health_check (esv_api field).
//            This placeholder is ready for future scripture text lookup
//            features (verse validation, reference display, etc.).
//
//   USAGE (when implemented):
//     window.esvConfig = { baseUrl: "https://api.esv.org/v3/passage/" };
//     Consumer modules call a backend endpoint that proxies ESV requests.
// =============================================================================

"use strict";

/* -----------------------------------------------------------------------------
   PLACEHOLDER: ESV API configuration
   When the ESV integration is built out, this file will expose:
   - Base URL and endpoint constants
   - A fetch wrapper that calls a backend proxy endpoint
   - Caching helpers for scripture lookups
----------------------------------------------------------------------------- */
window.esvConfig = {
  // ESV API base URL (v3)
  baseUrl: "https://api.esv.org/v3/passage/",

  // Backend proxy endpoint (to be created) — keeps the API key server-side
  proxyEndpoint: "/api/admin/esv/passage",

  // Whether the ESV API is configured (checked via system health)
  isConfigured: false,

  // Update the configured flag from the system health response
  updateFromHealth: function (healthData) {
    if (healthData && healthData.esv_api && healthData.esv_api.status === "configured") {
      this.isConfigured = true;
    }
  },
};
