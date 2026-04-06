---
name: vibe_coding_rules.md
version: 1.0.0
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
- **Single Source of Truth:** The structure originates from `database.sql`. Keep queries explicit and avoid complex, nested logic inside the frontend WASM calls.
