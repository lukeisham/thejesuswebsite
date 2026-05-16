---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Essays & Responses Module pages (essays, historiography, challenge responses)
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_style.md, essays_responses_nomenclature.md, guide_dashboard_appearance.md, guide_function.md]
---

## 5.0 Essays & Responses Module
**Scope:** Essays (Context, Theological, Spiritual) & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1 Essays & Historiography
**Corresponds to:** `frontend/pages/context_essay.html`, `frontend/pages/debate/historiography.html`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW ]                             |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  essay-toc-aside    |  essay-content-main                               |
|                     |                                                   |
|  Table of Contents  |   [ESSAY TITLE]                                   |
|  ─────────────────  |   [PRIMARY VERSE]                                 |
|  - Section 1        |   By [Author], The Jesus Website [YEAR]           |
|  - Section 2        |   +--------------------------------------+        |
|  - Section 3        |   | Abstract: [SNIPPET]                  |        |
|                     |   +--------------------------------------+        |
|  (auto-populated    |                                                   |
|   from headings     |   [Body Text - Premium Typography / Max-Width]    |
|   by JS)            |   [Inline MLA Snippet]                            |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [ Picture ]                               |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY]                                  |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `frontend/pages/context_essay.html` | Essay page shell (layout-two-col) |
| `frontend/pages/debate/historiography.html` | Historiography page shell (layout-two-col) |
| `css/5.0_essays_responses/frontend/essays.css` | Essay typography & layout |
| `css/1.0_foundation/grid.css` | Two-column grid structure |
| `js/5.0_essays_responses/frontend/view_context_essays.js` | Essay content injection |
| `js/5.0_essays_responses/frontend/view_historiography.js` | Historiography content injection |
| `js/5.0_essays_responses/frontend/mla_snippet_display.js` | Inline MLA citation rendering |
| `js/5.0_essays_responses/frontend/sources_biblio_display.js` | Bibliography section rendering |
| `js/2.0_records/frontend/pictures_display.js` | Picture rendering |

---

### 5.2 Challenge Responses
**Corresponds to:** `frontend/pages/debate/response.html`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW ]                             |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  list-filters       |  layout-two-col__content                          |
|  (aside)            |                                                   |
|                     |   [RESPONSE TITLE]                                |
|  ┌ Responding To ─┐ |   By [Author], The Jesus Website [YEAR]           |
|  │ [Challenge      │ |   +--------------------------------------+       |
|  │  Title]         │ |   | Abstract: [SNIPPET]                  |       |
|  └─────────────────┘ |   +--------------------------------------+       |
|                     |                                                   |
|  Table of Contents  |   [Body Text - Premium Typography / Max-Width]    |
|  ─────────────────  |   [Inline MLA Snippet]                            |
|  - Section 1        |                                                   |
|  - Section 2        |   +-------------------------------------------+   |
|  - Section 3        |   | [ Picture ]                               |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY]                                  |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `frontend/pages/debate/response.html` | Response page shell (layout-two-col) |
| `css/5.0_essays_responses/frontend/responses.css` | Response typography & layout |
| `css/1.0_foundation/grid.css` | Two-column grid structure |
| `js/5.0_essays_responses/frontend/response_display.js` | Response content injection |
| `js/5.0_essays_responses/frontend/list_view_responses.js` | Response list view |
| `js/5.0_essays_responses/frontend/mla_snippet_display.js` | Inline MLA citation rendering |
| `js/5.0_essays_responses/frontend/sources_biblio_display.js` | Bibliography section rendering |
| `js/9.0_cross_cutting/frontend/html_utils.js` | Shared HTML utilities |
| `js/2.0_records/frontend/pictures_display.js` | Picture rendering |

---
