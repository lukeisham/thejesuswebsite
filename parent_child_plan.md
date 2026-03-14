# Plan: Add Parent-Child Field to Records

**Goal:** Wire up the existing `parent_id` column in SQLite through the full backend and dashboard CRUD form, for future use in the Ardor branching tree evidence page.

**Design decisions (confirmed with Luke):**
- Single parent only (no join table) — `parent_id TEXT REFERENCES records(id)` already exists in schema.sql
- Root record (John 1:1) will be created manually via dashboard — leave parent field blank
- Dashboard CRUD form gets: (a) parent dropdown to select parent, (b) read-only child list
- Ardor tree visual rendering is **out of scope** — no changes to ardor_tree.js
- parent_id is nullable — records with no parent are root nodes

---

## Task 1 — Add `parent_id` to Rust Record struct
**Assignee: Gemini Flash**

File: `app/app_core/src/types/record/record.rs`

1. Add field to the `Record` struct (after line 37, before `created_at`):
   ```rust
   #[serde(skip_serializing_if = "Option::is_none")]
   pub parent_id: Option<String>,
   ```
2. Update `SCHEMA_VERSION` from `"1.1.0"` to `"1.2.0"` (line 55)
3. Update `try_new()` to accept `parent_id: Option<String>` parameter and set it in the constructed `Self`
4. Update the test `test_schema_version_is_documented` to assert `"1.2.0"`

---

## Task 2 — Update SQLite store/get to handle `parent_id`
**Assignee: Gemini Flash**

File: `app/app_storage/src/sqlite.rs`

1. In `store_record()` (line 593): add `parent_id` to the INSERT column list and bind `record.parent_id` (bind as `Option<&str>` — SQLite will store NULL if None)
2. In `get_records()` (line 692): add `parent_id` to the SELECT column list and read it into the Record struct
3. The schema.sql column already exists (line 31) — **no SQL migration needed**

---

## Task 3 — Update ChromaDB storage
**Assignee: Gemini Flash**

File: `app/app_storage/src/chroma.rs`

1. ChromaDB stores records via `record.to_json()` (line 146). Since `parent_id` is now in the Record struct with `serde`, it will automatically be included in the JSON.
2. **Verify** that no explicit field mapping exists that would need updating. If ChromaDB has explicit metadata field extraction, add `parent_id` there too.
3. This task may be a no-op if ChromaDB just serialises the whole Record. Confirm and document either way.

---

## Task 4 — Update DTO if needed
**Assignee: Gemini Flash**

File: `app/app_core/src/types/dtos.rs`

1. Check `PublishRecordRequest` (line 83) — if it maps fields to build a Record, add `parent_id: Option<String>`
2. Check `DraftRecordRequest` (line 73) — add `parent_id: Option<String>` if drafts should track parent
3. Check any handler/route code that constructs a Record from a DTO and ensure `parent_id` is passed through

---

## Task 5 — Add parent dropdown to dashboard CRUD form
**Assignee: Gemini Flash**

Files: `frontend/private/dashboard.html`, `frontend/private/js/edit_records.js`

1. In `dashboard.html`, add a new form group in the record editor section:
   ```html
   <div class="form-group">
     <label for="record-parent-field">Parent Record</label>
     <select id="record-parent-field" class="form-control">
       <option value="">— No Parent (Root) —</option>
       <!-- Options populated by JS -->
     </select>
   </div>
   ```
2. In `edit_records.js`:
   - Add `record-parent-field` to the field references (around line 25)
   - When loading records for the form, populate the parent dropdown with all existing records (id + name), excluding the current record being edited
   - When saving a record, include the selected `parent_id` in the payload
   - When loading a record for editing, set the dropdown to the current `parent_id`

---

## Task 6 — Add read-only children list to dashboard CRUD form
**Assignee: Gemini Flash**

Files: `frontend/private/dashboard.html`, `frontend/private/js/edit_records.js`

1. In `dashboard.html`, add below the parent dropdown:
   ```html
   <div class="form-group">
     <label>Child Records</label>
     <ul id="record-children-list" class="list-group">
       <!-- Populated by JS -->
     </ul>
     <small class="text-muted">Records that have this record as their parent</small>
   </div>
   ```
2. In `edit_records.js`:
   - When loading a record for editing, filter all records where `parent_id === currentRecord.id`
   - Display matching child record names in the `record-children-list`
   - This list is **read-only** — no edit/delete buttons

---

## Task 7 — Update `agent_guide.yml`
**Assignee: Gemini Flash**

File: `agent_guide.yml`

1. Update version to match new schema version
2. Add `parent_id` to the Record field documentation
3. Note that parent-child is dashboard-only, not in public views

---

## Task 8 — Claude Opus Audit
**Assignee: Claude Opus (you)**

Full integration audit after Tasks 1-7 are complete:

1. **Type safety**: Verify `parent_id` flows correctly through Record struct → DTO → SQLite → ChromaDB → JSON API → frontend
2. **Schema consistency**: Confirm schema.sql, Record struct, and SCHEMA_VERSION all agree
3. **No regressions**: Check that existing record creation/editing still works (parent_id is Optional/nullable throughout)
4. **Circular reference check**: Verify no record can be its own parent (either via backend validation or frontend constraint)
5. **Dashboard integration**: Confirm parent dropdown excludes current record, children list filters correctly
6. **Compile check**: Run `cargo check` to verify Rust code compiles
7. **Document any issues** found and fix them

---

## Task 9 — Update `records_architecture.html`
**Assignee: Gemini Flash**

File: `frontend/private/records_architecture.html`

1. Add a new section documenting the parent-child relationship:
   - `parent_id` field: nullable, references `records(id)`
   - Root records have `parent_id = NULL`
   - Used in dashboard CRUD form (parent dropdown + children list)
   - Will be used in Ardor tree diagram (future work)
2. Update the data flow diagram to show `parent_id` in the pipeline
3. Update the field reference table to include `parent_id`

---

## Task 10 — Luke's deployment steps
**Assignee: Luke**

After all tasks are complete and the audit passes:

1. **Push the working branch to GitHub:**
   ```bash
cd ~/Developer/thejesuswebsite/.claude/worktrees/eager-gould
git add -A
git commit -m "feat: wire parent_id through records pipeline for ardor tree"
git push origin claude/eager-gould
   ```

2. **Create a Pull Request and merge on GitHub:**
Go to the repo on GitHub
Create PR from `claude/eager-gould` → `main`
Review the changes, then merge

3. **Sync your Mac with the merged main branch:**
   ```bash
cd ~/Developer/thejesuswebsite
git checkout main
git pull origin main
   ```

4. **Refresh the website:**
Rebuild/redeploy as per your normal process
Verify the dashboard shows the new parent dropdown and children list

5. **Delete the Claude working branch (local + remote):**
   ```bash
   git branch -d claude/eager-gould
   git push origin --delete claude/eager-gould
   ```
   Also clean up the worktree:
   ```bash
   rm -rf .claude/worktrees/eager-gould
   ```

6. **Create the root record:**
   - Go to the dashboard, create a new record
   - Set primary verse to "John 1:1"
   - Leave the Parent Record dropdown as "— No Parent (Root) —"
   - Fill in other fields as desired (name, description, etc.)

---

## File change summary

| File | Change |
|------|--------|
| `app/app_core/src/types/record/record.rs` | Add `parent_id` field, update version |
| `app/app_storage/src/sqlite.rs` | Add `parent_id` to INSERT/SELECT |
| `app/app_storage/src/chroma.rs` | Verify JSON includes `parent_id` |
| `app/app_core/src/types/dtos.rs` | Add `parent_id` to DTOs |
| `frontend/private/dashboard.html` | Add parent dropdown + children list HTML |
| `frontend/private/js/edit_records.js` | Wire parent dropdown + children list JS |
| `agent_guide.yml` | Update schema docs |
| `frontend/private/records_architecture.html` | Document parent-child relationship |
| `app/app_storage/database/schema.sql` | **No change** (column already exists) |
