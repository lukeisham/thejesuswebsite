## Validation: Wikipedia Algorithm v2 — Scoring, Ranking & Export (Plan 6)

**Plan:** wikipedia-v2-06-scoring-ranking-export.md  
**Date:** 2026-07-28

### Manual checks

- [ ] **Contribution sum invariant** — Query 5 random articles from `wikipedia_article_signals`. For each, sum all 25 `contribution` values. Confirm the sum exactly matches the article's `net_score` in `wikipedia_articles`. No rounding, no truncation after summing — exact match.
- [ ] **Ranking order** — Fetch all 255 articles from the API (`GET /api/wikipedia`) and verify they are returned in order of descending `net_score`. Spot-check: rank 1 article should have the highest score; rank 128 should be roughly median; rank 255 should be lowest. Verify rank field equals position + 1.
- [ ] **Alphabetical tie-break** — Find two articles with the same `net_score` in the database. Verify they are sorted alphabetically by **raw title** (before comma→hyphen substitution). Example: if "Mary, mother of Jesus" and "Pool of Bethesda" both score 25, "Mary..." should come first alphabetically.
- [ ] **Deliverable file formats** — (a) Open `Wikipedia Articles.csv`: verify header row, three columns (title, url, ranking), comma→hyphen substitution in titles ("Mary - mother of Jesus" not "Mary, mother of Jesus"), %2C encoding in URLs, 255 data rows, ranks 1–255 in order. (b) Open `wiki-bulk-paste.txt`: same title/url/ranking content, tab/space-separated, 255 rows, comma→hyphen applied, %2C in URLs. (c) Open `Wikipedia Articles - Scoring Detail.csv`: 41 columns including ranking, title, net_score, raw_signals (verse_count, ref_count, etc.), and contribution/cap values; 255 data rows. (d) Open `scoring-export.json`: valid JSON, top-level keys `meta`, `articles`, `signal_dictionary`; `meta.article_count = 255`; `articles` array length 255; each article has exactly 25 contribution keys (no extra, no missing).
- [ ] **Import script output** — Run import script on test export; verify logs show "All 255 articles valid" (or test count), "Signals written: 6375" (255×25), no validation errors, exit code 0.
- [ ] **Signal key names** — Spot-check the `scoring-export.json` contribution keys and the `wikipedia_article_signals.signal_key` column. Verify all 25 are present (manuscripts, bible_verses, narrative_interp_split, commentaries, balanced_debate, ante_nicene, arch_site, jewish_context, ancient_historians, literary_analysis, primary_quotes, journals_books, maps_diagrams, wiki_quality, religious_art, gnostic_over_emphasis, confessional_balance, other_religion, jesus_seminar, ot_nt_criticism, mythicist, supernatural_criticism, referencing_quality, no_bible_verse, location_bonus) and none of the removed keys (historical_context, passion_criticism, niche_bonus, poor_referencing, no_references, gnostic_quoted) appear.
- [ ] **Multiplier truncation** — Inspect the `raw_signals` for articles with jesus_seminar_mult or mythicist_mult values (e.g., 0.5, 2). Manually compute the capped contribution after truncation (e.g., −6 × 0.5 = −3 truncated to −3; −9 × 0.5 = −4.5 truncated to −4). Verify the stored `contribution` matches the truncated value.
- [ ] **Live API response** — Query `https://thejesuswebsite.org/api/wikipedia` (production). Verify 255 articles, each with 25 signals, ranking 1–255, net_score field present, signals array structure correct (id, signal_key, contribution, cap).
- [ ] **Public list page** — Visit `https://thejesuswebsite.org/debate/wikipedia` on the live site. Verify ranked list renders in order, article 1 is at the top with highest score, scrolling shows rank progression, clicking an article opens its detail page with title, rank, score, and signal breakdown visible.
- [ ] **meta.ceiling resolution** — Confirm the decision recorded in the Notes section of the plan (whether it was corrected to 255, left at 250, or documented). If left at 250, search the codebase for code that consumes this field and verify it still works correctly with 255 articles present.

### Code-review checks

- [ ] **JS-1** — Signal key names, cap derivation logic, and contribution assembly are self-documenting; only "why" comments present. Variable names like `narrative_interp_split`, `religious_art`, `referencing_quality` are clear; no magic numbers in deriveCap rules (all capped values encoded as data, not hard-coded per signal).
- [ ] **JS-2** — Validation is exhaustive and all-or-nothing: unknown keys rejected, caps derived per article, contributions bounded, Σcontributions checked. No partial DB writes on validation failure (transaction rolls back on error).
- [ ] **SQL-1** — All DB writes use `db.prepare()` with named parameters (e.g., `@articleId`, `@key`, `@contribution`). No raw SQL strings concatenated with data.
- [ ] **SQL-2** — No article title, URL, or ranking is interpolated into SQL. All flow through `?` or `@` placeholders.
- [ ] **SR-1** — Import script remains one file with multiple exported helpers (deriveCap, validateContribution, validateArticle, slugFromTitle); matches existing pattern (same as generate-sitemap.js).
- [ ] **Σcontributions == net_score invariant** — Test fixture and all 57 tests respect this: articles with net_score 0 have all contributions 0; articles with net_score > 0 have contributions summing to that value. No test case violates the invariant.
- [ ] **25-key migration** — KNOWN_SIGNAL_KEYS is a Set of exactly 25 keys, not 28. Removed keys (historical_context, passion_criticism, niche_bonus, poor_referencing, no_references, gnostic_quoted) do not appear in the set. Added/renamed keys (literary_analysis, maps_diagrams, religious_art, gnostic_over_emphasis, referencing_quality) do appear. Test for set size = 25 is present.
- [ ] **Tier-based conditional caps** — narrative_interp_split, arch_site (location bonus), gnostic_over_emphasis, referencing_quality, literary_analysis, and supernatural_criticism (with category gates) correctly implement their multi-tier rules. Tests cover all tiers and boundary conditions.
- [ ] **Multiplier truncation in deriveCap** — jesus_seminar and mythicist use `Math.trunc()` immediately after multiplication. Tests include edge cases: −6 × 0.5 = −3, −9 × 0.5 = −4.
- [ ] **Rank assignment is deterministic** — Composite sort key (−net_score, raw_title) ensures same input always produces same rank order (no dependence on sort stability or row order).
- [ ] **No hardcoded 250** — Search the plan's code changes for "250" — should not appear as a hardcoded rank cap. Rank assignment is data-driven from article count.

---

## Validation: API-8 Bounded Responses — Shared Pagination

**Plan:** api-8-bounded-responses-pagination.md
**Date:** 2026-08-16

### Manual checks

- [ ] **Default response unchanged** — `curl` each of `evidence`, `blog-posts`, `historiography`, `responses`, `essays`, `wikipedia`, `academic-challenges`, `popular-challenges`, `collections`, `identifiers`, `resources?list_key=<real key>` with no query params against the local dev server. Every one returns a bare JSON array, exactly as before this plan.
- [ ] **Paginated response shape** — Re-run each of the same routes with `?page=1&limit=1`. Every one returns `{ items, total, page, limit, totalPages }` with `items.length <= 1` and `page === 1`.
- [ ] **Invalid `page` rejected** — `curl` at least one route with `?page=0` and with `?page=abc`. Both return HTTP 400 with `error.code === "E-INPUT-005"`.
- [ ] **`limit` clamps, doesn't error** — `curl` a route with `?page=1&limit=9999`. Response succeeds with `limit === 100` (clamped), not an error.
- [ ] **Wikipedia signals survive pagination** — `curl /api/wikipedia?page=1&limit=2`. Both returned articles still carry a populated `signals` array, not an empty one.
- [ ] **Collections total is per-collection, not per-join-row** — `curl /api/collections?page=1&limit=1` against a collection with more than one linked evidence item (or seed one). `total` still counts distinct collections, not evidence-collection link rows.
- [ ] **`resources` grouped-summary path untouched** — `curl /api/resources` with no `list_key` still returns the grouped `{list_key, count, resource_ids}` summary rows, unaffected by this plan.
- [ ] **`sources` (MLA bibliography) left unpaginated** — confirm `GET /api/sources` (admin, needs a signed-in session) still returns the full flat array with no `page`/`limit` support — this was a deliberate exclusion (see the plan's Notes).

### Code-review checks

- [ ] **API-8** — every touched route's `GET /` (or `GET /?list_key=`) now supports `LIMIT`-bounded pagination via the shared helper; none of the 11 endpoints can return an unbounded table dump when `page`/`limit` are supplied.
- [ ] **SR-4** — exactly one `paginate()` implementation exists, in `api/models/model-helpers.js`; no model reimplements the `LIMIT ? OFFSET ?` / `COUNT(*)` logic inline.
- [ ] **API-4** — routes still validate before calling the model: the `INVALID_NUMERIC_PARAM` catch branch maps the model's thrown error to a 400 without ever letting a malformed `page` reach SQL.
- [ ] **API-3** — the new invalid-`page` response goes through `sendValidationError()` with `ERRORS.INVALID_NUMERIC_PARAM`; no new raw `res.status(400)` was added.
- [ ] **SQL-1** — `paginate()` still calls `db.prepare()` internally; no raw string concatenation of `page`/`limit` into SQL text.
- [ ] **JS-2** — `limit` is clamped in the model layer (1–100) independent of route-level validation, so a route that forgot to validate still can't produce an unbounded query.
- [ ] **Backward compatibility** — for every touched model, calling `getAllPublished()` (or `getByListKey()`) with no `page`/`limit` returns the same flat array shape as before this plan; `list-route-contracts.test.js`'s existing bare-array assertions still pass unmodified.

---

## Validation: Data-Layer Query Hygiene
**Plan:** data-layer-query-hygiene.md
**Date:** 2026-08-16

### Manual checks
- [ ] `curl` an evidence/response/essay/historiography/blog-post `GET /:slug` detail page twice in a row and confirm identical response bodies (proving the statement cache doesn't return stale or wrong data on a second call)
- [ ] `GET /essays` and `GET /essays/admin` (and the equivalent for news-articles) return the same fields as before the `SELECT *` → named-columns swap — no column silently dropped
- [ ] `GET /essays/:id` (admin) still includes `two_column`, `doi`, `author_bio`

### Code-review checks
- [ ] SQL-1 — `getLinked()`, `getLinkedMlaSources()`, `getLinkedIdentifiers()` (junctions.js) and `getChildren()`/`deleteChildren()`/the insert (child-rows.js) all read from a module-scope cache Map on repeat calls with the same `(table, column...)` combination, not a fresh `db.prepare()` every time
- [ ] SQL-4 — the whitelist `assertWhitelisted()` calls still run before the cache is consulted; caching didn't bypass or weaken them
- [ ] SQL-9 — no `SELECT *` remains in `essay.model.js` or `news-article.model.js`
- [ ] Automated tests exist and pass: `api/tests/relations.test.js` (cache correctness), `api/tests/essay.model.test.js`, `api/tests/news-article.model.test.js` (named-column assertions)
