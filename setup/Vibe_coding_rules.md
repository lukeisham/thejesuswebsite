# Vibe Coding Rules

## Setup Rules
**SR-1** — One file per function  
Only combine functions in the same file if they form a single linear sequence **or** are tightly related by type/purpose.

**SR-2** — Dependencies  
Use external dependencies **only** for visual/display libraries.

**SR-3** — Performance First  
Website loading speed is non-negotiable. Optimize for it at every step.

## JS Rules
**JS-1** — Self-documenting > Comments  
Use clear, intention-revealing names for everything. Write code that is readable without comments.

**JS-2** — Robust & Predictable > Clever  
Validate inputs, handle errors explicitly, prefer early returns and defensive programming. Never fail silently.

**JS-3** — Modern & Simple > Over-engineered  
Use current JS features. Keep functions small and focused. Avoid unnecessary classes, abstractions, or layers.

**JS-4** — Comments: “Why”, not “What”  
Write JSDoc for public APIs and complex logic. Keep comments minimal, truthful, and up-to-date. Delete outdated comments immediately.

**JS-5** — Async/Await by Default  
Use `async/await` + `try/catch` for all async code. Show loading states before fetch and error states on failure. Centralize all raw `fetch()` calls in `api.js`.

**JS-6** — Safe DOM Handling  
Use event delegation for dynamic elements. Remove listeners when elements are removed. Never use `innerHTML` with user data. Cache repeated DOM queries.

## CSS Rules
**CSS-1** — One File, One Job  
Each CSS file styles exactly one component, layout, or page. Keep files under 150 lines. Split when they grow. No unrelated styles.

**CSS-2** — Custom Properties Only  
Reference `--color-*`, `--space-*`, `--font-*` etc. from `variables.css`. Never hardcode values that belong in variables.

**CSS-3** — Mobile Inside Component Files  
Put all `@media (max-width)` rules in the same file as the component. Use breakpoints from `variables.css`. No separate mobile files.

**CSS-4** — Semantic Class Names  
Class names describe *what* something is (`.card-grid`, `.popular-challenges`), never *how* it looks. Use kebab-case, consistent with filenames.

**CSS-5** — Low Specificity  
Prefer single classes. Avoid IDs and nested selectors. Never use `!important`.

**CSS-6** — CSS Comments  
Use large clear section headings and subheadings. Keep comments sparse and useful.

## HTML Rules
**HTML-1** — Semantic First  
Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>` etc. Use `<div>` only for pure styling hooks. One `<main>` per page.

**HTML-2** — Images  
Every `<img>` must have an `alt` attribute. Descriptive for informative images, empty `alt=""` for decorative.

**HTML-3** — Proper Heading Hierarchy  
Exactly one `<h1>` per page. Never skip levels (`h1 → h2 → h3`). Headings describe content structure, not visual size.

**HTML-4** — Asset Loading Order  
CSS in `<head>`. Scripts at bottom or with `defer`. Inline critical CSS only when necessary for above-the-fold performance.

**HTML-5** — Accessible Forms  
Every form control has a proper `<label>`. Use `aria-describedby` for error messages. Placeholders are hints only.
