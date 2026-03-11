# Plan: Update records_architecture.html in Bite-Sized Batches

## Context

The current `records_architecture.html` documents the creation/storage pipeline and display pipeline well, but is missing three major areas:
1. **Record references on other pages** — Evidence (ardor tree), timeline, maps, essays, responses
2. **Record toggle button** — turning Bible verses into internal record links
3. **A single unified ASCII overview diagram** showing the full 6-step lifecycle

The page will be updated with a clear ASCII diagram of the full process and updated file/term listings, structured as **section-per-batch** updates.

**File to modify:** `frontend/private/records_architecture.html`

---

## Batch Plan

### Batch 1: Master Overview ASCII Diagram

**What:** Insert a new unified ASCII diagram at the top showing the full 6-step record lifecycle. Keep the existing detailed diagrams below it.

**Diagram structure:**
```
1. SEED ─→ 2. SEARCH ─→ 3. CRUD ─→ 4. CREATE
                              │
   5. REFERENCE (evidence, timeline, maps, essays, responses)
                              │
   6. TOGGLE (Bible verses → record links)
```

The diagram will show:
- **Step 1 (Seed):** 6 list pages → `list_page_parser.js` → `wgt_db_populator.js` → POST `/api/v1/admin/populate` → SQLite + ChromaDB → ~300 records (title + ULID + primary verse + internal link)
- **Step 2 (Search):** `records.html` search bar → GET `/api/v1/records?q=` → results render in 3 views: Grid (record_card.js, 14 fields), Feed (record_feed.js, compact), List (title + primary verse)
- **Step 3 (CRUD on Dashboard):** `dashboard.html` → same search → click record → `populateForm(r)` in CRUD editor → PUT/DELETE
- **Step 4 (Create):** CRUD editor → `clearForm()` → fill fields → POST `/api/v1/records/publish`
- **Step 5 (Reference):** Evidence/timeline/maps fetch records via JS and display title + primary verse; essays/responses link via internal links
- **Step 6 (Toggle):** Footer button toggles all Bible verses into clickable links to `records.html`

**Insert location:** Between the `<h2>Data Flow</h2>` heading and the existing "Record Creation & Storage Pipeline" diagram.

---

### Batch 2: Record Reference Section (New)

**What:** Add a new ASCII diagram and reference table documenting how records are referenced across the site.

**Diagram will show:**

```
                    ┌─── evidence.html (ardor tree nodes)
                    │      └─ ardor_tree.js → fetch records by node
                    │
                    ├─── timeline.html (period selection)
                    │      └─ JS → fetch records by era
 GET /api/v1/      │
 records ──────────┤
 (title + verse)   ├─── maps/*.html (location sidebar)
                    │      └─ map_zoom.js → fetch records by location
                    │
                    ├─── context/*.html & responses/*.html
                    │      └─ internal links (<a> href to records.html)
                    │
                    └─── Any page with Bible verses
                           └─ Record toggle → .record-link → records.html
```

**New file/function reference table** listing:
- `evidence.html` + `ardor_tree.js`
- `timeline.html` + shuffle/zoom scripts
- `maps/maps.html` + 5 regional map HTMLs + `map_zoom.js`
- `context.html` + `context_hero.js`
- `challenge_academic.html` + `challenge_academic_hero.js`
- `footer_actions.js` → `toggleRecordLinks()`

**Insert location:** After the existing Display Pipeline diagram.

---

### Batch 3: Record Toggle Section (New)

**What:** Add a dedicated ASCII diagram for the Record Toggle feature (intended behavior).

**Diagram will show:**
```
  Any page with Bible verses
         │
  btn-toggle-links (footer button)
         │  click
         ▼
  footer_actions.js → toggleRecordLinks()
         │
         ▼
  Every Bible verse element with class .record-link
         │  toggle visibility
         ▼
  Verse text becomes <a href="/records.html?verse=Book+Ch:Vs">
  → Takes user to records.html filtered to that record
```

**Insert location:** After the new Reference section from Batch 2.

---

### Batch 4: Update File & Function Reference Tables

**What:** Update existing `<details>` tables and add new ones.

**New sections:**
1. **"Frontend — Record References (cross-page)"** — evidence, timeline, maps, context, challenge pages, footer_actions.js
2. **"Frontend — DB Populator & Parsing"** — wgt_db_populator.js, list_page_parser.js, bible_ref_parser.js, 6 list page HTML files

**Updates to existing sections:**
- CSS Classes table: add `.record-link`, `.record-list`, `.primary-verse-display`

---

### Batch 5: Terms Glossary (New)

**What:** Add a "Glossary of Terms" section at the bottom of the page.

**Terms:** ULID, Record, Primary Verse, Secondary Verse, Internal Link, Record Toggle, DB Populator, Classification, ContentEntry, TimelineEra, MapType, ChromaDB, CRUD Editor, RecordGatekeeper

**Insert location:** After all existing `<details>` sections, before `</body>`.

---

## Verification

After each batch:
1. Open `records_architecture.html` in a browser to verify layout
2. Check ASCII diagrams render in `<pre class="glossary-diagram">` blocks
3. Verify `<details>` sections expand/collapse correctly

After all batches:
- Review full page for consistency
- Verify master overview diagram reflects all 6 steps
- Cross-check file paths against actual codebase

---

## Files Modified

- `frontend/private/records_architecture.html` — the only file being edited (all 5 batches)
