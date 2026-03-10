# Glossary Re-Organisation Plan

**Project:** The Jesus Website
**Component:** Architecture Glossary System (Dashboard + Private Pages)
**Date:** March 11, 2026
**Author:** Luke Isham
**Purpose:** Replace the inline dashboard glossary with a panel of navigation buttons linking to standalone architecture pages — one per topic — all formatted per GLOSSARY_PLAN.md.

---

## How This Plan Works

This plan is divided into **7 Phases** with small steps. Each phase ends with a **Checkpoint**. Phase 7 is a **mandatory second-pass review** where you verify your work against the actual codebase.

**CRITICAL RULES:**
1. Do NOT guess file names, element IDs, CSS classes, or HTML structures. Refer to the exact values in this plan.
2. Always read the source file to confirm a structure before modifying it.
3. Follow the GLOSSARY_PLAN.md format for all architecture pages: ASCII diagrams in `<pre class="glossary-diagram">`, file/function tables in collapsible `<details class="glossary-section">`, tables using `<table class="glossary-table">`.

---

## Current State (Reference — Do Not Change Unless Instructed)

### Dashboard Layout (in `frontend/private/dashboard.html`)

| Row | grid-row | Content | Lines |
|-----|----------|---------|-------|
| 1 | 1 | CRUD editor panel with tabs (Records, Feed View, Essays, Responses, Blogposts, Wiki Weights) | ~202-664 |
| 2 | 2 | Cheatsheet (Quick Reference) — single panel, left side of `a-cols-2` wrapper | ~665-674 |
| 3 | 3 | Chat panel (left) + System Data Feed (right) | ~676-714 |
| 4 | 4 | Glossary — full-width panel with `grid-column: 1 / -1` | ~716-725 |
| 5 | 5 | System Widgets grid (16 cards) | ~727-879 |

### Key HTML Element IDs

| ID | Purpose | Location |
|----|---------|----------|
| `dashboard-cheatsheet` | Cheatsheet container | Row 2, left column |
| `cheatsheet-content` | Cheatsheet inner content div | Inside `#dashboard-cheatsheet` |
| `dashboard-glossary` | Glossary container | Row 4, full width |
| `glossary-content` | Glossary inner content div | Inside `#dashboard-glossary` |

### Existing Files

| File | Purpose |
|------|---------|
| `frontend/private/wikipedia_architecture.html` | Standalone wiki architecture page (uses Mermaid — will be converted to GLOSSARY_PLAN.md format) |
| `frontend/private/js/glossary_records.js` | Records glossary content — exports `window.GLOSSARY_RECORDS = { tabId, html }` |
| `GLOSSARY_PLAN.md` | Format specification for all architecture pages |

### Glossary JS Wiring (inline script in dashboard.html, lines ~1049-1121)

The `initDashboardTabs()` function:
- Scans `window` for properties starting with `GLOSSARY_`
- Builds a map of `{ tabId: htmlString }`
- On tab click, updates `#glossary-content` innerHTML with matching entry
- This entire mechanism will be removed in this refactor.

### CRUD Tab IDs (data-target attribute values)

| Tab Button | data-target |
|------------|-------------|
| Records | `crud-records` |
| Feed View | `crud-records-feed` |
| Essays | `crud-essays` |
| Responses | `crud-responses` |
| Blogposts | `crud-blogs` |
| Wiki Weights | `crud-weights` |

---

## Target State

After this refactor:

1. **Row 2** on the dashboard will have two side-by-side panels:
   - **Left:** Quick Reference (cheatsheet) — unchanged
   - **Right:** Architecture Glossary — a card with 7 navigation buttons

2. **7 standalone private pages** exist, one per topic:
   - `frontend/private/records_architecture.html`
   - `frontend/private/challenges_architecture.html`
   - `frontend/private/news_feed_architecture.html`
   - `frontend/private/sources_architecture.html`
   - `frontend/private/blog_architecture.html`
   - `frontend/private/essay_architecture.html`
   - `frontend/private/wikipedia_architecture.html` (updated to GLOSSARY_PLAN.md format)

3. **Row 4 glossary panel is deleted** from dashboard.html

4. **`glossary_records.js` content is migrated** into `records_architecture.html`

5. **`initDashboardTabs()` glossary wiring is removed** (cheatsheet wiring kept)

---

## Phase 1: Create the Architecture Page Template

**Goal:** Build a reusable HTML template that all 7 architecture pages will follow. This template must match the GLOSSARY_PLAN.md format.

### Step 1A: Study the format specification

1. Open `GLOSSARY_PLAN.md` and review:
   - §2: Data flow diagrams use ASCII art in `<pre class="glossary-diagram">` blocks
   - §3: File/function references use `<table class="glossary-table">` inside `<details class="glossary-section">`
   - §5: Read-only reference, no forms, no API calls, collapsible `<details>/<summary>`, diagrams in `<pre>` tags

2. Open `frontend/private/js/glossary_records.js` and study the HTML string — this is the content format to follow. Key elements:
   - `<h4 class="glossary-heading">` for section titles
   - `<pre class="glossary-diagram">` for ASCII data flow diagrams
   - `<details class="glossary-section"><summary>...</summary>` for collapsible file/function reference tables
   - `<table class="glossary-table"><thead><tr>...</tr></thead><tbody>...</tbody></table>`
   - `<p class="glossary-note">` for inline notes

### Step 1B: Create the template file

1. Create `frontend/private/architecture_template.html` (this is a reference, not served to users)
2. Use this exact structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[TOPIC] Architecture — The Jesus Website</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        body {
            font-family: var(--font-sans, 'Inter', sans-serif);
            background: var(--bg-primary, #fafaf9);
            color: var(--text-primary, #333);
            padding: 2rem;
            max-width: 960px;
            margin: 0 auto;
        }

        h1 { color: var(--accent-color, #5b7065); border-bottom: 2px solid var(--accent-color, #5b7065); padding-bottom: 0.5rem; }
        h2 { color: var(--accent-color, #5b7065); margin-top: 2rem; }

        .glossary-diagram {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1.5rem;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.8rem;
            line-height: 1.4;
            margin: 1rem 0;
        }

        .glossary-section {
            margin: 1rem 0;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 4px;
        }

        .glossary-section summary {
            padding: 0.75rem 1rem;
            cursor: pointer;
            font-weight: 600;
            background: var(--bg-secondary, #f5f5f0);
        }

        .glossary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            margin: 0.5rem 0;
        }

        .glossary-table th {
            text-align: left;
            background: var(--bg-secondary, #f5f5f0);
            padding: 0.5rem;
            border-bottom: 2px solid var(--border-color, #ddd);
        }

        .glossary-table td {
            padding: 0.5rem;
            border-bottom: 1px solid var(--border-color, #eee);
            vertical-align: top;
        }

        .glossary-table code {
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.8rem;
        }

        .glossary-note {
            color: #666;
            font-style: italic;
            font-size: 0.9rem;
        }

        .glossary-heading {
            color: var(--accent-color, #5b7065);
            margin-top: 1.5rem;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 1.5rem;
            color: var(--accent-color, #5b7065);
            text-decoration: none;
        }

        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <a href="/private/dashboard.html" class="back-link">&larr; Back to Dashboard</a>

    <h1>[TOPIC] Architecture</h1>
    <p class="glossary-note">System architecture reference for [TOPIC]. Read-only — no forms or API calls.</p>

    <!-- § DATA FLOW DIAGRAMS -->
    <h2>Data Flow</h2>

    <h4 class="glossary-heading">[Diagram 1 Title]</h4>
    <pre class="glossary-diagram">
[ASCII DIAGRAM HERE]
    </pre>

    <h4 class="glossary-heading">[Diagram 2 Title]</h4>
    <pre class="glossary-diagram">
[ASCII DIAGRAM HERE]
    </pre>

    <!-- § FILE & FUNCTION REFERENCE -->
    <h2>File &amp; Function Reference</h2>

    <details class="glossary-section">
        <summary>[Section Title, e.g., Backend Core Types]</summary>
        <table class="glossary-table">
            <thead>
                <tr><th>File</th><th>Export / Method</th><th>Description</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>[file path]</code></td>
                    <td><code>[function/struct name]</code></td>
                    <td>[description]</td>
                </tr>
            </tbody>
        </table>
    </details>

    <!-- Repeat <details> blocks for each section -->

</body>
</html>
```

### Checkpoint 1

- [ ] `frontend/private/architecture_template.html` exists
- [ ] It follows GLOSSARY_PLAN.md format with `glossary-diagram`, `glossary-section`, `glossary-table`, `glossary-heading`, `glossary-note` classes
- [ ] It includes a "Back to Dashboard" link pointing to `/private/dashboard.html`
- [ ] The `<style>` block is self-contained (page works standalone)
- [ ] The template renders cleanly if opened in a browser (even with placeholder text)

---

## Phase 2: Create the Records Architecture Page

**Goal:** Migrate the content from `glossary_records.js` into a standalone HTML page using the template.

### Step 2A: Create `records_architecture.html`

1. Copy `frontend/private/architecture_template.html` to `frontend/private/records_architecture.html`
2. Replace `[TOPIC]` with `Records` in the title, h1, and description
3. Open `frontend/private/js/glossary_records.js` and read the `html` string inside `window.GLOSSARY_RECORDS`
4. Copy ALL content from that HTML string into the `<body>` of `records_architecture.html`:
   - The two `<pre class="glossary-diagram">` blocks (Record Creation & Storage, Record Display)
   - All six `<details class="glossary-section">` blocks (Backend Core Types, API Handlers, Storage, Frontend Public JS, Frontend Admin JS, CSS Classes)
5. Ensure all tables use `<table class="glossary-table">` class
6. Ensure all collapsible sections use `<details class="glossary-section">` class

### Step 2B: Verify content completeness

Cross-reference your new page against `glossary_records.js` (281 lines). Confirm:

1. **Diagram 1** (Record Creation & Storage Pipeline) is present with both Path A and Path B
2. **Diagram 2** (Record Display Pipeline) is present with Public and Dashboard paths
3. **Backend Core Types** table has entries for: Record, Classification, TimelineEra, MapType, Content, DTOs
4. **API Handlers** table has 10 handler entries
5. **Storage** section has: sqlite.rs (7 methods), chroma.rs (4 methods), schema.sql (2 tables)
6. **Frontend Public JS** section has 7 files
7. **Frontend Admin JS** section has 3 files
8. **CSS Classes** section lists all record-related CSS classes

### Checkpoint 2

- [ ] `frontend/private/records_architecture.html` exists
- [ ] Contains 2 ASCII diagrams and 6 collapsible reference sections
- [ ] All content from `glossary_records.js` is present — nothing was lost
- [ ] Page renders correctly in browser
- [ ] "Back to Dashboard" link works

---

## Phase 3: Update Wikipedia Architecture Page

**Goal:** Convert `wikipedia_architecture.html` from Mermaid format to GLOSSARY_PLAN.md format (ASCII diagrams, collapsible tables).

### Step 3A: Read the existing page

1. Open `frontend/private/wikipedia_architecture.html` (459 lines)
2. Note the three Mermaid diagrams:
   - Diagram 1: Wikipedia List Generation, Ranking & Display
   - Diagram 2: Widget/Agent Trigger → System Data Viewer
   - Diagram 3: CRUD Editor — Weight Management Workflow
3. Note the File Inventory section with Backend (6 files), Frontend JS (4 files), Frontend HTML/CSS (3 files), Configuration (1 file)

### Step 3B: Rewrite the page using the template

1. Replace the entire content of `frontend/private/wikipedia_architecture.html` with the architecture template structure
2. Set title to `Wikipedia Architecture`
3. Convert each Mermaid diagram into an ASCII art equivalent inside `<pre class="glossary-diagram">`:
   - Represent flowchart nodes as boxes: `[ Node Name ]`
   - Represent arrows as: `-->`, `==>`, `--->`
   - Represent decisions as: `< condition? >`
   - Keep the same logical flow and annotations from the Mermaid diagrams
4. Convert the File Inventory section into collapsible `<details class="glossary-section">` blocks:
   - **Backend (Rust):** 6 files with Status column
   - **Frontend JS:** 4 files with Status column
   - **Frontend HTML/CSS:** 3 files with Status column
   - **Configuration:** 1 file with Status column

### Step 3C: Preserve all information

Verify no information was lost. Cross-reference against the original:

1. All three diagram flows are represented (even if simplified to ASCII)
2. All file paths, method names, and status notes are preserved in tables
3. The key annotations (e.g., "Needs weight integration", "Missing endpoint") are kept

### Checkpoint 3

- [ ] `wikipedia_architecture.html` now uses GLOSSARY_PLAN.md format
- [ ] No Mermaid `<script>` tags remain
- [ ] All 3 diagrams are present as ASCII art
- [ ] All file inventory entries are in collapsible `<details>` sections
- [ ] Page renders correctly without the Mermaid library
- [ ] "Back to Dashboard" link present

---

## Phase 4: Create Stub Pages for Remaining 5 Topics

**Goal:** Create architecture pages for Challenges, Newsfeed, Sources, Blog Posts, and Context Essays. These will be stubs with placeholder content that can be filled in later.

### Step 4A: Create `challenges_architecture.html`

1. Copy the template to `frontend/private/challenges_architecture.html`
2. Set title to `Challenges & Responses Architecture`
3. Add a single placeholder diagram:
   ```
   <pre class="glossary-diagram">
   ┌─────────────────────────────────────────────────────────────┐
   │                CHALLENGES & RESPONSES PIPELINE              │
   │                                                             │
   │  Dashboard CRUD                                             │
   │  ┌──────────────┐    ┌──────────────────┐    ┌───────────┐ │
   │  │ Responses    │───>│ edit_challenge_   │───>│ POST /api │ │
   │  │ Tab          │    │ results.js        │    │ /v1/...   │ │
   │  └──────────────┘    └──────────────────┘    └───────────┘ │
   │                                                     │       │
   │                                              ┌──────▼─────┐ │
   │                                              │  sqlite.rs │ │
   │                                              └────────────┘ │
   └─────────────────────────────────────────────────────────────┘
   </pre>
   ```
4. Add one collapsible section:
   ```html
   <details class="glossary-section">
       <summary>Files (placeholder — to be completed)</summary>
       <table class="glossary-table">
           <thead><tr><th>File</th><th>Purpose</th><th>Status</th></tr></thead>
           <tbody>
               <tr><td><code>frontend/private/js/edit_challenge_results.js</code></td><td>CRUD handlers for challenges</td><td>Needs documentation</td></tr>
           </tbody>
       </table>
   </details>
   ```

### Step 4B: Create `news_feed_architecture.html`

1. Copy template, set title to `Newsfeed Architecture`
2. Add a placeholder diagram showing: News Crawler widget → API endpoint → sqlite.rs → public display
3. Add one collapsible placeholder section with `wgt-news-crawler` reference
4. Include note: `<p class="glossary-note">This page will be populated with newsfeed pipeline details.</p>`

### Step 4C: Create `sources_architecture.html`

1. Copy template, set title to `Sources Architecture`
2. Add a placeholder diagram showing: Sources widget → API endpoint → sqlite.rs
3. Add one collapsible placeholder section
4. Include note about future population

### Step 4D: Create `blog_architecture.html`

1. Copy template, set title to `Blog Posts Architecture`
2. Add a placeholder diagram showing: Blog CRUD tab → blog_crud.js → API endpoint → sqlite.rs → public display
3. Add one collapsible placeholder section referencing `frontend/private/js/blog_crud.js`
4. Note: The CRUD tab `crud-blogs` already exists on the dashboard

### Step 4E: Create `essay_architecture.html`

1. Copy template, set title to `Context Essays Architecture`
2. Add a placeholder diagram showing: Essays CRUD tab → API endpoint → sqlite.rs → public display
3. Add one collapsible placeholder section
4. Note: The CRUD tab `crud-essays` already exists on the dashboard

### Checkpoint 4

- [ ] All 5 new files exist in `frontend/private/`:
  - `challenges_architecture.html`
  - `news_feed_architecture.html`
  - `sources_architecture.html`
  - `blog_architecture.html`
  - `essay_architecture.html`
- [ ] Each file follows the template structure
- [ ] Each file has a "Back to Dashboard" link
- [ ] Each file has at least one placeholder diagram and one collapsible section
- [ ] Each file renders correctly in a browser

---

## Phase 5: Add the Architecture Glossary Panel to the Dashboard

**Goal:** Add a new panel to Row 2 (next to the cheatsheet) containing 7 navigation buttons — one for each architecture page.

### Step 5A: Modify the Row 2 wrapper

1. Open `frontend/private/dashboard.html`
2. Find the Row 2 wrapper (line ~665):
   ```html
   <div class="a-grid a-cols-2 a-gap-md" style="grid-row: 2;">
   ```
3. This wrapper already uses `a-cols-2`, meaning it supports two columns. The cheatsheet panel currently occupies the left column. You will add the glossary panel as the right column.

### Step 5B: Add the Architecture Glossary panel

1. Find the closing `</div>` of the `#dashboard-cheatsheet` panel (line ~674)
2. **After** that closing `</div>` but **before** the closing `</div>` of the `a-grid` wrapper, add:

```html
<!-- Right: Architecture Glossary Navigation -->
<div class="dashboard-panel" id="dashboard-architecture-nav"
    style="margin-top: 1rem; border-top: 2px solid var(--accent-color); font-family: var(--font-sans);">
    <h3 style="margin-bottom: 0.75rem; color: var(--accent-color);">Architecture Glossary</h3>
    <p class="glossary-note" style="margin-bottom: 0.75rem;">Reference documentation for each subsystem.</p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <a href="/private/wikipedia_architecture.html" class="arch-nav-btn">Wikipedia</a>
        <a href="/private/records_architecture.html" class="arch-nav-btn">Records</a>
        <a href="/private/challenges_architecture.html" class="arch-nav-btn">Challenges &amp; Responses</a>
        <a href="/private/news_feed_architecture.html" class="arch-nav-btn">Newsfeed</a>
        <a href="/private/sources_architecture.html" class="arch-nav-btn">Sources</a>
        <a href="/private/blog_architecture.html" class="arch-nav-btn">Blog Posts</a>
        <a href="/private/essay_architecture.html" class="arch-nav-btn">Context Essays</a>
    </div>
</div>
```

### Step 5C: Add button CSS

1. Open `frontend/style.css`
2. Find the `/* --- Chat Inline Input --- */` section
3. **Before** that section, add:

```css
/* --- Architecture Glossary Navigation --- */
.arch-nav-btn {
    display: inline-block;
    padding: 8px 16px;
    background: var(--accent-color, #5b7065);
    color: #fff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    transition: background 0.2s, transform 0.1s;
    cursor: pointer;
}

.arch-nav-btn:hover {
    background: #4a5c53;
    transform: translateY(-1px);
}

.arch-nav-btn:active {
    transform: translateY(0);
}
```

### Checkpoint 5

- [ ] Dashboard Row 2 now has two panels side by side: Cheatsheet (left) and Architecture Glossary (right)
- [ ] Architecture Glossary panel contains 7 buttons
- [ ] Each button links to the correct architecture page
- [ ] Clicking a button navigates to the correct page
- [ ] Clicking "Back to Dashboard" on any architecture page returns to the dashboard
- [ ] Buttons are styled with the accent colour and have hover effects
- [ ] No layout breakage — Row 3 (chat/feed) and Row 5 (widgets) still render correctly

---

## Phase 6: Delete the Old Glossary Infrastructure

**Goal:** Remove the Row 4 glossary panel, the glossary JS file, and the glossary wiring code.

### Step 6A: Delete the Row 4 glossary panel from dashboard.html

1. Open `frontend/private/dashboard.html`
2. Find the glossary row wrapper (originally line ~716):
   ```html
   <!-- Glossary row -->
   <div class="a-grid a-cols-2 a-gap-md" style="grid-row: 4;">
       <div class="dashboard-panel" id="dashboard-glossary"
           style="grid-column: 1 / -1; margin-top: 1rem; border-top: 2px solid var(--accent-color); font-family: var(--font-sans);">
           <h3 style="margin-bottom: 0.5rem; color: var(--accent-color);">Glossary</h3>
           <div id="glossary-content" style="line-height: 1.5;">
               <p style="color: #666; font-style: italic;">Select a tab above to see specific guidance.</p>
           </div>
       </div>
   </div>
   ```
3. **Delete** this entire block (the outer `<div class="a-grid">` and everything inside it)

### Step 6B: Remove the glossary JS wiring from `initDashboardTabs()`

1. In `frontend/private/dashboard.html`, find the inline `initDashboardTabs()` function (originally line ~1049)
2. Find the `buildGlossaries()` function definition:
   ```javascript
   function buildGlossaries() {
       const map = {};
       Object.keys(window).forEach(function (key) {
           if (key.startsWith("GLOSSARY_")) {
               var entry = window[key];
               if (entry && entry.tabId && entry.html) {
                   map[entry.tabId] = entry.html;
               }
           }
       });
       return map;
   }
   ```
3. **Delete** the entire `buildGlossaries()` function

4. Find the glossary variable declaration:
   ```javascript
   const glossaryEl = document.getElementById("glossary-content");
   ```
5. **Delete** this line

6. Inside the tab click handler, find the glossary update block:
   ```javascript
   // Update Glossary (from window.GLOSSARY_* registry)
   if (glossaryEl) {
       var glossaries = buildGlossaries();
       if (glossaries[targetId]) {
           glossaryEl.innerHTML = glossaries[targetId];
       } else {
           glossaryEl.innerHTML = "<p style='color: #666; font-style: italic;'>No glossary available for this tab yet.</p>";
       }
   }
   ```
7. **Delete** this entire block

8. **Keep** the cheatsheet wiring (the `cheatsheetEl` variable, the `cheatsheets` object, and the `if (cheatsheetEl && cheatsheets[targetId])` block) — that still works.

### Step 6C: Remove the glossary_records.js script tag

1. In `frontend/private/dashboard.html`, find the script tag loading glossary_records.js:
   ```html
   <script src="/private/js/glossary_records.js" defer></script>
   ```
2. **Delete** this line

### Step 6D: Delete the glossary_records.js file (optional)

1. The file `frontend/private/js/glossary_records.js` is no longer loaded or referenced
2. You may either delete it or leave it as a dead file — it causes no harm either way
3. **Do NOT delete** `records_architecture.html` — that is the replacement

### Checkpoint 6

- [ ] Row 4 glossary panel is gone from dashboard.html
- [ ] `initDashboardTabs()` no longer references `glossaryEl`, `buildGlossaries()`, or any `GLOSSARY_*` registry
- [ ] The cheatsheet still works (switching tabs updates Quick Reference content)
- [ ] No `<script>` tag for `glossary_records.js` exists in dashboard.html
- [ ] No console errors when loading the dashboard
- [ ] Run: `grep -n "glossary-content\|glossaryEl\|buildGlossaries\|GLOSSARY_" frontend/private/dashboard.html` — should return ZERO matches
- [ ] Run: `grep -n "glossary_records.js" frontend/private/dashboard.html` — should return ZERO matches

---

## Phase 7: Second-Pass Verification (MANDATORY)

### 7A: Verify all 7 architecture pages exist

Run:
```bash
ls -la frontend/private/*_architecture.html
```

Expected output — exactly 7 files:
- `blog_architecture.html`
- `challenges_architecture.html`
- `essay_architecture.html`
- `news_feed_architecture.html`
- `records_architecture.html`
- `sources_architecture.html`
- `wikipedia_architecture.html`

### 7B: Verify each page follows GLOSSARY_PLAN.md format

For EACH of the 7 files, confirm:

1. Uses `<pre class="glossary-diagram">` for diagrams (not Mermaid, not plain text)
2. Uses `<details class="glossary-section">` for collapsible sections
3. Uses `<table class="glossary-table">` for file/function tables
4. Has a "Back to Dashboard" link: `<a href="/private/dashboard.html">`
5. Has self-contained `<style>` block with all glossary CSS classes
6. Page title includes topic name

### 7C: Verify dashboard navigation panel

1. Open `frontend/private/dashboard.html`
2. Confirm `#dashboard-architecture-nav` exists with 7 `<a class="arch-nav-btn">` links
3. Confirm each link href matches an existing file:
   - `/private/wikipedia_architecture.html` ✓
   - `/private/records_architecture.html` ✓
   - `/private/challenges_architecture.html` ✓
   - `/private/news_feed_architecture.html` ✓
   - `/private/sources_architecture.html` ✓
   - `/private/blog_architecture.html` ✓
   - `/private/essay_architecture.html` ✓

### 7D: Verify old glossary is fully removed

Run:
```bash
grep -rn "dashboard-glossary\|glossary-content\|buildGlossaries\|GLOSSARY_RECORDS\|glossary_records.js" frontend/private/dashboard.html
```

Expected: **ZERO matches**

### 7E: Verify cheatsheet still works

1. Open dashboard in browser
2. Click each CRUD tab (Records, Essays, Responses, Blogposts, Wiki Weights)
3. Confirm the Quick Reference panel updates with each tab click
4. Confirm no console errors

### 7F: Verify records_architecture.html contains all glossary_records.js content

Open both files and verify:
1. Diagram 1 (Record Creation & Storage) — present in records_architecture.html
2. Diagram 2 (Record Display Pipeline) — present in records_architecture.html
3. All 6 collapsible sections with tables — present in records_architecture.html
4. Count of table rows matches between the two files

### 7G: Verify no broken links

For each architecture page, click the "Back to Dashboard" link. It should navigate to the dashboard.

From the dashboard, click each of the 7 navigation buttons. Each should open the correct architecture page without a 404.

### 7H: Verify CSS is in place

1. Open `frontend/style.css`
2. Confirm `.arch-nav-btn` rule exists with: `display: inline-block`, `padding`, `background: var(--accent-color)`, `color: #fff`, `border-radius: 6px`
3. Confirm `.arch-nav-btn:hover` rule exists

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/private/architecture_template.html` | CREATE | Reusable template for architecture pages (reference only) |
| `frontend/private/records_architecture.html` | CREATE | Records architecture — migrated from glossary_records.js |
| `frontend/private/wikipedia_architecture.html` | MODIFY | Converted from Mermaid to GLOSSARY_PLAN.md ASCII format |
| `frontend/private/challenges_architecture.html` | CREATE | Challenges & Responses architecture (stub) |
| `frontend/private/news_feed_architecture.html` | CREATE | Newsfeed architecture (stub) |
| `frontend/private/sources_architecture.html` | CREATE | Sources architecture (stub) |
| `frontend/private/blog_architecture.html` | CREATE | Blog Posts architecture (stub) |
| `frontend/private/essay_architecture.html` | CREATE | Context Essays architecture (stub) |
| `frontend/private/dashboard.html` | MODIFY | Add architecture nav panel to Row 2; delete Row 4 glossary; remove glossary JS wiring |
| `frontend/style.css` | MODIFY | Add `.arch-nav-btn` button styles |
| `frontend/private/js/glossary_records.js` | DELETE (optional) | No longer loaded; content migrated to records_architecture.html |

---

## Notes for Implementation Agent

- **Work sequentially:** Complete Phase 1 before Phase 2, etc.
- **Do NOT invent content** for the stub pages (Phase 4). Use minimal placeholder diagrams and a single collapsible section. The content will be filled in later by a human.
- **Preserve all information** when migrating glossary_records.js content (Phase 2) and converting wikipedia_architecture.html (Phase 3). Do not summarise or abbreviate.
- **The cheatsheet must keep working.** Phase 6 only removes glossary wiring — the cheatsheet variable, object, and update logic must remain untouched.
- **Template file is for reference only.** It does not need to be served or linked. It exists so future architecture pages can be created consistently.
- **CSS in architecture pages is self-contained.** Each page includes its own `<style>` block so it renders correctly as a standalone document.

---

**End of Plan**
