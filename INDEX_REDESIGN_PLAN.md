# Index Page Redesign Plan — Cover Page for thejesuswebsite.org

Generated: 2026-03-09
Scope: Replace the current `index.html` (a zero-second redirect to `/records.html`) with a functional cover page that serves as the entry point for the website.

---

## Engineering Checklist

- [ ] Uses the existing `/style.css` — no new CSS files
- [ ] Includes the universal invisible `<head>` fragment from `_header.html` (SEO meta, MCP link, JSON-LD)
- [ ] Includes the universal footer from `_footer.html` (copyright, action buttons, MCP capabilities)
- [ ] Does NOT include the sidebar — this is a single-column cover page
- [ ] Responsive across mobile (320px) → tablet (768px) → desktop (1200px+)
- [ ] All links are functional and point to existing pages
- [ ] Page loads without JavaScript — content is static HTML
- [ ] Image has a proper `alt` attribute for accessibility
- [ ] Follows the existing CSS variable system (`--bg-color`, `--text-color`, `--accent-color`, etc.)

---

## Current State

`frontend/index.html` is currently:
```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url='/records.html'" />
</head>
<body>
  <p>Redirecting to <a href="/records.html">Records</a>...</p>
</body>
</html>
```

Users who visit `www.thejesuswebsite.org` see nothing — they're instantly sent to `/records.html`. There is no cover page, no introduction, no entry experience.

---

## Target Layout

```
┌──────────────────────────────────────────────────────┐
│ <head> (invisible — SEO meta, style.css, MCP, LD+JSON) │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│             ROW 1 — HEADING                          │
│                                                      │
│             The Jesus Website                        │
│             (h1, centred, serif font)                │
│             Optional subtitle (h2 or p)              │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│             ROW 2 — CENTRED PICTURE                  │
│                                                      │
│              ┌─────────────────────┐                 │
│              │                     │                 │
│              │   Hero / Feature    │                 │
│              │   Image             │                 │
│              │                     │                 │
│              └─────────────────────┘                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│             ROW 3 — PARAGRAPH                        │
│                                                      │
│             Placeholder text with inline links       │
│             sprinkled throughout. Links to:           │
│             records, evidence, challenges,            │
│             resources, about, etc.                    │
│                                                      │
│                                                      │
│             [ Explore Records → ]  (CTA button)      │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│             FOOTER (universal)                       │
│             © Luke Isham 2026 CC BY-SA 4.0          │
│             Toggle Links | Copy URL | Copy Text ...  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **No sidebar.** This is the only page without the nav sidebar. The user enters a clean, focused landing experience. Navigation to other pages happens via inline links in the paragraph and the CTA button.
2. **Single column, centred.** Max-width container (matching the essay page style: `max-width: 42rem; margin: 0 auto;`).
3. **Existing CSS only.** Uses `.a-grid`, gap utilities, and existing typography from `style.css`.
4. **Footer included.** Same footer as all other pages — copyright, action buttons, `footer_actions.js`.

---

## Full HTML — `frontend/index.html`

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Universal Head Fragment (_header.html) -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <meta name="author" content="The Jesus Website">
    <meta name="theme-color" content="#5b7065">

    <title>The Jesus Website</title>
    <meta name="description"
          content="An encyclopaedic survey of the historical evidence for Jesus of Nazareth. Browse records, maps, timelines, challenges, and primary sources.">

    <link rel="stylesheet" href="/style.css">

    <!-- Agentic Friendliness & MCP Discovery -->
    <link rel="alternate" type="application/mcp" href="/api/v1/mcp">
    <script type="application/ld+json" id="page-metadata">
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "The Jesus Website",
        "url": "https://www.thejesuswebsite.org",
        "description": "An encyclopaedic survey of the historical evidence for Jesus of Nazareth.",
        "author": {
            "@type": "Person",
            "name": "Luke Isham"
        }
    }
    </script>

    <!-- Cover page: suppress sidebar, centre content -->
    <style>
        .cover-root {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .cover-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            max-width: 42rem;
            margin: 0 auto;
            padding: 3rem 1.5rem;
            text-align: center;
        }
        .cover-heading {
            margin-bottom: 0.5rem;
        }
        .cover-subtitle {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--accent-color);
            margin-bottom: 2.5rem;
        }
        .cover-image {
            width: 100%;
            max-width: 36rem;
            border-radius: 6px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            margin-bottom: 2.5rem;
        }
        .cover-text {
            text-align: left;
            line-height: 1.8;
            margin-bottom: 2rem;
        }
        .cover-text a {
            color: var(--accent-color);
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        .cover-text a:hover {
            color: var(--text-color);
        }
        .cover-cta {
            display: inline-block;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            padding: 0.75rem 2rem;
            background-color: var(--accent-color);
            color: #fff;
            border: none;
            border-radius: 4px;
            text-decoration: none;
            transition: background-color 0.2s;
            margin-top: 1rem;
        }
        .cover-cta:hover {
            background-color: var(--text-color);
        }

        /* Footer sits at the bottom naturally via flex */
        #nav-footer {
            margin-top: auto;
        }
    </style>
</head>

<body>
    <div class="cover-root">

        <!-- ═══════════════════════════════════════════════ -->
        <!-- ROW 1 — HEADING                                -->
        <!-- ═══════════════════════════════════════════════ -->
        <main class="cover-main">
            <h1 class="cover-heading">The Jesus Website</h1>
            <p class="cover-subtitle">An encyclopaedic survey of the historical evidence</p>

            <!-- ═══════════════════════════════════════════ -->
            <!-- ROW 2 — CENTRED PICTURE                    -->
            <!-- ═══════════════════════════════════════════ -->
            <img
                class="cover-image"
                src="/images/cover.jpg"
                alt="Landscape of the Sea of Galilee at dawn, looking east from the ancient shoreline near Capernaum"
            >

            <!-- ═══════════════════════════════════════════ -->
            <!-- ROW 3 — PARAGRAPH WITH LINKS               -->
            <!-- ═══════════════════════════════════════════ -->
            <div class="cover-text">
                <p>
                    This website is an encyclopaedic survey of the historical evidence
                    for Jesus of Nazareth. It brings together
                    <a href="/records.html">primary and secondary records</a>
                    from the first century, organises them by
                    <a href="/evidence.html">sequence</a> and
                    <a href="/timeline.html">timeline</a>, and plots key events on
                    <a href="/maps/maps.html">interactive maps</a> of ancient Galilee,
                    Judea, and the wider Roman world.
                </p>
                <p>
                    Every claim is open to scrutiny. The
                    <a href="/challenge.html">challenges</a> section catalogues the
                    strongest objections from scholarship, while the
                    <a href="/resources.html">resources</a> section provides
                    recommended books, articles, and videos for further reading.
                    The project is maintained by
                    <a href="/about.html">Luke Isham</a> and released under a
                    Creative Commons licence.
                </p>
            </div>

            <a href="/records.html" class="cover-cta">Explore the Records &rarr;</a>
        </main>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- FOOTER (Universal — from _footer.html)         -->
        <!-- ═══════════════════════════════════════════════ -->
        <nav id="nav-footer" class="footer" aria-label="Footer navigation">
            <div class="footer-left">
                <p>&copy; Luke Isham 2026
                    <a href="https://creativecommons.org/licenses/by-sa/4.0/"
                       target="_blank" rel="noopener">CC BY-SA 4.0</a>
                </p>
            </div>
            <div class="footer-right">
                <button id="btn-toggle-links" class="btn-footer">Toggle Record Links</button>
                <button id="btn-copy-url" class="btn-footer">Copy URL</button>
                <button id="btn-copy-text" class="btn-footer">Copy Content Text</button>
                <button id="btn-save-pdf" class="btn-footer">Save as PDF</button>
                <button id="btn-save-slide" class="btn-footer">Export to Slide</button>
            </div>

            <script type="application/mcp">
            {
                "capabilities": ["Save-pdf", "Copy-text"]
            }
            </script>

            <script type="module" src="/js/footer_actions.js"></script>
        </nav>
    </div>
</body>
</html>
```

---

## Implementation Notes

### Image

The HTML references `/images/cover.jpg`. This file does **not yet exist**. Options:

1. **Add a placeholder image.** Create or source a landscape photograph of the Sea of Galilee, the Judean hills, or an archaeological site relevant to Jesus. Save it as `frontend/images/cover.jpg`. Recommended size: 1200×600px, JPEG quality 80, under 200KB.

2. **Use a CSS gradient placeholder** until a real image is available. Replace the `<img>` tag with:
   ```html
   <div class="cover-image" style="height: 300px; background: linear-gradient(135deg, var(--bg-color) 0%, var(--accent-color) 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-style: italic;">
       Cover image — coming soon
   </div>
   ```

3. **Generate an image** using an AI image tool and save it to `frontend/images/cover.jpg`.

### What This Page Does NOT Include

- **No sidebar.** The cover page is a clean, single-column layout. The sidebar appears on every subsequent page once the user clicks through.
- **No JavaScript dependencies** (except footer_actions.js for the universal footer buttons). The page is fully static.
- **No admin link.** The admin link is in the sidebar, which doesn't appear here. This is intentional — the cover page is public-facing only.

### How It Fits the User Flow

```
User types: www.thejesuswebsite.org
            │
            ▼
    ┌───────────────┐
    │  index.html   │  ← NEW cover page
    │  (cover page) │
    │               │
    │  Reads intro  │
    │  paragraph    │
    │               │
    │  Clicks CTA:  │
    │  "Explore     │
    │  Records →"   │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ records.html  │  ← Existing page (sidebar + search + grid)
    │               │
    │  Full site    │
    │  navigation   │
    │  via sidebar  │
    └───────────────┘
```

### CSS Approach

All new styles are in a `<style>` block in the `<head>` of `index.html` rather than added to the shared `style.css`. This keeps the cover page styles isolated and avoids affecting any other page. The styles use existing CSS variables (`--bg-color`, `--text-color`, `--accent-color`) so the cover page matches the site's design language.

If the team later wants to move these styles into `style.css`, the class names are all prefixed with `cover-` to prevent collisions.

### Inline Links in Paragraph Text

The paragraph contains 7 links to existing pages:

| Link Text | Destination | Exists? |
|-----------|-------------|---------|
| "primary and secondary records" | `/records.html` | Yes |
| "sequence" | `/evidence.html` | Yes |
| "timeline" | `/timeline.html` | Yes |
| "interactive maps" | `/maps/maps.html` | Yes |
| "challenges" | `/challenge.html` | Yes |
| "resources" | `/resources.html` | Yes |
| "Luke Isham" | `/about.html` | Yes |

All 7 destinations are confirmed to exist in the `frontend/` directory.

---

## Verification Checklist (After Implementation)

1. [ ] Visit `https://www.thejesuswebsite.org/` → see the cover page (not a redirect)
2. [ ] Heading "The Jesus Website" is centred and uses Georgia serif
3. [ ] Subtitle uses Helvetica sans, uppercase, sage green accent colour
4. [ ] Image is centred, rounded corners, drop shadow (or placeholder is visible)
5. [ ] Paragraph text is left-aligned within the centred column
6. [ ] All 7 inline links navigate to the correct pages
7. [ ] "Explore the Records →" CTA button navigates to `/records.html`
8. [ ] Footer is visible at the bottom with copyright and action buttons
9. [ ] Footer buttons work (Copy URL, Copy Text, Save PDF, Export Slide)
10. [ ] No sidebar is visible
11. [ ] Page is responsive: readable on 320px mobile, 768px tablet, 1200px+ desktop
12. [ ] Lighthouse audit: Performance > 90, Accessibility > 95, SEO > 95
13. [ ] JSON-LD structured data validates at https://validator.schema.org
14. [ ] `robots.txt` and sitemap include `/` (not just `/records.html`)
