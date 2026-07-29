# Extraction Signal Reference (v2, non-vector)

Signals produced by `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.js` on the default
path (Plan 2 — Harvest & Extraction). Vector-based signals (§9 rows 3, 5, 10, 16, 17, 19–23 of
`Wikipedia_alogrithm_refractor.md`) are out of scope here; see Plans 4/5. Weight/cap application
happens in `rank_engine.py`, not in extract.js — this file lists the raw signal and the §9 row it
feeds, not the final scored contribution.

## Default-path signals

| Signal (field) | Detection method | Output type | §9 row | Notes / boundary conditions |
|---|---|---|---|---|
| `verseCount` | Regex match on `Book chapter:verse` patterns against `document.body.innerText`, deduplicated | number | 2, 25 | 0 verses → row 25 fires (−10 flat) |
| `refCount` | Count of `.references li, ol.references li, .reflist li` nodes | number | 24 | Feeds `refQualityTier` |
| `journalCount` | Reference-list entries matching `journal`/`doi.org`/`jstor`/`Quarterly`/`Bulletin` | number | 12 | Associated-term lookup, not a fixed publisher list |
| `bookCount` | Reference-list entries matching `ISBN`/`University Press`/`Press[,.]`/`Publishing` | number | 12 | Associated-term lookup |
| `commentaryCount` | Reference-list entries matching named commentary series or the word "commentary" | number | 4 | Only scored for parable/teaching articles (rank_engine.py) |
| `archSiteHit` | IAA / "archaeolog-" / "excavat-" / "ossuary" / "inscription" keyword match | boolean | 7 | Parable articles score reduced credit in rank_engine.py, not here |
| `manuscriptCount` | Fixed 12-name manuscript list; generic "papyrus/codex/manuscript(s)" mention counts as 1 if no named match | number | 1 | Doubled for teaching/Bible-book articles in rank_engine.py |
| `refQualityTier` | Tiered lookup on `refCount`: 0 → `"zero"`; 1–4 → `"niche"`; 5–9 → `"supported"`; 10+ → `"wellsourced"` | string | 24 | Weight mapping (zero → −9, niche → +3, supported → +1, wellsourced → 0) applied in rank_engine.py, not here |
| `hasCitationNeeded` | DOM/text match for "citation needed" / maintenance-banner phrases | boolean | 24 | Independent −1, applies on top of whichever tier fires |
| `mapsAndDiagramsCount` | DOM inspection: mapframe/location-map/kartographer elements, `svg.diagram`/`figure.diagram`, or thumbnail/figure captions containing "map"/"diagram"/"plan"/"floor plan" | number, capped at 2 | 13 | Shared detection also drives `hasDiagramOrMap` |
| `hasPictureNarrow` | Rendered `<img>` inside `#mw-content-text` that is **not** inside `.infobox` or `.gallery` | boolean | 15 | Used when `is_passion` is false (standard sensitivity) |
| `hasPictureWide` | Any rendered `<img>` inside `#mw-content-text`, infobox/gallery included | boolean | 15 | Used when `is_passion` is true (raised sensitivity, §3.9 row 15) |
| `hasDiagramOrMap` | `mapsAndDiagramsCount > 0` | boolean | 15 | Shared with row 13; rank_engine.py picks narrow/wide and combines with this to derive the −1/0/+1 religious-art score |
| `primarySourceQuoteCount` | `#mw-content-text blockquote` count + long (40+ char) double-quoted spans in body text | number | 11 | Unchanged from v1 |
| `gnosticSourceHit` | Fixed keyword/name match ("Gnostic", "Nag Hammadi", named Gnostic gospels, "Valentinian", "Sethian") | boolean | — | Kept unconditionally active; not a §11.4-listed dormant family in this plan (see Issues.md #138) |
| `wikiQualityHit` | DOM inspection of `[id^="mw-indicator-"]` elements for Good/Featured Article markers | boolean | 14 | Unchanged from v1 |
| `ancientHistorianCount` | Fixed 8-name list (Josephus, Tacitus, Pliny the Younger, Suetonius, Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon) | number | 9 | Scores 0 for parable articles (rank_engine.py) |
| `anteNiceneCount` | Fixed 11-name list (Ignatius of Antioch … Cyprian) | number | 6 | Unchanged from v1 |
| `jewishContextHits` | Fixed keyword list (Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha, Torah, rabbinic, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) | number | 8 | Unchanged from v1 |
| `otherReligionHit` | Shared matcher (Qur'an, Muhammad, Hadith, Book of Mormon, LDS, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í, etc.) | boolean | 18 | Same matcher drives the balanced-debate sentence exclusion when that dormant family is active |
| `isPassion` / `isMiracle` / `isParable` / `isLocation` / `isTeaching` / `isBibleBook` | Category-strip matching (`#mw-normal-catlinks a`) plus, for `isBibleBook`, a page-title regex fallback | boolean | gates rows 1, 4, 6, 7, 9, 10, 15, 22, 23 | Category flags — not scored signals themselves |

## Genuinely removed (no fallback)

| Signal | Reason |
|---|---|
| `historicalContextHit` | Weight dropped from the rubric (§3.8) — overlapped with archaeology and Jewish-context signals |
| `passionCriticismHits` | Weight dropped from the rubric (§3.7) — too narrow, rarely fired |
| `narrativeHeading` / `interpHeading` | Heading-based section bucketing retired; the §3.1.1 vector classifier (Plan 4) is now the sole bucketing authority |

## Dormant fallbacks (§11.4)

Gated behind `DORMANT_FALLBACKS` in extract.js, all `false` by default. Each stays on the fallback
for its vector family (Plan 4/5) until that family clears the 0.8 precision floor. When a flag is
off, its field is **absent** from the return object, not `null`/`false`.

| Field(s) | Family flag | Detection method | Output type | §9 row |
|---|---|---|---|---|
| `balancedDebateHits`, `balancedDebateNamedAuthors` | `balancedDebate` | 12-pattern debate-language regex set + named-representative attribution regex, scanned over full article text | number, number | 5 |
| `criticalScholarCount`, `evangelicalHit` | `confessionalBalance` | Fixed critical-scholar name list (Ehrman, Lüdemann, Pagels, Fredriksen, Aslan, Casey, Avalos, Martin) + fixed Evangelical-scholar name list, scanned over full article text | number, boolean | 17 |
| `jesusSeminarCount` | `jesusSeminar` | Fixed 3-name list (Funk, Crossan, Borg) with generic "Jesus Seminar" fallback | number | 19 |
| `mythicistCount` | `mythicist` | Fixed 3-name list (Carrier, Price, Doherty) with generic "mythicist"/"Christ myth theory" fallback | number | 21 |
| `contOTNT` | `otNtContinuity` | 15-pattern regex set covering the four OT–NT continuity critique schools + contradiction framing | number | 20 |
| `superCrit` | `supernaturalCriticism` | Keyword/regex match ("mythological", "legendary accretion", "historicity questioned", "skeptic-", "naturalistic explanation", "hallucinat-") | number | 22 |
| `miracleCriticismHits` | `miracleCriticism` | Fixed 8-term list (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible); only computed for `isMiracle` articles | number | 23 |

**Known limitation of the dormant path (logged as Issues.md #138):** the v1 detectors these fall
back to computed section *placement* (data/narrative vs. interpretation) from heading-based
buckets. That bucketing is retired everywhere (§3.4.2) — extract.js does not revive it. The dormant
detectors above therefore return raw counts/names scanned over the **full** article text, with no
placement fields (`InData`/`InInterp`/`InOther`). If a dormant family is ever activated in
production, per-hit placement must be resolved in `rank_engine.py` against Plan 4's
`bucket-labels.json`, consistent with how the vector-based counterparts already work.
