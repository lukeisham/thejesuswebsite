# Plan: Refactor Records Page Tabs

## 1. Introduction

**Purpose & Goal**
The goal of this task is to refactor the display modes on the public `records.html` page. Currently, records are displayed in either a "Grid" or "Feed" format, with Grid as the default. This refactor will reorganize the display tabs in the order "Feed", "Record", "Grid", and make **"Feed"** the default view on page load. 

We will introduce a new "Record" tab that acts as a 1-item view (a single-record grid). By default, this tab will display the universal record "Resurrection of Jesus". Furthermore, interactivity will be enhanced so that clicking a record from the Feed or Grid, searching for a record, or navigating via a direct URL (`?id=` or `?verse=`) will automatically populate and switch the user to the new "Record" tab to view that specific item.

**Vibe Coding Rules References**
As outlined in `frontend/readme.md`, we must adhere to the following principles:
- **HTML/CSS:** "Atomic Design, Global consistency, Responsive Flow / CSS Grid for Layout, Flexbox for Components. / does the page still function?"
- **JavaScript:** "Strict Interface, Error Translation, Lean Passthrough, Idempotency / One script per task / No loss of functionality during rewrites!"
- **Vibe Rule:** "Complete one task fully and carefully before proceeding to the next task."

---

## 2. Tasks for GeminiFlash

1. **Tab Restructuring:** Update the HTML structure in `records.html` to align the tabs in the order: "Feed", "Record", "Grid". Ensure "Feed" has the `.active` class on load.
2. **Record Section Addition:** Create a new container in `records.html` (e.g., `<section id="record-single" style="display: none;">`) to house the single-record view. 
3. **View Toggling Logic:** Update `toggle_record_view.js` to manage the visibility of `#record-feed`, `#record-single`, and `#record-grid`. Modify the default behavior so `sessionStorage` fallback defaults to "feed" instead of "grid".
4. **Default Record Fetching:** Update `refresh_records.js` (or create a dedicated script per the "One script per task" rule) to identify the record titled "Resurrection of Jesus" from the loaded API response and populate it into the `#record-single` container by default.
5. **Interactivity Update (Clicks):** Modify the click events in `record_card.js` and `record_feed.js`. When a user clicks a specific card or feed item, intercept the click, populate that specific record's data into the `#record-single` container, and trigger the view switch to the "Record" tab.
6. **Interactivity Update (Search):** Hook into `search_records.js` so that when a user performs a search and results are returned, the script automatically populates `#record-single` with the *first* search result and swaps the UI view to the "Record" tab.


---

## 3. Most Difficult Task(s) for Gemini 3.1 Pro (High)

**URL Parameter Interception & Lifecycle Timing:** 
The most complex part of this refactor is correctly integrating the URL parameters (`?id=` or `?verse=`) found inside `records.html` with the asynchronous `refresh_records.js` loading flow, the new single-item tab system, and the DOM updating script. The current inline script in `records.html` waits for a custom `"records-loaded"` event (or a timeout), maps the parameter to an element, highlights it, and scrolls to it. 

With the new setup, the system must instead look up the target record from the raw data payload, inject its `createRecordCard(r)` representation into `#record-single`, override `sessionStorage` or tab logic to force the "Record" tab active, and ensure all of this happens *before* the user sees flickering grid changes. Ensuring "No loss of functionality during rewrites!" while drastically altering how URL params alter the baseline page state is a delicate concurrency challenge best handled by Gemini Pro.

---

## 4. Audit Table

| Task | Verification Steps | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **Tab Ordering & Default** | 1. Load `records.html` in an incognito window.<br>2. Check tab order. | Order is "Feed", "Record", "Grid". "Feed" tab is active by default; feed list is visible. | |
| **Default "Record" Display** | 1. Click "Record" tab.<br>2. Check the contents. | The single-item grid displays the "Resurrection of Jesus" record. | |
| **Click Interactivity** | 1. Open "Feed" or "Grid".<br>2. Click on a specific record (e.g., "Baptism of Jesus"). | The view automatically switches to the "Record" tab, displaying the clicked record. | |
| **Search Interactivity** | 1. Use the search bar for a query (e.g., "Galilee").<br>2. Execute search. | The view automatically switches to the "Record" tab, displaying the first search result. | |
| **URL Parameters** | 1. Navigate to `/records.html?id=...` or `?verse=...` using a known record. | The page heavily loads directly onto the "Record" tab displaying the targeted record. | |
| **Responsive UI** | 1. Resize browser window (mobile & desktop).<br>2. Evaluate the "Record" view container. | Uses atomic CSS Grid/Flexbox principles without overflowing; maintains global consistency constraints. | |
