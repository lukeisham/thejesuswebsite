# Content Shortcodes & Inline Markers

The five long-form content types (contextual essays, responses, historiography articles, blog posts, and evidence descriptions) share a single inline-marker system for positioning pictures, MLA citations, and unique identifiers at exact points inside body text.

## Standard Layout Mapping

Body text is plain text split into paragraphs on blank lines (double-newline).

### Block-level markers

Block-level markers occupy their own paragraph (a line surrounded by blank lines) and render as a block element at exactly that point in the text flow.

#### Figure shortcode

```
[figure src="/assets/images/example.webp" caption="A first-century coin."]
```

Optionally floats right or left on screens ≥1024px:

```
[figure src="/assets/images/coin.webp" caption="A first-century coin." align="right"]
[figure src="/assets/images/coin.webp" caption="A first-century coin." align="left"]
```

- `src` — path to the image, e.g. `/assets/images/example.webp`
- `caption` — alt text and visible caption (required for accessibility)
- `align` — optional; `"left"` or `"right"` to float the figure as a 320px breakout on desktop screens

### Inline markers

Inline markers may occur anywhere inside a paragraph's prose text.

#### MLA citation — `[mla:N]`

```
According to recent scholarship[mla:7], the inscription dates...
```

- `N` is the `id` of an MLA source already linked to the content item via its junction table (e.g. `context_essay_mla_sources`).
- Renders as a superscript citation link jumping to that entry in the bibliography (for essays, responses, historiography, and evidence).
- On blog posts, renders as an inline parenthetical `(Author)` — blogs have no footnote/bibliography system per the Style guide.
- A marker referencing a source **not linked** to the item renders nothing.

#### Identifier — `[id:N]`

```
...the Nazareth inscription[id:12], which was discovered...
```

- `N` is the `id` of an identifier linked to the content item via its junction table (e.g. `context_essay_identifiers`).
- Renders as an inline badge showing the identifier's most meaningful label (manuscript number, IAA number, Pleiades name, etc.).
- A marker referencing an identifier **not linked** to the item renders nothing.

### Evidence descriptions

The evidence pictures grid above the description is unchanged. However, the `description` field supports `[mla:N]` and `[id:N]` inline markers exactly like the four long-form body fields. Markers resolve against that evidence row's own `evidence_mla_sources` and `evidence_identifiers` junction rows.

### Blog pull-quote shortcode

Blog posts also support a pull-quote block shortcode (no other content type uses this):

```
[pullquote]A memorable passage extracted from the article text.[/pullquote]
```

## Rules

1. **Markers reference existing linked rows only.** `[mla:N]` must match an `mla_sources.id` already linked to the item; `[id:N]` must match an `identifiers.id` already linked. Unlinked markers render nothing.
2. **Marker resolution is client-side at render time.** The stored body text stays plain Markdown-like syntax. Ids remain stable even if source text is edited later.
3. **Figure numbering** is injected automatically by the frontend after body rendering — floated figures participate in the sequential count.
4. **No database changes needed.** Markers are parsed from the existing body text fields at render time.

## Examples

### Essay body with all marker types

```
The archaeological evidence for first-century Nazareth is limited but significant.

[figure src="/assets/images/nazareth-farm.webp" caption="Remains of a first-century farmstead near Nazareth." align="right"]

Recent excavations have uncovered several structures dating to the early Roman period[id:12]. As Meyers notes[mla:7], the agricultural nature of the settlement is well-attested.

However, some scholars dispute the dating of these structures[mla:15], arguing for a later period of construction.
```

### Blog post with parenthetical citation

```
The question of Jesus's literacy has generated substantial debate in recent years.

[pullquote]The evidence suggests Jesus could read Hebrew scripture but probably could not write at a professional scribal level.[/pullquote]

This position is supported by archaeological findings from the region[mla:3].
```
