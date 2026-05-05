---
name: guide_security.md
purpose: description of security measures taken to protect the backend section 
version: 1.4.0
dependencies: [guide_dashboard_appearance.md, module_sitemap.md]
---

# Guide to Security

This is the source of truth for the codebase security.

## 1. Preventing DDoS attacks via flood control
The project implements a multi-layer defense against high-volume traffic and automated bot flood patterns.

- **Nginx Rate Limiting:** The primary defense layer. Configure `nginx.conf` (`limit_req_zone`) to limit requests per IP.
- **MCP Server Throttling:** The `backend/middleware/rate_limiter.py` FastAPI middleware applies rate limiting to the admin API. The read-only MCP server (`mcp_server.py` at the project root) uses stdio/SSE transport and is not directly exposed to the public internet — AI agents connect via local transport.
- **SSL Integrity:** Use `deployment/ssl_renew.sh` to automate SSL certificate renewal via Certbot, ensuring encrypted traffic.
- **WAF Coverage:** Use a developer-friendly firewall (like Cloudflare) to auto-detect and block robotic flood patterns before they reach the VPS.

## 2. Preventing SQL injection attacks
Since the search function interacts with the SQLite database, sanitization is required at both the entry and query points.

- **Parameterized Queries:** NEVER use string concatenation (f-strings). Always use the standard placeholder syntax (`?` in SQLite/sql.js) which escapes all user input automatically.
- **Frontend Validation:** Use `js/2.0_records/frontend/sanitize_query.js` to strip out special SQL control characters (like `;`, `--`, or `/*`) before passing them to the WASM database engine.
- **Read-Only WASM:** The frontend `sql.js` instance is naturally limited to the local browser memory, preventing direct injection attacks from affecting the primary server-side database file.

## 3. Admin-only access to the Dashboard
The Admin Portal requires a robust authentication flow to prevent unauthorized content modification.

- **Environment Credentials:** The `ADMIN_PASSWORD` and `SECRET_KEY` are stored in a hidden `.env` file (ignored by `.gitignore`) and managed by the Python `admin_api.py`.
  > **⚠️ Warning — Default fallback values:** Both `ADMIN_PASSWORD` and `SECRET_KEY` have hardcoded fallback defaults (`"admin"` and `"default-secret-key"` respectively) if the `.env` file is missing or malformed. In production, verify that `.env` exists with strong unique values. Consider adding a startup-time check that refuses to launch if either value matches its default.
  > **Password storage note:** The password is compared as plaintext (`password == ADMIN_PASSWORD`) rather than a hashed digest (e.g., bcrypt). This is an accepted trade-off for a single-admin system with credentials loaded from environment variables, where the `.env` file itself serves as the primary secret boundary. The 1-second artificial delay on failed attempts (see brute-force defense) mitigates timing attacks.
- **JWT & Auth Utilities:** Successful logins generate a JSON Web Token (JWT) managed by `admin/backend/auth_utils.py` and stored in a HttpOnly cookie.  
  > **Cookie security:** The cookie secure flag is controlled by the `COOKIE_SECURE` environment variable. Set `COOKIE_SECURE=true` in the production `.env` file to enforce HTTPS-only transmission and prevent session interception over plain HTTP. Defaults to `false` so local dev on `http://localhost` works without friction.
- **Session Middleware:** On `admin.html` (login page), `admin_login.js` sends credentials and redirects on success. On `dashboard.html` (dashboard), `dashboard_auth.js` calls `verifyAdminSession()` from `load_middleware.js` as a page guard — if the session cookie is invalid or expired, the browser is redirected back to `admin.html`. Individual module loads do not re-check the session (verified once at page load). The "Return to Frontend" button (`return_to_site.js`) also calls `/api/admin/verify` but preserves the session cookie — unlike logout, this is a session-preserving navigation that lets the user return to the dashboard without re-authenticating. Only the "Logout" button (`logout_middleware.js`) calls `POST /api/admin/logout` to destroy the cookie and terminate the session.

## 3a. Expanded Admin API Endpoints (plan_backend_infrastructure)

The following API endpoints were added as part of the backend infrastructure
plan. All are protected by the admin JWT session verification middleware
(`verify_token` dependency).

**System Config & Health:**
- `GET /api/admin/system/config` — Read all system_config key/value pairs
- `PUT /api/admin/system/config` — Upsert system_config key/value pairs
- `GET /api/admin/health_check` — System health (DB, DeepSeek API, VPS resources)
- `GET /api/admin/mcp/health` — MCP server status proxy

**Content Generation (DeepSeek-powered):**
- `POST /api/admin/snippet/generate` — Trigger AI snippet generation
- `POST /api/admin/metadata/generate` — Trigger AI metadata/keyword extraction

**Essay & Historiography:**
- `GET /api/admin/essays` — List all essay records
- `GET /api/admin/historiography` — Get the single historiography record

**Blog & News:**
- `GET /api/admin/blogposts` — List all blog post records
- `DELETE /api/admin/records/{id}/blogpost` — Remove blog content (preserves record)
- `GET /api/admin/news/items` — List all news item records
- `POST /api/admin/news/crawl` — Trigger news crawler pipeline

**Challenge Responses:**
- `POST /api/admin/responses` — Create draft challenge response (201 Created)
- `GET /api/admin/responses` — List all challenge responses
- `GET /api/admin/responses/{id}` — Get single response by ID

**Agent Management:**
- `POST /api/admin/agent/run` — Trigger DeepSeek agent pipeline (202 Accepted, async)
- `GET /api/admin/agent/logs` — Paginated agent run history with pipeline filter

All endpoints require a valid JWT session cookie. Rate limiting (60 req/min, configurable) applies globally via `RateLimiterMiddleware`. SQL injection is prevented through exclusive use of parameterized queries (`?` placeholders).

- **Brute Force Defense:** The backend implements login delays and temporary IP lockouts after 5 consecutive failed attempts, handled within `auth_utils.py`.
- **Scaling Note:** Both the rate limiter and brute-force tracker use in-memory dictionaries. Under a single-process VPS deployment this is sufficient, but if the app is ever scaled to multiple workers/processes, these should be backed by Redis to maintain shared state.

## 4. Obfuscating the Dashboard Code and Documentation
Administrative logic is protected by minification and structural obscurity.

> **Caveat:** Obfuscation is **not a security boundary** — it is a minor deterrent against casual browser inspection. The real protection for admin functionality comes from the JWT authentication layer (Section 3). Do not rely on minification or code splitting as a substitute for proper access controls.

- **Minification Pipeline:** All code inside `/admin/frontend/` is processed by `tools/minify_admin.py` before deployment. The tool writes minified `.min.js` / `.min.css` files alongside the originals (preserving dev sources) with comments stripped and whitespace compressed.
- **Code Splitting:** Crucial admin logic is split into multiple modules as defined in the `module_sitemap.md`, preventing reverse-engineering from a single file.
- **Directory Exclusion:** Nginx config explicitly forbids directory listing in the `/admin/` folder structure.
- **Agent Restriction:** `mcp_server.py` (project root) exposes only a read-only API via SELECT queries with parameterized placeholders, ensuring external automated agents cannot access admin editing tools.

## 5. Bulk CSV Upload Security

The bulk CSV upload workflow implements a **two-phase review gate** to prevent accidental or malicious data ingestion:

- **Phase 1 — Client-Side Validation:** CSV files are parsed and validated entirely in the browser (`bulk_csv_upload_handler.js`). Required fields are checked, enum values are validated against the canonical set, and verse patterns are verified against a regex. No data touches the server in this phase — all parsed records live in an ephemeral in-memory store (`_ephemeralRows[]`).
- **Phase 2 — Admin-Gated Commit:** Records are only written to the database when the admin explicitly reviews the parsed data and clicks "Save as Draft". Valid rows are pre-checked; invalid rows are visually flagged (red-tinted) and cannot be selected. The commit endpoint (`POST /api/admin/bulk-upload/commit`) forces `status = 'draft'` on all inserted records regardless of any `status` field in the payload, preventing bulk-publishing of unreviewed content.
- **Ephemeral Store Pattern:** If the admin navigates away or switches toggles without saving, all ephemeral records are discarded — no API call is made and the records simply vanish. This ensures that abandoned uploads never reach the database.
- **Server-Side Re-validation:** The commit endpoint re-validates all fields server-side (required fields, enum values) before insertion, as a defense-in-depth measure against tampered client-side requests.
- **Re-upload Warning:** If a second CSV is uploaded while a previous review is still pending, the admin is prompted with a confirmation dialog before the old ephemeral store is replaced.

## 6. Arbor Diagram — Relational Integrity Checks

The **Arbor Diagram** is the admin dashboard's interactive tree-view editor that visualises the hierarchical parent-child relationships between records (e.g., a "Miracle" record nested under a "Life of Jesus" parent). It allows administrators to reorganise the site's content tree via drag-and-drop.

Because re-parenting could introduce circular parent-child loops (e.g., A → B
and B → A simultaneously), the editor prevents data corruption through
relational integrity enforced at two independent layers:

- **Client-Side Validation (handle_node_drag.js + update_node_parent.js):**
  Before allowing a drop, `_wouldCreateCircularReference()` walks up the
  ancestor chain from the proposed parent to verify the dragged node is not
  already an ancestor. If a cycle is detected, the drop is rejected with
  a visual `is-drop-invalid` state, and `surfaceError()` displays:
  "Error: Cannot re-parent '{title}' — this would create a circular loop
  in the tree."

- **Server-Side Validation (admin_api.py → update_diagram_tree):**
  As a defense-in-depth measure, the backend also detects direct 2-node
  cycles (`A ↔ B`) before committing the transaction. If found, it returns
  HTTP 422 with a descriptive error. The frontend catches this response
  in `update_node_parent.js` and rolls back both the in-memory state
  and the visual tree to the pre-drag configuration.

- **Transaction Atomicity:** All parent_id updates within a batch are wrapped
  in a single `BEGIN TRANSACTION … COMMIT / ROLLBACK` block. If any update
  fails (e.g., missing record, circular reference), the entire batch is
  rolled back, preventing partial corruption.

## 7. Wikipedia & Challenge Ranking — Field Validation

The Ranked Lists dashboard modules (Wikipedia, Challenge) accept admin-edited
weighting values, search terms, and metadata fields that are written directly
to the `records` table via `PUT /api/admin/records/{id}`. The following
validation rules apply:

- **Weight Multipliers (`wikipedia_weight`, `*_challenge_weight`):**
  The frontend constrains weight inputs to `min="0" max="100" step="0.01"`,
  preventing negative or excessively large values. The server-side
  `update_record` endpoint writes these as JSON blobs via parameterized
  queries — the database itself does not evaluate the arithmetic, so
  injection is not possible.

- **Search Terms (`wikipedia_search_term`):**
  Terms are stored as JSON arrays in the database. The frontend sidebar
  handler (`wikipedia_sidebar_handler.js`) serialises them via
  `JSON.stringify()` before sending to the API, preventing hand-crafted
  injection. The pipeline (`pipeline_wikipedia.py`) reads these terms and
  passes them as URL parameters to the Wikipedia REST API — they are
  percent-encoded by the `requests` library automatically.

- **Metadata Fields (snippet, slug, meta):**
  Snippet and meta fields accept free-text and JSON respectively. The
  `update_record` endpoint uses parameterized SQLite queries, preventing
  SQL injection regardless of field content. The auto-gen buttons call
  separate `POST /api/admin/snippet/generate` and
  `POST /api/admin/metadata/generate` endpoints that validate input before
  invoking DeepSeek-powered generation scripts.

- **Rank Updates (`wikipedia_rank`, `*_challenge_rank`):**
  The ranking calculator (`wikipedia_ranking_calculator.js`) computes new
  rank positions as integers before sending them via PUT. The frontend
  constrains ranking to the actual set of records being ranked — no rank
  can exceed the list length or be negative.

- **Draft-Gating:** All Wikipedia and Challenge edits explicitly set
  `status: "draft"` in the PUT payload. The only path to `status: "published"`
  is through the explicit "Publish" action, which requires the admin to
  have reviewed the full ranked order first. This prevents partially
  edited or un-reviewed ranking data from reaching the public site.

## 8. Dependency Monitoring and Vulnerability Scanning
To ensure long-term stability, dependencies are audited both manually and automatically.

- **Automated Security Audits:** Use `tests/security_audit.py` to run weekly safety scans (`npm audit`, `pip-audit`).
- **Dependabot Integration:** Enable GitHub's Dependabot to automatically alert and provide PRs for library security patches.
- **Minimal Surface Area:** Follow the "Vibe Coding" rule of minimal external dependencies (Vanilla JS/CSS) to reduce potential attack vectors.
