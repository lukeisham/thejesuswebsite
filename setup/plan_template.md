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

<!-- Always include the push task. Then include ONE of the two verification tasks below:
     - Smoke test — sufficient for non-UI/UX changes (backend, schema, API, tooling).
     - Test live   — mandatory for UI/UX changes (user-facing pages, admin UI, browser behaviour).
     Delete the task that does NOT apply and the playbook section below it if unused. -->

- [ ] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "<feature name>"`, `git push`.

- [ ] **Smoke test** — run the automated test suite plus a targeted check: e.g. curl the affected API route on the deployed server and assert the response shape, run a migration against a copy, or execute the script and inspect its output.
- [ ] **Test live** — if the implementing agent is **Claude**, follow the **Live testing playbook** below to open the deployed site in Chrome and confirm the change works in production. URL: `https://thejesuswebsite.org/<page>`. If the implementing agent is **not Claude** (e.g. DeepSeek in Zed), **tell the user to open Claude in Chrome** (the Claude Code Browser extension) and perform the live test there — leave the checkbox unchecked but annotate it with a note: "Deferred to Claude in Chrome: <reason>." Do not move the plan to `PLANS/Completed/` until this box is ticked.

### Live testing playbook

<!-- Keep this section verbatim in every plan that has a Test live task; delete it otherwise.
     It exists because live checks have repeatedly been derailed by wrong domains, half-initialized
     browser panes, and blank screenshots (see setup/Issues.md #78). -->

1. **Use the canonical origin from the header's `Live site:` field** (`https://thejesuswebsite.org`). Never test against `thejesuswebsite.com` or any URL taken from a bug report without checking it against the header first.
2. **Curl before browser.** Confirm the origin responds before opening any browser tool: `curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/<page>` must return `200` (or an expected redirect). If it doesn't, stop and diagnose DNS/deploy — do NOT launch the browser at a dead URL; a hung connection can time out for minutes and leave the browser pane in a bad state.
3. **Curl-first triage.** Check what curl alone can prove before reaching for the browser: response headers (`cf-cache-status`, `last-modified`, `cache-control`), JSON endpoints (`/api/...`, `/assets/data/*.json`), and asset freshness (fetch the deployed JS/CSS file and `diff` it against the local copy). The browser is only needed to confirm client-side rendering and console/network errors.
4. **Browser sequence (Claude Code Browser pane):** call `preview_start` with `{url: "https://thejesuswebsite.org/<page>"}` exactly once, note the `tabId` it returns, and pass that `tabId` explicitly to every subsequent `navigate` / `read_page` / `javascript_tool` / `read_console_messages` call. Never call `navigate` before a successful `preview_start`. If `preview_start` times out, fix the URL/connectivity first, then call `preview_start` again fresh — don't try to salvage the half-initialized pane with `navigate`. **This tool family (`mcp__Claude_Browser__*`, the sandboxed Browser pane) is for public, unauthenticated pages only** — see step 7 for why admin/passkey checks must use a different tool family entirely, not just a different tab.
5. **Verify via DOM, not screenshots.** Prove the change with `read_page` (accessibility tree) or a `javascript_tool` query (e.g. `document.querySelector('.some-class')?.textContent`, `getBoundingClientRect()`, computed styles) plus `read_console_messages` for errors. Screenshots are optional supporting evidence only — they can render blank right after a JS-driven scroll and must never be the sole proof that something works.
6. **Cloudflare staleness:** a check run within ~60s of the deploy can hit a stale edge cache (HTML `max-age=60`; the deploy workflow purges, but propagation isn't instant). If a live check looks stale right after a push, wait ~30–60s and re-check `cf-cache-status` before concluding the deploy failed.
7. **Admin pages require passkey auth the agent cannot perform.** The admin uses WebAuthn passkey sign-in, which needs the user's device authenticator — no agent can automate it (see `setup/Issues.md` #33/#76 for history). Three facts drive the procedure below:
   - **MUST use `claude-in-chrome` (`mcp__claude-in-chrome__*`), never the Browser pane (`preview_start`/`mcp__Claude_Browser__*`), for this step.** This is not optional and not interchangeable with step 4's tool. WebAuthn platform authenticators (Touch ID) are bound to the specific browser application they were registered in. If the user's passkey lives in their real Chrome, only the actual Chrome app can present the Touch ID prompt — the Browser pane is a separate, sandboxed browser context with no access to that credential, and a sign-in attempt there will silently have no usable authenticator to offer (see `setup/Issues.md` #99, where an implementing agent used `preview_start` here and had to redo the step). Before running this step, confirm which browser holds the passkey if you don't already know.
   - **The agent cannot reuse a tab the user already has open.** The `claude-in-chrome` tools operate on their *own* session tab-group; tabs the user opened outside that group are invisible to the agent, and `sameSite:strict` on the session cookie means agent-initiated navigations don't inherit the session anyway. There is no reliable "share my existing tab" path — do not ask the user to open a tab and log in *first*, it won't be usable.
   - **This is extension isolation, not a site bug.** `www.thejesuswebsite.org` 301-redirects cleanly to the apex and the session cookie (set in `api/routes/passkey.js`, host-only, no `Domain`) is correct — verified 2026-07-20. Do **not** re-diagnose this as a split-origin/cookie-domain problem or log an `Issues.md` row for it.

   **The one reliable flow — agent opens the tab, user logs in once, agent drives it:**
   1. **Pause and tell the user you're about to open an admin tab in their real Chrome (via `claude-in-chrome`) for them to authenticate.** Do not proceed silently.
   2. Call `tabs_context_mcp {createIfEmpty: true}` then `navigate` (both `mcp__claude-in-chrome__*`) to the admin page — it will redirect to `/admin/auth/login.html`. (The pre-redirect flash of admin UI in a first screenshot is NOT proof of a session.)
   3. **Ask the user to click "Sign in with Passkey" in that tab and complete Touch ID, then tell you when they're in.** Wait for their reply.
   4. Re-navigate to the target admin page and drive the test in that now-authenticated tab (verify via `mcp__claude-in-chrome__javascript_tool`/`read_page` DOM queries + `read_console_messages` — same verification style as steps 4–5, different tool family).
   5. **Clean up:** if the test wrote anything to a textarea/form, clear it and do not click Save — leave no test records in production. Avoid Ignore/Learn-style actions that mutate persistent state (e.g. the spellcheck dictionary).

   **If the user is unavailable or declines**, still do the non-interactive checks (curl the deployed assets and `diff` against local copies; run the automated tests) — but mark the Test live task as **deferred, not done**: leave its checkbox unchecked, annotate it with what *was* verified (code deployed, tests pass) and what remains (the interactive click-through), and per the plan lifecycle rules the plan stays in `PLANS/New/` until the deferred check is performed and ticked. Do **not** log an `Issues.md` row for the deferral — the passkey constraint is a known environment fact, not a new defect.

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

