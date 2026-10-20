# Architecture reference

Load-bearing decisions that span more than one file.

`setup/ARCHITECTURE/Website_guide.md` is the entry point: the project map and the
cross-module patterns. The other files in this directory each cover one subsystem. The same gate applies to all of them.

---

## The gate

A sentence may live in this directory only if it passes **both** tests:

1. **Load-bearing** — violating it breaks something, and the break is *silent*.
   No test fails, no error appears; the site is just quietly wrong. If breaking
   the rule produces a red test or a stack trace, the codebase already defends
   itself and the sentence is redundant.
2. **Cross-file** — no single file can tell you it. If one file answers the
   question, that file is the documentation; link to it instead.

Everything that passes is a *constraint on future edits*. Everything that fails
is either code's job or trivia. When in doubt, cut it.

## The ban list

These rot fastest and are the reason docs stop being believed. None of them
belong here, ever:

| Banned | Why | Where it lives instead |
|---|---|---|
| Counts and tallies (88 codes, 25 signals, 254 articles) | Wrong the next time someone adds one | Read the file |
| Pixel values, colours, font sizes | Style guide owns these | `setup/STYLE_GUIDE/` |
| Code snippets over ~3 lines | Becomes a second copy that silently diverges | The source file |
| Byte sizes, disk footprints, memory budgets | Change with every dependency bump | Measure it |
| Version numbers, dependency lists | `package.json` is the truth | `package.json` |
| Dated narratives, changelogs, "we used to X, now Y" | This is an audit log, not architecture | Git history |
| Migration history between internal versions | Same — the current shape is all that matters | Git history |
| Status reports ("Plan 9 approved", "57 tests passing") | True for a week | The plan, the test run |
| Full file listings / directory dumps | `ls` is faster and never lies | The filesystem |

**The tell:** if a sentence would still be *interesting* in a retrospective but
would not *change what you write today*, it is history. Delete it.

## File template

Every subsystem file uses these sections, in this order, with nothing else
at the top level. If your content doesn't fit the template, that is the template
telling you it doesn't belong here.

```markdown
# <Subsystem>

<Two or three sentences: what it is, what problem it solves. No history.>

**Source of truth:** `path/to/file` — wins any disagreement with this doc.
**Spans:** `fileA`, `fileB`, `fileC` — change one, check the others.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|

## Shape

<Which module owns what. Pointers, not contents. Keep under ~10 lines.>

## Extending it

<Ordered steps for the change people actually make to this subsystem.>

## Not documented here

<The volatile detail, and where to read it. Deliberately excluded.>
```

An Invariants row belongs here only if the constraint is **genuinely
cross-file**: it spans two or more modules/directories and no single file
states it. Anything a single file can state moves to that file as a code
comment instead — that is **SR-6** in `setup/Vibe_coding_rules.md` (code is
self-explanatory; guides are for the rest). A row that merely echoes what a
code comment now says gets deleted, not kept as a reminder.

Two sections carry most of the anti-drift weight:

- **Spans** makes staleness *mechanically detectable* — see the checker below.
- **Not documented here** is the pressure valve. It tells the next reader where
  the pixel values and the thresholds are, so they don't feel the urge to paste
  them back in. Without it, detail creeps back within a few sessions.

The **Breaks silently if violated** column is the gate made into a form field.
If you can't fill it in, the row fails test 1 — cut the row.

## Keeping it true

Periodic review does not keep a doc true, because reviews get skipped. Tie each
update to the edit that invalidates it.

**1. The checker.** Run it whenever you touch documented code:

```bash
node setup/scripts/check-architecture-docs.js
```

- Verifies every repo path mentioned in these docs still exists. Moved and
  renamed files are the single most common form of decay, and this catches all
  of them.
- With `--touched`, reads your uncommitted changes and prints which docs claim
  something about the files you just edited — your re-read list.

It cannot verify that a *claim* is true. It verifies only that the anchors resolve.

**2. The workflow hook.** CORE-5 in `setup/Vibe_coding_rules.md` requires each
guide to match the files you edit. Run `node setup/scripts/check-architecture-docs.js --touched`
before you call work finished, and update or delete anything it flags as stale. That is the
enforcement point — not a calendar reminder.

**3. Deletion is maintenance.** A row you can no longer justify gets deleted,
not marked deprecated or moved to a history section. There is no archive here;
git already is one.

> **Not in CI.** These docs and the checker are `.gitignore` exceptions, so
> they are on GitHub and the VPS. No CI job runs the checker. The Definition
> of done is the only enforcement point.

---

## Files

| File | Covers |
|---|---|
| [`Website_guide.md`](Website_guide.md) | Entry point — project map, cross-module patterns (visual split, editor bridges, frontend/admin split), running locally |
| [`publishing-pipeline.md`](publishing-pipeline.md) | Draft to publish, static pages, first-paint snapshots, partial saves, and the steps to add a content entity |
| [`deployment.md`](deployment.md) | Local to GitHub to VPS, the deploy order, the webhook restart, the nginx symlink |
| [`performance-and-caching.md`](performance-and-caching.md) | Cache lifetimes by file type, edge cache, lazy loading and the first-paint snapshot |
| [`accessibility.md`](accessibility.md) | Heading order, skip link, focus, keyboard controls on the visuals, toasts |
| [`image-display.md`](image-display.md) | Figures vs thumbnails — the two image patterns, figure numbering, lazy loading |
| [`esv-api.md`](esv-api.md) | ESV verse proxy and the `data-esv-ref` client contract |
| [`analytics.md`](analytics.md) | Page-view analytics: what the browser sends, what the server derives, the public write route and the admin reads |
| [`journal-article-fields.md`](journal-article-fields.md) | Abstract, response strength and footnotes: columns, the `[fn:N]` marker, validation limits shared with the admin |
| [`timeline.md`](timeline.md) | Timeline: offsets and geometry shared by the editor and the public page, era band, zoom stacks, labels, snapshot |
| [`arbor.md`](arbor.md) | Arbor: the edge route shared by the editor and the public page |
| [`maps.md`](maps.md) | Maps: pin fanning shared by the editor and the public page, and the check of the maps against AD 30 |
| [`error-notification.md`](error-notification.md) | Route error codes, the not-found code contract, and how pages show failures |
| [`wikipedia-ranking-pipeline.md`](wikipedia-ranking-pipeline.md) | Scoring pipeline, deploy-time import, vector sidecar and store sync |
| [`wikipedia-quality-grid.md`](wikipedia-quality-grid.md) | Signal grid, score panel, tooltip and copy button on the Wikipedia list |

Adding a subsystem: new file on the template, new row here. Never a new section
in `Website_guide.md`.
