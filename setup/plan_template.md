# Plan: <Feature Name>

**Module(s):** <Frontend / Admin / API / Database / MCP Server / Shared>
**Date:** <YYYY-MM-DD>
**Status:** Drafting
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). Use this exact origin in every live-testing task URL. -->

## Goal
One or two sentences describing what this plan delivers and why.

## Coding rules to keep in mind
- **<Rule ID>** — <why it's especially relevant here>
- **<Rule ID>** — <why it's especially relevant here>

## Tasks

<!-- Add or remove groups as needed. Order by dependency. -->

### <Group — e.g. Database>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### <Group — e.g. API>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### <Group — e.g. Frontend>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### Deploy & verify

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

- [ ] **Tier 1 — Smoke test** — run the automated test suite plus a targeted check that exercises the changed behaviour: curl the affected API route and assert the response shape, run a migration against a copy, or execute the script and inspect its output.
- [ ] **Tier 2 — Browser check (local)** — verify in the Claude Browser pane against the local dev server, **before** the push task below. Follow the **Tier 2 playbook**. Pages: `/<page>`.
- [ ] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "<feature name>"`, `git push`.
- [ ] **Tier 3 — Chrome check (live, needs your sign-in)** — verify on the deployed site in the user's real Chrome. Follow the **Tier 3 playbook**. Pages: `https://thejesuswebsite.org/<page>`. <!-- If this touches /admin/, say so here: the page needs passkey auth and the user must sign in mid-test. -->

<!-- Non-Claude agents (e.g. DeepSeek in Zed) cannot run Tiers 2–3: leave the box unchecked,
     annotate "Deferred to Claude in Chrome: <reason>", and do not move the plan to Completed/. -->

### Tier 2 playbook — local browser check

<!-- Keep verbatim in plans with a Tier 2 task; delete otherwise. -->

1. **Run against the local dev server, not production.** `preview_start {name: "frontend"}` (port 4179; `admin` and `api` configs also exist in `.claude/launch.json`). Note the returned `tabId` and pass it explicitly to every subsequent `navigate` / `read_page` / `javascript_tool` / `read_console_messages` call. Never call `navigate` before a successful `preview_start`.
2. **The local database is empty** (see `CLAUDE.local.md`) — local pages render without real content. If your check depends on real records, it is a Tier 3 check, not Tier 2.
3. **Verify via DOM, not screenshots.** Prove the change with `read_page` or a `javascript_tool` query (`document.querySelector(...)?.textContent`, `getBoundingClientRect()`, computed styles) plus `read_console_messages`. Screenshots are optional supporting evidence — they can render blank after a JS-driven scroll and must never be the sole proof.
4. **Never use this tool family on `/admin/` or any logged-in page** — it cannot authenticate. That is Tier 3. (— `Issues.md` #99)
5. If `preview_start` times out, fix the server/URL and call `preview_start` again fresh — don't salvage a half-initialized pane with `navigate`.

### Tier 3 playbook — live check in real Chrome

<!-- Keep verbatim in plans with a Tier 3 task; delete otherwise. -->

1. **Use the origin from the header's `Live site:` field** (`https://thejesuswebsite.org`) — never `.com`, never a URL copied unverified from a bug report. (— `Issues.md` #78)
2. **Curl before browser.** `curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/<page>` must return `200` or an expected redirect. A dead URL hangs the browser for minutes — diagnose DNS/deploy first.
3. **Curl-first triage.** Prove what curl can prove before opening a browser: response headers (`cf-cache-status`, `last-modified`, `cache-control`), JSON endpoints (`/api/...`, `/assets/data/*.json`), and asset freshness (fetch the deployed JS/CSS and `diff` against local). The browser is only needed for client-side rendering and console/network errors.
4. **Cloudflare staleness:** a check within ~60s of deploy can hit a stale edge cache. Wait ~30–60s and re-check `cf-cache-status` before concluding the deploy failed.
5. **Use `mcp__claude-in-chrome__*` — the user's real Chrome. Not the Browser pane.** WebAuthn platform authenticators are bound to the browser app they were registered in, so only real Chrome can present Touch ID; the sandboxed pane has no access to that credential and no way to sign in. The agent also cannot reuse a tab the user already has open — `claude-in-chrome` sees only its own tab-group, and `sameSite:strict` blocks inherited sessions. (This is extension isolation, **not** a cookie-domain bug — verified 2026-07-20; do not re-diagnose or log it. — `Issues.md` #33/#76/#99)
6. **The flow — agent opens the tab, user signs in once, agent drives it:**
   1. **Pause and tell the user** you're opening a tab in their real Chrome for them to authenticate. Never proceed silently.
   2. `tabs_context_mcp {createIfEmpty: true}`, then `navigate` to the target page (admin pages redirect to `/admin/auth/login.html`; a pre-redirect flash of admin UI is **not** proof of a session).
   3. **Ask the user to sign in with their passkey in that tab and reply when they're in.** Wait.
   4. Re-navigate to the target page and verify via `javascript_tool` / `read_page` DOM queries + `read_console_messages`.
   5. **Clean up:** clear anything typed into a form, never click Save, and avoid actions that mutate persistent state (e.g. spellcheck Ignore/Learn). Leave no test records in production.
7. **If the user is unavailable or declines:** run the non-interactive checks anyway (curl, asset diffs, test suite), then leave the Tier 3 box **unchecked and annotated** with what was and wasn't verified. The plan stays in `PLANS/New/`. Do **not** log an `Issues.md` row — the passkey constraint is a known environment fact, not a defect.

## Files touched
- `path/to/file.ext` — created / modified
- `path/to/file.ext` — created / modified

## Error notification

<!-- Answer both questions. Reference setup/Website_guide.md § Error Notification for the encoding architecture. -->

**a) Does this plan impact existing error handling?**

Yes / No. If yes, list which `E-*` error codes are affected and whether new codes are needed.

**b) Should this plan add, update, or remove any error notification behaviour?**

Yes / No. If yes, describe what changes — new `sendError`/`sendValidationError` calls, new `showErrorToast`/`handleApiError` usage, changes to `error-fallback.js`, etc.

## Notes
Anything that isn't obvious — edge cases, constraints, ordering dependencies.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: If this plan's Goal is to fix row(s) already logged in `setup/Issues.md` by an earlier plan, include a task that updates only the `Status` cell for those specific row(s) from `open` to `resolved` (via script) once the fix is verified working — leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.

