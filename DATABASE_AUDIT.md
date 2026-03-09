# Database & Storage Audit — SQL, ChromaDB, and Data Persistence

Generated: 2026-03-09
Scope: Trace every data path from widget → API handler → storage layer. Identify gaps where data is lost, inaccessible, or never persisted.

**Governing document:** `agent_guide.yml` v1.2.0

---

## Engineering Checklist (Apply to Every Fix)

- [ ] No panics — use `?` or `unwrap_or_else`, never `unwrap()`
- [ ] Schema changes update `SCHEMA_VERSION`, `schema.sql`, ChromaDB migrations, AND `agent_guide.yml` (§5)
- [ ] Never overwrite existing UUIDs — merge new Metadata only (§5)
- [ ] All IDs are ULID/UUID TEXT — no auto-increment for domain entities
- [ ] Monetary values are INTEGER cents — no floats
- [ ] Timestamps are ISO 8601 TEXT
- [ ] Every new table gets a matching `SqliteStorage` method in `sqlite.rs`
- [ ] Every new ChromaDB collection gets a matching `ChromaStorage` method in `chroma.rs`
- [ ] `///` doc comments on every new public function

---

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      StorageManager                          │
│  app/app_storage/src/manager.rs                              │
│                                                              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │    SqliteStorage      │    │      ChromaStorage         │ │
│  │    sqlite.rs          │    │      chroma.rs             │ │
│  │                       │    │                            │ │
│  │  Structured data:     │    │  Unstructured data:        │ │
│  │  contacts, donors,    │    │  essays, records,          │ │
│  │  challenges, weights, │    │  responses, pictures,      │ │
│  │  work queue, metrics  │    │  blog_posts                │ │
│  │                       │    │                            │ │
│  │  thejesuswebsite.db   │    │  http://localhost:8000     │ │
│  └──────────────────────┘    └────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────┐                                   │
│  │    NewsEngine         │  In-memory only (Arc<RwLock>)    │
│  │    NOT persisted      │                                   │
│  └──────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Issues (Will Cause Runtime Failures)

### CRITICAL-1: `users` Table Missing from schema.sql

**Impact:** `wgt_users.js` → `GET /api/v1/admin/users` → `sqlite.get_users()` → `SELECT id, email, role FROM users` → **RUNTIME ERROR: no such table**

The `sqlite.rs` file defines `get_users()`, `create_user()`, and `delete_user()` methods but `schema.sql` has no `users` table.

**Fix — add to `schema.sql`:**
```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id    TEXT PRIMARY KEY,              -- ULID
    email TEXT NOT NULL UNIQUE,
    role  TEXT NOT NULL CHECK (role IN ('Admin'))
);
```

**Also run on existing database:**
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK (role IN ('Admin'))
);
```

---

### CRITICAL-2: `security_logs` Table Missing from schema.sql

**Impact:** `wgt_security.js` → `GET /api/v1/admin/security/logs` → `sqlite.get_security_logs()` → `SELECT id, event_type, ip_address, details, created_at FROM security_logs` → **RUNTIME ERROR: no such table**

Also impacts login: `login.rs` calls `SecurityLogger::log()` → `sqlite.log_security_event()` → **fails silently or crashes**.

**Fix — add to `schema.sql`:**
```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY LOGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_logs (
    id         TEXT PRIMARY KEY,          -- ULID
    event_type TEXT NOT NULL CHECK (event_type IN (
        'Honeypot', 'RateLimit', 'LoginRequest', 'LoginSuccess', 'LoginFail'
    )),
    ip_address TEXT,
    details    TEXT,
    created_at TEXT NOT NULL              -- ISO 8601
);
```

---

### CRITICAL-3: `contact_messages` INSERT Missing Required Columns

**Impact:** `store_contact.js` → `POST /api/contact` → `sqlite.store_contact()` → INSERT into `contact_messages` with only `(id, contact_id, status)` → **RUNTIME ERROR: NOT NULL constraint failed: contact_messages.subject**

The `contact_messages` schema requires `subject TEXT NOT NULL` and `body TEXT NOT NULL`, but `store_contact()` in `sqlite.rs` doesn't insert them. The JS frontend sends `{ name, email, message }` — the `message` field maps to `body` but is never passed through.

**Fix — update `store_contact()` in `sqlite.rs`:**
```rust
pub async fn store_contact(
    &self,
    name: &str,
    email: &str,
    subject: &str,  // new parameter
    body: &str,     // new parameter
) -> Result<(), sqlx::Error> {
    let cid = ulid::Ulid::new().to_string();
    let message_id = ulid::Ulid::new().to_string();
    let sent_at = chrono::Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO contacts (id, name, email) VALUES (?, ?, ?)",
        cid, name, email
    ).execute(&self.pool).await?;

    sqlx::query!(
        "INSERT INTO contact_messages (id, contact_id, subject, body, sent_at)
         VALUES (?, ?, ?, ?, ?)",
        message_id, cid, subject, body, sent_at
    ).execute(&self.pool).await?;

    Ok(())
}
```

**Also update `api_contacts.rs` handler** to extract `subject` and `body` from the request.

**Also update `store_contact.js`** to send `subject` (can default to "Website Contact Form").

---

## Persistence Gaps (Data Not Stored)

### GAP-1: NewsEngine — In-Memory Only

**Impact:** All news data is lost on server restart. The `news_items` and `news_holding_area` tables exist in `schema.sql` but `NewsEngine` only uses `Arc<RwLock<Newsfeed>>` in memory.

| Path | What Happens | Should Happen |
|------|--------------|---------------|
| `wgt_news_crawler.js` → `POST /api/v1/news_run` | Seeds mock data in memory | Persist to `news_items` table |
| `GET /api/v1/news` | Reads from memory | Read from `news_items` table |

**Fix:** Wire `NewsEngine.harvest_raw()` and `process_next_pending()` to INSERT into `news_holding_area` and then move to `news_items` via SQLite.

---

### GAP-2: WikiWeight CRUD — Stub Only

**Impact:** `wgt_wiki_weights.js` performs full CRUD on `/api/v1/weights/wikipedia` — GET, POST, PUT, DELETE — but every handler is a stub returning mock data. The `wikipedia_weights` table exists in `schema.sql` and is properly defined, but no handler touches it.

| Handler | Currently | Should |
|---------|-----------|--------|
| `handle_get_weights()` | Returns hardcoded mock | `SELECT * FROM wikipedia_weights` |
| `handle_create_weight()` | Returns mock object | `INSERT INTO wikipedia_weights` |
| `handle_update_weight()` | Returns mock object | `UPDATE wikipedia_weights WHERE id = ?` |
| `handle_delete_weight()` | Returns 204 | `DELETE FROM wikipedia_weights WHERE id = ?` |

**Fix:** Add `SqliteStorage` methods for wiki weights and wire them to handlers.

---

### GAP-3: Sources CRUD — Stub Only

**Impact:** `wgt_sources.js` and `widget_sources.js` perform GET/POST/DELETE on `/api/v1/sources` and `/api/v1/admin/sources`, but all three handlers return hardcoded data. The `sources` table exists in `schema.sql`.

| Handler | Currently | Should |
|---------|-----------|--------|
| `handle_get_sources()` | Returns hardcoded list | `SELECT * FROM sources` |
| `handle_create_source()` | Validates DTO only | `INSERT INTO sources` |
| `handle_delete_source()` | Returns success | `DELETE FROM sources WHERE id = ?` |

---

### GAP-4: Challenges — Stub Only

**Impact:** `wgt_challenge_ranker.js` and `edit_challenge_results.js` call challenge endpoints, but all handlers return hardcoded data. The `challenges_popular` and `challenges_academic` tables exist in `schema.sql`.

| Handler | Currently | Should |
|---------|-----------|--------|
| `handle_get_challenges()` | Hardcoded | `SELECT * FROM challenges_popular UNION SELECT * FROM challenges_academic` |
| `handle_post_challenge()` | Hardcoded | `INSERT INTO challenges_popular` or `challenges_academic` |
| `handle_challenge_sort()` | Hardcoded | `UPDATE ... SET ranking = ?` |

---

### GAP-5: Donor Persistence — Placeholder

**Impact:** `store_donor.js` → `POST /api/donate` → `sqlite.store_donor()` → the method body does nothing (placeholder). The `donors` table exists in `schema.sql`.

**Fix — implement `store_donor()` in `sqlite.rs`:**
```rust
pub async fn store_donor(&self, name: &str, amount_cents: i64) -> Result<(), sqlx::Error> {
    let id = ulid::Ulid::new().to_string();
    let display = if name.is_empty() { "Anonymous" } else { name };
    sqlx::query!(
        "INSERT INTO donors (id, display_name, privacy, total_contributed_cents)
         VALUES (?, ?, 'Unpublished', ?)",
        id, display, amount_cents
    ).execute(&self.pool).await?;
    Ok(())
}
```

---

### GAP-6: Record Drafts — No Persistence

**Impact:** `edit_records.js` → `POST /api/v1/records/draft` → `handle_save_record_draft()` → returns hardcoded success. Drafts are never saved anywhere. ChromaDB only stores *published* records via `store_record()`.

**Fix:** Either add a `record_drafts` SQLite table, or store drafts in ChromaDB with a `is_draft: true` metadata flag.

---

### GAP-7: Spider/Mentions — No Persistence

**Impact:** `widget_spider.js` → `GET /api/v1/admin/mentions` and `POST /api/v1/admin/mentions` → both return hardcoded data. No mentions table exists in `schema.sql`.

**Fix:** Create a `mentions` table:
```sql
CREATE TABLE IF NOT EXISTS mentions (
    id          TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('Human', 'Agent')),
    url         TEXT NOT NULL,
    snippet     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
```

---

### GAP-8: Deadlinks — No Persistence

**Impact:** `widget_deadlinks.js` → `GET /api/widgets/deadlinks/run` and `POST /api/widgets/deadlinks/replace` → both return hardcoded data. No deadlinks table exists in `schema.sql`.

**Fix:** Create a `deadlinks` table:
```sql
CREATE TABLE IF NOT EXISTS deadlinks (
    id      TEXT PRIMARY KEY,
    url     TEXT NOT NULL,
    status  TEXT NOT NULL,       -- e.g. '404', '500', 'timeout'
    context TEXT,                 -- page where the link was found
    found_at TEXT NOT NULL
);
```

---

### GAP-9: Spelling/Spellcheck — No Persistence

**Impact:** `wgt_spelling.js` and `widget_spellcheck.js` → all spelling endpoints return hardcoded data. No spelling issues table or custom dictionary table exists.

**Fix:** Create tables:
```sql
CREATE TABLE IF NOT EXISTS spelling_issues (
    id         TEXT PRIMARY KEY,
    bad_word   TEXT NOT NULL,
    context    TEXT NOT NULL,
    suggestion TEXT,
    resolved   INTEGER NOT NULL DEFAULT 0,
    found_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_dictionary (
    word TEXT PRIMARY KEY
);
```

---

### GAP-10: Work Queue — Table Exists, Not Wired

**Impact:** `work_queue` table exists in `schema.sql` with proper columns (`id`, `payload`, `status`, `created_at`, `updated_at`) but `handle_agent_queue()` returns hardcoded work items. The SQLite table is never read or written to.

**Fix:** Add `SqliteStorage` methods and wire to handlers:
```rust
pub async fn get_queue_items(&self) -> Result<Vec<WorkQueueRow>, sqlx::Error>
pub async fn enqueue_task(&self, payload: &str) -> Result<String, sqlx::Error>
pub async fn update_task_status(&self, id: &str, status: &str) -> Result<(), sqlx::Error>
```

---

### GAP-11: Trace Reasoning — Table Exists, Not Wired

**Impact:** `trace_reasoning` table exists in `schema.sql` but `handle_agent_trace()` returns hardcoded steps. `show_trace_reasoning.js` and `wgt_agent-self_reflection.js` would display real data if the table were wired.

---

### GAP-12: Token Metrics — Table Exists, Not Wired

**Impact:** `tokens` table exists in `schema.sql` but `handle_token_metrics()` returns hardcoded `{ used: 12500, limit: 100000 }`. Priority 1 in `agent_guide.yml` §6 — this should be the most accurately tracked metric.

---

### GAP-13: Server Metrics — Table Exists, Not Wired

**Impact:** `server_metrics` singleton table exists in `schema.sql` but `handle_server_metrics()` returns hardcoded data.

---

### GAP-14: Page Views / User Metrics — Tables Exist, Not Wired

**Impact:** `page_ids`, `page_views`, and `user_metrics` tables exist in `schema.sql` but `handle_page_metrics()` returns hardcoded data.

---

## ChromaDB Issues

### CHROMA-1: MockEngine Returns Zero Vectors

**Impact:** ALL semantic searches return meaningless results. The `MockEngine` returns `vec![0.0; 384]` for every text input, making every document equidistant in vector space.

**Current code in `main.rs`:**
```rust
let chroma = Arc::new(
    ChromaStorage::connect(&storage_config, Arc::new(MockEngine)).await
);
```

**Fix:** Replace `MockEngine` with a real embedding engine. Options:

1. **CandleEngine** (local, already in `app_brain`): Wire the existing Candle BERT model to produce real 384-dim embeddings
2. **OpenAI Embeddings API**: Use `text-embedding-3-small` via HTTP
3. **Sentence-Transformers server**: Run a local embedding server

The `InferenceEngine` trait is already defined:
```rust
#[async_trait]
pub trait InferenceEngine: Send + Sync {
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>, AppError>;
}
```

Replace `MockEngine` with a real implementation of this trait.

---

### CHROMA-2: No Update or Delete Operations

ChromaDB collections only support `store_*()` and `query_*()`. There is no:
- `update_record()` — editing a record creates a duplicate
- `delete_record()` — no way to remove entries

**Fix:** Add upsert and delete methods to `ChromaStorage`:
```rust
pub async fn upsert_record(&self, record: &Record) -> Result<(), AppError>
pub async fn delete_record(&self, id: &str) -> Result<(), AppError>
```

---

### CHROMA-3: Missing `read_at` / `is_read` on Contact Messages

`get_unread_contacts()` queries `contact_messages` but the table has no `is_read` or `read_at` column. `mark_contact_read()` has no column to update.

**Fix — add column to `contact_messages`:**
```sql
ALTER TABLE contact_messages ADD COLUMN read_at TEXT;  -- NULL = unread
```

Then `mark_contact_read()` updates `SET read_at = ? WHERE id = ?` and `get_unread_contacts()` filters `WHERE read_at IS NULL`.

---

## Full Data Flow Trace: Widget → Handler → Storage

| Widget | API Endpoint | Handler | Storage Call | Actual Persistence |
|--------|-------------|---------|--------------|-------------------|
| `wgt_agent-chat` | `POST /api/v1/agent/chat` | `handle_agent_chat` | Agent brain (in-memory) | None — responses not stored |
| `wgt_agent-self_reflection` | `GET /api/v1/agent/trace` | `handle_agent_trace` | None | **STUB** — `trace_reasoning` table unused |
| `wgt_agent-self_reflection` | `GET /api/v1/agent/reflection` | `handle_agent_reflection` | None | **STUB** |
| `wgt_agent_workflow` | `GET /api/v1/agent/queue` | `handle_agent_queue` | None | **STUB** — `work_queue` table unused |
| `wgt_token_metrics` | `GET /api/v1/metrics/tokens` | `handle_token_metrics` | None | **STUB** — `tokens` table unused |
| `wgt_server_metrics` | `GET /api/v1/metrics/server` | `handle_server_metrics` | None | **STUB** — `server_metrics` table unused |
| `wgt_page_metrics` | `GET /api/v1/metrics/page` | `handle_page_metrics` | None | **STUB** — `page_views` table unused |
| `wgt_news_crawler` | `POST /api/v1/news_run` | `handle_news_run` | NewsEngine (memory) | **IN-MEMORY ONLY** — `news_items` table unused |
| `wgt_spelling` | `POST /api/v1/spelling/check-all` | `handle_spelling_check_all` | None | **STUB** — no spelling table |
| `wgt_wiki_interface` | `GET /api/v1/tools/wiki/status` | `handle_wiki_status` | None | **STUB** |
| `wgt_wiki_interface` | `POST /api/v1/tools/wiki/sync` | `handle_wiki_sync` | None | **STUB** |
| `wgt_wiki_weights` | `GET /api/v1/weights/wikipedia` | `handle_get_weights` | None | **STUB** — `wikipedia_weights` table unused |
| `wgt_wiki_weights` | `POST /api/v1/weights/wikipedia` | `handle_create_weight` | None | **STUB** — table unused |
| `wgt_challenge_ranker` | `POST /api/v1/tools/challenge/sort` | `handle_challenge_sort` | None | **STUB** — `challenges_*` tables unused |
| `wgt_research_suggest` | `GET /api/v1/research/suggest` | `handle_research_suggest` | None | **STUB** |
| `wgt_contact_triage` | `GET /api/v1/contact/triage` | `handle_contact_triage` | SQLite (contacts) | ✅ REAL — reads from contacts |
| `wgt_draft_results` | `GET /api/v1/system/draft_counts` | `handle_draft_counts` | None | **STUB** — returns zeros |
| `wgt_users` | `GET /api/v1/admin/users` | `handle_get_users` | SQLite (users) | **CRASH** — table missing |
| `wgt_security` | `GET /api/v1/admin/security/logs` | `handle_get_security_logs` | SQLite (security_logs) | **CRASH** — table missing |
| `wgt_sources` | `GET /api/v1/sources` | `handle_get_sources` | None | **STUB** — `sources` table unused |
| `wgt_deadlinks` | `GET /api/widgets/deadlinks/run` | `handle_deadlinks_run` | None | **STUB** — no table |
| `edit_records` | `GET /api/v1/records` | `handle_record_list` | ChromaDB (records) | ✅ REAL — queries records |
| `edit_records` | `POST /api/v1/records/draft` | `handle_save_record_draft` | None | **STUB** |
| `edit_records` | `POST /api/v1/records/publish` | `handle_publish_record` | ChromaDB (records) | ✅ REAL — stores record |
| `blog_crud` | `GET /api/blog/posts` | `handle_get_posts` | ChromaDB (blog_posts) | ✅ REAL — queries posts |
| `blog_crud` | `POST /api/blog/posts` | `handle_create_post` | ChromaDB (blog_posts) | ✅ REAL — stores post |
| `widget_contact` | `GET /api/v1/admin/contacts/unread` | `handle_get_unread_contacts` | SQLite (contacts) | ✅ REAL — reads contacts |
| `widget_contact` | `PATCH /api/v1/admin/contacts/{id}/read` | `handle_mark_contact_read` | SQLite (contact_messages) | **BROKEN** — no read_at column |
| `widget_security` | `GET /api/v1/admin/security/logs` | `handle_get_security_logs` | SQLite (security_logs) | **CRASH** — table missing |
| `widget_sources` | `POST /api/v1/admin/sources` | `handle_create_source` | None | **STUB** |
| `widget_user_manager` | `POST /api/v1/admin/users` | `handle_create_user` | SQLite (users) | **CRASH** — table missing |
| `widget_deadlinks` | `POST /api/widgets/deadlinks/replace` | `handle_deadlinks_replace` | None | **STUB** |
| `widget_spellcheck` | `GET /api/widgets/spellcheck/run` | `handle_spellcheck_run` | None | **STUB** |
| `store_contact` | `POST /api/contact` | `handle_store_contact` | SQLite (contacts) | **BROKEN** — missing columns |
| `store_donor` | `POST /api/donate` | `handle_store_donor` | SQLite (donors) | **PLACEHOLDER** — does nothing |
| `login` | `POST /login` | `handle_login` | SQLite (security_logs) | **CRASH** — table missing |

---

## Work Order (Priority Order)

### Batch 1 — Fix Runtime Crashes (CRITICAL)

| # | Task | File(s) | Impact |
|---|------|---------|--------|
| 1 | Add `users` table to `schema.sql` | `schema.sql` | Unblocks user management |
| 2 | Add `security_logs` table to `schema.sql` | `schema.sql` | Unblocks security widget AND login logging |
| 3 | Add `read_at` column to `contact_messages` | `schema.sql` | Fixes mark-as-read functionality |
| 4 | Fix `store_contact()` to include `subject`, `body`, `sent_at` | `sqlite.rs`, `api_contacts.rs` | Fixes contact form submission |
| 5 | Run the CREATE TABLE statements on the live database | VPS SSH | Applies fixes to production |

### Batch 2 — Wire Existing Tables to Handlers (HIGH)

These tables already exist in `schema.sql` but no handler reads/writes them.

| # | Task | Table(s) | Handler File |
|---|------|----------|-------------|
| 6 | Wire `wikipedia_weights` CRUD | `wikipedia_weights` | `api_weights.rs`, `sqlite.rs` |
| 7 | Wire `sources` CRUD | `sources` | `api_sources.rs`, `sqlite.rs` |
| 8 | Wire `challenges_popular` + `challenges_academic` | `challenges_*` | `api_agents.rs`, `sqlite.rs` |
| 9 | Wire `work_queue` read/write | `work_queue` | `api_agents.rs`, `sqlite.rs` |
| 10 | Wire `trace_reasoning` read/write | `trace_reasoning` | `api_agents.rs`, `sqlite.rs` |
| 11 | Wire `tokens` tracking | `tokens` | `api_tools.rs`, `sqlite.rs` |
| 12 | Wire `server_metrics` singleton | `server_metrics` | `api_tools.rs`, `sqlite.rs` |
| 13 | Wire `page_views` + `page_ids` | `page_views`, `page_ids` | `api_tools.rs`, `sqlite.rs` |
| 14 | Wire `news_items` persistence from NewsEngine | `news_items`, `news_holding_area` | `api_news.rs`, `sqlite.rs` |
| 15 | Implement `store_donor()` body | `donors` | `sqlite.rs` |

### Batch 3 — Create Missing Tables (MEDIUM)

| # | Task | New Table | Handler File |
|---|------|-----------|-------------|
| 16 | Create `mentions` table + wire spider handlers | `mentions` | `api_spider.rs`, `sqlite.rs` |
| 17 | Create `deadlinks` table + wire handlers | `deadlinks` | `api_widgets.rs`, `sqlite.rs` |
| 18 | Create `spelling_issues` + `custom_dictionary` tables | Both | `api_widgets.rs`, `sqlite.rs` |
| 19 | Create `record_drafts` table or add draft flag to ChromaDB | Per approach | `api_records.rs` |

### Batch 4 — Replace MockEngine (HIGH but Separate)

| # | Task | File(s) |
|---|------|---------|
| 20 | Implement real `InferenceEngine` using CandleEngine or external API | `main.rs`, `chroma.rs` |
| 21 | Add upsert and delete operations to `ChromaStorage` | `chroma.rs` |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| SQLite tables in schema | 25 |
| SQLite tables actually used by handlers | 3 (contacts, donors (stub), users/security (crash)) |
| SQLite tables with data but no handler | 13 |
| ChromaDB collections | 5 |
| ChromaDB collections actually used | 4 (essays, records, blog_posts, responses) |
| Handlers returning real data | 8 |
| Handlers returning hardcoded stubs | 28 |
| Handlers that crash at runtime | 4 (users ×2, security_logs ×1, login ×1) |
| Data stored in memory only | 1 (NewsEngine) |
| Embedding engine | MockEngine (all zeros — search broken) |
