# Validation Checklist — holding-pen-gallery-visibility

**Plan:** `setup/PLANS/New/holding-pen-gallery-visibility.md`

## Code-level checks

- [ ] `admin/assets/js/admin-maps/maps-gallery.js` — `Gallery.show()` now hides `<main>` (mirrors the existing `Gallery.hide()` behaviour).
- [ ] `admin/assets/js/admin-maps/maps-gallery.js` — `Gallery.show()` line 173 (`pen.hidden = true`) is still intact.
- [ ] `admin/assets/js/admin-maps/maps-gallery.js` — `Gallery.hide()` line 196 (`pen.hidden = false`) is still intact.
- [ ] `admin/assets/js/admin-maps/maps-gallery.js` — `Gallery.hide()` line 192 (`main.hidden = false`) is still intact.

## Frontend verification (public pages)

- [ ] `frontend/evidence/maps/index.html` — does not reference the holding pen.
- [ ] `frontend/evidence/maps/galilee.html` — does not reference the holding pen.
- [ ] `frontend/evidence/maps/[map_key].html` — does not reference the holding pen.
- [ ] `frontend/assets/js/maps/` — no holding pen references in any JS module.
- [ ] `frontend/assets/css/pages/maps.css` and `frontend/assets/css/pages/maps/` — no holding pen styles.

## Admin behaviour checks

- [ ] **Initial load:** Navigate to admin Maps Editor → gallery cards are visible, no holding pen, no phantom gap.
- [ ] **Open a map:** Click a map card → holding pen renders above the canvas with unplaced evidence chips (or "No unplaced evidence" empty state).
- [ ] **Return to gallery:** Click "← All Maps" → gallery cards are visible, holding pen is hidden, no phantom gap below gallery.
- [ ] **Re-open a different map:** Click a different map card → holding pen renders with that map's unplaced evidence.
- [ ] **Save flow:** Place a chip onto the canvas, click Save → holding pen refreshes (placed evidence removed from pen).

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (admin-only change, no public URL changes).
