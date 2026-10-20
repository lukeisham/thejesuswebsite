# Validation Checklist — evidence-list-cache-fix

**Plan:** `setup/PLANS/New/evidence-list-cache-fix.md`

## Code-level checks

- [ ] `frontend/assets/js/evidence-list.js` — `silentlyRefreshPage1()` function exists and uses `async/await` + `try/catch`.
- [ ] `frontend/assets/js/evidence-list.js` — `silentlyRefreshPage1()` compares fresh page-1 `data.items` with current `allItems` (by length check, or item-by-item if needed).
- [ ] `frontend/assets/js/evidence-list.js` — `silentlyRefreshPage1()` replaces `allItems`, clears `$list.innerHTML`, re-renders, re-caches, and updates `hasMore`/`currentPage`/`$sentinel`/end state when data differs.
- [ ] `frontend/assets/js/evidence-list.js` — `silentlyRefreshPage1()` does **not** call `showState("loading")`, `showState("error")`, or `showToast()`.
- [ ] `frontend/assets/js/evidence-list.js` — `restoreFromCache()` calls `silentlyRefreshPage1()` unconditionally (not gated behind `cacheAge > CACHE_TTL`).
- [ ] `frontend/assets/js/evidence-list.js` — the old `Math.ceil(allItems.length / PAGE_SIZE) + 1` line is removed.
- [ ] `frontend/assets/js/evidence-list.js` — `loadPage()` is unchanged (still used by infinite scroll and `resetAndLoad()`).
- [ ] `frontend/assets/js/evidence-list.js` — `resetAndLoad()` is unchanged (still calls `clearCachedItems()` then `loadPage()`).

## Behaviour checks

- [ ] **Normal load (warm cache):** Open `/evidence/`, cached items paint instantly (no spinner), total count is accurate.
- [ ] **New item added (cache stale by content):** Add an evidence item in admin, reload `/evidence/` — new item appears silently in the list, count updates.
- [ ] **No new items (cache == server):** Reload `/evidence/` with unchanged DB — no flicker or duplicate rendering.
- [ ] **Back-navigation:** Navigate `/evidence/` → another page → browser back — cached items visible instantly, revalidated silently.
- [ ] **Filters applied:** Apply a filter, navigate away, navigate back — filter chips are active, content matches filter.
- [ ] **Infinite scroll works after silent refresh:** After silent refresh, scroll to bottom — page 2+ loads correctly via sentinel.
- [ ] **Network error during silent refresh:** Disconnect network before loading `/evidence/` — cached items still render, no error toast.
- [ ] **Empty DB (no items):** Clear all evidence via admin, load `/evidence/` — empty state shown (not "All 0 items loaded" with stale cache).
- [ ] **No sessionStorage corruption:** Delete or corrupt `evidence_list_items` in dev tools — page falls through to normal `loadPage()` flow without crash.

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (no new/removed public URLs).
