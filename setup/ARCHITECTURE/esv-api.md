# ESV API (Bible verse integration)

Scripture text comes from the Crossway ESV API through a server-side proxy, so
`ESV_API_KEY` never reaches the browser. Every verse element ships with
readable fallback text. The API only improves it.

**Source of truth:** `api/routes/esv.js` and `frontend/assets/js/esv_verse.js` — win any disagreement with this doc.
**Spans:** `api/routes/esv.js`, `api/server.js`, `frontend/assets/js/api.js`, `frontend/assets/js/esv_verse.js`, `frontend/assets/js/evidence-detail.js`, `frontend/about.html`, `frontend/assets/js/utils/content-markers.js`, `frontend/assets/js/utils/markdown.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The browser reaches the ESV API only through `getEsvPassage()` in `api.js` (JS-5), which calls `/esv/passage` | The proxy attaches the key. A browser-side call would need the key in the page source | The key is public. The page still works |
| Every `data-esv-ref` element contains real fallback text | `esv_verse.js` replaces only `textContent` and only after a successful fetch. An outage leaves the fallback | An empty element shows a blank gap during an ESV outage |
| Markup that a script inserts after page load calls `enhanceEsvVerses(root)` | `esv_verse.js` scans the document once, when it loads. `evidence-detail.js` renders its verse later and calls it | The verse stays as fallback text. No error appears |
| A citation `<a>` carries an `href` to esv.org | The script never touches `href`. The link is the full-chapter path for readers without the enhancement | The citation text is not a link |
| ESV citations come from static HTML or script-built markup, not from body fields | The body renderers escape raw HTML, so an `<a data-esv-ref>` typed into a body field shows as literal text | Authors see the markup as text. Nothing is enhanced |
| Each page that carries a `data-esv-ref` element loads `esv_verse.js` | The script is the only code that reads the attribute | The fallback text stays on the page forever |

## Shape

- `api/routes/esv.js` fetches the passage from upstream with the key. `api/server.js` mounts it under `publicReadLimit`.
- `frontend/assets/js/esv_verse.js` finds `[data-esv-ref]` elements and swaps in the returned text.
- Two sources produce `data-esv-ref` elements today: the static anchor in `frontend/about.html`, and the `<p>` elements that `evidence-detail.js` builds from `primary_verse` and `secondary_verse`.
- The body renderers are `content-markers.js` and `markdown.js`. Both escape raw HTML.

## Extending it

Adding verses to a new page type:

1. Add the element with `data-esv-ref` and real fallback text. For a link, add the `href` to esv.org.
2. Load `esv_verse.js` on the page.
3. If a script builds the element after page load, call `enhanceEsvVerses(root)` on the new markup.

## Not documented here

The reference validation, the upstream URL, the cache and the error codes are in
`api/routes/esv.js`.
