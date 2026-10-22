# Plan: <Feature Name>

<Purpose statement: what this plan delivers and why, in 40 words or fewer (CORE-6). This is the plan's goal.>

**Module(s):** <Frontend / Admin / API / Database / MCP Server / Shared>
**Date:** <YYYY-MM-DD>
**Status:** Drafting
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain. Use this exact origin in every live-testing task URL. -->

## 1. Coding rules to keep in mind
- **<Rule ID>** — <why it's especially relevant here>
- **<Rule ID>** — <why it's especially relevant here>

## 2. Tasks

<!-- Add or remove groups as needed. Order by dependency. Number the groups 2.1, 2.2, … in order. -->

### 2.1 <Group — e.g. Database>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### 2.2 <Group — e.g. API>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### 2.3 <Group — e.g. Frontend>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **Register `<new page>` with the sitemap generator** — a new HTML page only. `deploy.sh` rebuilds `frontend/sitemap.xml` from this script, so never edit the XML. File: `api/scripts/generate-sitemap.js`

### 2.4 Core Rules pass

<!-- One task per file marked "modified" in the Per-file rule check table. Delete the group if the plan modifies no existing file. -->

- [ ] **Bring `<modified file>` into line with the Core Rules** — apply the Touch rule and CORE-5 steps 1–4 to the whole file. Run `node setup/scripts/check-architecture-docs.js --touched` and compare each guide it lists with the file. Name the file in the final reply if you added a connection comment, a guide row, or a fix from CORE-5 step 4. File: `path/to/file.ext`

### 2.5 Guides and guide tests

<!-- One task per guide the plan edits (including its CORE-6 purpose statement) and one per guide test file the plan adds or updates (TEST-10). Delete the group if the Guide tests section says "None". -->

- [ ] **Update `<guide>`** — add or edit the row, bring the purpose statement to 40 words or fewer (CORE-6), and name the guide test next to the rows that it covers. File: `setup/ARCHITECTURE/<guide>.md`
- [ ] **Add guide test for `<guide>`** — read the source files as text and fail when code breaks the row. Failure messages name the rule, the file and line, and the guide path. Each exception sits in a named list with a one-line reason. File: `api/tests/guide-<guide-name>.test.js`

### 2.6 Close out

<!-- Only when this plan's goal is to fix rows already in the issue log. Delete the group otherwise. -->

- [ ] **Resolve issue row `<#>`** — once the fix is verified, change only that row's `Status` cell to `resolved`, by script, in the file that holds it. File: `setup/ISSUES/issues.md` or its archive

### 2.7 Deploy & verify

<!-- Verification is a three-tier ladder. Tiers are CUMULATIVE, not alternatives:
     pick the highest tier this plan reaches, and include every tier at or below it.
     Delete the tasks and playbook blocks for tiers this plan doesn't use. -->

| Tier | Task | Tool | Include when |
|---|---|---|---|
| **1** | Smoke test | Bash — test suite, `curl`, run the script | **Always. Every plan, no exceptions.** |
| **2** | Browser check | `mcp__Claude_Browser__*` on the local dev server | Browser-visible **and** provable without real data or a login |
| **3** | Chrome check | `mcp__claude-in-chrome__*` + the user's passkey sign-in | Needs **real production data**, **or** touches `/admin/` UI/UX, **or** anything behind auth |

**Routing — two questions:**
1. Is any of this observable in a browser? **No** → Tier 1 only.
2. Does seeing it work *correctly* require production data or a logged-in session? **Yes** → Tier 3. **No** → Tier 2.

Tier 3 supersedes Tier 2 *for the same page*, but a plan touching both public and admin surfaces carries both, each scoped to its own pages. Tier 1 is never dropped just because a higher tier applies.

- [ ] **Tier 1 — Smoke test** — run the automated test suite for each area changed (`cd api && npm test` also runs the guide tests) plus a targeted check that exercises the changed behaviour: curl the affected API route and assert the response shape, run a migration against a copy, or execute the script and inspect its output.
- [ ] **Tier 2 — Browser check (local)** — verify in the Claude Browser pane against the local dev server, **before** the push task below. Follow the **Tier 2 playbook**. Pages: `/<page>`.
- [ ] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "<feature name>"`, `git push`.
- [ ] **Tier 3 — Chrome check (live, needs your sign-in)** — verify on the deployed site in the user's real Chrome. Follow the **Tier 3 playbook**. Pages: `https://thejesuswebsite.org/<page>`. <!-- If this touches /admin/, say so here: the page needs passkey auth and the user must sign in mid-test. -->

<!-- Non-Claude agents (e.g. DeepSeek in Zed) cannot run Tiers 2–3: leave the box unchecked,
     annotate "Deferred to Claude in Chrome: <reason>", and do not move the plan to Completed/. -->

### 2.8 Tier 2 playbook — local browser check

<!-- Keep verbatim in plans with a Tier 2 task; delete otherwise. -->

1. **Run against the local dev server, not production.** `preview_start {name: "frontend"}` (port 4179; `admin` and `api` configs also exist in `.claude/launch.json`). Note the returned `tabId` and pass it explicitly to every subsequent `navigate` / `read_page` / `javascript_tool` / `read_console_messages` call. Never call `navigate` before a successful `preview_start`.
2. **The local database is empty** (see `CLAUDE.local.md`) — local pages render without real content. If your check depends on real records, it is a Tier 3 check, not Tier 2.
3. **Verify via DOM, not screenshots.** Prove the change with `read_page` or a `javascript_tool` query (`document.querySelector(...)?.textContent`, `getBoundingClientRect()`, computed styles) plus `read_console_messages`. Screenshots are optional supporting evidence — they can render blank after a JS-driven scroll and must never be the sole proof.
4. **Never use this tool family on `/admin/` or any logged-in page** — it cannot authenticate. That is Tier 3.
5. If `preview_start` times out, fix the server/URL and call `preview_start` again fresh — don't salvage a half-initialized pane with `navigate`.
6. **Front the tab before asserting on rendered DOM.** Diagram/canvas pages (timeline, arbor, maps) build their DOM inside `batchWrite()` (`frontend/assets/js/utils/dom.js`), which schedules the write via `requestAnimationFrame` — browsers throttle rAF to near-zero in a backgrounded or hidden tab, so the page can sit in its pre-render state indefinitely even though nothing is wrong. Confirm the tab is actually visible (`tabs_select`, or check `document.visibilityState !== "hidden"` via `javascript_tool`) before treating "nothing rendered yet" as a bug.

### 2.9 Tier 3 playbook — live check in real Chrome

<!-- Keep verbatim in plans with a Tier 3 task; delete otherwise. -->

1. **Use the origin from the header's `Live site:` field** (`https://thejesuswebsite.org`) — never `.com`, never a URL copied unverified from a bug report.
2. **Curl before browser.** `curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/<page>` must return `200` or an expected redirect. A dead URL hangs the browser for minutes — diagnose DNS/deploy first.
3. **Curl-first triage.** Prove what curl can prove before opening a browser: response headers (`cf-cache-status`, `last-modified`, `cache-control`), JSON endpoints (`/api/...`, `/assets/data/*.json`), and asset freshness (fetch the deployed JS/CSS and `diff` against local). The browser is only needed for client-side rendering and console/network errors.
4. **Cloudflare staleness:** a check within ~60s of deploy can hit a stale edge cache. Wait ~30–60s and re-check `cf-cache-status` before concluding the deploy failed.
5. **Use `mcp__claude-in-chrome__*` — the user's real Chrome. Not the Browser pane.** WebAuthn platform authenticators are bound to the browser app they were registered in, so only real Chrome can present Touch ID; the sandboxed pane has no access to that credential and no way to sign in. The agent also cannot reuse a tab the user already has open — `claude-in-chrome` sees only its own tab-group, and `sameSite:strict` blocks inherited sessions. (This is extension isolation, **not** a cookie-domain bug — do not re-diagnose or log it.)
6. **The flow — agent opens the tab, user signs in once, agent drives it:**
   1. **Pause and tell the user** you're opening a tab in their real Chrome for them to authenticate. Never proceed silently.
   2. `tabs_context_mcp {createIfEmpty: true}`, then `navigate` to the target page (admin pages redirect to `/admin/auth/login.html`; a pre-redirect flash of admin UI is **not** proof of a session).
   3. **Ask the user to sign in with their passkey in that tab and reply when they're in.** Wait.
   4. Re-navigate to the target page and verify via `javascript_tool` / `read_page` DOM queries + `read_console_messages`.
   5. **Clean up:** clear anything typed into a form, never click Save, and avoid actions that mutate persistent state (e.g. publishing a draft or deleting a record). Leave no test records in production.
7. **If the user is unavailable or declines:** run the non-interactive checks anyway (curl, asset diffs, test suite), then leave the Tier 3 box **unchecked and annotated** with what was and wasn't verified. The plan stays in `PLANS/New/`. Do **not** log a row in `setup/ISSUES/issues.md` — the passkey constraint is a known environment fact, not a defect.

## 3. Files touched
- `path/to/file.ext` — created / modified
- `path/to/file.ext` — created / modified

## 4. Per-file rule check

<!-- One row per file in "Files touched", and no other files. A modified file needs the Touch rule and CORE-5, with a task in the Core Rules pass group. A modified guide, style guide or README also needs its CORE-6 purpose statement. A created file meets the Core Rules from the first commit. Never add a file only to clean it. -->

| File | Created / modified | Rules that apply | Core Rules pass |
|---|---|---|---|
| `path/to/file.ext` | modified | `<Rule ID>`, `<Rule ID>` | Touch rule + CORE-5 steps 1–4 |
| `path/to/new-file.ext` | created | `<Rule ID>` | Meets Core Rules from the first commit |

## 5. Guide tests

<!-- Answer all three questions (TEST-10). Write "None" and the reason if the plan adds or edits no guide row. -->

1. **Guide rows added or edited:** `<guide>` row `<n>`, or "None".
2. **Rows a text search can check** (a banned pattern, or a value that two files must share): each has a task to add or update `api/tests/guide-<guide-name>.test.js`.
3. **Rows that stay prose** (meaning or behaviour): list them, or "None".

## 6. Error notification

<!-- Answer both questions. The error architecture is in setup/ARCHITECTURE/error-notification.md. -->

**a) Does this plan impact existing error handling?**

Yes / No. If yes, list which `E-*` error codes are affected and whether new codes are needed.

**b) Should this plan add, update, or remove any error notification behaviour?**

Yes / No. If yes, describe what changes — new `sendError`/`sendValidationError` calls, new `showToast(message, "error", { details })` usage, etc.

## 7. Notes
Anything that isn't obvious — edge cases, constraints, ordering dependencies.

---

## 8. Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

1. **Edit markdown by script, never by hand.** Use a short Python script that parses the file, changes only the intended text, and rewrites it. Imprecise hand edits have spliced stray and duplicated tags into files in this codebase.
2. **Mark progress.** As each task is implemented and verified, change `- [ ]` to `- [x]`.
3. **Log new issues.** Add rows to `setup/ISSUES/issues.md` only for problems discovered while generating or implementing this plan. Never log the problem this plan exists to fix. That is its goal.
4. **Resolve existing issues.** If this plan fixes rows already in the log, find each row in `setup/ISSUES/issues.md` or in the archive `setup/ISSUES/Issues_<first>_to_<last>.md` whose range covers its number. An archived row can still be open. Change only that row's `Status` cell to `resolved` once the fix is verified (task 2.6).
5. **Audit what shipped.** Before completion, confirm that every file in Files touched exists with its planned content, not a stub or a placeholder. A missing or smaller-than-planned file keeps the plan in `PLANS/New/`, with a note that names the gap.
6. **Complete the plan.** When every box is ticked and the audit passes, change **Status** to `✅ Completed` and move this file to `setup/PLANS/Completed/`. Until then it stays in `setup/PLANS/New/`.
7. **Push everything last.** The code, any `setup/ISSUES/issues.md` update, and this plan file's edits and move go in the same push as the Deploy & verify group. Nothing is done until it is pushed.
