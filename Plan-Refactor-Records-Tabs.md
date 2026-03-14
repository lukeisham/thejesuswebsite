# Plan: Refactor Records Tabs

## 1. Introduction
The objective of this task is to refactor `records.html` so that the view tabs ("Record", "Feed", "Grid") sit directly above the search bar, left-aligned, rather than to the left. The tabs will be re-ordered to "Record", "Feed", "Grid", with "Record" functioning as the default active tab on first page load. 

The "Record" tab will display a single record in a one-card grid. By default, this will show a blank record with placeholders, unless a specific record is dictated by a search query (top result) or an internal link. Additionally, the system architecture documentation (`records_architecture.html`) must be updated to align with these frontend structural changes.

**Relevant Vibe-Coding Rules (`frontend/readme.md`):**
- **HTML/CSS**: Atomic Design, Global consistency, Responsive Flow. Use **CSS Grid for Layout** and **Flexbox for Components**. Crucially: *does the page still function?* Moving tabs structurally over the search bar shouldn't compromise existing responsive styling.
- **JS**: Strict Interface, Lean Passthrough. **One script per task**. Crucially: *No loss of functionality during rewrites!* A new dedicated JS script will handle the single-record logic to maintain modularity.

---

## 2. Bite-Sized Tasks for GeminiFlash

1. **HTML Tab Reorder & Structure**: 
   - Open `frontend/records.html`.
   - Move the `<div class="record-view-tabs">` block directly above the `<input type="text" id="search-input" ...>` search bar.
   - Reorder the tabs to: "Record", "Feed", "Grid".
   - Set the "Record" tab to `<div class="tab active" data-view="record">Record</div>`.
2. **CSS Layout Update**:
   - Locate the `.record-search` and `.record-view-tabs` classes in `frontend/style.css` (or inline if applicable).
   - Ensure the `.record-search` element operates as a flex column (e.g. `flex-direction: column; align-items: flex-start;`) so the tabs remain left-aligned directly stacked above the input field.
3. **JS Tab Toggle Refactor**:
   - Update `frontend/js/toggle_record_view.js` to recognize "Record" as the default tab.
   - Adjust the DOM toggle logic so clicking "Record" hides `#record-grid` / `#record-feed` and displays `#record-single`.
4. **Architecture Documentation Update**:
   - In `frontend/private/records_architecture.html`, find the **Record Display Pipeline** section and modify the diagram to reflect 3 tabs and the `#record-single` flow. Update the note describing the toggle feature.

---

## 3. Most Difficult Task(s) for Gemini 3.1 Pro (High)

1. **New Script for Single Record View Management**:
   - Create a brand new script: `frontend/js/show_single_record.js` (or similar).
   - Implement logic to handle the state of `#record-single`:
     - If the page first loads without a search/URL query, render a pre-defined layout with a **blank record with placeholders**.
     - Intercept search results (either from `refresh_records.js` or `search_records.js`) and if the user clicks the "Record" tab while results exist, render the **top result** of that search array.
     - Process incoming internal links pointing to a specific record (via URL query parameters) and prioritize rendering that specific record over the blank placeholder.

---

## 4. Audit Table

| Task | Verification Steps | Expected Outcome | Pass/Fail |
|------|--------------------|------------------|-----------|
| **HTML Update** | Inspect DOM of `records.html` | `<div class="record-view-tabs">` is structurally placed above the search bar input and ordered: Record, Feed, Grid. | Pass |
| **CSS Checks** | View the records page in a browser | Tabs are left-aligned and sit neatly above the search bar, avoiding breaking the wrapper. | Pass |
| **JS Toggle** | Click "Feed", "Grid", then "Record" | Each click adds `active` state and toggles the appropriate `display` properties on the section containers. | Pass |
| **Default Load** | Refresh `records.html` with no query | The "Record" tab is active by default. The `#record-single` section is visible and shows blank placeholders. | Pass |
| **Top Result** | Search for a specific event keyword | When navigating to "Record" tab, the #1 retrieved result populates the single record display. | Pass |
| **Internal Link** | Visit `/records.html?id=ULID_HERE` | The "Record" tab displays the exact matching record fetched by the backend. | Pass |
| **Architecture** | Open `/private/records_architecture.html` | Data flow diagram clearly indicates "Record" view alongside Grid and Feed. | Pass |
