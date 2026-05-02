---
name: plan_dashboard_system
version: 1.0.0
module: 7.0 — System
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_system

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "System" dashboard module, the central administrative hub for monitoring and managing the project's infrastructure and development lifecycle. It features real-time status displays for API health, VPS resource usage, and security alerts, alongside interactive controls for running test suites, editing architectural documentation, and generating AI agents. This module provides administrators with total operational oversight and the tools necessary for system maintenance, security auditing, and extension within the 'providence' design framework.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_system.html` | System health monitoring container |
| **CSS** | `css/7.0_system/dashboard/dashboard_system.css` | Log stream & gauge aesthetics |
| **JS** | `js/7.0_system/dashboard/dashboard_system.js` | Module orchestration & initialization |
| **JS** | `js/7.0_system/dashboard/display_system_data.js` | Real-time status polling & health card rendering |
| **JS** | `js/7.0_system/dashboard/test_execution_logic.js` | Test suite execution & log piping |
| **JS** | `js/7.0_system/dashboard/agent_generation_controls.js` | Agent generation & document management triggers |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create System Dashboard HTML

- **File(s):** `admin/frontend/dashboard_system.html`
- **Action:** Create the structural layout for the system hub, including the health monitoring grid, test execution panel, and documentation management anchor.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement System Dashboard CSS

- **File(s):** `css/7.0_system/dashboard/dashboard_system.css`
- **Action:** Implement the 'providence' theme styling for health status cards, resource usage meters, and the interactive testing control console.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement System Orchestrator

- **File(s):** `js/7.0_system/dashboard/dashboard_system.js`
- **Action:** Initialize the system module and coordinate the real-time status polling, test execution, and documentation management logic.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement System Data Display

- **File(s):** `js/7.0_system/dashboard/display_system_data.js`
- **Action:** Implement the logic to poll backend status APIs and render the results into the health and resource monitoring cards.
- **Dependencies:** `admin/backend/admin_api.py` (system routes planned)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Test Execution Logic

- **File(s):** `js/7.0_system/dashboard/test_execution_logic.js`
- **Action:** Implement the UI logic to trigger backend test suites (API, Agent, Port) and display live results in the system console.
- **Dependencies:** `mcp_server.py` (system testing)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Agent Generation Controls

- **File(s):** `js/7.0_system/dashboard/agent_generation_controls.js`
- **Action:** Implement the UI triggers to initiate agent generation workflows and document management tasks.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T7 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T8 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new System dashboard files under Module 7.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new system monitoring files. |
| `documentation/data_schema.md" | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | Yes | Document integration with VPS health monitoring and testing. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the System health hub and testing console. |
| `documentation/guides/guide_function.md` | Yes | Document system monitoring logic and test orchestration flow. |
| `documentation/guides/guide_security.md` | Yes | Note integration with security alerts and JWT validation status. |
| `documentation/guides/guide_style.md" | Yes | Document the system health card and console CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
