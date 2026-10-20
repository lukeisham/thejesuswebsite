# Accessibility

Every visitor, including keyboard and screen-reader users, can read the content and use the
interactive visuals. The shared templates and base styles give the structure. Each visual gives its own keyboard controls.

The target is WCAG ([WAI overview](https://www.w3.org/WAI/standards-guidelines/wcag/)).

**Source of truth:** `frontend/assets/css/base/invisible-header.css` and `frontend/assets/css/base/reset.css` — win any disagreement with this doc.
**Spans:** `frontend/assets/css/base/invisible-header.css`, `frontend/assets/css/base/reset.css`, `frontend/assets/js/utils/toasts.js`, `frontend/assets/js/arbor`, `frontend/assets/js/timeline`, `frontend/assets/js/maps`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Alt text for an uploaded image is stored next to the image reference in a `*_alt` column, not hard-coded (`image-display.md`) | An editor can change the text without a code edit | An image has the wrong alt text, or none |
| Each page's `<h1>` sits in the visually hidden header (`.sr-only` in `invisible-header.css`). Visible headings start at `<h2>` (HTML-3) | Screen readers need one `<h1>` and an unbroken heading order | The page has two `<h1>` elements, or a heading level is skipped |
| The global `:focus-visible` outline is in `reset.css`. Component CSS that removes it supplies a replacement | A keyboard user needs to see the focus | A control has no visible focus |
| Each page template carries `<a class="skip-link" href="#main-content">`. `.skip-link` is styled in `invisible-header.css` | A keyboard user can skip the navigation | A new template has no skip link |
| Arbor, timeline and maps interactions have keyboard equivalents. The `*-interactions.js` files handle the keys, and the `*-keyboard.test.js` files cover them | A pointer-only control locks out keyboard users | A new interaction works only with a mouse |
| Toast auto-dismiss durations are in `frontend/assets/js/utils/toasts.js`. `{ duration: 0 }` disables auto-dismiss | A message must stay long enough to read | A message disappears too fast to read |

Rows 2, 3, 4 and 5 are enforced by `api/tests/guide-accessibility.test.js` (TEST-10). Rows 1 and 6 are not.

## Shape

- **Page structure:** the page templates and `frontend/assets/css/base/`.
- **Visual controls:** `frontend/assets/js/arbor/`, `frontend/assets/js/timeline/` and `frontend/assets/js/maps/`.
- **Messages:** `frontend/assets/js/utils/toasts.js`.

## Extending it

1. Build the new control with a native element where one exists.
2. Add the key handling in the `*-interactions.js` file of the visual, and a `*-keyboard.test.js` case.
3. Test with the keyboard alone and with VoiceOver, and run a Lighthouse accessibility pass. Automated tools find only part of the problems.

## Not documented here

Touch-target sizes, the focus ring and colour rules are in `setup/STYLE_GUIDE/`.
