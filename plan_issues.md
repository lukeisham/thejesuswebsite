---
name: plan_issues.md
version: 1.0.0
purpose: Cross-plan issue logger — captures conflicts, gaps, missing dependencies, and implementation issues discovered during plan execution
created: 2026-05-02
---

# Plan Issue Log

> **What this is:** A running log of issues, conflicts, gaps, and unresolved questions that arise during plan implementation. Each plan's agent appends to this file at the end of execution.
>
> **What this is not:** A task tracker or to-do list. It does not replace checkboxes inside individual plans. It captures only cross-cutting or plan-level issues that need visibility across the project.

---

## Issue Table

| # | Plan | Severity | Category | Description | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `plan_dashboard_login_and_shell.md` | Medium | Documentation Drift | `documentation/dashboard_refractor.md` login ASCII diagram still shows a `Username: [_______]` field, but `guide_security.md` §3 specifies password-only authentication against `ADMIN_PASSWORD` in `.env`. The refractor doc also references `admin_login.js` while the plan uses `admin.js` — a file naming mismatch across the whole dashboard subsystem. | The plan was updated to remove the username field and document the password-only flow. `dashboard_refractor.md` needs a separate pass to realign its file names and diagrams. | RESOLVED |
| 2 | `plan_dashboard_login_and_shell.md` | Medium | Nomenclature Drift | `plan_dashboard_login_and_shell.md` and `documentation/dashboard_refractor.md` use different file names for the same components: the plan uses `dashboard_orchestrator.js`, `dashboard_universal_header.js`, `display_dashboard_cards.js`; `guide_security.md` §3 references `admin_login.js`, `dashboard_auth.js`, `load_middleware.js`, `return_to_site.js`, `logout_middleware.js`. The naming convention needs to be unified across all plans and docs. | Unresolved — file names in the plan were preserved as-is for now. A project-wide naming audit should decide the canonical names. | RESOLVED |

---

## Field Reference

| Field | Description |
| :--- | :--- |
| **#** | Auto-incrementing issue number |
| **Plan** | The plan file name (`plan_dashboard_login_and_shell.md`, etc.) that surfaced the issue |
| **Severity** | `Critical` — blocks implementation or breaks another plan · `High` — requires coordination with another plan's agent · `Medium` — non-blocking but should be addressed · `Low` — informational / future cleanup |
| **Category** | `Conflict` — two plans claim ownership of the same file or logic · `Gap` — missing file, dependency, or logic not covered by any plan · `Missing Dependency` — a dependency referenced by a plan but not owned by any existing plan · `Implementation Issue` — a problem discovered during execution (e.g., API shape mismatch, missing route) · `Documentation Drift` — a guide or reference doc contradicts a plan's implementation · `Nomenclature Drift` — the same file, function, or concept is referred to by different names across plans, docs, or guides (e.g., `admin.js` vs `admin_login.js`) |
| **Description** | What was discovered, plus specific file paths or plan references |
| **Resolution** | How it was resolved (or `Unresolved` if still open). Include the commit or PR reference if applicable. |
| **Status** | `Open` · `In Progress` · `Resolved` · `Won't Fix` |

---

## Agent Instructions

> **When to log:** At the end of every plan execution, the agent reviews the plan's T12 (Vibe-Coding Audit) and T13 (Purpose Check) results. If any issues were discovered during implementation that affect other plans or the project at large, the agent appends a row to the Issue Table above.

1. **Before logging**, check the existing table to avoid duplicates.
2. **Assign the next sequential `#`** (the first issue is `1`).
3. **Be specific** in the Description — include exact file paths, plan names, and the nature of the mismatch.
4. **If resolved during the same plan**, mark it `Resolved` and describe the resolution.
5. **If unresolved**, mark it `Open` so the next agent or the user can address it.
6. **Do not log** issues that are purely internal to a single plan and have no impact outside it. Those belong in the plan's own task checkboxes.
