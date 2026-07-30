#!/usr/bin/env python3
"""
The Jesus Website — deterministic scoring/ranking engine.

Modes:
  check                    Validate Wikipedia Articles.csv against Scoring Detail.csv (and
                           wiki-bulk-paste.txt). Read-only; exits 1 and prints every mismatch found.
  add --input <file>       For each new "title<TAB>url" line in <file> not already present (and not
                           on the permanent exclusion list), harvest it via !HeadlessChromeBrowser,
                           score it against the current weight table, merge with the existing scored
                           rows (their stored signals are reused, NOT re-harvested), resort everyone
                           by net score + tie-break, renumber 1..N, and rewrite all deliverable files.
  exclude <title> ...      Permanently exclude one or more titles: appends to excluded-titles.txt
                           AND removes any matching row from the live data, in one step.
  remove <title> ...       One-off removal WITHOUT permanent denylisting (the title could be
                           re-added by a later top-up). Use `exclude` instead when it should never
                           come back.
  rescore                  Full re-harvest of every CURRENTLY-PRESENT article under the current
                           weight table (does not reuse stored signals) — run this after a weight-
                           table change so the whole list is scored on the same rubric. Resumable
                           via .rescore-progress.jsonl if interrupted.

Does not decide WHICH candidates to add or exclude — the pool-building (Stage 1) and inclusion/
exclusion judgment (Stage 2) in Wikipedia Articles - Reference.md are the calling agent's job. This
script only does the deterministic part: harvest signals, compute the weighted score, sort, write files.
"""
import csv, json, subprocess, sys, os, argparse

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ALGORITHM_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_SCRIPT_DIR)))),
    "Wikipedia algorithm",
)

# Headless Chrome browser skill path (Dropbox — external tool, not a deliverable).
BROWSER = "/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/.claude/skills/!HeadlessChromeBrowser/scripts/browser.py"
EXTRACT_JS = os.path.join(_SCRIPT_DIR, "extract.js")

MAIN_CSV = os.path.join(ALGORITHM_DIR, "Wikipedia Articles.csv")
DETAIL_CSV = os.path.join(ALGORITHM_DIR, "Wikipedia Articles - Scoring Detail.csv")
EXCLUDED_TXT = os.path.join(ALGORITHM_DIR, "excluded-titles.txt")
BULK_PASTE_TXT = os.path.join(ALGORITHM_DIR, "wiki-bulk-paste.txt")

# The two v2 file-based interfaces this plan (wikipedia-v2-06) reads directly —
# Plan 4's section classifier and Plan 5's vector family scorer. Both live in
# the v2 working directory alongside this script's own deliverables. (Directory
# renamed from "Wikipedia algorithm v2" to "Wikipedia algorithm" once v1 was
# retired — see wikipedia-v2-09's close-out.)
BUCKET_LABELS_JSON = os.path.join(ALGORITHM_DIR, "bucket-labels.json")
VECTOR_FAMILY_SCORES_JSON = os.path.join(ALGORITHM_DIR, "vector-family-scores.json")

# Vector family name (Plan 5's registry.py keys) -> the §9 signal key it feeds.
# confessional-balance's family score already encodes the -3/-1/0 tiering
# (§3.1.8, reuses the balanced-debate store) so it maps straight across too.
VECTOR_FAMILY_TO_SIGNAL = {
    "balanced-debate": "balanced_debate",
    "anti-supernatural": "supernatural_criticism",
    "ot-nt-discontinuity": "ot_nt_criticism",
    "mythicist-framing": "mythicist",
    "jesus-seminar": "jesus_seminar",
    "secular-materialist": "secular_materialist",
    "confessional-balance": "confessional_balance",
    "literary-analysis": "literary_analysis",
    "gnostic-over-emphasis": "gnostic_over_emphasis",
}

DETAIL_FIELDS = [
    "ranking", "title", "net_score", "verse_count", "ref_count", "journal_hits", "book_hits",
    "commentary_hits", "arch_site", "manuscript_hits", "primary_source_quotes",
    "poor_referencing", "wiki_quality", "ancient_historian_hits", "ante_nicene_hits",
    "mythicist_hits", "data_interp_tier", "data_interp_split_contribution", "data_interp_pending",
    "jesus_seminar_hits", "jesus_seminar_mult", "jesus_seminar_contribution",
    "mythicist_mult", "mythicist_contribution",
    "no_bible_verse", "ot_nt_criticism_contribution", "supernatural_criticism_contribution",
    "secular_materialist_contribution", "literary_analysis_contribution",
    "gnostic_over_emphasis_contribution", "confessional_balance_contribution",
    "balanced_debate_contribution",
    "jewish_context_hits", "other_religion_hit",
    "balanced_debate_hits", "balanced_debate_named",
    "critical_scholar_hits", "critical_outside_interp", "evangelical_contrast",
    "maps_diagrams_count", "has_picture_wide", "has_picture_narrow", "has_diagram_or_map",
    "is_passion", "is_miracle", "is_parable", "is_location",
    "is_teaching", "is_bible_book",
]


def load_bucket_labels():
    """Plan 4's classifier output — per-article paragraph labels and row-3
    tier. Fails loudly (raises) if missing or malformed rather than silently
    scoring data_interp_split as 0 for every article (JS-2 equivalent)."""
    if not os.path.exists(BUCKET_LABELS_JSON):
        raise FileNotFoundError(
            f"bucket-labels.json not found at {BUCKET_LABELS_JSON} — Plan 4's "
            "section classifier must be run before scoring/ranking (§11.4 "
            "criterion 1: blocking for everything else)."
        )
    with open(BUCKET_LABELS_JSON, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"bucket-labels.json malformed: expected a JSON object, got {type(data)}")
    return data


def load_vector_family_scores():
    """Plan 5's family-scorer output — one contribution per article per
    vector family, keyed by article id. A family absent from an article's
    record means that family fell back to its dormant keyword detector
    (§11.4) — the caller, not this loader, resolves that fallback. Fails
    loudly if the file is missing or malformed."""
    if not os.path.exists(VECTOR_FAMILY_SCORES_JSON):
        raise FileNotFoundError(
            f"vector-family-scores.json not found at {VECTOR_FAMILY_SCORES_JSON} — "
            "Plan 5's family export.py must be run before scoring/ranking."
        )
    with open(VECTOR_FAMILY_SCORES_JSON, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"vector-family-scores.json malformed: expected a JSON object, got {type(data)}")
    return data


TIER_TO_NARRATIVE_INTERP = {10: "clear_split", -3: "muddled", -5: "one_sided", 0: "unclassifiable"}


def merge_upstream_signals(article_id, sig, bucket_labels, family_scores):
    """Merge Plan 4's row-3 tier and Plan 5's vector-family contributions
    onto a freshly-harvested `sig` dict, in place. `article_id` must match
    the key convention the two upstream exports use (Wikipedia title).

    Missing per-article entries in either file are themselves an error for
    bucket-labels.json (every scored article must have been classified), but
    a missing per-family entry in vector-family-scores.json means that
    family fell back to its dormant keyword detector — `sig`'s existing
    keyword-derived fields are left untouched in that case, which is exactly
    the dormant-fallback path (§11.4).

    `bucket_labels`/`family_scores` may each be None — the file-absence case,
    handled by the caller as the documented pending state rather than an
    error (§9 activation checklist). A None `bucket_labels` marks `sig` as
    pending instead of merging a tier; a None `family_scores` leaves every
    vector-covered signal on its dormant keyword fallback."""
    if bucket_labels is None:
        sig["dataInterpPending"] = True
    else:
        bucket_entry = bucket_labels.get(article_id)
        if bucket_entry is None:
            raise KeyError(f'"{article_id}" missing from bucket-labels.json')
        sig["dataInterpTier"] = TIER_TO_NARRATIVE_INTERP.get(bucket_entry.get("tier"), "unclassifiable")

    if family_scores is not None:
        family_entry = family_scores.get(article_id, {})
        for family_name, signal_key in VECTOR_FAMILY_TO_SIGNAL.items():
            if family_name not in family_entry:
                continue  # dormant fallback — sig's keyword-derived value stands
            sig[f"__vector_{signal_key}"] = family_entry[family_name]

# The set of keys row_from_signals() actually produces (DETAIL_FIELDS minus "ranking" and
# "no_bible_verse" — derived later, not stored on the row itself; plus "url" which isn't a
# DETAIL_FIELD but is stored). Used to detect a schema-stale resume/progress entry from before a
# weight-table change added new fields, so it never gets silently treated as "done".
ROW_KEYS = (set(DETAIL_FIELDS) - {"ranking", "no_bible_verse"}) | {"url"}


def load_main():
    rows = []
    with open(MAIN_CSV, encoding="utf-8") as f:
        f.readline()  # header
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            title, url, rank = line.rsplit(",", 2)
            # Reverse to_output_title()'s comma -> " -" encoding (write_files/write_bulk_paste_file)
            # so main_rows carries the real title, matching every other in-memory title (detail
            # CSV, export, harvest) — an unreversed title here silently forked into two spellings
            # of the same article wherever a title contains a comma (e.g. "Mary, mother of Jesus").
            # The URL is intentionally left %2C-encoded (NOT decoded to a literal comma): it must
            # match to_output_url()'s encoding exactly, because api/scripts/import-wikipedia-
            # scoring.js matches existing DB rows by url string, and every previously-imported
            # comma-titled article has its url stored in the encoded form. Decoding here would
            # silently break that match for every such row (update -> spurious insert -> UNIQUE
            # constraint on slug, since the un-updated existing row already holds that slug).
            title = title.replace(" -", ",") if " -" in title else title
            rows.append({"title": title, "url": url, "ranking": int(rank)})
    return rows


def load_detail():
    with open(DETAIL_CSV, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_excluded():
    if not os.path.exists(EXCLUDED_TXT):
        return set()
    with open(EXCLUDED_TXT, encoding="utf-8") as f:
        return {line.strip() for line in f if line.strip()}


def placement_mult(sig, prefix):
    """Section-placement multiplier for a negative-weight-author signal: x2 if any hit sits in a
    data/narrative section, x0.5 if hits sit ONLY in interpretation sections, x1 otherwise
    (lede, references, mixed interp+other, or ambiguous headings). Applied to the CAPPED penalty;
    the halved result truncates toward zero (int()), i.e. rounds leniently.

    Degrades to x1 until the harvest side re-derives InData/InInterp/InOther from Plan 4's
    per-paragraph bucket-labels.json (retired heading-based bucketing produced these flags
    previously — see Issues.md #138)."""
    if sig.get(prefix + "InData"):
        return 2.0
    if sig.get(prefix + "InInterp") and not sig.get(prefix + "InOther"):
        return 0.5
    return 1.0


def vec(sig, signal_key, fallback):
    """Read a vector-family contribution merged onto `sig` by
    merge_upstream_signals() (as `__vector_<signal_key>`); fall back to the
    dormant keyword-detector value when the family hasn't shipped or its
    precision floor wasn't met for this article (§11.4)."""
    v = sig.get(f"__vector_{signal_key}")
    return v if v is not None else fallback


def net_score_from_signals(sig):
    """Sum all 25 §9 signal contributions. Mirrors contributions_from_row() exactly — the export
    path verifies Σcontributions == net_score and refuses to write on mismatch (JS-2)."""
    s = 0

    # Row 2: Bible verse citations — +3 per, capped +12
    s += min(sig["verseCount"], 4) * 3

    # Row 3: Data/interpretation split — vector (§3.1.1, Plan 4). No dormant fallback exists
    # for this signal (the classifier has no fallback — §11.4); "unclassifiable" scores 0.
    tier = sig.get("dataInterpTier", "unclassifiable")
    s += {"clear_split": 10, "muddled": -3, "one_sided": -5}.get(tier, 0)

    # Row 1: Named manuscripts — +2 per, capped +6; flat +8 (not doubled) for teachings/Bible books
    manuscript_cap = 8 if (sig.get("isTeaching") or sig.get("isBibleBook")) else 6
    s += min(sig.get("manuscriptCount", 0) * 2, manuscript_cap)

    # Row 7: Archaeological site/artefact — +2 flat; +8 for location-category articles with a hit.
    # Absorbs the old location_bonus key; no parable exception (row 7 scores +2 for parables too).
    if sig.get("archSiteHit"):
        s += 8 if sig.get("isLocation") else 2

    # Row 12: Journal/book citations — merged single signal, +1 per citation capped +2 per type
    s += min(sig.get("journalCount", 0), 2) + min(sig.get("bookCount", 0), 2)

    # Row 11: Primary-source quotes — +1 per, capped +4
    s += min(sig.get("primarySourceQuoteCount", 0), 4)

    # Row 8: Jewish context terms — +2 per, capped +6
    s += min(sig.get("jewishContextHits", 0), 3) * 2

    # Row 5: Balanced debate — +2 per pattern capped +6; doubled to +12 with 2+ named reps.
    # Vector family (§3.1.2); dormant fallback is the keyword-pattern count below.
    balanced_debate_fallback = min(sig.get("balancedDebateHits", 0), 3) * 2 * (
        2 if sig.get("balancedDebateNamedAuthors", 0) >= 2 else 1
    )
    balanced_debate_pts = vec(sig, "balanced_debate", balanced_debate_fallback)
    s += balanced_debate_pts

    # Row 4: Scholarly commentary — +1 per, capped +6, only parable/teaching articles
    if sig.get("isParable") or sig.get("isTeaching"):
        s += min(sig.get("commentaryCount", 0), 6)

    # Row 9: Non-Christian ancient historians — +2 per, capped +6; capped +3 for parables
    ancient_historian_cap = 3 if sig.get("isParable") else 6
    s += min(sig.get("ancientHistorianCount", 0) * 2, ancient_historian_cap)

    # Row 10: Literary analysis — vector (§3.1.9), no dormant fallback (genuinely new signal)
    s += vec(sig, "literary_analysis", 0)

    # Row 13: Maps and diagrams — +1 per, capped +2 (unchanged plain lookup, §3.8)
    s += min(sig.get("mapsAndDiagramsCount", 0), 2)

    # Row 14: Wikipedia Good/Featured Article — +1 flat
    s += 1 if sig.get("wikiQualityHit") else 0

    # Row 15: Religious art — context-conditional (§3.5.1). Does not fire for parable/teaching
    # articles. is_passion picks the raised-sensitivity (wide) picture test (§3.9 row 15).
    if not sig.get("isParable") and not sig.get("isTeaching"):
        has_picture = sig.get("hasPictureWide") if sig.get("isPassion") else sig.get("hasPictureNarrow")
        if has_picture:
            s += 1 if sig.get("hasDiagramOrMap") else -1

    # Row 6: Ante-Nicene authors — +2 per, capped +6
    s += min(sig.get("anteNiceneCount", 0), 3) * 2

    # Row 16: Gnostic over-emphasis — vector (§3.1.10), −2/−4 tiered. Dormant fallback is the old
    # boolean gnostic_quoted hit, read conservatively as the −2 "contextualised" tier (it can't
    # distinguish a privileged use).
    gnostic_fallback = -2 if sig.get("gnosticSourceHit") else 0
    s += vec(sig, "gnostic_over_emphasis", gnostic_fallback)

    # Row 17: Confessional balance — vector (§3.1.8, reuses row-5 store). −3 outside
    # interpretation / −1 inside without an Evangelical contrast / 0 inside with one.
    if sig.get("criticalScholarCount", 0) > 0:
        if sig.get("criticalScholarInData") or sig.get("criticalScholarInOther"):
            confessional_fallback = -3
        elif not sig.get("evangelicalHit", sig.get("evangelicalInInterp")):
            confessional_fallback = -1
        else:
            confessional_fallback = 0
    else:
        confessional_fallback = 0
    s += vec(sig, "confessional_balance", confessional_fallback)

    # Row 18: Other-religion sources — −3 flat
    s += -3 if sig.get("otherReligionHit", sig.get("islamicMormonHit")) else 0

    # Row 19: Jesus Seminar bias — −3 per author capped −6, × placement multiplier (truncated
    # toward zero), then a further −2 if balanced debate (row 5) scored 0. Vector (§3.1.6).
    jesus_seminar_capped = max(sig.get("jesusSeminarCount", 0) * -3, -6)
    jesus_seminar_fallback = int(jesus_seminar_capped * placement_mult(sig, "jesusSeminar"))
    if balanced_debate_pts == 0:
        jesus_seminar_fallback += -2
    s += vec(sig, "jesus_seminar", jesus_seminar_fallback)

    # Row 20: OT–NT continuity criticism — −3 per pattern, capped −6. Vector (§3.1.4).
    ot_nt_fallback = max(sig.get("contOTNT", 0) * -3, -6)
    s += vec(sig, "ot_nt_criticism", ot_nt_fallback)

    # Row 22: Criticism of the supernatural worldview — −2 per instance, capped −8. Absorbs the
    # old miracle_criticism key; Miracle- AND Passion-scoped. Vector (§3.1.3).
    if sig.get("isMiracle") or sig.get("isPassion"):
        combined_hits = sig.get("superCrit", 0) + sig.get("miracleCriticismHits", 0)
        supernatural_fallback = max(combined_hits * -2, -8)
    else:
        supernatural_fallback = 0
    s += vec(sig, "supernatural_criticism", supernatural_fallback)

    # Row 21: Mythicist bias — −3 per author capped −7, × placement multiplier (truncated toward
    # zero), then a further −2 if balanced debate (row 5) scored 0. Vector (§3.1.5).
    mythicist_capped = max(sig.get("mythicistCount", 0) * -3, -7)
    mythicist_fallback = int(mythicist_capped * placement_mult(sig, "mythicist"))
    if balanced_debate_pts == 0:
        mythicist_fallback += -2
    s += vec(sig, "mythicist", mythicist_fallback)

    # Row 23: Secular-materialist presuppositions — −2 per term, capped −8. Miracle- and
    # Passion-scoped like row 22, but no placement multiplier. Vector (§3.1.7); the registry's
    # fallback for this family is the supernatural_criticism keyword detector (no legacy
    # secular-materialist detector exists on its own).
    s += vec(sig, "secular_materialist", supernatural_fallback)

    # Row 24: Referencing quality — tiered on ref_count, absorbing the former no_references,
    # poor_referencing, and niche_bonus signals; plus an independent −1 for poor referencing.
    s += _ref_quality_weight(sig["refCount"])
    if sig.get("hasCitationNeeded"):
        s += -1

    # Row 25: No Bible verse cited anywhere — −10 flat
    s += -10 if sig["verseCount"] == 0 else 0

    return s


def row_from_signals(title, url, sig):
    """Build the internal row persisted to the Scoring Detail CSV and re-loaded on every later
    run (detail_row_to_internal). Pure-formula (non-vector) signals store their raw, pre-cap
    harvested counts — contributions_from_row() re-derives the capped points from these on export.
    Vector-covered signals (§3.1.x) have no meaningful "raw pre-cap" value of their own (the
    family module or its dormant keyword fallback already applies its own capping), so their
    *resolved* contribution is stored directly under a `_contribution` field and passed straight
    through by contributions_from_row() — this is what keeps Σcontributions == net_score exact
    across a CSV round-trip."""
    balanced_debate_fallback = min(sig.get("balancedDebateHits", 0), 3) * 2 * (
        2 if sig.get("balancedDebateNamedAuthors", 0) >= 2 else 1
    )
    balanced_debate_contribution = vec(sig, "balanced_debate", balanced_debate_fallback)

    gnostic_fallback = -2 if sig.get("gnosticSourceHit") else 0

    if sig.get("criticalScholarCount", 0) > 0:
        if sig.get("criticalScholarInData") or sig.get("criticalScholarInOther"):
            confessional_fallback = -3
        elif not sig.get("evangelicalHit", sig.get("evangelicalInInterp")):
            confessional_fallback = -1
        else:
            confessional_fallback = 0
    else:
        confessional_fallback = 0

    jesus_seminar_capped = max(sig.get("jesusSeminarCount", 0) * -3, -6)
    jesus_seminar_fallback = int(jesus_seminar_capped * placement_mult(sig, "jesusSeminar"))
    if balanced_debate_contribution == 0:
        jesus_seminar_fallback += -2

    ot_nt_fallback = max(sig.get("contOTNT", 0) * -3, -6)

    if sig.get("isMiracle") or sig.get("isPassion"):
        combined_hits = sig.get("superCrit", 0) + sig.get("miracleCriticismHits", 0)
        supernatural_fallback = max(combined_hits * -2, -8)
    else:
        supernatural_fallback = 0

    mythicist_capped = max(sig.get("mythicistCount", 0) * -3, -7)
    mythicist_fallback = int(mythicist_capped * placement_mult(sig, "mythicist"))
    if balanced_debate_contribution == 0:
        mythicist_fallback += -2

    tier = sig.get("dataInterpTier", "unclassifiable")
    data_interp_contribution = {"clear_split": 10, "muddled": -3, "one_sided": -5}.get(tier, 0)

    return {
        "title": title, "url": url, "net_score": net_score_from_signals(sig),
        "verse_count": sig["verseCount"], "ref_count": sig["refCount"],
        "journal_hits": sig["journalCount"], "book_hits": sig["bookCount"],
        "commentary_hits": sig.get("commentaryCount", 0),
        "arch_site": sig["archSiteHit"],
        "manuscript_hits": sig.get("manuscriptCount", 0),
        "primary_source_quotes": sig.get("primarySourceQuoteCount", 0),
        # extract.js only ever emits hasCitationNeeded — poorReferencingHit was never a real
        # field (pre-existing dead mapping fixed while consolidating row 24 here).
        "poor_referencing": sig.get("hasCitationNeeded", False),
        "wiki_quality": sig.get("wikiQualityHit", False),
        "ancient_historian_hits": sig.get("ancientHistorianCount", 0),
        "ante_nicene_hits": sig.get("anteNiceneCount", 0),
        "mythicist_hits": sig.get("mythicistCount", 0),
        "data_interp_tier": tier,
        "data_interp_split_contribution": data_interp_contribution,
        # Global "the classifier hasn't run" state (bucket-labels.json absent), distinct from a
        # genuine per-article "unclassifiable" outcome once Plan 4 ships (§9 activation checklist).
        "data_interp_pending": sig.get("dataInterpPending", False),
        "jesus_seminar_hits": sig.get("jesusSeminarCount", 0),
        "jesus_seminar_mult": placement_mult(sig, "jesusSeminar"),
        "jesus_seminar_contribution": vec(sig, "jesus_seminar", jesus_seminar_fallback),
        "mythicist_mult": placement_mult(sig, "mythicist"),
        "mythicist_contribution": vec(sig, "mythicist", mythicist_fallback),
        "ot_nt_criticism_contribution": vec(sig, "ot_nt_criticism", ot_nt_fallback),
        "supernatural_criticism_contribution": vec(sig, "supernatural_criticism", supernatural_fallback),
        "secular_materialist_contribution": vec(sig, "secular_materialist", supernatural_fallback),
        "literary_analysis_contribution": vec(sig, "literary_analysis", 0),
        "gnostic_over_emphasis_contribution": vec(sig, "gnostic_over_emphasis", gnostic_fallback),
        "confessional_balance_contribution": vec(sig, "confessional_balance", confessional_fallback),
        "balanced_debate_contribution": balanced_debate_contribution,
        "jewish_context_hits": sig.get("jewishContextHits", 0),
        "balanced_debate_hits": sig.get("balancedDebateHits", 0),
        "balanced_debate_named": sig.get("balancedDebateNamedAuthors", 0),
        "critical_scholar_hits": sig.get("criticalScholarCount", 0),
        "critical_outside_interp": bool(sig.get("criticalScholarInData") or sig.get("criticalScholarInOther")),
        "evangelical_contrast": bool(sig.get("evangelicalInInterp", False)),
        "other_religion_hit": sig.get("otherReligionHit", sig.get("islamicMormonHit", False)),
        "maps_diagrams_count": sig.get("mapsAndDiagramsCount", 0),
        "has_picture_wide": sig.get("hasPictureWide", False),
        "has_picture_narrow": sig.get("hasPictureNarrow", False),
        "has_diagram_or_map": sig.get("hasDiagramOrMap", False),
        "is_passion": sig.get("isPassion", False),
        "is_miracle": sig.get("isMiracle", False),
        "is_parable": sig.get("isParable", False),
        "is_location": sig.get("isLocation", False),
        "is_teaching": sig.get("isTeaching", False),
        "is_bible_book": sig.get("isBibleBook", False),
    }


def harvest_one(url):
    subprocess.run(["python3", BROWSER, "open", "--url", url], capture_output=True, text=True, timeout=30)
    js = open(EXTRACT_JS, encoding="utf-8").read()
    r = subprocess.run(["python3", BROWSER, "eval", "--js", js], capture_output=True, text=True, timeout=30)
    return json.loads(r.stdout)


def to_output_title(title):
    return title.replace(",", " -") if "," in title else title


def to_output_url(url):
    return url.replace(",", "%2C") if "," in url else url


def write_bulk_paste_file(rows):
    """rows must already be sorted/ranked (index+1 == final ranking).
    A complete, always-current plain-text view of the same data — "title, url, rank" per line,
    comma-space delimited. Uses the same hyphen/percent-encoding convention as the main CSV, so
    every one of the 195(+) rows is included here; nothing needs splitting out into a separate file.
    This is the final end point of the pipeline and must be regenerated every time the data changes.
    """
    with open(BULK_PASTE_TXT, "w", encoding="utf-8", newline="\n") as f:
        lines = [f"{to_output_title(r['title'])}, {to_output_url(r['url'])}, {i}" for i, r in enumerate(rows, start=1)]
        f.write("\n".join(lines) + "\n")


def write_files(rows):
    # §12.2: sort by net_score descending; the only tie-break is the raw title, alphabetically —
    # no verse_count/ref_count secondary keys. The rank order is fixed here, at rank-assignment
    # time, from the raw (pre comma->hyphen) title.
    rows.sort(key=lambda r: (-r["net_score"], r["title"].lower()))
    with open(MAIN_CSV, "w", encoding="utf-8", newline="\n") as f:
        lines = ["title,url,ranking"]
        for i, r in enumerate(rows, start=1):
            lines.append(f'{to_output_title(r["title"])},{to_output_url(r["url"])},{i}')
        f.write("\n".join(lines) + "\n")
    with open(DETAIL_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=DETAIL_FIELDS)
        w.writeheader()
        for i, r in enumerate(rows, start=1):
            w.writerow({
                "ranking": i, "title": r["title"], "net_score": r["net_score"],
                "verse_count": r["verse_count"], "ref_count": r["ref_count"],
                "journal_hits": r["journal_hits"], "book_hits": r["book_hits"],
                "commentary_hits": r["commentary_hits"],
                "arch_site": r["arch_site"],
                "manuscript_hits": r["manuscript_hits"],
                "primary_source_quotes": r["primary_source_quotes"],
                "poor_referencing": r["poor_referencing"],
                "wiki_quality": r["wiki_quality"],
                "ancient_historian_hits": r["ancient_historian_hits"],
                "ante_nicene_hits": r["ante_nicene_hits"],
                "mythicist_hits": r["mythicist_hits"],
                "data_interp_tier": r["data_interp_tier"],
                "data_interp_split_contribution": r["data_interp_split_contribution"],
                "data_interp_pending": r["data_interp_pending"],
                "jesus_seminar_hits": r["jesus_seminar_hits"],
                "jesus_seminar_mult": r["jesus_seminar_mult"],
                "jesus_seminar_contribution": r["jesus_seminar_contribution"],
                "mythicist_mult": r["mythicist_mult"],
                "mythicist_contribution": r["mythicist_contribution"],
                "no_bible_verse": r["verse_count"] == 0,
                "ot_nt_criticism_contribution": r["ot_nt_criticism_contribution"],
                "supernatural_criticism_contribution": r["supernatural_criticism_contribution"],
                "secular_materialist_contribution": r["secular_materialist_contribution"],
                "literary_analysis_contribution": r["literary_analysis_contribution"],
                "gnostic_over_emphasis_contribution": r["gnostic_over_emphasis_contribution"],
                "confessional_balance_contribution": r["confessional_balance_contribution"],
                "balanced_debate_contribution": r["balanced_debate_contribution"],
                "jewish_context_hits": r["jewish_context_hits"],
                "other_religion_hit": r["other_religion_hit"],
                "balanced_debate_hits": r["balanced_debate_hits"],
                "balanced_debate_named": r["balanced_debate_named"],
                "critical_scholar_hits": r["critical_scholar_hits"],
                "critical_outside_interp": r["critical_outside_interp"],
                "evangelical_contrast": r["evangelical_contrast"],
                "maps_diagrams_count": r["maps_diagrams_count"],
                "has_picture_wide": r["has_picture_wide"],
                "has_picture_narrow": r["has_picture_narrow"],
                "has_diagram_or_map": r["has_diagram_or_map"],
                "is_passion": r["is_passion"], "is_miracle": r["is_miracle"],
                "is_parable": r["is_parable"], "is_location": r["is_location"],
                "is_teaching": r["is_teaching"], "is_bible_book": r["is_bible_book"],
            })
    write_bulk_paste_file(rows)
    write_export(rows)


# --- JSON export (for The Jesus Website visualization widget) ---------------------------------
EXPORT_JSON = os.path.join(ALGORITHM_DIR, "scoring-export.json")
_REPO_ROOT = os.path.dirname(ALGORITHM_DIR)
EXPORT_REPO_JSON = os.path.join(_REPO_ROOT, "database", "scoring-export.json")

# label, weight description, caveat — the embedded data dictionary for the widget. 25 signals,
# §9 of Wikipedia_alogrithm_refractor.md.
SIGNAL_DICTIONARY = {
    "bible_verses":        {"label": "Bible verses cited", "weight": "+3 per, capped +12", "caveat": None},
    "data_interp_split": {"label": "Data/interpretation section split", "weight": "+10 clear split / -3 muddled / -5 one-sided / 0 unclassifiable", "caveat": "vector-classified (§3.1.1); no keyword fallback"},
    "manuscripts":         {"label": "Named manuscripts", "weight": "+2 per, capped +6; +8 flat for teachings/books of the Bible", "caveat": "fixed list; generic mention counts as 1"},
    "ante_nicene":         {"label": "Ante-Nicene authors", "weight": "+2 per, capped +6", "caveat": None},
    "arch_site":           {"label": "Archaeological site/artefact", "weight": "+2 flat; +8 for location articles", "caveat": "absorbs the old location bonus"},
    "journal_or_book":     {"label": "Journal/book citations", "weight": "+1 per, capped +2 per type", "caveat": "merged signal — journal and book citations each cap independently at +2"},
    "primary_quotes":      {"label": "Primary-source quotes", "weight": "+1 per, capped +4", "caveat": "blunt proxy: any substantial quote"},
    "jewish_context":      {"label": "Jewish context terms", "weight": "+2 per, capped +6", "caveat": None},
    "balanced_debate":     {"label": "Balanced debate in interpretation sections", "weight": "+2 per, capped +6; doubled to +12 when 2+ named representatives cited", "caveat": "vector-classified (§3.1.2); dormant keyword fallback"},
    "commentaries":        {"label": "Commentary citations", "weight": "+1 per, capped +6", "caveat": "only for parables/idioms/sayings/teachings"},
    "ancient_historians":  {"label": "Non-Christian ancient historians", "weight": "+2 per, capped +6; capped +3 for parables", "caveat": "8-name list incl. Mara bar Serapion, Lucian, Celsus, Phlegon"},
    "wiki_quality":        {"label": "Wikipedia Good/Featured Article", "weight": "+1 flat", "caveat": None},
    "confessional_balance": {"label": "Confessional balance", "weight": "0 / -1 / -3 conditional", "caveat": "vector-classified (§3.1.8, reuses balanced-debate store); fires when a critical-scholarship historian is cited: -3 outside interpretation sections, -1 inside without an Evangelical counterpart, 0 with one"},
    "gnostic_over_emphasis": {"label": "Gnostic over-emphasis", "weight": "-2 contextualised / -4 privileged", "caveat": "vector-classified (§3.1.10); dormant keyword fallback reads as the -2 tier"},
    "jesus_seminar":       {"label": "Jesus Seminar citations", "weight": "-3 per, capped -6; x2 outside interpretation, x0.5 if interpretation-only; further -2 if balanced debate scored 0", "caveat": "vector-classified (§3.1.6); stance-blind — placement and balance act as structural proxies (§11.3)"},
    "ot_nt_criticism":     {"label": "OT-NT continuity criticism", "weight": "-3 per distinct pattern, capped -6", "caveat": "vector-classified (§3.1.4); dormant keyword fallback"},
    "supernatural_criticism": {"label": "Supernatural-worldview criticism", "weight": "-2 per, capped -8", "caveat": "vector-classified (§3.1.3); Miracle- and Passion-scoped, absorbs the old miracle-specific signal"},
    "other_religion":      {"label": "Other-religion sources", "weight": "-3 flat", "caveat": "Islamic, Mormon, Buddhist, Hindu, Sikh, Jain, Rastafari, Baha'i material cited as authoritative"},
    "mythicist":           {"label": "Mythicist citations", "weight": "-3 per, capped -7; x2 outside interpretation, x0.5 if interpretation-only; further -2 if balanced debate scored 0", "caveat": "vector-classified (§3.1.5); stance-blind — placement and balance act as structural proxies (§11.3)"},
    "referencing_quality": {"label": "Referencing quality", "weight": "-9 at 0 refs / +3 at 1-4 / +1 at 5-9 / 0 at 10+; further -1 for poor referencing", "caveat": "absorbs the former no-references, poor-referencing, and niche-exposure signals"},
    "no_bible_verse":      {"label": "No Bible verse cited", "weight": "-10 flat", "caveat": None},
    "literary_analysis":   {"label": "Literary analysis", "weight": "+6 for parable/teaching/Bible-book articles; +4 for others", "caveat": "vector-classified (§3.1.9); no dormant fallback — genuinely new signal"},
    "maps_diagrams":       {"label": "Maps and diagrams", "weight": "+1 per, capped +2", "caveat": None},
    "religious_art":       {"label": "Religious art", "weight": "-1 picture without diagram/map / +1 picture with one", "caveat": "does not fire for parable/teaching articles; raised sensitivity on is_passion (§3.9)"},
    "secular_materialist":  {"label": "Secular-materialist presuppositions", "weight": "-2 per, capped -8", "caveat": "vector-classified (§3.1.7); Miracle- and Passion-scoped, no placement multiplier; dormant fallback shares the supernatural-criticism keyword detector"},
}


def contributions_from_row(r):
    """Per-signal POINT contributions (caps and category conditionals applied) for one internal
    row. Must mirror net_score_from_signals exactly — cmd/auto export verifies the sum equals the
    stored net_score for every article and refuses to write a mismatched export.

    Pure-formula (non-vector) signals are recomputed here from the row's raw stored fields.
    Vector-covered signals were already resolved (vector contribution, or dormant keyword
    fallback) at harvest time by row_from_signals() and are passed straight through — there is
    no meaningful "raw pre-cap" value to recompute them from."""
    return {
        "bible_verses": min(r["verse_count"], 4) * 3,
        "data_interp_split": r["data_interp_split_contribution"],
        "manuscripts": min(r["manuscript_hits"] * 2, 8 if (r["is_teaching"] or r["is_bible_book"]) else 6),
        "ante_nicene": min(r["ante_nicene_hits"], 3) * 2,
        "arch_site": (8 if r["is_location"] else 2) if r["arch_site"] else 0,
        "journal_or_book": min(r["journal_hits"], 2) + min(r["book_hits"], 2),
        "primary_quotes": min(r["primary_source_quotes"], 4),
        "jewish_context": min(r["jewish_context_hits"], 3) * 2,
        "balanced_debate": r["balanced_debate_contribution"],
        "commentaries": min(r["commentary_hits"], 6) if (r["is_parable"] or r["is_teaching"]) else 0,
        "ancient_historians": min(r["ancient_historian_hits"] * 2, 3 if r["is_parable"] else 6),
        "wiki_quality": 1 if r["wiki_quality"] else 0,
        "confessional_balance": r["confessional_balance_contribution"],
        "gnostic_over_emphasis": r["gnostic_over_emphasis_contribution"],
        "jesus_seminar": r["jesus_seminar_contribution"],
        "ot_nt_criticism": r["ot_nt_criticism_contribution"],
        "supernatural_criticism": r["supernatural_criticism_contribution"],
        "other_religion": -3 if r["other_religion_hit"] else 0,
        "mythicist": r["mythicist_contribution"],
        "referencing_quality": _ref_quality_weight(r["ref_count"]) + (-1 if r["poor_referencing"] else 0),
        "no_bible_verse": -10 if r["verse_count"] == 0 else 0,
        "literary_analysis": r["literary_analysis_contribution"],
        "maps_diagrams": min(r["maps_diagrams_count"], 2),
        "religious_art": _religious_art_contribution(r),
        "secular_materialist": r["secular_materialist_contribution"],
    }


def _ref_quality_weight(refs):
    """referencing_quality's tier weight, derived from ref_count alone — the single source of
    truth both net_score_from_signals() and contributions_from_row() call this with, so a
    harvested article's refQualityTier string (extract.js) never needs to be trusted or
    re-validated separately from the ref_count it was itself derived from."""
    if refs == 0:
        return -9
    if refs < 5:
        return 3
    if refs < 10:
        return 1
    return 0


def _religious_art_contribution(r):
    if r["is_parable"] or r["is_teaching"]:
        return 0
    has_picture = r["has_picture_wide"] if r["is_passion"] else r["has_picture_narrow"]
    if not has_picture:
        return 0
    return 1 if r["has_diagram_or_map"] else -1


def write_export(rows):
    """rows: sorted internal rows (index+1 == ranking). Writes scoring-export.json beside the
    CSVs and copies it into the thejesuswebsite repo's database/ folder (skipped with a warning
    if that folder is absent, e.g. on another machine)."""
    import datetime
    articles = []
    mismatches = []
    for i, r in enumerate(rows, start=1):
        contrib = contributions_from_row(r)
        if sum(contrib.values()) != r["net_score"]:
            mismatches.append(f'{r["title"]}: contributions sum {sum(contrib.values())} != net_score {r["net_score"]}')
        # raw_signals field names here are the import script's contract (api/scripts/
        # import-wikipedia-scoring.js deriveCap()) — keep them in lockstep with that file.
        articles.append({
            "ranking": i, "title": r["title"], "url": r["url"], "net_score": r["net_score"],
            "contributions": contrib,
            "raw_signals": {
                "verse_count": r["verse_count"], "ref_count": r["ref_count"],
                "journal_hits": r["journal_hits"], "book_hits": r["book_hits"],
                "commentary_hits": r["commentary_hits"], "arch_site": r["arch_site"],
                "manuscript_hits": r["manuscript_hits"],
                "primary_source_quotes": r["primary_source_quotes"],
                "poor_referencing": r["poor_referencing"], "wiki_quality": r["wiki_quality"],
                "ancient_historian_hits": r["ancient_historian_hits"],
                "ante_nicene_hits": r["ante_nicene_hits"], "mythicist_hits": r["mythicist_hits"],
                "data_interp_tier": r["data_interp_tier"],
                "data_interp_pending": r["data_interp_pending"],
                "jesus_seminar_hits": r["jesus_seminar_hits"],
                "jesus_seminar_mult": r["jesus_seminar_mult"], "mythicist_mult": r["mythicist_mult"],
                "jewish_context_hits": r["jewish_context_hits"],
                "other_religion_hit": r["other_religion_hit"],
                "balanced_debate_hits": r["balanced_debate_hits"],
                "balanced_debate_named": r["balanced_debate_named"],
                "critical_scholar_hits": r["critical_scholar_hits"],
                "critical_outside_interp": r["critical_outside_interp"],
                "evangelical_contrast": r["evangelical_contrast"],
                "maps_diagrams_count": r["maps_diagrams_count"],
                "has_picture": r["has_picture_wide"] if r["is_passion"] else r["has_picture_narrow"],
                "has_diagram_or_map": r["has_diagram_or_map"],
            },
            "categories": {
                "is_passion": r["is_passion"], "is_miracle": r["is_miracle"],
                "is_parable": r["is_parable"], "is_location": r["is_location"],
                "is_teaching": r["is_teaching"], "is_bible_book": r["is_bible_book"],
            },
        })
    if mismatches:
        print("EXPORT ABORTED — contribution/net_score mismatches (contributions_from_row is out of "
              "sync with net_score_from_signals):")
        print("\n".join(mismatches))
        return False
    doc = {
        "meta": {
            "generated": datetime.datetime.now().isoformat(timespec="seconds"),
            "article_count": len(articles),
            # No known consumer references meta.ceiling anywhere in frontend/, api/routes/, or
            # admin/ (confirmed by search at v2 migration time) — it always equals article_count,
            # the actual size of the ranked list (currently 255, not a fixed 250 or 255).
            "ceiling": len(articles),
            "source": "Lukeatron !TheJesusWebsite-Wikipedia rank_engine.py",
            "note": "contributions are capped/conditional POINTS per signal (they sum to net_score); "
                    "raw_signals are the uncapped harvested values. data_interp_split (row 3) and "
                    "literary_analysis (row 10) score 0 for every article: both are pending (no "
                    "keyword fallback exists — §9 activation checklist), unblocked by "
                    "bucket-labels.json (Plan 4) and vector-family-scores.json (Plan 5) — see "
                    "raw_signals.data_interp_pending and setup/Issues.md #141. maps_diagrams "
                    "(row 13) and religious_art (row 15) carry real harvested values as of this "
                    "export.",
        },
        "signal_dictionary": SIGNAL_DICTIONARY,
        "articles": articles,
    }
    payload = json.dumps(doc, ensure_ascii=False, indent=1)
    with open(EXPORT_JSON, "w", encoding="utf-8", newline="\n") as f:
        f.write(payload + "\n")
    repo_dir = os.path.dirname(EXPORT_REPO_JSON)
    if os.path.isdir(repo_dir):
        with open(EXPORT_REPO_JSON, "w", encoding="utf-8", newline="\n") as f:
            f.write(payload + "\n")
        print(f"Export written: {EXPORT_JSON} and {EXPORT_REPO_JSON} ({len(articles)} articles).")
    else:
        print(f"Export written: {EXPORT_JSON} ({len(articles)} articles). "
              f"WARNING: repo folder missing, skipped copy to {EXPORT_REPO_JSON}")
    return True


def cmd_export():
    main_rows = load_main()
    url_lookup = {r["title"]: r["url"] for r in main_rows}
    internal = [detail_row_to_internal(d, url_lookup) for d in load_detail()]
    # §12.2: no tie-break beyond the raw title, alphabetically.
    internal.sort(key=lambda r: (-r["net_score"], r["title"].lower()))
    if not write_export(internal):
        sys.exit(1)


def detail_row_to_internal(d, url_lookup):
    return {
        "title": d["title"], "url": url_lookup.get(d["title"], ""),
        "net_score": int(d["net_score"]), "verse_count": int(d["verse_count"]), "ref_count": int(d["ref_count"]),
        "journal_hits": int(d["journal_hits"]), "book_hits": int(d["book_hits"]),
        "commentary_hits": int(d.get("commentary_hits", 0)),
        "arch_site": d.get("arch_site", d.get("iaa_or_arch", "False")) == "True",
        # manuscript/jesus_seminar were flat booleans before per-instance counting was added;
        # a pre-upgrade detail row (not yet rescored) has the old column, not the new one —
        # fall back to reading it as a count of 1 rather than silently zeroing it out.
        "manuscript_hits": int(d["manuscript_hits"]) if "manuscript_hits" in d else (1 if d.get("manuscript") == "True" else 0),
        "primary_source_quotes": int(d.get("primary_source_quotes", 0)),
        "poor_referencing": d.get("poor_referencing", "False") == "True",
        "wiki_quality": d.get("wiki_quality", "False") == "True",
        "ancient_historian_hits": int(d.get("ancient_historian_hits", 0)),
        "ante_nicene_hits": int(d.get("ante_nicene_hits", 0)),
        "mythicist_hits": int(d.get("mythicist_hits", 0)),
        "data_interp_tier": d.get("data_interp_tier", "unclassifiable"),
        "data_interp_split_contribution": int(d.get("data_interp_split_contribution", 0)),
        "data_interp_pending": d.get("data_interp_pending", "False") == "True",
        "jesus_seminar_hits": int(d["jesus_seminar_hits"]) if "jesus_seminar_hits" in d else (1 if d.get("jesus_seminar_cited") == "True" else 0),
        # Placement multipliers (2026-07-17): pre-rescore rows lack the columns — default x1.
        "jesus_seminar_mult": float(d.get("jesus_seminar_mult") or 1.0),
        "jesus_seminar_contribution": int(d.get("jesus_seminar_contribution", 0)),
        "mythicist_mult": float(d.get("mythicist_mult") or 1.0),
        "mythicist_contribution": int(d.get("mythicist_contribution", 0)),
        "ot_nt_criticism_contribution": int(d.get("ot_nt_criticism_contribution", 0)),
        "supernatural_criticism_contribution": int(d.get("supernatural_criticism_contribution", 0)),
        "secular_materialist_contribution": int(d.get("secular_materialist_contribution", 0)),
        "literary_analysis_contribution": int(d.get("literary_analysis_contribution", 0)),
        "gnostic_over_emphasis_contribution": int(d.get("gnostic_over_emphasis_contribution", 0)),
        "confessional_balance_contribution": int(d.get("confessional_balance_contribution", 0)),
        "balanced_debate_contribution": int(d.get("balanced_debate_contribution", 0)),
        "jewish_context_hits": int(d.get("jewish_context_hits", 0)),
        "balanced_debate_hits": int(d.get("balanced_debate_hits") or 0),
        "balanced_debate_named": int(d.get("balanced_debate_named") or 0),
        "critical_scholar_hits": int(d.get("critical_scholar_hits") or 0),
        "critical_outside_interp": d.get("critical_outside_interp", "False") == "True",
        "evangelical_contrast": d.get("evangelical_contrast", "False") == "True",
        "maps_diagrams_count": int(d.get("maps_diagrams_count", 0)),
        "has_picture_wide": d.get("has_picture_wide", "False") == "True",
        "has_picture_narrow": d.get("has_picture_narrow", "False") == "True",
        "has_diagram_or_map": d.get("has_diagram_or_map", "False") == "True",
        # Renamed from islamic_mormon_hit (2026-07-17, list expanded to other religions) — a
        # pre-rescore detail row still has the old column name; read it as the same signal.
        "other_religion_hit": (d.get("other_religion_hit") or d.get("islamic_mormon_hit", "False")) == "True",
        "is_passion": d.get("is_passion", "False") == "True",
        "is_miracle": d.get("is_miracle", "False") == "True",
        "is_parable": d.get("is_parable", "False") == "True",
        "is_location": d.get("is_location", "False") == "True",
        "is_teaching": d.get("is_teaching", "False") == "True",
        "is_bible_book": d.get("is_bible_book", "False") == "True",
    }


def cmd_check():
    main_rows = load_main()
    detail_rows = load_detail()
    excluded = load_excluded()
    problems = []

    main_titles = {r["title"] for r in main_rows}
    detail_titles = {r["title"] for r in detail_rows}
    if main_titles != detail_titles:
        problems.append(
            f"Title sets differ between the two files: only-in-main={main_titles - detail_titles}, "
            f"only-in-detail={detail_titles - main_titles}"
        )

    hit_excluded = main_titles & excluded
    if hit_excluded:
        problems.append(f"Permanently-excluded titles found in the live list: {hit_excluded}")

    url_lookup = {r["title"]: r["url"] for r in main_rows}
    internal = [detail_row_to_internal(d, url_lookup) for d in detail_rows]
    internal.sort(key=lambda r: (-r["net_score"], r["title"].lower()))
    expected_rank = {r["title"]: i for i, r in enumerate(internal, start=1)}
    for r in main_rows:
        if expected_rank.get(r["title"]) != r["ranking"]:
            problems.append(
                f'"{r["title"]}" is ranked {r["ranking"]} but the Scoring Detail sort says it should be '
                f'{expected_rank.get(r["title"])}'
            )

    if os.path.exists(BULK_PASTE_TXT):
        expected_bulk = "\n".join(
            f"{to_output_title(r['title'])}, {to_output_url(r['url'])}, {r['ranking']}" for r in main_rows
        ) + "\n"
        with open(BULK_PASTE_TXT, encoding="utf-8") as f:
            actual_bulk = f.read()
        if actual_bulk != expected_bulk:
            problems.append("wiki-bulk-paste.txt is stale — does not match Wikipedia Articles.csv.")
    else:
        problems.append("wiki-bulk-paste.txt is missing.")

    if problems:
        print("\n".join(problems))
        sys.exit(1)
    print(f"OK — {len(main_rows)} articles, all files consistent.")
    sys.exit(0)


def cmd_remove(titles_to_remove):
    """One-off removal WITHOUT permanent denylisting — the title could be re-added by a later
    top-up. Use `exclude` instead when it should never come back."""
    detail_rows = load_detail()
    main_rows = load_main()
    url_lookup = {r["title"]: r["url"] for r in main_rows}
    internal = [detail_row_to_internal(d, url_lookup) for d in detail_rows]

    before = len(internal)
    to_remove = set(titles_to_remove)
    removed = [r["title"] for r in internal if r["title"] in to_remove]
    not_found = [t for t in titles_to_remove if t not in {r["title"] for r in internal}]
    internal = [r for r in internal if r["title"] not in to_remove]

    write_files(internal)
    after = len(internal)
    print(f"Removed {len(removed)} title(s): {removed}")
    if not_found:
        print(f"Not found (skipped): {not_found}")
    print(f"Count: {before} → {after}")


def cmd_exclude(titles_to_add):
    excluded = load_excluded()
    new_ones = [t for t in titles_to_add if t not in excluded]
    if new_ones:
        with open(EXCLUDED_TXT, "a", encoding="utf-8") as f:
            for t in new_ones:
                f.write(t + "\n")
    excluded |= set(titles_to_add)

    detail_rows = load_detail()
    main_rows = load_main()
    url_lookup = {r["title"]: r["url"] for r in main_rows}
    internal = [detail_row_to_internal(d, url_lookup) for d in detail_rows]

    before = len(internal)
    removed = [r["title"] for r in internal if r["title"] in excluded]
    internal = [r for r in internal if r["title"] not in excluded]

    write_files(internal)
    after = len(internal)
    print(f"Excluded and removed {len(removed)} title(s): {removed}")
    print(f"Count: {before} → {after}")


def cmd_rescore():
    """Full re-harvest of every CURRENTLY-PRESENT article under the CURRENT weight table (not a
    merge of stale signals — use this after a weight-table change so every row is scored on the
    same, current rubric). Resumable: progress is written to .rescore-progress.jsonl as it goes,
    so an interrupted run can just be re-invoked and will skip whatever's already done.

    Plan 4's bucket-labels.json and Plan 5's vector-family-scores.json are read when present and
    fail loudly when malformed — but their outright *absence* is the documented pending state
    (§9 activation checklist, PENDING_SIGNAL_KEYS), not an error: every article is harvested with
    data_interp_split explicitly marked pending (raw_signals.data_interp_pending) instead of the
    whole rescore refusing to run."""
    try:
        bucket_labels = load_bucket_labels()
    except FileNotFoundError:
        print("bucket-labels.json not found — proceeding with data_interp_split marked pending "
              "(§9 activation checklist).")
        bucket_labels = None
    try:
        family_scores = load_vector_family_scores()
    except FileNotFoundError:
        print("vector-family-scores.json not found — vector-covered signals fall back to their "
              "dormant keyword detectors.")
        family_scores = None

    main_rows = load_main()
    total = len(main_rows)

    done = {}
    stale = 0
    if os.path.exists(RESCORE_PROGRESS):
        with open(RESCORE_PROGRESS, encoding="utf-8") as f:
            for line in f:
                entry = json.loads(line)
                # Check keyset is current — if schema changed since last resume, discard stale entries
                if set(entry.keys()) == ROW_KEYS:
                    done[entry["title"]] = entry
                else:
                    stale += 1
        if stale:
            print(f"Skipping {stale} stale resume entry(s) from a previous weight-table version.")

    remaining = [r for r in main_rows if r["title"] not in done]
    if not remaining:
        write_files(list(done.values()))
        print(f"Rescore already complete — all {total} article(s) done.")
        return

    already_done = len(done)
    print(f"Resuming rescore: {already_done}/{total} done, {len(remaining)} remaining.")
    with open(RESCORE_PROGRESS, "a", encoding="utf-8") as prog:
        for i, r in enumerate(remaining, start=1):
            print(f"  [{already_done + i}/{total}] {r['title']}")
            try:
                sig = harvest_one(r["url"])
            except Exception as e:
                print(f"    HARVEST FAILED: {e} — skipping")
                continue
            merge_upstream_signals(r["title"], sig, bucket_labels, family_scores)
            row = row_from_signals(r["title"], r["url"], sig)
            done[r["title"]] = row
            prog.write(json.dumps(row) + "\n")
            prog.flush()

    write_files(list(done.values()))
    os.remove(RESCORE_PROGRESS)
    print(f"Rescore complete — {total} article(s) written.")


def cmd_add(input_path):
    """Reads Plan 4's bucket-labels.json and Plan 5's vector-family-scores.json when present —
    see cmd_rescore()'s docstring for the pending-state handling when either is absent."""
    try:
        bucket_labels = load_bucket_labels()
    except FileNotFoundError:
        print("bucket-labels.json not found — proceeding with data_interp_split marked pending "
              "(§9 activation checklist).")
        bucket_labels = None
    try:
        family_scores = load_vector_family_scores()
    except FileNotFoundError:
        print("vector-family-scores.json not found — vector-covered signals fall back to their "
              "dormant keyword detectors.")
        family_scores = None

    detail_rows = load_detail()
    main_rows = load_main()
    url_lookup = {r["title"]: r["url"] for r in main_rows}
    internal = [detail_row_to_internal(d, url_lookup) for d in detail_rows]
    existing_titles = {r["title"] for r in internal}
    excluded = load_excluded()

    with open(input_path, encoding="utf-8") as f:
        candidates = [line.rstrip("\n").split("\t", 1) for line in f if line.strip()]

    new_count = 0
    for title, url in candidates:
        if title in existing_titles:
            print(f'  SKIP "{title}" — already in list')
            continue
        if title in excluded:
            print(f'  SKIP "{title}" — permanently excluded')
            continue
        print(f'  [{new_count + 1}] {title}')
        try:
            sig = harvest_one(url)
        except Exception as e:
            print(f"    HARVEST FAILED: {e} — skipping")
            continue
        merge_upstream_signals(title, sig, bucket_labels, family_scores)
        row = row_from_signals(title, url, sig)
        internal.append(row)
        existing_titles.add(title)
        new_count += 1

    if new_count == 0:
        print("No new titles added — writing files to ensure consistency.")
    else:
        print(f"Added {new_count} new title(s).")

    write_files(internal)
    print(f"Total: {len(internal)} articles.")


RESCORE_PROGRESS = os.path.join(ALGORITHM_DIR, ".rescore-progress.jsonl")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sp = p.add_subparsers(dest="cmd")

    sp.add_parser("check")
    sp_add = sp.add_parser("add")
    sp_add.add_argument("--input", required=True)
    sp_rm = sp.add_parser("remove")
    sp_rm.add_argument("titles", nargs="+")
    sp_ex = sp.add_parser("exclude")
    sp_ex.add_argument("titles", nargs="+")
    sp.add_parser("rescore")
    sp.add_parser("export")

    args = p.parse_args()
    if args.cmd == "check":
        cmd_check()
    elif args.cmd == "add":
        cmd_add(args.input)
    elif args.cmd == "remove":
        cmd_remove(args.titles)
    elif args.cmd == "exclude":
        cmd_exclude(args.titles)
    elif args.cmd == "rescore":
        cmd_rescore()
    elif args.cmd == "export":
        cmd_export()
    else:
        p.print_help()
        sys.exit(1)
