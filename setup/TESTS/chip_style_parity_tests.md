# Validation: Chip-Style Parity

**Plan:** `setup/PLANS/New/1-chip-style-parity.md`  
**Date:** 2026-08-03

---

## Manual checks

### Frontend Content Badges
- [ ] Evidence detail page badges display with 4px `border-radius`
- [ ] Badge padding is exactly `2px 8px` (tight, compact look)
- [ ] Badge font-size is `0.75rem` (small, `var(--text-2xs)`)
- [ ] Badge background is neutral surface-alt, not interactive on hover
- [ ] Badge border is neutral `1px solid var(--border)`, never changes
- [ ] NO era colour highlights on content badges (these are labels, not filters)
- [ ] Badges wrap naturally on evidence cards when multiple badges present

### Frontend Filter Chips (Era/Category)
- [ ] Filter chips in search page have pill-shaped `border-radius: 999px`
- [ ] Inactive filter chip: transparent background, neutral border, neutral text
- [ ] Hover filter chip: light background tint, neutral border, neutral text
- [ ] Active filter chip: accent border, accent text, light accent-tinted background
- [ ] **NEW**: Filter chips representing timeline eras have a `3px` left border with era colour (e.g., passion-week era chip has `#d4a0a0` left border)
- [ ] **NEW**: Active era filter chip: full era colour background (not just tint), full era colour left border, contrasting text
- [ ] Filter chip transitions smooth over `150ms ease-out`
- [ ] Filter chips are reachable via keyboard Tab and Space/Enter to toggle

### Admin Arbor Holding Pen Chips
- [ ] Arbor pen chips use **only admin tokens** (no `--bg-primary`, `--border`, `--text-primary` leaks from frontend)
- [ ] Arbor pen chip background is `--admin-bg` or `--admin-surface`
- [ ] Arbor pen chip border is `1px solid --admin-border`
- [ ] Arbor pen chip text is `--admin-text-primary`
- [ ] Arbor pen chip padding is `4px 8px` using admin space scale (`var(--space-xs)` `var(--space-sm)`)
- [ ] Arbor pen chip font-size is `0.875rem` (small, `var(--text-small)`)
- [ ] Arbor pen chip border-radius is `4px` (`var(--radius-sm)`)
- [ ] Arbor pen chip is draggable (cursor changes to `grab`)
- [ ] Arbor pen chip hover: subtle shadow + light background tint
- [ ] Arbor pen chip dragging: opacity `0.4` visual feedback

### Admin Timeline Era Filter Chips
- [ ] Timeline era filter chips use **only admin tokens**
- [ ] Inactive era chip: neutral background (`--admin-surface`), neutral border (`--admin-border`), neutral text
- [ ] Inactive era chip: `3px` left border in neutral border colour (not era tint)
- [ ] Inactive era chip padding is `4px 8px` (`var(--space-xs)` `var(--space-sm)`)
- [ ] Inactive era chip font-size is `0.8125rem` (small, `var(--text-xs)`)
- [ ] Inactive era chip border-radius is `6px` (admin convention, consistent with other admin chips)
- [ ] Active era chip: full era colour background (e.g., `--era-passion-week` = `#d4a0a0`)
- [ ] Active era chip: full era colour left border (`3px`)
- [ ] Active era chip: contrasting text (light on dark eras, dark on light eras)
- [ ] Active era chip: bold font-weight (`600`)
- [ ] All 8 era classes have correct colour mappings: pre-incarnation, old-testament, early-life, life, galilee-ministry, judean-ministry, passion-week, post-passion

### Admin Table Badges (Publish/Draft Status)
- [ ] Table badge padding is `2px 8px` (consistent with frontend badges)
- [ ] Table badge border-radius is `6px` (standardised from old `12px`)
- [ ] Table badge font-size is `0.8125rem` (standardised from hardcoded `11px`)
- [ ] Published badge: green background (`--admin-success` tint), green text
- [ ] Draft badge: yellow-grey background (`--admin-draft-bg`), yellow-grey text (`--admin-draft-color`)
- [ ] Badges are read-only labels, no hover state

### Admin Arbor Canvas Badges (Publish/Draft Status)
- [ ] Arbor badge padding is `1px 6px` (compact for canvas overlay)
- [ ] Arbor badge border-radius is `6px` (standardised from old `4px`)
- [ ] Arbor badge font-size is `0.8125rem` (standardised from hardcoded `10px`)
- [ ] Arbor badge no longer has `text-transform: uppercase` (removed for consistency)
- [ ] Published badge: green background, green text (matches table badge colour scheme)
- [ ] Draft badge: yellow-grey background, yellow-grey text (matches table badge colour scheme)

### Admin Analytics Date-Range Chips
- [ ] Analytics chip padding is `4px 8px` (standardised from hardcoded `6px 14px`)
- [ ] Analytics chip font-size is `0.875rem` (standardised from hardcoded `13px`)
- [ ] Analytics chip border-radius is `20px` (pill shape, retained for visual identity)
- [ ] Inactive chip: neutral background and border
- [ ] Active chip: accent background, accent border, white/contrast text
- [ ] Chips are interactive buttons (keyboard accessible)

### Admin Resources Pen Chips
- [ ] Resources pen chips use **only admin tokens**
- [ ] Resources pen chip padding is `4px 8px` (`var(--space-xs)` `var(--space-sm)`)
- [ ] Resources pen chip font-size is `0.875rem` (standardised from hardcoded `13px`)
- [ ] Resources pen chip border-radius is `4px` (`var(--admin-radius-sm)`)
- [ ] Resources pen chip background is `--admin-bg`
- [ ] Resources pen chip border is `1px solid --admin-border`
- [ ] Resources pen chip text is `--admin-text-primary`
- [ ] Resources pen chip displays resource title, origin URL, and delete button

### Admin Maps Holding Pen Chips
- [ ] Maps holding-pen chips use **only admin tokens** (no frontend token leaks)
- [ ] Holding-pen chip background is `--admin-surface`
- [ ] Holding-pen chip border is `1px solid --admin-border`
- [ ] Holding-pen chip border-radius is `4px` (`var(--admin-radius-sm)`)
- [ ] Holding-pen chip text is using admin text tokens
- [ ] Holding-pen chip is draggable with `grab` cursor

### Style Guide Documentation
- [ ] Style Guide §8 (Components) expanded with full canonical chip spec
- [ ] Chip specification includes shape, size, typography, padding, radius, hover/active/focus states
- [ ] Chip specification documents era colour highlight (left-border tint) with application rules
- [ ] New subsection "Filter Chips" added to §8 documenting era-aware filter styling
- [ ] Chip type classification table present, mapping types to sizing/spacing for frontend and admin
- [ ] Website Guide updated with "No Cross-Import Rule" clarification

---

## Code-review checks

- [ ] **CSS-1** — Each chip component file is under 150 lines and styles one concern only
- [ ] **CSS-2** — All padding, font-size, colors, border-radius use custom properties (no hardcoded px values for design tokens)
- [ ] **CSS-3** — Media queries (if any) live in the same file as the component they affect
- [ ] **CSS-4** — Class names are semantic: `.filter-chip` describes what it is (a chip used for filtering), not how it looks
- [ ] **CSS-5** — No `!important` anywhere. Specificity is kept low with single classes. No IDs.
- [ ] **Website Guide principle** — Frontend and admin CSS files do not cross-import. Each system uses only its own token set. Visual parity achieved through spec alignment, not shared stylesheets.
- [ ] **No frontend token leaks in admin CSS** — `--bg-primary`, `--border`, `--text-primary`, `--radius-sm` do not appear in admin CSS files. Admin files use `--admin-*` equivalents or hardcoded values.
- [ ] **No admin token leaks in frontend CSS** — `--admin-surface`, `--admin-border`, `--admin-text-primary` do not appear in frontend CSS files.
- [ ] **Era tokens correctly scoped** — Both frontend and admin define identical `--era-*` tokens in their respective variables.css files. CSS references use `var(--era-passion-week)` etc., not hardcoded hex values.
- [ ] **Hardcoded values eliminated** — Removed hardcoded `font-size: 11px`, `font-size: 10px`, `padding: 6px 14px`, `border-radius: 12px`, `border-radius: 20px` replaced with appropriate tokens where applicable.
- [ ] **Transitions consistent** — All interactive chips use `var(--duration-fast)` (150ms) and `var(--ease-out)` for state changes (hover, active).
- [ ] **Focus states present** — Interactive chips (filter-chip, analytics-chip, era-filter-chip) have `focus-visible` outlines using accent colour with `2px offset`.
- [ ] **Disabled/dragging states** — Draggable chips (arbor pen, resources pen, maps holding pen) correctly show `opacity: 0.4` when dragging or disabled.

---

## Integration checks

- [ ] **Frontend filter-chip era classes** — Evidence search page, timeline page, and maps page render filter chips with correct `.era--<kebab-era>` class names where applicable. Verified via `read_page` class list inspection.
- [ ] **Admin timeline-era-filter era classes** — Admin timeline diagram renders filter chips with `.era--<kebab-era>` class names. Verified via `read_page` class list inspection.
- [ ] **No console CSS errors** — Open browser DevTools console after each page load; confirm no "undefined variable" or "invalid property value" messages related to CSS custom properties.
- [ ] **No regressions in existing features** — Run `npm test` in `api/` directory; confirm all tests still pass (no breaking CSS changes to JavaScript-dependent UI).
- [ ] **Admin pages accessible after changes** — Log into admin, navigate to arbor.html, timeline.html, analytics.html, maps.html, and at least one resources page. Confirm all chips render and remain interactive (keyboard + mouse).

