# Security

Visitors and AI agents read public content, while only the signed-in admin changes it. This guide keeps the browser protections, the admin session and the public agent endpoint working as one set.

**Source of truth:** `deploy/nginx-http.conf` — wins any disagreement with this doc about the page policy.
**Spans:** `deploy/nginx-http.conf`, `deploy/nginx.conf`, `api/middleware/security-headers.js`, `api/middleware/auth.js`, `api/routes/auth.js`, `api/routes/uploads.js`, `mcp-server/server.js`, `scripts/pm2-apply.js`, `README.md`, `mcp-server/README.md`, `mcp-server/.env.example`, `frontend/llms.txt`, `frontend/.well-known/llms.txt`, `api/tests/auth.test.js`, `api/tests/guide-security.test.js` — change one, check the others.

## 1. Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The page policy in `deploy/nginx-http.conf` (`$page_csp`) and the policy string in `api/middleware/security-headers.js` are equal | nginx sends the policy for HTML pages and the API sends it for JSON. Two policies drift apart | One side is edited and the other keeps the old rules. No page breaks, so nobody notices |
| An executable inline script exists only in a page on `INLINE_SCRIPT_PAGES` in `api/tests/guide-security.test.js`. A page that no longer has one leaves the list | The policy allows `'unsafe-inline'` (D-066), so the browser does not block a new inline script | A new inline script runs with no block, and an injected script looks the same as one of ours |
| `style-src` keeps `'unsafe-inline'` for inline style attributes and `<style>` blocks (D-066) | Pages use both. A strict `style-src` would unstyle them | An agent removes `'unsafe-inline'` from `style-src` and pages lose their styles in production only. Local dev sends no page policy |
| Uploads accept images only, chosen by the first bytes of the file, never by name or type | `script-src 'self'` trusts every file under our own origin, and nginx serves `/uploads/` from it | An upload route that accepts a `.js` file lets an attacker place a script that the policy allows |
| Sessions live in process memory. A restart, including every deploy, logs the admin out (D-015) | One admin does not need a session store | An agent adds a session store, or reads a logout after a deploy as a fault |
| `readToken` returns `null` for a malformed cookie, so `requireAuth`, `GET /auth/me` and `POST /auth/logout` answer 401 | `decodeURIComponent` throws on a stray `%`, and the cookie header is attacker input | A bad cookie gives a 500, or a wrong `SQL_QUERY_FAILURE` code, instead of a 401 |
| The MCP process listens on `127.0.0.1` only. `location /mcp` in `deploy/nginx.conf` proxies to it and keeps `limit_req`, `limit_conn`, `client_max_body_size` and `access_log` | The rate limits, the body cap and the log exist only in nginx. The Node process has none of them | A listener on every interface lets a client reach the process directly and skip all four |
| Files that name the MCP or API address for agents use the bare domain. The `www` redirects in `deploy/nginx.conf` use `308` | A `301` lets a client repeat a POST as a GET, and the MCP endpoint takes only POST for tool calls | An agent that follows a `www` link gets a `400`. A GET to the site still works, so nothing else shows it |

Rows 1, 2, 7 and 8 are enforced by `api/tests/guide-security.test.js` (TEST-10). Row 6 is enforced by behaviour tests in `api/tests/auth.test.js`. The other rows are not.

## 2. Shape

The page policy reaches the browser from nginx. `dev-proxy.js` sends no page policy, so a local check cannot show a policy fault. Cloudflare caches each HTML page for 60 seconds (D-013), so a nonce would repeat for every visitor and cannot work.

Requests to the public agent endpoint are logged in `/var/log/nginx/thejesuswebsite-mcp.access.log` on the VPS. To look for abuse, read the busiest client addresses and the status codes in that file.

The pm2 health check in `scripts/pm2-apply.js` calls the MCP process on `127.0.0.1:3100`. The nginx proxy uses the same address.

## 3. Extending it

1. **A new script on a page:** put it in a `.js` file and load it with `<script src>`. An inline script needs Luke's sign-off, because it adds a page to `INLINE_SCRIPT_PAGES`.
2. **A change to the page policy:** edit `deploy/nginx-http.conf` and `api/middleware/security-headers.js` together, then run `cd api && npm test`.
3. **A new public route that nginx proxies:** add `limit_req` and `limit_conn` to its `location` block. Copy `location /mcp`.

## 4. Not documented here

The current policy string, the rate numbers and the session length. They are in `deploy/nginx-http.conf`, `deploy/nginx.conf` and `api/middleware/auth.js`.
