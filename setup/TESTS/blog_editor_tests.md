# Blog Editor Tests

Manual validation checks for blog-related frontend changes.

---

## Plan: remove-blog-further-reading (#71)

**Date:** 2026-07-19

### Manual checks

- [ ] **Live blog page renders normally** — open any live blog post detail page (`/news-and-blog/blog/<slug>`), confirm the page renders without errors and the blog content is visible.
- [ ] **No console errors** — open browser DevTools console; confirm no errors reference `renderFurtherReading`, `$furtherReading`, or `$sourcesList`.
- [ ] **No leftover empty heading** — scroll through the blog post page; confirm no empty "Further Reading" heading or section appears anywhere.
- [ ] **Bibliography still works** — confirm the "Bibliography" section still renders correctly with MLA-formatted sources when a blog post has `mla_sources` populated.
- [ ] **Heading hierarchy intact** — inspect the DOM; confirm the `<h2>`s flow correctly (no skipped or dangling heading levels) after the Further Reading section removal.
