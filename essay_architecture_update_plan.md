# Plan: Update essay_architecture.html in Bite-Sized Batches

## Context

The current `essay_architecture.html` is a bare placeholder — a single vague box diagram and one stub table entry. It needs to be replaced with a fully documented architecture covering the 4-step essay lifecycle:
1. Essays are created in the CRUD using Markdown
2. Published essays can be searched in a new Search tab in the Essays panel
3. Published essays generate an internal URL based on a slugified title
4. Published essays appear as a card on the `context.html` grid

Key codebase facts:
- The Essays CRUD panel (`crud-essays`) exists in `dashboard.html` but `essay_crud.js` has not been created yet — it is **intended**, modelled on `blog_crud.js`
- The public essays page is `context.html`, which uses `context_hero.js` to load essay content dynamically
- The Essay Rust type has: title, author, text, cover_image, bibliography, status — **no internal_url field yet** (URL is auto-generated from the title slug at publish time)
- The Search tab for essays is a new tab to be added inside the Essays CRUD panel

**File to modify:** `frontend/private/essay_architecture.html`

---

## Batch Plan

### Batch 1: Master Overview ASCII Diagram

**What:** Replace the existing placeholder box diagram with a unified 4-step lifecycle overview.

**Diagram:**
```
1. CREATE (CRUD)     2. SEARCH (CRUD)     3. PUBLISH (URL)     4. DISPLAY (public)
────────────────     ────────────────     ────────────────     ───────────────────
dashboard.html       dashboard.html       title slug           context.html
crud-essays panel    Essays Search tab    auto-generated       card grid
markdown textarea    list of published    /context/<slug>      context_hero.js
                     essays + search bar                       GET /api/v1/essays
```

**Insert location:** Replace the existing placeholder `<pre class="glossary-diagram">` block.

---

### Batch 2: CRUD Creation Diagram

**What:** Detailed ASCII diagram for how essays are created and saved using Markdown.

**Covers:**
- `dashboard.html` essay fields: title, record-id (hidden), body textarea (markdown)
- Save Draft → `POST /api/v1/essays/draft` → `sqlite.rs: save_essay_draft()`
- Publish → `POST /api/v1/essays/publish` → `Essay::compose()` → `Essay::publish()` → `EssayGatekeeper` → `sqlite.rs + chroma.rs: store_essay()`
- Key file: `private/js/essay_crud.js` (intended, modelled on `blog_crud.js`)

**Insert after:** Master overview diagram.

---

### Batch 3: Search Tab Diagram

**What:** ASCII diagram for the intended Search tab in the Essays CRUD panel.

**Covers:**
- New "Search" tab alongside "Write" tab in Essays panel
- `essay_crud.js` → `loadEssays()` → `GET /api/v1/essays` (with Bearer auth)
- `renderEssayList()` — title + status, search filter, click to edit, delete button

**Insert after:** CRUD Creation diagram.

---

### Batch 4: URL Slug + Public Display Diagram

**What:** Combined diagram showing slug generation at publish time and display on `context.html`.

**Covers:**
- Slug generation: `"The Life of Paul"` → `"the-life-of-paul"` → `/context/the-life-of-paul`
- `context.html` → `context_hero.js` → `GET /api/v1/essays` → essay cards in `#hero-placeholder`
- Each card: title, author, excerpt, cover image, `<a href="/context/<slug>">`

**Insert after:** Search tab diagram.

---

### Batch 5: File & Function Reference Tables

**What:** Replace the single stub `<details>` table with accurate reference tables.

**New `<details>` sections:**
1. Backend — Core Types (`essay.rs`, `metadata.rs`, `PublicationStatus`)
2. Backend — API Handlers (7 intended endpoints + stub search route)
3. Backend — Storage (`sqlite.rs`, `chroma.rs`, `essay_drafts` table)
4. Frontend — Admin JS (`essay_crud.js` intended functions, `blog_crud.js` as reference)
5. Frontend — Public JS (`context_hero.js`)

---

### Batch 6: Terms Glossary

**What:** New `<h2>` "Glossary of Terms" section with a definition table.

**Terms:** Essay, CRUD, Markdown, Draft, PublicationStatus, Slug, Internal URL, EssayGatekeeper, ChromaDB, EntryToggle, context.html, hero-placeholder

---

## Verification

After each batch: open in browser, verify diagrams render, check `<details>` expand.
After all batches: review full page for consistency with the 4 process steps.

---

## Files Modified

- `frontend/private/essay_architecture.html` — the only file being edited (all 6 batches)
