# Validation Checklist: Dashboard Back-Links in Editors

**Feature:** Add "← Dashboard" back-links to Timeline, Arbor, and Maps editor topbars

---

## Visual Inspection

- [ ] **Timeline Editor** (`/admin/diagrams/timeline.html`)
  - [ ] Back-link is visible in the topbar
  - [ ] Back-link appears next to (or after) "Timeline Editor" title
  - [ ] Link text is "← Dashboard" or similar
  - [ ] Link styling matches topbar aesthetic (color, font, alignment)

- [ ] **Arbor Editor** (`/admin/diagrams/arbor.html`)
  - [ ] Back-link is visible in the topbar
  - [ ] Back-link appears next to (or after) "Arbor Editor" title
  - [ ] Link text is "← Dashboard" or similar
  - [ ] Link styling matches topbar aesthetic

- [ ] **Maps Editor** (`/admin/diagrams/maps.html`)
  - [ ] Back-link is visible in the topbar
  - [ ] Back-link appears next to or after "Maps Editor" title (before subtitle)
  - [ ] Link text is "← Dashboard" or similar
  - [ ] Link styling matches topbar aesthetic

## Color & Styling

- [ ] All three back-links use consistent styling
- [ ] Base color is --text-secondary (#5C524A or equivalent in editor tokens)
- [ ] Hover color is --text-primary (#2C2522 or equivalent)
- [ ] Link appears clickable (cursor changes to pointer on hover)
- [ ] No !important flags in CSS
- [ ] Spacing between title and link is consistent (--space-md or --space-sm)

## Interaction

- [ ] **Timeline**: Click back-link → navigates to `/admin/index.html`
- [ ] **Arbor**: Click back-link → navigates to `/admin/index.html`
- [ ] **Maps**: Click back-link → navigates to `/admin/index.html`
- [ ] All three navigate correctly (no 404, no errors)

## Responsive Layout

- [ ] Links reflow gracefully on narrow viewports
- [ ] Topbar flex-wrap allows title + link to stack if needed
- [ ] No horizontal scroll introduced
- [ ] Mobile view (if applicable): link is still accessible and clickable

## Code Quality

- [ ] HTML: All `<a>` tags use href="/admin/index.html" (or relative path)
- [ ] HTML: No unnecessary classes or IDs on back-link
- [ ] CSS: Class names follow BEM (e.g., `.admin-timeline-topbar__back-link`)
- [ ] CSS: No unused or duplicate rules
- [ ] CSS: Respects existing spacing/color tokens
- [ ] No console errors when opening each editor

## Functionality

- [ ] Canvas still renders correctly after back-link addition (Timeline, Arbor, Maps)
- [ ] Toolbar buttons/controls not affected
- [ ] No event listener conflicts
- [ ] Holding pen / panels / modals work as before
- [ ] Zoom controls, save buttons, etc. unaffected

## Browser Compatibility

- [ ] Back-link visible and functional in Chrome/Chromium
- [ ] Back-link visible and functional in Firefox
- [ ] Back-link visible and functional in Safari

---

## Sign-Off

- [ ] All checks passed
- [ ] Ready to move plan to `setup/PLANS/Completed/`
- [ ] No additional fixes needed
