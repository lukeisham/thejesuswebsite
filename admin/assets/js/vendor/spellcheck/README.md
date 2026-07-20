# Vendor: Spellcheck Libraries

This directory holds pre-built browser-compatible spellcheck/grammar libraries
loaded only by admin pages (never referenced from `frontend/`).

## Current approach

`spellcheck-worker.js` (a module Web Worker) imports the vendored `nspell.js`
directly via a top-level ESM `import` and loads the Hunspell `dictionary-en`
affix/dictionary files with `fetch()` at worker startup. Because the worker is
created with `{ type: "module" }`, the import works from inside the worker
script itself — no `<script>` tag is needed on the admin HTML pages.

If the nspell bundle or dictionary files fail to load (network error, parse
error, 404), the worker logs a `console.warn` and falls back to the built-in
~5,000-word `check()`/`checkGrammar()` engine in `spellcheck-engine.js` for
that session (JS-2: never fail silently). The message protocol (`{ text,
dictionaryWords }` in, `{ spellingErrors, grammarErrors }` out) is identical
either way, so the controller and overlay need no changes.

## Files present here

- `nspell.js` — nspell@2.1.5 (MIT), rebuilt as an ESM browser bundle with
  `esbuild --bundle --format=esm --platform=browser` from an entry module
  re-exporting nspell's default export (nspell ships only a CommonJS build on
  npm, so this project vendors a self-built ESM version rather than fetching
  a prebuilt one — no such bundle is published to jsDelivr). Source:
  https://github.com/wooorm/nspell. To regenerate: `npm install nspell
  esbuild`, then `esbuild entry.js --bundle --format=esm --platform=browser
  --outfile=nspell.js` where `entry.js` is `export { default } from "nspell"`.
- `dictionary-en.aff` / `dictionary-en.dic` — dictionary-en@4.0.0
  ((MIT AND BSD)), the `en_US` Hunspell dictionary from
  https://github.com/wooorm/dictionaries. ~49,500 dictionary entries; Hunspell
  affix rules expand this to roughly 170,000 recognized surface word forms.
  Fetched at runtime by the worker relative to its own script location, so
  they must stay alongside `nspell.js` in this directory.

## Upgrading to retext (not yet done)

Grammar checking still uses the rule-based `checkGrammar()` in
`spellcheck-engine.js` (passive voice, repeated words, indefinite articles).
`retext` + plugins are ESM-only and expect a bundler; the same vendoring
approach used for nspell above (fetch the npm package, bundle with esbuild
`--format=esm --platform=browser`, commit the output) would apply if this is
picked up later.
