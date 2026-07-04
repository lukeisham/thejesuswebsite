# Plan: Shared Constants & Root Project Files

**Module(s):** Shared / Root
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Create the remaining cross-cutting and repository-root files described in Website_guide.md: the shared constants module used across modules, the deploy helper, the license, the git ignore rules, and the uploads directory for user-uploaded media. These are the small, infrastructural pieces that close out the file tree.

## Coding rules to keep in mind
- **JS-1 / JS-3** — `constants.js` uses clear, intention-revealing names and exports plain, frozen value objects — no logic, no abstraction.
- **JS-4** — A short header comment explains the file's role; entries are self-documenting.
- **SR-2 / SR-3** — No dependencies introduced; nothing here affects site load.

## Tasks

### Shared

- [x] **Create the shared constants module** — central definitions reused across `api/`, `admin/`, `frontend/`, and `mcp-server/`: error codes/messages, the controlled-vocabulary enums that mirror the schema CHECK constraints (gospel categories, timeline eras/periods, map locations, resource `list_key`s, arbor relationship types), and any shared route/path constants. Export as frozen objects. File: `shared/constants.js`

### Root project files

- [x] **Create the gitignore** — ignore `node_modules/`, `.env`, `*.db`, `public/uploads/*` (keep the folder), logs, and OS/editor cruft. File: `.gitignore`
- [x] **Create the license** — the project's open-source license text. File: `LICENSE`
- [x] **Create the deploy script** — a VPS helper that installs API deps, applies the schema/migrations, and starts/restarts the API server (one-command deploy/setup, idempotent, `set -euo pipefail`). File: `deploy.sh`

### Uploads directory

- [x] **Create the uploads directory placeholder** — add `public/uploads/.gitkeep` so the user-upload target directory exists in the repo while its contents stay git-ignored. File: `public/uploads/.gitkeep`

## Files touched
- `shared/constants.js` — created
- `.gitignore` — created
- `LICENSE` — created
- `deploy.sh` — created
- `public/uploads/.gitkeep` — created

## Notes
- **No automated tests**: the plan skill mandates automated tests only for `.js` under `api/`, `admin/`, or `mcp-server/`. `shared/constants.js` is in none of those and contains only data (no logic to assert), so it needs no test file. If consumers later add logic to `shared/`, add a matching test then.
- **Schema as source of truth**: the enum values in `constants.js` must be copied exactly from `database/schema.sql` CHECK constraints. Keeping them in one place reduces drift, but they remain a manual mirror of the schema — note this in the file header.
- **License choice**: Website_guide.md says "Open-source license" without naming one. Confirm the specific license (e.g. MIT) with the owner before filling `LICENSE`; logged to Issues.md as an open decision.
- **`.env` already exists** and is intentionally not committed; the new `.gitignore` formalises that.
- **Deploy specifics** (VPS host, process manager, paths) depend on the target server; the script encodes the documented "one-command deploy/setup" intent and should be reviewed against the actual VPS before first use.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
