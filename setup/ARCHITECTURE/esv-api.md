# ESV API (Bible verse integration)

Scripture text is fetched from the Crossway ESV API through a server-side proxy,
so the `ESV_API_KEY` never reaches the browser. Every verse citation is
progressive-enhanced: the page ships with readable fallback text and the API
only ever improves it.

**Source of truth:** `api/routes/esv.js` and `frontend/assets/js/esv_verse.js` — win any disagreement with this doc.
**Spans:** `api/routes/esv.js`, `api/server.js`, `frontend/assets/js/api.js`, `frontend/assets/js/esv_verse.js`, every detail-page template that may carry a citation.

## Shape

- `api/routes/esv.js` — validates the reference, calls upstream with the key, caches the result in an in-memory `Map`, maps failures to `E-*` codes.
- Mounted in `api/server.js` under `publicReadLimit`, like every other public read route.
- `frontend/assets/js/api.js` — `getEsvPassage(ref)`, the only place the endpoint is called (JS-5).
- `frontend/assets/js/esv_verse.js` — finds `[data-esv-ref]` elements, swaps in the returned text, does nothing on failure.

The HTML contract is an `<a class="esv-verse" data-esv-ref="…" href="…">` whose
inner text is the fallback and whose `href` points at esv.org for the full
chapter. `.esv-verse` is deliberately unstyled — it inherits link appearance
from `typography.css`.

Citations authored inside body content survive `parseContentBody()`
(`content-markers.js`), which treats them as existing HTML and leaves them
alone. Static pages carry them directly in source.

## Extending it

Adding verses to a new page type:

1. Author the citation with both `data-esv-ref` and real fallback text — never an empty element. Every citation must carry hardcoded fallback text inside the element: the API is a third party that will be down sometime, and the fallback is what renders during an outage.
2. Load `esv_verse.js` on that page (it is already on evidence, essays, responses, blog, and about).
3. If the content passes through a renderer, confirm that renderer treats the anchor as HTML rather than escaping it.

## Not documented here

The validation regex and its length cap, the upstream URL, the response shape,
and the exact error codes — all in `api/routes/esv.js`, which is short enough to
read end to end.
