_Part of the [Style Guide](INDEX.md) — §14: content shortcodes & inline markers._

---

## 14. Content Shortcodes & Inline Markers

Evidence descriptions, contextual essays, responses, historiography articles, blog posts and challenge bodies share one inline-marker system. It places pictures, MLA citations and identifiers at exact points in body text. The parser is `frontend/assets/js/utils/content-markers.js`. The grammar for `[figure]` is in `utils/figure-shortcodes.js`.

### Standard Layout Mapping

Body text splits into paragraphs on blank lines. Inside a paragraph, a single line break becomes `<br>` (plain-text bodies). Blog, essay, response, historiography and challenge bodies also accept Markdown (§9).

#### Block-level markers

A block-level marker sits in its own paragraph and renders as a block at that point in the text.

##### Figure shortcode

```
[figure src="/assets/images/example.webp" caption="A first-century coin."]
```

Optionally floats right or left on screens ≥1024px:

```
[figure src="/assets/images/coin.webp" caption="A first-century coin." align="right"]
[figure src="/assets/images/coin.webp" caption="A first-century coin." align="left"]
```

- Write the attributes in this order, with double quotes: `src`, `caption`, `align`.
- `src` — path to the image, for example `/assets/images/example.webp`.
- `caption` — the visible caption and the image's alt text. The parser accepts a figure without one, but then the alt text is empty. Always write a caption.
- `align` — optional. `"left"` or `"right"` floats the figure as a 320px breakout on screens ≥1024px (§8 Pictures / Figures).
- Evidence descriptions: figures move to the Pictures section above the description, in the standard figure box (§9, Evidence Detail Page). Aligned figures keep their float.

##### Pull quote — `[pullquote]`

```
[pullquote]A memorable passage extracted from the article text.[/pullquote]
```

Blog posts only. Look: §9 Blog Posts.

#### Inline markers

An inline marker can sit anywhere inside a paragraph.

##### MLA citation — `[mla:N]`

```
According to recent scholarship[mla:7], the inscription dates...
```

- `N` is the `id` of an MLA source that is linked to the item (junction tables below).
- Essays, responses, historiography, challenges and evidence: a superscript link to that entry in the bibliography (`#mla-N`). The link text is the source's author, or `N` when the source has no author.
- Blog posts: an inline `(Author)`, or `(Source N)` when the source has no author. Blogs have no footnotes.
- A marker for a source that is not linked renders nothing.

##### Identifier — `[id:N]`

```
...the Nazareth inscription[id:12], which was discovered...
```

- `N` is the `id` of an identifier that is linked to the item.
- Renders as an inline badge. Label, first one that exists: `title`, manuscript number, IAA number, Pleiades name, source title, event name, individual, ISBN book title. With an `external_url`, the badge is a link with a small external-link icon.
- A marker for an identifier that is not linked, or that has no label, renders nothing.

### Junction tables

A marker resolves only against rows linked to the same item.

| Content type | MLA sources table | Identifiers table |
|---|---|---|
| Evidence | `evidence_mla_sources` | `evidence_identifiers` |
| Contextual essay | `context_essay_mla_sources` | `context_essay_identifiers` |
| Response | `response_mla_sources` | `response_identifiers` |
| Historiography | `historiography_mla_sources` | `historiography_identifiers` |
| Blog post | `blog_post_mla_sources` | `blog_post_identifiers` |
| Challenge | `challenge_mla_sources` | `challenge_identifiers` |

### Rules

1. **Markers reference linked rows only.** `[mla:N]` must match an `mla_sources.id` linked to the item. `[id:N]` must match an `identifiers.id` linked to the item. Anything else renders nothing.
2. **Markers resolve in the browser, at render time.** The database stores the body text unchanged. A marker holds a row `id`, not a position, so reordering the bibliography does not change what a marker points to.
3. **Figure numbering** runs after the body renders. Every `<figure>` in the container counts, including floated figures (§8 Pictures / Figures).

### Examples

#### Essay body with all marker types

```
The archaeological evidence for first-century Nazareth is limited but significant.

[figure src="/assets/images/nazareth-farm.webp" caption="Remains of a first-century farmstead near Nazareth." align="right"]

Recent excavations have uncovered several structures dating to the early Roman period[id:12]. As Meyers notes[mla:7], the agricultural nature of the settlement is well-attested.

However, some scholars dispute the dating of these structures[mla:15], arguing for a later period of construction.
```

#### Blog post with parenthetical citation

```
The question of Jesus's literacy has generated substantial debate in recent years.

[pullquote]The evidence suggests Jesus could read Hebrew scripture but probably could not write at a professional scribal level.[/pullquote]

This position is supported by archaeological findings from the region[mla:3].
```
