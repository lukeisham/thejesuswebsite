# System Data Viewer Refactor Plan

**Project:** The Jesus Website
**Component:** System Data Viewer (Dashboard)
**Date:** March 10, 2026
**Author:** Luke Isham
**Purpose:** Transform the System Data Viewer from an interactive tabbed tool into a read-only, auto-refreshing system health feed with alert integration

---

## Overview

The System Data Viewer currently displays system health data through an interactive tabbed interface. This refactor transforms it into a passive, auto-refreshing feed that:

- **Displays 10 system data categories** in a single read-only view (Server Metrics, Token Metrics, Security, Contact Triage, Queue/Workflow, Sources, Self Reflection, Page Metrics, Deadlinks, Spelling)
- **Auto-refreshes hourly** via frontend timer (60 * 60 * 1000 ms)
- **Injects alerts into #chat-messages** when system problems are detected
- **Uses real database data** (no new data definitions required)
- **Deduplicates alert messages** to prevent spam

The refactor spans 5 phases: backend stub fixes, frontend HTML cleanup, new system feed module creation, orphaned code removal, and verification.

---

## Current Backend State Audit

| Category | Endpoint | Status | Notes |
|----------|----------|--------|-------|
| Server Metrics | `/api/v1/system/server-metrics` | STUB | Returns hardcoded values |
| Token Metrics | `/api/v1/system/token-metrics` | STUB | Returns hardcoded values |
| Security | `/api/v1/system/security` | STUB | Returns hardcoded values |
| Contact Triage | `/api/v1/system/contact-triage` | FULL | Queries real database |
| Queue/Workflow | `/api/v1/system/queue-workflow` | MIXED | Some endpoints functional, others stub |
| Sources | `/api/v1/system/sources` | STUB | Returns hardcoded values |
| Self Reflection | `/api/v1/system/self-reflection` | STUB | Returns hardcoded values |
| Page Metrics | `/api/v1/system/page-metrics` | STUB | Returns hardcoded values |
| Deadlinks | `/api/v1/system/deadlinks` | STUB | Returns hardcoded values |
| Spelling | `/api/v1/system/spelling` | STUB | Returns hardcoded values |

---

## Phase 1: Fix Backend Stubs and Create Unified Feed Endpoint

### 1A. Fix Page Metrics Endpoint

**Goal:** Replace hardcoded stub with real database queries

**Steps:**

1. Locate `/api/v1/system/page-metrics` handler in `src/routes/system.rs`
2. Query the `page_metrics` table (columns: `page_id`, `views`, `avg_time_on_page`, `bounce_rate`)
3. Return JSON response matching the existing stub structure
4. Test with: `curl http://localhost:3000/api/v1/system/page-metrics`
5. Verify response contains 5-10 records with real page data

**Expected Response Format:**

```json
{
  "status": "success",
  "data": [
    {
      "page_id": "/records.html",
      "views": 1250,
      "avg_time_on_page": 180,
      "bounce_rate": 0.25
    }
  ]
}
```

### 1B. Fix Spelling Endpoint

**Goal:** Replace hardcoded stub with real database queries

**Steps:**

1. Locate `/api/v1/system/spelling` handler in `src/routes/system.rs`
2. Query the `spelling_errors` table (columns: `error_id`, `word`, `location`, `suggested_correction`, `severity`)
3. Return only the most recent 10 errors, sorted by timestamp descending
4. Test with: `curl http://localhost:3000/api/v1/system/spelling`
5. Verify response contains real spelling errors from the database

**Expected Response Format:**

```json
{
  "status": "success",
  "data": [
    {
      "error_id": "spell-001",
      "word": "recieve",
      "location": "/articles/history.html",
      "suggested_correction": "receive",
      "severity": "low"
    }
  ]
}
```

### 1C. Fix Deadlinks Endpoint

**Goal:** Replace hardcoded stub with real database queries

**Steps:**

1. Locate `/api/v1/system/deadlinks` handler in `src/routes/system.rs`
2. Query the `deadlinks` table (columns: `link_id`, `url`, `source_page`, `http_status`, `last_checked`)
3. Return only links with status codes indicating failure (4xx, 5xx, timeout)
4. Sort by `last_checked` descending
5. Test with: `curl http://localhost:3000/api/v1/system/deadlinks`
6. Verify response contains 0-20 deadlinks with real data

**Expected Response Format:**

```json
{
  "status": "success",
  "data": [
    {
      "link_id": "link-042",
      "url": "https://example.com/defunct-page",
      "source_page": "/context.html",
      "http_status": 404,
      "last_checked": "2026-03-10T14:30:00Z"
    }
  ]
}
```

### 1D. Fix Self Reflection Endpoint

**Goal:** Replace hardcoded stub with real database queries

**Steps:**

1. Locate `/api/v1/system/self-reflection` handler in `src/routes/system.rs`
2. Query the `self_reflection` table (columns: `reflection_id`, `topic`, `summary`, `timestamp`)
3. Return the 5 most recent reflections, sorted by timestamp descending
4. Test with: `curl http://localhost:3000/api/v1/system/self-reflection`
5. Verify response contains real reflection data from the database

**Expected Response Format:**

```json
{
  "status": "success",
  "data": [
    {
      "reflection_id": "ref-001",
      "topic": "User engagement patterns",
      "summary": "Peak usage occurs between 2-4 PM EST",
      "timestamp": "2026-03-10T16:00:00Z"
    }
  ]
}
```

### 1E. Create Unified System Feed Endpoint

**Goal:** Create a single endpoint that returns all 10 system data categories

**Steps:**

1. Create new route handler `/api/v1/system/feed` in `src/routes/system.rs`
2. This endpoint should call all 10 individual category endpoints internally
3. Aggregate responses into a single JSON object with structure:

```json
{
  "status": "success",
  "timestamp": "2026-03-10T16:30:00Z",
  "data": {
    "server_metrics": [...],
    "token_metrics": [...],
    "security": [...],
    "contact_triage": [...],
    "queue_workflow": [...],
    "sources": [...],
    "self_reflection": [...],
    "page_metrics": [...],
    "deadlinks": [...],
    "spelling": [...]
  }
}
```

4. Test with: `curl http://localhost:3000/api/v1/system/feed`
5. Verify all 10 categories are present and contain real data (not empty arrays)

---

## Phase 2: Remove Interactive UI Elements from Frontend

### 2A. Remove Tabs and Action Bar

**Goal:** Strip the System Data Viewer of interactive elements

**Steps:**

1. Open `frontend/private/dashboard.html`
2. Locate the System Data Viewer section (find the container with id or class containing "viewer", "tabs", or "system-data")
3. Remove ALL `<button>` elements within the viewer (e.g., "Create", "Update", "Delete", "Search")
4. Remove the tab navigation structure (`<ul class="tabs">`, individual `<li><a>` tab buttons)
5. Remove any event listener registration code attached to these buttons
6. Save and verify the HTML structure remains valid (run through HTML validator if available)

**Before/After Checklist:**

- [ ] Original tab buttons removed
- [ ] Original action bar buttons removed
- [ ] Tab content divs remain (will be repurposed as single unified feed container)
- [ ] All IDs and classes remain for JavaScript reference

### 2B. Create Single Feed Container

**Goal:** Replace tabbed layout with a single list container for feed items

**Steps:**

1. Keep the existing tab content container but repurpose it as a single unified feed area
2. Rename or create a new container with id `system-feed-container`
3. Add a `<ul id="system-feed-list" class="system-feed">` inside the container
4. Add CSS placeholder styling (minimal):

```css
#system-feed-container {
  padding: 1rem;
  border-radius: 6px;
  background-color: var(--bg-secondary);
}

.system-feed {
  list-style: none;
  padding: 0;
  margin: 0;
}

.system-feed li {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid var(--accent-color);
  background-color: var(--bg-tertiary);
  border-radius: 4px;
}

.system-feed li.alert {
  border-left-color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
}
```

5. Save and verify the container displays without error

---

## Phase 3: Create System Feed JavaScript Module

### 3A. Create `wgt_system_feed.js` Module

**Goal:** Create the core module that fetches, renders, and manages the system feed

**Steps:**

1. Create new file: `frontend/private/js/wgt_system_feed.js`
2. Define module with four exported functions:
   - `fetchSystemFeed()` - HTTP request to `/api/v1/system/feed`
   - `renderFeed(data)` - DOM manipulation to display feed
   - `checkForAlerts(data)` - Logic to detect and inject alerts
   - `startAutoRefresh(interval)` - Timer for periodic refresh

3. Add file header with JSDoc comments:

```javascript
/**
 * System Feed Widget Module
 * Manages auto-refreshing system health feed with alert injection
 * @module wgt_system_feed
 */

const SystemFeed = (() => {
  // Implementation here
})();

export default SystemFeed;
```

4. Save file and verify it can be imported without syntax errors

### 3B. Implement `fetchSystemFeed()` Function

**Goal:** Create HTTP request to unified feed endpoint

**Steps:**

1. Inside `wgt_system_feed.js`, implement:

```javascript
async function fetchSystemFeed() {
  try {
    const response = await fetch('/api/v1/system/feed');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch system feed:', error);
    return null;
  }
}
```

2. Test by opening browser console and running: `SystemFeed.fetchSystemFeed()`
3. Verify response contains all 10 data categories
4. Verify timestamp field is present

### 3C. Implement `renderFeed(data)` Function

**Goal:** Convert API response into DOM list items

**Steps:**

1. Inside `wgt_system_feed.js`, implement:

```javascript
function renderFeed(data) {
  const container = document.getElementById('system-feed-list');
  if (!container) {
    console.warn('system-feed-list container not found');
    return;
  }

  container.innerHTML = ''; // Clear existing items

  const categories = [
    'server_metrics', 'token_metrics', 'security', 'contact_triage',
    'queue_workflow', 'sources', 'self_reflection', 'page_metrics',
    'deadlinks', 'spelling'
  ];

  categories.forEach(category => {
    const items = data.data[category] || [];
    const categoryLabel = category.replace(/_/g, ' ').toUpperCase();

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${categoryLabel}</strong>: ${items.length} items
      ${items.length > 0 ? `<small>${JSON.stringify(items[0])}</small>` : ''}
    `;
    container.appendChild(li);
  });
}
```

2. Test by calling: `SystemFeed.renderFeed(feedData)` in console
3. Verify list items appear in the DOM
4. Verify all 10 categories are represented

### 3D. Implement `checkForAlerts(data)` Function

**Goal:** Detect problems and inject alert messages into chat

**Steps:**

1. Inside `wgt_system_feed.js`, implement:

```javascript
const alertCache = new Set(); // Deduplication

function checkForAlerts(data) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) {
    console.warn('chat-messages container not found');
    return;
  }

  // Check deadlinks
  if (data.data.deadlinks && data.data.deadlinks.length > 0) {
    const alertKey = `deadlinks-${data.data.deadlinks.length}`;
    if (!alertCache.has(alertKey)) {
      injectAlert(chatContainer, `⚠️ Found ${data.data.deadlinks.length} deadlinks`);
      alertCache.add(alertKey);
    }
  }

  // Check spelling errors
  if (data.data.spelling && data.data.spelling.length > 0) {
    const alertKey = `spelling-${data.data.spelling.length}`;
    if (!alertCache.has(alertKey)) {
      injectAlert(chatContainer, `⚠️ Found ${data.data.spelling.length} spelling errors`);
      alertCache.add(alertKey);
    }
  }

  // Check security issues (if status indicates problem)
  if (data.data.security && data.data.security.length > 0) {
    data.data.security.forEach(issue => {
      if (issue.severity === 'critical') {
        const alertKey = `security-${issue.id}`;
        if (!alertCache.has(alertKey)) {
          injectAlert(chatContainer, `🚨 Critical security issue: ${issue.description}`);
          alertCache.add(alertKey);
        }
      }
    });
  }
}

function injectAlert(container, message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'system-alert';
  alertDiv.innerHTML = `<p>${message}</p>`;
  alertDiv.style.cssText = `
    padding: 0.75rem;
    margin: 0.5rem 0;
    background-color: #fef3c7;
    border-left: 4px solid #dc2626;
    border-radius: 4px;
  `;
  container.appendChild(alertDiv);
}
```

2. Test by calling: `SystemFeed.checkForAlerts(feedData)` in console
3. Verify alert messages appear in #chat-messages container
4. Verify alerts are not duplicated on repeated calls

### 3E. Implement `startAutoRefresh(interval)` Function and Auto-Start

**Goal:** Set up hourly auto-refresh timer and initialize feed on page load

**Steps:**

1. Inside `wgt_system_feed.js`, implement:

```javascript
let refreshInterval = null;

function startAutoRefresh(interval = 60 * 60 * 1000) { // 60 minutes
  if (refreshInterval) clearInterval(refreshInterval);

  // Initial fetch on startup
  (async () => {
    const data = await fetchSystemFeed();
    if (data) {
      renderFeed(data);
      checkForAlerts(data);
    }
  })();

  // Set up periodic refresh
  refreshInterval = setInterval(async () => {
    const data = await fetchSystemFeed();
    if (data) {
      renderFeed(data);
      checkForAlerts(data);
    }
  }, interval);

  console.log(`System feed auto-refresh started (${interval}ms interval)`);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
```

2. In the same module, add auto-start on page load:

```javascript
// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startAutoRefresh());
} else {
  startAutoRefresh();
}
```

3. Import the module in `dashboard.html`:

```html
<script type="module">
  import SystemFeed from '/js/wgt_system_feed.js';
  window.SystemFeed = SystemFeed; // Expose for debugging
</script>
```

4. Test:
   - Open dashboard in browser
   - Verify feed renders immediately on page load
   - Check browser console for "System feed auto-refresh started" message
   - Wait and verify feed refreshes after ~5 minutes (or adjust test interval to 5 * 60 * 1000)

---

## Phase 4: Remove Orphaned Code

### 4A. Identify Orphaned Inline Scripts

**Goal:** Find and document any JavaScript code attached to removed tab buttons

**Steps:**

1. Open `dashboard.html`
2. Search for event listeners bound to removed button IDs (grep or browser DevTools)
3. Look for patterns like:
   - `document.getElementById('btn-...')` referencing removed buttons
   - `.addEventListener('click', ...)` on viewer buttons
   - Tab switching logic that's no longer needed
4. Document each orphaned code block with line numbers

### 4B. Remove Orphaned Event Listeners

**Goal:** Delete JavaScript that references removed UI elements

**Steps:**

1. In `dashboard.html`, locate `<script>` blocks within or near the System Data Viewer section
2. Remove code blocks that:
   - Attach click handlers to tab buttons
   - Manage tab state (active/inactive classes)
   - Switch between tab content divs
   - Show/hide panels based on tab selection
3. Keep code that:
   - Manages the overall feed container visibility
   - Handles data display (non-interactive)
4. Save and verify no console errors appear on page load

### 4C. Remove Unused CSS for Tabs

**Goal:** Clean up styling rules for removed tab UI

**Steps:**

1. Open `style.css`
2. Search for tab-related CSS classes (`.tabs`, `.tab-content`, `.tab-active`, etc.)
3. Remove rules that only apply to removed tab elements
4. Keep rules for `.system-feed` and `.system-feed li` (added in Phase 2B)
5. Verify dashboard still displays correctly after removal

### 4D. Remove Unused Data Structures

**Goal:** Delete JavaScript objects/variables storing tab state

**Steps:**

1. Search `dashboard.html` for viewer state objects:
   - `let viewerState = {}`
   - `const tabConfig = {}`
   - Any global variables tracking tab index or active category
2. Remove these declarations if not used elsewhere
3. Keep data structures related to feed rendering

### 4E. Verify No Console Errors

**Goal:** Confirm cleanup is complete

**Steps:**

1. Open dashboard.html in browser
2. Open DevTools Console
3. Refresh page (Ctrl+R or Cmd+R)
4. Verify NO errors or warnings appear
5. Verify NO "undefined" or "cannot read property" errors
6. Document any remaining issues for Phase 5

---

## Phase 5: Verification and Testing

### 5A. Test Backend Feed Endpoint

**Goal:** Verify the unified feed endpoint works correctly

**Steps:**

1. Open terminal/command line
2. Run: `curl -s http://localhost:3000/api/v1/system/feed | jq .`
3. Verify response structure:
   - Contains `status: "success"`
   - Contains `timestamp` field
   - Contains `data` object with 10 categories
   - All categories contain arrays (may be empty, but must be present)
4. Check response time (should be < 500ms)
5. Repeat 3 times to verify consistency

### 5B. Test Frontend Feed Display

**Goal:** Verify feed renders correctly on dashboard

**Steps:**

1. Open browser to `http://localhost:3000/dashboard.html`
2. Wait for page to fully load
3. Check DevTools Console:
   - Verify "System feed auto-refresh started" message appears
   - No error messages
4. Visually verify:
   - System feed container is visible
   - All 10 categories are listed
   - Each category shows item count
   - No blank or "undefined" entries
5. Take a screenshot for documentation

### 5C. Test Alert Injection

**Goal:** Verify alerts appear when problems are detected

**Steps:**

1. Manually insert a test deadlink into the database (if possible)
2. Manually insert a test spelling error into the database (if possible)
3. Refresh dashboard (Ctrl+R)
4. Wait for auto-refresh to trigger or manually call `SystemFeed.fetchSystemFeed()` in console
5. Check #chat-messages container:
   - Alerts for deadlinks should appear
   - Alerts for spelling errors should appear
6. Refresh page again:
   - Verify alerts do NOT duplicate (deduplication working)
   - Old alerts should remain visible
7. Document alert output for verification

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/routes/system.rs` | MODIFY | Fix 4 stub endpoints (Page Metrics, Spelling, Deadlinks, Self Reflection), create unified `/api/v1/system/feed` endpoint |
| `frontend/private/dashboard.html` | MODIFY | Remove tab buttons, action bar buttons, create unified `#system-feed-container` and `#system-feed-list` |
| `frontend/private/js/wgt_system_feed.js` | CREATE | New module with fetchSystemFeed(), renderFeed(), checkForAlerts(), startAutoRefresh() functions |
| `frontend/style.css` | MODIFY | Add CSS for `.system-feed`, `.system-feed li`, `.system-feed li.alert` |
| `frontend/private/dashboard.html` | MODIFY | Import and initialize `wgt_system_feed.js` module |

---

## Notes for Implementation Agent

- **Work sequentially**: Complete Phase 1 before starting Phase 2, etc.
- **Test early and often**: Use curl for backend, browser console for frontend
- **Preserve structure**: Keep database schema unchanged; only modify queries
- **Handle errors**: Wrap fetch calls in try/catch; log errors to console
- **Deduplication strategy**: Store alert keys in Set to prevent duplicate messages
- **Weights exclusion**: Confirmed in requirements; NOT included in feed categories
- **Auto-refresh timing**: 60 * 60 * 1000 ms = 3600 seconds = 60 minutes = 1 hour
- **Alert styling**: Keep minimal; will inherit from page theme variables

---

**End of Plan**
