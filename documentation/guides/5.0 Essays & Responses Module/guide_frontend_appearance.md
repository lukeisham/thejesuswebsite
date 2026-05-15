---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Essays & Responses Module pages (essays, historiography, challenge responses)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, guide_style.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 5.0 Essays & Responses Module
**Scope:** Essays (Context, Theological, Spiritual) & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1 Essays
**Purpose:** High-readability typography layout for long-form contextual, theological, and spiritual essays plus the historiographical essay. Includes an abstract, author details, inline MLA citations, and a full bibliography.

**Relevant Files:**
- **HTML:** `frontend/pages/context_essay.html`, `frontend/pages/debate/historiography.html`
- **CSS:** `css/5.0_essays_responses/frontend/essays.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js`, `js/5.0_essays_responses/frontend/mla_snippet_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`, `js/2.0_records/frontend/display_snippet.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW]                               |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   [ESSAY TITLE]                                   |
|                     |   [Optional subtitle]                             |
|                     |   [PRIMARY VERSE]                                 |
|                     |   By [Author], The Jesus Website [YEAR]           |
|                     |   +--------------------------------------+        |
|                     |   | Abstract:[SNIPPET]                   |        |
|                     |   |                                      |        |
|                     |   +--------------------------------------+        |
|                     |                                                   |
|                     |   [Body Text - Premium Typography / Max-Width]    |
|                     |   "Lorem ipsum dolor sit amet, consectetur        |
|                     |   adipiscing elit. Mauris blandit aliquet elit,   |
|                     |   eget tincidunt nibh pulvinar a..."              |
|                     |   [Inline MLA Snippet]                            |
|                     |                                                   |
|  [Table of          |   +-------------------------------------------+   |
|  Contents]          |   | [ Picture ]                               |   |
|   - Section 1       |   |                                           |   |
|   - Section 2       |   |                                           |   |
|   - Section 3       |   +-------------------------------------------+   |
|                     |                                                   |
|                     |    [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 5.2 Challenge Responses
**Purpose:** High-readability typography layout for individual challenge response pages. Shares the essay typography treatment but links back to the originating challenge and displays the challenge context alongside the response.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/response.html`
- **CSS:** `css/5.0_essays_responses/frontend/responses.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/response_display.js`, `js/5.0_essays_responses/frontend/list_view_responses.js`, `js/5.0_essays_responses/frontend/mla_snippet_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW]                               |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   [CHALLENGE TITLE]                               |
|                     |   [CHALLENGE CONTEXT]                             |
|                     |   By [Author], The Jesus Website [YEAR]           |
|                     |   +--------------------------------------+        |
|                     |   | Abstract:[SNIPPET]                   |        |
|                     |   |                                      |        |
|                     |   +--------------------------------------+        |
|                     |                                                   |
|                     |   [Body Text - Premium Typography / Max-Width]    |
|                     |   "Lorem ipsum dolor sit amet, consectetur        |
|                     |   adipiscing elit. Mauris blandit aliquet elit,   |
|                     |   eget tincidunt nibh pulvinar a..."              |
|                     |   [Inline MLA Snippet]                            |
|                     |                                                   |
|  [Table of          |   +-------------------------------------------+   |
|  Contents]          |   | [ Picture ]                               |   |
|   - Section 1       |   |                                           |   |
|   - Section 2       |   |                                           |   |
|   - Section 3       |   +-------------------------------------------+   |
|                     |                                                   |
|                     |    [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

