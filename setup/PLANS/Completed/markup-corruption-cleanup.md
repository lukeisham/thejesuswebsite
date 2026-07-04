# Plan: Markup Corruption Cleanup

**Module(s):** Frontend / Admin
**Date:** 2026-07-02
**Status:** ✅ Complete

## Goal
Fix pervasive markup corruption discovered while investigating the journal-CSS bug (Issues.md #14): a stray or duplicated closing tag — almost always `</title>`, `</h1>`, `</h2>`, `</p>`, `</span>`, or `</script>` — has been spliced into 40 HTML files across `frontend/` and `admin/`, breaking `<title>`/`<meta>` tags, headings, paragraphs, `<link>`/`<script>` tags, and even landing inside HTML comments and CSS. A five-heuristic sweep (duplicate `</title>` count, duplicate `</h1>` count, same-tag-twice-on-one-line, cross-tag splice, and stray tags inside attribute values) was run across all 89 HTML files in the project to build the authoritative file list below — broader than the 22-file estimate first reported, and one initially-flagged file (`admin/auth/register.html`) was confirmed to be a false positive (two legitimate, complete, adjacent `<p>` tags in a JS string, not a splice) and is excluded.

Every task below has been pre-diagnosed with the exact corrupted line and its correct reconstruction, verified either from surrounding context in the file or from the equivalent line on a sibling page using the same template pattern. A few required reading extra context to disambiguate; those are called out explicitly.

## Coding rules to keep in mind
- **HTML-3** — the core symptom is broken heading structure (a split or duplicated `<h1>`/`<h2>`); every fix must leave exactly the heading structure the page originally intended, not a new one.
- **JS-2** — no automated blind find-replace across files; each fix is a manual, verified edit (this is why the plan enumerates every file individually rather than proposing a script).
- **SR-1** — each task is scoped to one file's specific corruption instance(s).

## Tasks

### Admin Pages

- [x] **Fix `admin/blog/edit-[id].html`** — line 6: `<title>Edit Blog Post —</title> Admin</title>` → `<title>Edit Blog Post — Admin</title>`. File: `admin/blog/edit-[id].html`
- [x] **Fix `admin/blog/index.html`** — line 8: stray `</title>` before the auth script tag (`</title>  <script defer src="../assets/js/auth.js"></script>`) → remove it, leaving `  <script defer src="../assets/js/auth.js"></script>`. File: `admin/blog/index.html`
- [x] **Fix `admin/blog/new.html`** — line 6: `<title>New Blog Post —</title> Admin</title>` → `<title>New Blog Post — Admin</title>`. File: `admin/blog/new.html`
- [x] **Fix `admin/debate/edit-[id].html`** — line 7: `<link</title> rel="stylesheet" href="../assets/css/admin.css">` → `<link rel="stylesheet" href="../assets/css/admin.css">`. File: `admin/debate/edit-[id].html`
- [x] **Fix `admin/debate/index.html`** — line 8: same stray-`</title>`-before-script pattern as `admin/blog/index.html` → remove it. File: `admin/debate/index.html`
- [x] **Fix `admin/debate/new.html`** — line 6: `<title>New Response —</title> Admin</title>` → `<title>New Response — Admin</title>`. File: `admin/debate/new.html`
- [x] **Fix `admin/essays/edit-[id].html`** — line 6: `<title>Edit Essay</title> — Admin</title>` → `<title>Edit Essay — Admin</title>`. File: `admin/essays/edit-[id].html`
- [x] **Fix `admin/essays/index.html`** — line 7: stray `</title>` before the stylesheet link (` </title> <link rel="stylesheet" href="../assets/css/admin.css">`) → remove it. File: `admin/essays/index.html`
- [x] **Fix `admin/essays/new.html`** — line 7: `<link rel</title>="stylesheet" href="../assets/css/admin.css">` → `<link rel="stylesheet" href="../assets/css/admin.css">`. File: `admin/essays/new.html`
- [x] **Fix `admin/news/index.html`** — line 7: `<link rel="stylesheet" href="../assets</title>/css/admin.css">` → `<link rel="stylesheet" href="../assets/css/admin.css">`. File: `admin/news/index.html`
- [x] **Fix `admin/resources/external-witnesses.html`** — line 8: `<script</title> defer src="../assets/js/auth.js"></script>` → `<script defer src="../assets/js/auth.js"></script>`. File: `admin/resources/external-witnesses.html`
- [x] **Fix `admin/resources/internal-witnesses.html`** — line 8: `<script defer src="../assets/js/auth.js</title>"></script>` → `<script defer src="../assets/js/auth.js"></script>`. File: `admin/resources/internal-witnesses.html`
- [x] **Fix `admin/resources/objects.html`** — line 7: `<link rel="stylesheet" href="../assets</title>/css/admin.css" />` → `<link rel="stylesheet" href="../assets/css/admin.css" />`. File: `admin/resources/objects.html`
- [x] **Fix `admin/resources/ot-verses.html`** — line 17, inside an inline `<style>` block: `color</title>: var(--admin-text-muted);` → `color: var(--admin-text-muted);`. Note: the stray tag landed inside CSS here, not HTML — double-check no sibling CSS property on adjacent lines was also affected before saving. File: `admin/resources/ot-verses.html`
- [x] **Fix `admin/resources/parables.html`** — line 7: `<link rel="stylesheet" href</title>="../assets/css/admin.css" />` → `<link rel="stylesheet" href="../assets/css/admin.css" />`. File: `admin/resources/parables.html`
- [x] **Fix `admin/resources/people.html`** — line 9: `</script</title>>` sits between `<script defer src="../assets/js/auth.js">` (line 8) and a second `<script defer src="../assets/js/admin.js">` (line 10) → the stray `</title>` fragment is spliced into what should simply be `</script>` (closing the auth.js script tag). File: `admin/resources/people.html`
- [x] **Fix `admin/wikipedia/index.html`** — line 7: stray `</title>` before the stylesheet link (`</title>  <link rel="stylesheet" href="../assets/css/admin.css">`) → remove it. File: `admin/wikipedia/index.html`

### Frontend Pages

- [x] **Fix `frontend/contextual-essays/[slug].html`** — line 6: `<title>Essay</title> — The Jesus Website</title>` → `<title>Essay — The Jesus Website</title>`. File: `frontend/contextual-essays/[slug].html`
- [x] **Fix `frontend/contextual-essays/index.html`** (4 instances) — line 6-7: `<meta name="description" content</title>="Contextual essays...">` → remove the stray `</title>` from inside `content=`; line 37: `<h1>Context</h1>ual Essays</h1>` → `<h1>Contextual Essays</h1>`; line 63: `<h2>Contextual Essays</h</h2>2>` → `<h2>Contextual Essays</h2>`; line 64: `<p>...for Jesus of</p> Nazareth.</p>` → `<p>...for Jesus of Nazareth.</p>`. File: `frontend/contextual-essays/index.html`
- [x] **Fix `frontend/debate/academic-challenges.html`** — line 6: `<title>Academic Challenges —</title> Debate — The Jesus Website</title>` → `<title>Academic Challenges — Debate — The Jesus Website</title>`; line 40, inside an HTML comment: `<!-- Off-can</h1>vas navigation sidebar -->` → `<!-- Off-canvas navigation sidebar -->`. The visible `<h1>` on line 37 is already correct — do not touch it. File: `frontend/debate/academic-challenges.html`
- [x] **Fix `frontend/debate/academic-challenges/[slug].html`** — line 6: `<title>Challenge — Debate</title> — The Jesus Website</title>` → `<title>Challenge — Debate — The Jesus Website</title>`. File: `frontend/debate/academic-challenges/[slug].html`
- [x] **Fix `frontend/debate/historiography.html`** — line 6-7: `<meta name="description" content</title>="Historiography articles...">` → remove the stray `</title>`; line 41, inside an attribute: `<div class</h1>="sidebar-backdrop" hidden></div>` → `<div class="sidebar-backdrop" hidden></div>`. The visible `<h1>` on line 37 is already correct — do not touch it. File: `frontend/debate/historiography.html`
- [x] **Fix `frontend/debate/historiography/[slug].html`** — line 7: `<meta name="description" content="A historiography article from</title> The Jesus Website.">` → `<meta name="description" content="A historiography article from The Jesus Website.">`. File: `frontend/debate/historiography/[slug].html`
- [x] **Fix `frontend/debate/historiography/index.html`** (2 instances) — line 7: ` </title> <meta name="description" content="Historiography articles...">` → remove the leading stray `</title> `; line 65: `<p>Articles examining how historians have studied</h2> Jesus over the centuries — the history of</p> the history.</p>` → `<p>Articles examining how historians have studied Jesus over the centuries — the history of the history.</p>`. File: `frontend/debate/historiography/index.html`
- [x] **Fix `frontend/debate/index.html`** (2 instances) — line 6: `<title>Debate &amp</title>; Discussion — The Jesus Website</title>` → `<title>Debate &amp; Discussion — The Jesus Website</title>`; line 37, inside a comment: `</h1>  <!-- Off-canvas navigation sidebar -->` → remove the stray `</h1>`; line 61: `<p>Explore popular and academic challenges to the historical Jesus, scholarly responses, and the</h2> historiography that</p> frames the debate.</p>` → `<p>Explore popular and academic challenges to the historical Jesus, scholarly responses, and the historiography that frames the debate.</p>`. The visible `<h1>` on line 34 is already correct — do not touch it. File: `frontend/debate/index.html`
- [x] **Fix `frontend/debate/popular-challenges.html`** (3 instances) — line 6: remove the duplicate trailing `</title>` (`...The Jesus Website</title></title>` → `...The Jesus Website</title>`); line 63: `<h2>Popular Challenges</h2></h2>` → `<h2>Popular Challenges</h2>`; line 64: `<p>Common objections and questions about the historical Jesus, ranked by frequency</p> and engagement.</p>` → `<p>Common objections and questions about the historical Jesus, ranked by frequency and engagement.</p>`. File: `frontend/debate/popular-challenges.html`
- [x] **Fix `frontend/debate/popular-challenges/[slug].html`** — line 7: ` </title> <meta name="description" content="A challenge to the historical Jesus from The Jesus Website.">` → remove the leading stray `</title> `. File: `frontend/debate/popular-challenges/[slug].html`
- [x] **Fix `frontend/debate/responses/[slug].html`** (2 instances) — line 6: remove the duplicate trailing `</title>`; line 117: `<span id="response-strength-dots"></span</span>>` → `<span id="response-strength-dots"></span>`. File: `frontend/debate/responses/[slug].html`
- [x] **Fix `frontend/debate/wikipedia.html`** (2 instances) — line 6: remove the duplicate trailing `</title>`; line 38, inside a comment: `<!--</h1> Off-canvas navigation sidebar -->` → `<!-- Off-canvas navigation sidebar -->`. The visible `<h1>` on line 35 is already correct — do not touch it. File: `frontend/debate/wikipedia.html`
- [x] **Fix `frontend/evidence/maps/galilee.html`** — line 6: `<title>Galilee</title> — The Jesus Website</title>` → `<title>Galilee — The Jesus Website</title>`. File: `frontend/evidence/maps/galilee.html`
- [x] **Fix `frontend/evidence/maps/jerusalem.html`** — line 9 (a multi-line meta description, check line 8 for the opening `<meta name="description"` before editing): stray `</title>` prefix before `content="Interactive map of Jerusalem..."` → remove it. File: `frontend/evidence/maps/jerusalem.html`
- [x] **Fix `frontend/evidence/maps/judea.html`** — line 9: `content="Interactive map of Judea featuring key locations</title> from the Gospels and biblical history."` → remove the stray `</title>` from inside the attribute value. File: `frontend/evidence/maps/judea.html`
- [x] **Fix `frontend/evidence/maps/roman-empire.html`** — line 8: `name="</title>description"` → `name="description"`. File: `frontend/evidence/maps/roman-empire.html`
- [x] **Fix `frontend/news-and-blog/blog/[slug].html`** — line 6: `<title></title>Blog Post — The Jesus Website</title>` → `<title>Blog Post — The Jesus Website</title>`. Note: this file also has two `<h1>` elements (the `.sr-only` header's and a second visible one at line 85) — that is a separate, likely-intentional matter (Style_guide.md's Blog Posts section explicitly specifies a visible `h1` title, unlike essays/responses/historiography), not part of this corruption pattern; do not touch it as part of this task. File: `frontend/news-and-blog/blog/[slug].html`
- [x] **Fix `frontend/news-and-blog/blog/index.html`** (2 instances) — line 6: remove the duplicate trailing `</title>`; line 37: `<h1>Blog — The Jesus</h1> Website</h1>` → `<h1>Blog — The Jesus Website</h1>`. File: `frontend/news-and-blog/blog/index.html`
- [x] **Fix `frontend/news-and-blog/index.html`** (2 instances) — line 6: remove the duplicate trailing `</title>`; line 38: `<h1>News &</h1>amp; Blog — The Jesus Website</h1>` → `<h1>News &amp; Blog — The Jesus Website</h1>`. File: `frontend/news-and-blog/index.html`
- [x] **Fix `frontend/news-and-blog/news/[slug].html`** — line 6: `<title>News Article —</title> The Jesus Website</title>` → `<title>News Article — The Jesus Website</title>`. Same note as the blog `[slug].html` file above regarding its second `<h1>` — out of scope here. File: `frontend/news-and-blog/news/[slug].html`
- [x] **Fix `frontend/news-and-blog/news/index.html`** (2 instances) — line 6: remove the duplicate trailing `</title>`; line 37: `<h1>News —</h1> The Jesus Website</h1>` → `<h1>News — The Jesus Website</h1>`. File: `frontend/news-and-blog/news/index.html`
- [x] **Fix `frontend/resources/index.html`** (3 instances) — line 6: `<title></title>Resources — The Jesus Website</title>` → `<title>Resources — The Jesus Website</title>`; line 32: `<h1>Resources — The Jesus Website</h1></h1>` → `<h1>Resources — The Jesus Website</h1>`; line 58: `<p>Curated, ranked lists for</h2> study</p> and reference — parables, manuscripts, people, sites, and more.</p>` → `<p>Curated, ranked lists for study and reference — parables, manuscripts, people, sites, and more.</p>`. File: `frontend/resources/index.html`
- [x] **Fix `frontend/resources/list.html`** — line 6: `<title>Resources</title> — The Jesus Website</title>` → `<title>Resources — The Jesus Website</title>`. File: `frontend/resources/list.html`

### Verification

- [x] **Re-run the corruption sweep and confirm zero remaining hits** — after all 40 files above are fixed, re-run the five detection heuristics used to build this plan (duplicate `</title>` count, duplicate `</h1>` count, same-tag-twice-on-one-line, cross-tag splice `</\w*</\w+>`, stray tag inside `content=`/`href=` attribute values) across all of `frontend/` and `admin/`. Confirm the union is empty. Also spot-check the 12 files this plan's own detection may have under- or over-counted are not falsely flagged (e.g. confirm `admin/auth/register.html` still correctly shows zero hits — it was never broken). File: none (verification pass only)

## Files touched
- `admin/blog/edit-[id].html` — modified
- `admin/blog/index.html` — modified
- `admin/blog/new.html` — modified
- `admin/debate/edit-[id].html` — modified
- `admin/debate/index.html` — modified
- `admin/debate/new.html` — modified
- `admin/essays/edit-[id].html` — modified
- `admin/essays/index.html` — modified
- `admin/essays/new.html` — modified
- `admin/news/index.html` — modified
- `admin/resources/external-witnesses.html` — modified
- `admin/resources/internal-witnesses.html` — modified
- `admin/resources/objects.html` — modified
- `admin/resources/ot-verses.html` — modified
- `admin/resources/parables.html` — modified
- `admin/resources/people.html` — modified
- `admin/wikipedia/index.html` — modified
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/contextual-essays/index.html` — modified
- `frontend/debate/academic-challenges.html` — modified
- `frontend/debate/academic-challenges/[slug].html` — modified
- `frontend/debate/historiography.html` — modified
- `frontend/debate/historiography/[slug].html` — modified
- `frontend/debate/historiography/index.html` — modified
- `frontend/debate/index.html` — modified
- `frontend/debate/popular-challenges.html` — modified
- `frontend/debate/popular-challenges/[slug].html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/debate/wikipedia.html` — modified
- `frontend/evidence/maps/galilee.html` — modified
- `frontend/evidence/maps/jerusalem.html` — modified
- `frontend/evidence/maps/judea.html` — modified
- `frontend/evidence/maps/roman-empire.html` — modified
- `frontend/news-and-blog/blog/[slug].html` — modified
- `frontend/news-and-blog/blog/index.html` — modified
- `frontend/news-and-blog/index.html` — modified
- `frontend/news-and-blog/news/[slug].html` — modified
- `frontend/news-and-blog/news/index.html` — modified
- `frontend/resources/index.html` — modified
- `frontend/resources/list.html` — modified

## Notes
- **No automated test task.** This plan touches only static HTML markup text (titles, meta tags, headings, paragraphs, comments) with no corresponding `.js` file in `api/`, `admin/`, or `mcp-server/` — the plan-generation skill's mandatory-test rule doesn't apply, and there is no meaningful unit test for "is this heading text correct." The Verification task's re-run of the detection sweep is the closest equivalent and is the actual regression guard here.
- **Scope correction from the original Issues.md #14 estimate**: that row cited "22 files" as an example count from a single detection heuristic (same-tag-twice-on-one-line). Building this plan required a broader 5-heuristic sweep across all 89 HTML files in the project, which surfaced 18 additional corrupted files the original heuristic missed (corruption split across two different lines, or splicing two *different* tag names together) and excluded one false positive (`admin/auth/register.html`). Issues.md #14 should be updated to reflect the corrected 40-file count once this plan is filed.
- Two files (`frontend/news-and-blog/blog/[slug].html`, `frontend/news-and-blog/news/[slug].html`) have a second, visible `<h1>` in their body in addition to the `.sr-only` header's `<h1>` — flagged in their tasks above as **not** part of this corruption pattern and explicitly out of scope, since Style_guide.md's Blog Posts section documents a visible `h1` title for this content type, unlike essays/responses/historiography. If that turns out to be unintentional, it needs its own Issues.md row — do not fix it as a side effect of this plan.
- A handful of tasks (`admin/resources/people.html`, `admin/resources/ot-verses.html`, `frontend/evidence/maps/jerusalem.html`) needed extra surrounding context to disambiguate the correct reconstruction; each task above notes exactly what to check before editing. Every other task's before/after text was verified directly from the corrupted line itself or a sibling page using the identical template.
- No sitemap changes — every file in this plan already exists; none are created or renamed.
