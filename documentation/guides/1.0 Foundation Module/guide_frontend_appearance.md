---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Foundation Module pages (landing, about, sidebar, footer, header, branding, typography)
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_style.md, foundation_nomenclature.md, guide_function.md]
---

# Guide to Page Appearance & Structural Layouts

## 1.0 Foundation Module

### 1.1 Website Landing Page (Public)

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                                                                         |
|                         The Jesus Website.                              |
|                                                                         |
|          A detailed presentation of the evidence for Jesus.             |
|-------------------------------------------------------------------------|
|                                                                         |
|                 +---------------------------------+                     |
|                 |                                 |                     |
|                 |      Picture of Jesus           |                     |
|                 |                                 |                     |
|                 |                                 |                     |
|                 +---------------------------------+                     |
|                 Fig. 1 — Jesus of Nazareth                              |
|                                                                         |
|                 [Paragraph text with inline links]                      |
|                 [Paragraph text with inline links]                      |
|                 [Paragraph text with inline links]                      |
|                                                                         |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 1.2 Internal Landing Page (Public)

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: [Section Title]              |
|                     |                                                   |
|  - Records          |   +-------------+ +-------------+ +-------------+ |
|  - Evidence         |   |  [Card 1]   | |  [Card 2]   | |  [Card 3]   | |
|  - Timeline         |   |             | |             | |             | |
|  - Maps             |   |             | |             | |             | |
|  - Context          |   +-------------+ +-------------+ +-------------+ |
|  - Debate           |                                                   |
|  - Resources        |                                                   |
|  - News             |                                                   |
|  - About            |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 1.3 About Page

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   ABOUT THE JESUS WEBSITE                         |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [Picture]                                 |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [Section: Tech Stack]                           |
|                     |   [Section: Methodology]                          |
|                     |   [Section: Contact]                              |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 1.4 Universal Sticky Sidebar

```text
+-------------------------+
| The Jesus Website       |
|-------------------------|
|                         |
|  - Records              |
|  - Evidence             |
|  - Timeline             |
|  - Maps                 |
|  - Context              |
|  - Debate & Discussion  |
|  - Resource Lists       |
|  - News                 |
|  - About                |
|                         |
|-------------------------|
|  [Admin Portal]         |
+-------------------------+
```

#### 1.4.1 Sidebar — Technical Anatomy

```text
+----------------------+-----------------------------+------------------------------------+
| Interface Element    | CSS Component Class         | DOM ID / Hook                      |
|----------------------|-----------------------------|------------------------------------|
| Main Container       | .site-sidebar               | #site-sidebar                      |
| Top Brand Label      | .site-sidebar__brand        | #sidebar-brand "The Jesus Website" |
| Navigation List      | .site-sidebar__nav          | #sidebar-main-nav                  |
| Navigation Link      | .site-sidebar__nav li a     | #sidebar-nav-[id]                  |
| Section Divider      | .site-sidebar__divider      | (No ID)                            |
| Category Label       | .site-sidebar__nav-category | (No ID)                            |
| Table of Contents    | .site-sidebar__nav          | #sidebar-toc                       |
| Mobile Backdrop      | .sidebar-backdrop           | #sidebar-backdrop                  |
| Admin Link           | .site-sidebar__admin-link   | #sidebar-admin-link                |
+----------------------+-----------------------------+------------------------------------+
```

---

### 1.5 Universal Footer

```text
+-----------------------------------------------------------------------------------------+
| © 2026 The Jesus Website | [א/Ω] | CC BY-NC 4.0     Print contents | Copy URL | Copy contents |
+-----------------------------------------------------------------------------------------+
```

#### 1.5.1 Footer — Component Anatomy

```text
+----------------------+-----------------------------+------------------------------------+
| Interface Element    | CSS Component Class         | DOM ID / Hook                      |
|----------------------|-----------------------------|------------------------------------|
| Main Container       | .site-footer                | #site-footer                       |
| Legal Group (Left)   | .site-footer__legal         | #footer-legal                      |
| Copyright Text       | .site-footer__legal-text    | #footer-copyright                  |
| Branding Mark        | .site-footer__mark          | #footer-mark                       |
| Licence Link         | .site-footer__licence-link  | #footer-licence                    |
| Actions Group (Right)| .site-footer__actions       | #footer-actions                    |
| Print Button         | .footer-btn                 | #footer-btn-print                  |
| Copy URL Button      | .footer-btn                 | #footer-btn-copy-url               |
| Copy Contents Button | .footer-btn                 | #footer-btn-copy-contents          |
| Button Icon          | .footer-btn__icon           | (No ID)                            |
+----------------------+-----------------------------+------------------------------------+
```

---

### 1.6 Universal Image/Picture Layout

```text
+-------------------------------------------------------------------------+
|+-----------------------------------------------------------------------+|
||                          [Picture / PNG]                               ||
|+-----------------------------------------------------------------------+|
| [Picture Label]                                                         |
+-------------------------------------------------------------------------+
```

---

### 1.7 Universal Search Header

```text
+-------------------------------------------------------------------------+
|                    .site-header (height: 64px, sticky top: 0)           |
|-------------------------------------------------------------------------|
|                                                                         |
|                     +-----------------------------------+               |
|                     | Search records, people, events…   |               |
|                     +-----------------------------------+               |
|                                                                         |
+-------------------------------------------------------------------------+
```

#### 1.7.1 Search Header — DOM Structure

```text
<header class="site-header" id="site-header">
│
└── <div class="site-header__search">
    └── <input type="search" id="global-search-input">
            placeholder: "Search records, people, events…"
            Enter  → redirect to /records?search=<encoded term>
            Escape → clear input (no navigation)
```

#### 1.7.2 Search Header — Mobile

```text
+------------------------------------------+
|  [ Search ]                              |
+------------------------------------------+
```

---

### 1.8 Branding, Icons & Identity

```text
+-------------------+
|                   |
|     א       Ω    |
|                   |
+-------------------+
  assets/favicon.png
```

---

### 1.9 Interactive Elements Directory

```text
+----------------------+----------------------------------+------------------------------------------+
| Element Type         | Primary Selectors                | Governing CSS File                       |
|----------------------|----------------------------------|------------------------------------------|
| Generic Buttons      | .btn-primary, .btn-outline,      | css/1.0_foundation/frontend/buttons.css  |
|                      | .btn--filled                     |                                          |
| Footer Buttons       | .footer-btn                      | css/1.0_foundation/footer.css            |
| Timeline Controls    | .timeline-actions button         | css/3.0_visualizations/frontend/         |
|                      |                                  | timeline.css                             |
| Map Controls         | .map-actions button              | css/3.0_visualizations/frontend/maps.css |
| Login Buttons        | .login-box button                | css/7.0_system/auth_login.css            |
| Range Sliders        | input[type="range"]              | css/1.0_foundation/frontend/forms.css    |
| Checkboxes & Radios  | input[type="checkbox"],          | css/1.0_foundation/frontend/forms.css    |
|                      | input[type="radio"]              |                                          |
| Toggle Switches      | .toggle-switch__input,           | css/1.0_foundation/frontend/forms.css    |
|                      | .toggle-switch__slider           |                                          |
+----------------------+----------------------------------+------------------------------------------+
```
