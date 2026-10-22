# Tests: Site Settings Wiring

**Plan:** `setup/PLANS/New/site-settings-wiring.md`
**Date:** 2026-07-10

## Automated

### API — Model

- [x] `cd api && node --test tests/site-settings-model.test.js` passes

Tests:
- `get()` returns the seeded row with title, description, og_image
- `update({ title: "New Title" })` persists and returns updated row
- `update({})` returns `undefined` (route maps this to 400)
- `update({ invalid_column: "x" })` — `pickWritable` rejects unknown columns
- `update({ title: "" })` — blank title is **dropped**, not persisted (title is
  NOT NULL; the existing value is preserved rather than blanked). A payload
  that is blank in every field returns `undefined`.
- `update()` returns the full row after update (all columns present)

### API — Route

- [x] `cd api && node --test tests/site-settings-route.test.js` passes

Tests:
- `GET /api/site-settings` returns 200 with `{ title, description, og_image }`
- `PUT /api/site-settings` with valid auth session returns 200 with updated row
- `PUT /api/site-settings` without auth returns 401
- `PUT /api/site-settings` with empty body `{}` returns 400 `{ error: "…" }`
- `PUT /api/site-settings` with a valid payload persists — subsequent GET returns the new values

### Admin JS — Settings Page

- [x] `cd admin && node --test tests/settings.test.js` passes

This project's `admin/tests/` suite has no DOM implementation (SR-2: no new
dependencies, so no jsdom) — every existing admin test file replicates pure
logic in plain Node rather than exercising real DOM. `settings.test.js`
follows that pattern: it tests the character-counter calculation and the
snake_case (`og_image`) ⇄ camelCase (`ogImage`) field-key normalisation on
load and save. Actual DOM structure (labelled inputs, hint text, image
preview, disabled-while-saving button, styled messages) was verified in a
live browser session instead — see the Manual Verification section below,
all of which passed.

## Manual Verification

### Settings Page — Data Loading

- [x] Open `admin/settings/index.html` — page shows "Loading settings…" briefly
- [x] Form loads with **pre-filled values** matching the database (not empty)
- [x] Site Title field shows current title
- [x] Site Description field shows current description
- [x] Default OG Image URL field shows current URL
- [x] If the API fails, shows a clear error message (not silent empty fields)

Verified via a live browser session (Chrome preview against the local dev
servers) hitting the real `GET /api/site-settings` endpoint — fields
pre-filled with `"The Jesus Website"`, the seeded description, and the
seeded OG image URL. `AdminAuth.requireSession()` itself could not be
exercised end-to-end (no WebAuthn passkey is enrolled in this dev
environment), so this was verified by mounting the same DOM-building code
directly; the pre-existing session-redirect guard is unchanged from before
this plan.

### Settings Page — Helper Text

- [x] Site Title field has helper text: "Appears in browser tabs, search results, social sharing cards, and the site header."
- [x] Site Description field has helper text: "Appears in search result snippets and social sharing cards. Keep under 160 characters."
- [x] Default OG Image field has helper text: "The image shown when any page on the site is shared on social media. Used as a fallback when a content page has no image of its own."

### Settings Page — Character Counter

- [x] Below the Description textarea, a character counter shows "X / 160 characters"
- [x] Typing in the textarea updates the counter in real time
- [x] Counter turns red when > 160 characters (`.settings-char-counter--over`, `var(--admin-danger)`)
- [x] Counter is accurate (counts actual characters, including spaces)

### Settings Page — OG Image Preview

- [x] When the OG Image URL field is empty, no preview is shown
- [x] Entering a valid image URL shows a small thumbnail (120px wide, `var(--admin-radius-sm)` border-radius)
- [x] Entering an invalid/broken URL shows no preview (`onerror` hides it silently)
- [x] The preview updates on blur of the OG Image field

### Settings Page — Save Behaviour

- [x] Clicking "Save Settings" disables the button (shows "Saving…")
- [x] Button is re-enabled after the request completes (success or error — `finally` block)
- [x] Double-clicking rapidly doesn't send two requests (button is disabled synchronously before the request starts)
- [x] On success: green success message appears below the form ("Settings saved successfully.")
- [x] On error: red error message appears ("Error: …" with description)
- [x] Success/error message uses the page's `.settings-message`/`--success`/`--error` classes (`--admin-success-color`/`--admin-error-color` tokens), not raw inline styles

### Settings Page — Save then Refresh

- [x] `PUT /api/site-settings` with a new title, then `GET /api/site-settings` reflects the change — covered by `api/tests/site-settings-route.test.js` ("returns 200 and persists a valid payload")
- [x] Change Description, save, refresh — new description persists (same route test, same request)
- [x] Change OG Image URL, save, refresh — new URL persists (same route test, same request)

### Page Generator

- [x] Update site title via Settings to a test value
- [x] Publish (insert + `published_draft = 1`) a temporary evidence item, run `cd api && npm run pages`
- [x] Generated `[slug].html` — `<title>` ends with `— Evidence — <site title>`
- [x] `og:site_name` matches the configured site title
- [x] Content item with no hero image — `og:image` and `twitter:image` fall back to the configured default OG image
- [x] Reverted title and removed the temporary evidence item/generated file after testing

### Frontend Dynamic Patcher

- [x] Open `frontend/index.html` proxied to the API
- [x] View Page Source — original hardcoded values are present (static HTML, SEO baseline; patch happens client-side after load)
- [x] After page load, `<title>`, `og:site_name`, `og:title`, `twitter:title`, the sr-only `<h1>`, the visible `.home-title` heading, the nav brand link, and the JSON-LD `WebSite` `name` all match the DB value
- [x] Changed site title via the DB to a test value, reloaded `index.html` — all of the above updated
- [x] Page-specific custom titles (e.g. `about.html`'s `"About — <title>"`) keep their unique prefix — only the shared `<title>` suffix and nav brand update, confirming the patcher never overwrites per-page text
- [x] Reverted title to `"The Jesus Website"` after testing

### Passkey Management (Regression)

- [ ] Passkey list still loads correctly below the settings form
- [ ] "Add a Passkey" button triggers the WebAuthn ceremony
- [ ] "Remove" button shows confirmation dialog and deletes on confirm
- [ ] Passkey section is visually separated from the settings form (border-top divider)

Not exercised — this dev environment has no enrolled passkey/authenticator
to complete a WebAuthn ceremony. The passkey section's markup/init call
(`window.Admin.Credentials.init(passkeysContainer)`) is unchanged from the
prior version of this page; only its container's CSS class changed name
(`settings-passkeys`, same visual rules — border-top divider, max-width,
spacing — as the previous inline styles).

### Existing Functionality (Regression)

- [x] All existing API test suites still pass: `cd api && npm test` (see Definition of Done below)
- [ ] All other admin pages (evidence, essays, debate, blog, etc.) load and function normally — not individually re-checked; unaffected by this plan's changes (no shared files touched outside `admin/settings/index.html`, `frontend/assets/js/api.js`, and the ~61 hand-written frontend pages' added `<script>` tag)

## Notes

- **Admin JS tests**: confirmed no `jsdom` (or any DOM shim) exists anywhere in this repo's test suites — every `admin/tests/*.test.js` file replicates pure logic in plain Node instead. `settings.test.js` follows that same pattern (SR-2: no new dependencies added to add one just for this plan).
- **OG Image preview**: The preview `<img>` tag sets `onerror` to hide itself gracefully when the URL is broken. No console noise, no broken image icon.
