# Validation Checklist — timeline-label-position-fix

**Plan:** `setup/PLANS/New/timeline-label-position-fix.md`

## Code-level checks

- [ ] `admin/assets/js/admin-timeline/timeline-events.js` — `label.style.left` is `"-50px"` (not `x - 50 + "px"`).
- [ ] `admin/assets/js/admin-timeline/timeline-events.js` — `label.style.top` is `"-22px"` when `yOffset <= 0`, `"8px"` otherwise (not `y - 22 + "px"` / `y + 8 + "px"`).
- [ ] `admin/assets/js/admin-timeline/timeline-events.js` — `label.style.width` and `label.style.textAlign` unchanged.
- [ ] `admin/assets/js/admin-timeline/timeline-events.js` — `el.appendChild(label)` unchanged (label is still a child of the dot).
- [ ] No other files modified.

## Admin behaviour checks

- [ ] **All labels align with dots:** Every event dot has its label immediately above or below it, regardless of position on the canvas.
- [ ] **No label-compounding at large coordinates:** Events far from `(0,0)` have labels at the correct offset, not double the distance.
- [ ] **Clustered events:** When multiple events share the same `x` position, they stagger vertically (`yOffset`), and each label follows its dot correctly.
- [ ] **Truncated labels:** Long titles show ellipsis, label stays centered over the dot.
- [ ] **Hidden labels:** `labelMode === "hidden"` suppresses the label entirely.
- [ ] **Drag-and-drop:** Clicking and dragging a dot still triggers the correct drag handler (label is a child so pointer events bubble).
- [ ] **Click-to-select:** Clicking a dot selects the event and opens the edit panel.

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (admin-only change).
