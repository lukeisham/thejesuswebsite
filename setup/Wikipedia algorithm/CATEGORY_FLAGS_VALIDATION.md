# Category Flags Validation Reference

Six boolean category flags gate or modify signals throughout the v2 rubric (`Wikipedia_alogrithm_refractor.md` §9). They are computed once per article from the Wikipedia category strip (`#mw-normal-catlinks a`) by `extract.js`, and every downstream signal that conditions on category reads these same six flags — never a fresh category check of its own. An error in a single flag therefore propagates silently into every signal it gates; validating the flags is a separate concern from validating the signals themselves, and should be checked first.

Distribution across the ranked 255 (`database/scoring-export.json`, verified 2026-07-28 — matches the research-brief figures cited in `wikipedia-v2-03-gold-set.md`):

| Flag | Count | % |
|---|---:|---:|
| `is_location` | 47 | 18.4% |
| `is_teaching` | 41 | 16.1% |
| `is_parable` | 41 | 16.1% |
| `is_miracle` | 29 | 11.4% |
| `is_passion` | 27 | 10.6% |
| `is_bible_book` | 11 | 4.3% |
| *(none of the above)* | 69 | 27.1% |

Flags are not mutually exclusive (an article can be both `is_teaching` and, in principle, another flag), but in practice the six detection patterns rarely overlap on the same article.

## Detection strings

Exactly as implemented in `extract.js` (setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.js):

| Flag | Category-strip regex (case-insensitive) | Extra rule |
|---|---|---|
| `is_passion` | `Passion of Jesus\|Crucifixion of Jesus\|Resurrection of Jesus` | — |
| `is_miracle` | `Miracles of Jesus` | — |
| `is_parable` | `Parables of Jesus` | — |
| `is_location` | `New Testament places\|New Testament cities\|Holy Land\|Geography of Israel\|Cities in Israel\|Archaeological sites in Israel\|Hebrew Bible places` | — |
| `is_teaching` | `Sayings of Jesus\|teachings of Jesus\|New Testament idioms\|New Testament words and phrases\|Sermon on the Mount` | — |
| `is_bible_book` | `Books of the New Testament\|Canonical Gospels\|^Gospels$` | **OR** the page title matches `^Gospel of (Matthew\|Mark\|Luke\|John)$` — the only flag with a title-based fallback, since the four canonical Gospel articles don't reliably carry a matching category |

## Which signals each flag gates (§9)

| Flag | Signals it gates or modifies |
|---|---|
| `is_passion` | Row 15 (religious art — raised sensitivity, picks the wide picture test instead of narrow, §3.9); Row 16 (Gnostic over-emphasis — raised sensitivity, §3.9); Row 21 (mythicist bias — raised sensitivity, §3.9); Row 22 (supernatural criticism — scope + raised sensitivity, §3.9); Row 23 (secular-materialist — scope + raised sensitivity, §3.9). No longer gates a signal of its own (the old passion-specific-criticism weight was removed, §3.7) — it is purely a sensitivity trigger now. |
| `is_miracle` | Row 22 (supernatural criticism — scope); Row 23 (secular-materialist — scope, §3.1.7). The old `miracleCriticismHits` dormant fallback (§11.4) is also miracle-scoped. |
| `is_parable` | Row 1 (manuscripts — no doubling, unlike teaching/Bible-book); Row 4 (commentary — fires); Row 7 (archaeology — standard +2, per §9; `rank_engine.py`'s current `net_score_from_signals()` still applies a legacy v1 zero-score exemption for parables on both archaeology and the ancient-historian count — out of scope for this plan, flagged for Plan 6); Row 9 (non-Christian ancient sources — reduced +3 cap instead of +6); Row 10 (literary analysis — upper tier, +6); Row 15 (religious art — does not fire) |
| `is_teaching` | Row 1 (manuscripts — doubled cap); Row 4 (commentary — fires); Row 10 (literary analysis — upper tier, +6); Row 15 (religious art — does not fire) |
| `is_bible_book` | Row 1 (manuscripts — doubled cap); Row 10 (literary analysis — upper tier, +6) |
| `is_location` | Row 7 (archaeology — +8 bonus instead of +2, when combined with an archaeology hit) |

## Category detection is a separate validation concern from signal detection

A wrong category flag doesn't just mis-score one row — it silently mis-scores every row in the table above for that article, in both directions (a false `is_passion` raises sensitivity where it shouldn't; a missed `is_passion` leaves five signals under-sensitive on an article that needed the raised bar). Because of this fan-out, category-flag correctness should be checked independently of — and before — any per-signal gold-set labelling: if `gold-set-section-classifier.csv` or `gold-set-vector-families.csv` records a signal-fire judgement for an article, verify first (e.g. against Wikipedia's live category strip) that the `categories` block attached to that article in `database/scoring-export.json` is still accurate. Category membership on Wikipedia can drift over time (categories get added/removed by editors); a stale flag from an old harvest is a distinct failure mode from a wrong signal judgement and should be logged separately if found.
