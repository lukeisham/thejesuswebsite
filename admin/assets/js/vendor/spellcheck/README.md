# Vendor: Spellcheck Libraries

This directory holds pre-built browser-compatible spellcheck/grammar libraries
loaded only by admin pages (never referenced from `frontend/`).

## Current approach

The spellcheck worker (`spellcheck-worker.js`) ships with a built-in English
dictionary (~5 000 common words) and rule-based grammar checks (passive voice,
repeated words, indefinite articles). This provides functional spellcheck out
of the box with zero npm dependencies.

## Upgrading to nspell + retext

To replace the built-in checker with full nspell/retext (as described in the
plan), follow these steps:

### 1. Obtain pre-built browser bundles

Since this project has no build step (no bundler, no npm in the project root),
each library must be vendored as a standalone browser-compatible file:

**nspell** (spellcheck):
- `nspell` itself: https://www.jsdelivr.com/package/npm/nspell
- `dictionary-en`: https://www.jsdelivr.com/package/npm/dictionary-en
  - The `.aff` and `.dic` files must be fetched at runtime; place them here
    and reference with a relative URL in the worker.

**retext** (grammar):
- `retext` + plugins are ESM-only and expect a bundler. The plan acknowledges
  this (see Notes § in `setup/PLANS/New/admin-spellcheck-widget.md`).
- A practical approach: use a CDN ESM build (e.g. esm.sh or skypack) via
  `import` in the worker, or pre-bundle with a one-time esbuild/rollup step
  and commit the resulting bundle.

### 2. Update the worker

Edit `admin-spellcheck/spellcheck-worker.js` to import nspell/retext instead of
using the built-in `BuiltinSpellchecker`. The message protocol (`{ text,
dictionaryWords }` in, `{ spellingErrors, grammarErrors }` out) stays the same,
so no other files need changes.

### 3. Update admin page script tags

Add `<script>` or `<script type="module">` tags for the vendored libraries
before the worker script on each admin page.

## Files expected here (once vendored)

- `nspell.js` — nspell browser build
- `dictionary-en.aff` — English hunspell affix file
- `dictionary-en.dic` — English hunspell dictionary file
- `retext.js` or `retext-bundle.js` — retext + plugin bundle
