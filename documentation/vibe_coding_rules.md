---
name: vibe_coding_rules.md
version: 1.1.0
purpose: Foundational coding philosophies and aesthetic mandates for the project
dependencies: []
---

# Vibe Coding Rules

This document outlines the core coding philosophies ("vibe coding rules") for maintaining a clean, consistent, and beautiful codebase across The Jesus Website project. The overarching theme is simplicity, modularity, and human-readability.

## 1. HTML (Structure)
- **Semantic Tags:** Use proper semantic HTML5 tags (`<article>`, `<section>`, `<nav>`, `<aside>`) instead of generic `<div>` soups.
- **Clean Skeletons:** Keep pages purely structural. Defer styles to external CSS and logic to external JS. Do not use inline styles (`style="..."`) or inline scripts.
- **Predictable Hooks:** Use clear, descriptive `id` attributes for JavaScript targeting, and modular `class` attributes for CSS styling.

## 2. CSS (Aesthetics & Layout)
- **Grid for everything:** Leverage CSS Grid for macro structural page layout (e.g., `grid.css`) and Flexbox for micro component-level alignment.
- **User Comments:** Use big headings and subheadings to show what everything is. 
- **Variables Everything:** Use CSS variables (defined in `typography_colors.css`) for all colors, fonts, and spacing to maintain a unified, premium aesthetic.
- **Vanilla Excellence:** Rely on vanilla CSS. Avoid massive utility classes or third-party frameworks. Write clean, purposeful stylesheets.
- **Rich Aesthetics:** Aim for a modern, high-quality feel. Use subtle transitions, logical whitespace, and typography scales to create a compelling user experience.

## 3. JavaScript (Logic & Rendering)
- **Functionality:** One function per script. 
- **User Comments:** Always start code with three comments, trigger, main function and output. 
- **Single Responsibility (1 Function/File):** Keep modules highly focused on one specific task or view (e.g., `list_newsitem.js`, `pictures_display.js`).
- **Vanilla ES6+:** Write standard, dependency-free JavaScript. No React, Vue, or heavy front-end frameworks.
- **Component Injection:** Use JS to render repeating UI elements (Headers, Footers, Sidebars) by injecting them into well-defined HTML anchors, avoiding code duplication across pages.

## 4. Python (Backend, API & Pipelines)
- **Readability First:** Write explicit, self-documenting code. Favor clear logic over overly clever or compact "Pythonic" tricks. 
- **Modular Pipelines:** Keep scraping and data ingestion scripts focused, stateless, and safe to run repeatedly.
- **Human-First:** Assume another developer needs to read the script to understand how external data maps to the SQLite database. Document API quirks and data anomalies clearly.

## 5. SQL (Database)
- **Human Readable:** Keep schema structures logical. Database fields and JSON keys must strictly use `snake_case`.

## 6. Source-of-Truth Discipline
- **Documentation Verification:** During implementation, the agent must cross-reference the active plan with `dashboard_refractor.md` and `detailed_module_sitemap.md` every 3 tasks.
- **Strict File Names:** Do not deviate from the filenames specified in implementation plans. If a file is not in the plan but is in the refractor document, it must be created.
- **Inventory Check:** Before marking a module as complete, perform a manual inventory of all created files against the "File Inventory" section of the plan.

## 7. AI Execution & Drift Control
- **Anti-Drift Reminder:** Before every task, explicitly remind yourself of the project purpose and what has been completed. Do not drift from the plan.
- **Precise Completion:** Slow down and burn tokens. Complete tasks with precision rather than guessing or skipping steps. Fidelity is more important than speed.
- **Identical Code Verification:** When a plan involves splitting or duplicating functionality into parallel modes (e.g., Academic vs. Popular), the agent must verify that both code paths remain functionally identical. No feature or code path may exist in one mode but not the other.
- **Stuck in a Loop:** If you find yourself stuck in a loop or repeating the same error, STOP. Do not keep guessing. Explain the situation and ask the user for help.
- **Cross-Plan Shared-Tool Ownership:** Several dashboard modules consume shared JS tools (`picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `markdown_editor.js`). Each shared tool is OWNED by exactly one plan and lives in ONE directory. Consumer plans MUST NOT create local copies. They MUST include the owner's file via a `<script>` tag in their HTML and call the exposed `window.*` function. The ownership table:
  - `plan_dashboard_records_single` owns: `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `metadata_widget.js`, `metadata_widget.css` — all in `js/2.0_records/dashboard/` (CSS in `css/2.0_records/dashboard/`)
  - `plan_dashboard_essay_historiography` owns: `markdown_editor.js` — in `js/5.0_essays_responses/dashboard/`
  If a consumer needs module-specific behavior, add a parameter to the shared function signature on the OWNER's copy — do not fork the file.
