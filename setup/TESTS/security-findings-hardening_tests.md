## Validation: Security Findings Hardening
**Plan:** security-findings-hardening.md
**Date:** 2026-10-22

### Manual checks
- [ ] Terminal: `curl -s -o /dev/null -w "%{http_code}" -H "Cookie: sid=%" https://thejesuswebsite.org/api/auth/me` prints `401` (it printed `500` before the fix).
- [ ] Terminal: `curl -s -o /dev/null -w "%{http_code}" https://thejesuswebsite.org/mcp` does not print `502` or `504`.
- [ ] VPS: the file `/var/log/nginx/thejesuswebsite-mcp.access.log` exists and shows the curl request above.
- [ ] VPS: `ss -ltn | grep 3100` shows `127.0.0.1:3100` and not `0.0.0.0:3100`.
- [ ] Admin: sign in with the passkey once and open any admin list page. It loads as before (the CSP policy did not change).
- [ ] Add a test `<script>alert(1)</script>` to a copy of a frontend page and run `cd api && node --test tests/guide-security.test.js`. The test fails and names the file, the line and `setup/ARCHITECTURE/security.md`. Remove the copy.

- [ ] Terminal: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -X POST https://www.thejesuswebsite.org/mcp` prints `308 https://thejesuswebsite.org/mcp`.
- [ ] Terminal: a POST to `https://www.thejesuswebsite.org/mcp` with `curl -L` ends in `200`, not `400`.
- [ ] Terminal: `grep -rn "www.thejesuswebsite.org" README.md mcp-server frontend/llms.txt frontend/.well-known/llms.txt --exclude-dir=node_modules` prints nothing.

### Code-review checks
- [ ] JS-2 — `readToken` in `api/middleware/auth.js` returns `null` for a malformed cookie and does not throw. The comment gives the reason for no `console.warn`.
- [ ] TEST-7 — `api/tests/auth.test.js` holds a blocked-path test (`sid=%` gives 401) and a pass-through test (valid session).
- [ ] CORE-4 — D-066 is one table row in `setup/Decisions_log.md`. No code comment holds the decision.
- [ ] CORE-2 — `api/middleware/security-headers.js` and `deploy/nginx-http.conf` have no "deliberate" or history wording, and each names the other file and the guide.
- [ ] SR-3 — `location /mcp` in `deploy/nginx.conf` keeps `limit_req`, `limit_conn` and `limit_req_status`, and adds `client_max_body_size` and `access_log`.
- [ ] JS-2, JS-5 — `mcp-server/server.js` binds `127.0.0.1` through one `HOST` constant.
- [ ] CORE-6 — the purpose statements of `security.md`, `INDEX.md` and `Decisions_log.md` have 40 words or fewer.
- [ ] DOC-2 — headings in `security.md` and `INDEX.md` are numbered, and no citation of an old `INDEX.md` heading is left.
- [ ] Touch rule + CORE-5 — `api/middleware/auth.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/tests/auth.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/middleware/security-headers.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `deploy/nginx-http.conf`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `deploy/nginx.conf`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `mcp-server/server.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `mcp-server/tests/tools.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/Decisions_log.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/INDEX.md`: comments give the why and the links, the guide matches the file
- [ ] TEST-10 — `api/tests/guide-security.test.js`: fails with the rule, file, line and guide path; `INLINE_SCRIPT_PAGES` has a reason, fails on a missing file, and fails when a listed page has no inline script left
- [ ] CORE-6, DOC-1 to DOC-3 — `README.md` and `mcp-server/README.md` open with a purpose statement of 40 words or fewer and have numbered headings
- [ ] Touch rule + CORE-5 — `mcp-server/README.md`, `mcp-server/.env.example`, `README.md`, `frontend/llms.txt`, `frontend/.well-known/llms.txt`: URLs use the bare domain and match the code
