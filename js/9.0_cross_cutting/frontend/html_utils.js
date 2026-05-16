// =============================================================================
//
//   THE JESUS WEBSITE — SHARED HTML UTILITY FUNCTIONS
//   File:    js/9.0_cross_cutting/frontend/html_utils.js
//   Version: 1.0.0
//   Purpose: Shared HTML escaping and date formatting utilities consumed by
//            frontend display modules across 4.0, 5.0, and 6.0.
//   Owner:   plan_resolve_outstanding_issues
//
//   Shared-Tool Ownership (vibe_coding_rules.md §7):
//     OWNED by: plan_resolve_outstanding_issues
//     LOCATION: js/9.0_cross_cutting/frontend/
//     CONSUMED by: 4.0 Ranked Lists frontend, 5.0 Essays & Responses frontend,
//                   6.0 News & Blog frontend
//
//   Usage:
//     <script src="path/to/html_utils.js"></script>
//     var safe = escapeHtml(userInput);
//     var dateStr = formatDateLong(isoString);
//
// =============================================================================

// Trigger: Included via <script> tag before display scripts that need these utils.
// Function: escapeHtml — basic HTML escaping for safe DOM injection.
// Output:   Returns escaped string with &, <, >, " replaced by HTML entities.

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Trigger: Called by display modules to format ISO date strings.
// Function: formatDateLong — formats an ISO 8601 date string into long-form
//           "Month Day, Year" (e.g., "January 15, 2026").
// Output:   Returns formatted date string or empty string on invalid input.

function formatDateLong(isoString) {
  if (!isoString) return "";
  try {
    var d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return isoString;
  }
}

// Trigger: Called by display modules to escape strings for use in HTML attributes.
// Function: escapeAttr — escapes &, ", ', <, > for safe attribute injection.
// Output:   Returns escaped string safe for use inside quoted HTML attributes.

function escapeAttr(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.formatDateLong = formatDateLong;
