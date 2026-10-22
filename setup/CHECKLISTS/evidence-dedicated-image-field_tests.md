# Evidence Dedicated Image Field — Validation Tests

Manual validation checks and code-review criteria for the evidence dedicated image field plan.

---

## Plan: evidence-dedicated-image-field

**Date:** 2026-07-20

### Manual checks

**Database Migration**

- [ ] **Migration applies without errors** — on the deployed VPS, run `npm run migrate` or manually execute the migration; confirm `database/migrations/031_add_evidence_image.sql` applies successfully with no SQL errors.
- [ ] **New columns exist** — verify via SQLite shell (`sqlite3 database/thejesuswebsite.db`): run `.schema evidence` and confirm two new TEXT columns: `image` and `image_alt` both exist and are nullable.
- [ ] **Existing data preserved** — confirm all existing evidence records remain intact (row count unchanged, no NULL values where they weren't before except in the new columns).

**Admin — New Evidence**

- [ ] **New evidence editor loads** — open the admin interface, navigate to `/admin/evidence/` (index), click "Create New". The form loads without console errors.
- [ ] **Image picker appears and functions** — in the new evidence form, confirm a "Primary Image" section appears above the description textarea. Click "Choose Image", select a test image file. Confirm the file upload succeeds and a thumbnail displays.
- [ ] **Alt text field is present and wired** — in the image picker, confirm an "Alt Text" input field exists below the thumbnail. Type a caption; confirm it's editable.
- [ ] **Form submission includes image data** — submit the new evidence form with an image and alt text. On the server (in browser DevTools Network tab), inspect the POST payload: confirm `image` and `image_alt` fields are present and contain the uploaded image path and alt text.
- [ ] **Image persists in database** — query the database after form submission: confirm the new evidence record has values in `image` and `image_alt` columns.

**Admin — Edit Evidence**

- [ ] **Edit evidence editor loads existing image** — open an existing evidence record in the editor (one that you just created with an image, or one that has no image). The form loads without errors.
- [ ] **Image picker pre-populates** — for a record with an image, confirm the image picker displays the existing thumbnail and alt text. For a record without an image, confirm the picker shows the upload button but no thumbnail.
- [ ] **Image can be updated** — upload a new image in the edit form; confirm the old thumbnail is replaced with the new one. Save the form.
- [ ] **Image can be removed** — click the "Remove" button on the image picker; confirm the thumbnail and form field values clear. Save the form and verify the database record has NULL in `image` and `image_alt`.
- [ ] **Alt text can be edited independently** — change only the alt text (without changing the image file), save, and confirm the alt text updates in the database while the image path remains unchanged.

**Frontend — Detail Page with Primary Image**

- [ ] **Primary image displays at top** — open an evidence detail page that has a dedicated image (created/edited in admin). The image displays at the top of the Pictures section with the alt text from `data.image_alt`.
- [ ] **Image has correct alt text** — inspect the image element in DevTools: confirm the `alt` attribute contains the correct text from `image_alt`.
- [ ] **Image has lazy loading** — inspect the image element; confirm it has `loading="lazy"` attribute for performance.
- [ ] **Pictures section still renders shortcodes** — in an evidence record that has both a primary image AND a `[figure]` shortcode in the description, confirm both render in the Pictures section (primary image first, then shortcode figures).

**Frontend — Legacy Records**

- [ ] **Legacy record (shortcode only) still renders** — open an evidence detail page that has NO dedicated image but has `[figure]` shortcodes in the description. Confirm the Pictures section renders the figures extracted from shortcodes (backward compatibility).
- [ ] **Multiple shortcodes render correctly** — open a legacy record with multiple `[figure]` shortcodes; confirm all figures render in order in the Pictures section.
- [ ] **Shortcode figures are stripped from description** — in the same legacy record, scroll down to the description text; confirm the `[figure]` shortcode strings do NOT appear in the rendered description (they're only in the Pictures section).

**Performance & Accessibility**

- [ ] **No console errors on detail page** — open an evidence detail page in DevTools console; confirm no errors or warnings related to image loading, renderPictures, or data handling.
- [ ] **Image missing alt text (edge case)** — in admin, upload an image with empty alt text; save and view the detail page. The `<img>` should still have an `alt` attribute (confirm it exists, even if empty). No accessibility violation warnings should appear.
- [ ] **Image path is URL-safe** — verify that image paths uploaded via the picker are properly escaped and do not contain unsafe characters (check Network tab in DevTools for the actual image request URL).

### Code-review checks

**Database & Migrations**

- [ ] **SQL-1 & SQL-2** — migration uses prepared statements (if applicable) or raw SQL that is safe; all values come from hardcoded strings, not user input.
- [ ] **Idempotency** — migration can be re-run on a database that already has the columns without error or side effects.
- [ ] **Nullable columns** — `image` and `image_alt` are both nullable (NULL is a valid value for legacy records and records without a primary image).

**API — Model**

- [ ] **SR-1** — changes to `api/models/evidence.model.js` are focused; only `WRITABLE_COLUMNS` array is modified (no other unrelated refactoring).
- [ ] **JS-2 & SQL-2** — `WRITABLE_COLUMNS` whitelist includes only `"image"` and `"image_alt"`; no other fields are added; the array is still used to filter user input on all create/update operations.
- [ ] **Tests cover whitelisting** — `api/tests/models/evidence.model.test.js` includes tests verifying that stray fields like `some_other_image_field` are rejected by `updateComposite()`.
- [ ] **Tests cover nullability** — tests verify that `updateComposite({ image: null, image_alt: null })` is accepted (legacy records with no image).

**Admin — Editors**

- [ ] **SR-3 (Performance)** — `admin-image-picker.js` is loaded via `<script defer>` (not blocking page load); thumbnail rendering uses lazy-load or efficient rendering.
- [ ] **JS-2 & JS-6** — DOM is built using element factories (no `innerHTML`); event listeners are properly scoped; no global state pollution.
- [ ] **HTML-5** — image picker labels have proper `<label>` tags with `for` attributes; alt-text input is accessible.
- [ ] **Form submission wiring** — both `new.html` and `edit-[id].html` read the picker's values via `getValue()` method before form submission; values are included in the POST/PUT payload to `/api/evidence`.
- [ ] **Consistency** — new.html and edit-[id].html follow the same pattern for image picker mounting and form wiring (no divergence).

**Frontend — Detail Page**

- [ ] **JS-2 & JS-5** — image rendering is wrapped in try/catch; missing image paths are handled gracefully (image renders as broken if path is invalid, but doesn't break the page).
- [ ] **HTML-2** — every rendered `<img>` has an `alt` attribute; for primary image, alt comes from `data.image_alt`; for shortcode figures, alt comes from shortcode caption or is set to empty string.
- [ ] **Backward compatibility** — `renderPictures()` function signature change (added optional `primaryImage` parameter) does NOT break existing call sites; call sites without the parameter still work.
- [ ] **Shortcode fallback** — logic correctly extracts `[figure]` shortcodes from description only if `primaryImage` is not present, OR if present, extracts them after rendering the primary image.
- [ ] **Performance** — images use `loading="lazy"` to defer offscreen image loads; no performance regression in page load time.

**Shared**

- [ ] **No duplicate upload handler** — the plan uses the existing `Admin.uploadImage()` function (shared by blog, challenges, etc.); no new upload endpoint or handler is created.
- [ ] **Error messages** — if image upload fails, error message is clear and user-facing (via error toast); no stack traces leak to the frontend.
- [ ] **No interference with shortcodes** — changes to `renderPictures()` do NOT break the `AdminInsertImage` widget (used for inline figures); both features coexist without conflict.
