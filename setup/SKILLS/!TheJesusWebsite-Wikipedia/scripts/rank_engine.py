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

BASE = "/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron"
PROJECT_DIR = os.path.join(BASE, "Memory/Long-Term/The-Jesus-Website/Wikipedia")
BROWSER = os.path.join(BASE, ".claude/skills/!HeadlessChromeBrowser/scripts/browser.py")
EXTRACT_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract.js")

MAIN_CSV = os.path.join(PROJECT_DIR, "Wikipedia Articles.csv")
DETAIL_CSV = os.path.join(PROJECT_DIR, "Wikipedia Articles - Scoring Detail.csv")
EXCLUDED_TXT = os.path.join(PROJECT_DIR, "excluded-titles.txt")
BULK_PASTE_TXT = os.path.join(PROJECT_DIR, "wiki-bulk-paste.txt")
CEILING = 250

DETAIL_FIELDS = [
    "ranking", "title", "net_score", "verse_count", "ref_count", "journal_hits", "book_hits",
    "commentary_hits", "arch_site", "historical_context", "manuscript_hits",
    "primary_source_quotes", "gnostic_source_quoted", "poor_referencing",
    "wiki_quality", "ancient_historian_hits", "ante_nicene_hits", "mythicist_hits",
    "narrative_and_interp_sections", "jesus_seminar_hits", "jesus_seminar_mult", "mythicist_mult",
    "no_bible_verse", "no_references", "ot_nt_criticism", "supernatural_criticism",
    "jewish_context_hits", "other_religion_hit", "passion_criticism_hits", "miracle_criticism_hits",
    "balanced_debate_hits", "balanced_debate_named",
    "critical_scholar_hits", "critical_outside_interp", "evangelical_contrast",
    "is_passion", "is_miracle", "is_parable", "is_location",
    "is_teaching", "is_bible_book",
]

# The set of keys row_from_signals() actually produces (DETAIL_FIELDS minus the two — ranking,
# no_bible_verse, no_references — that are derived later, not stored on the row itself; plus "url"
# which isn't a DETAIL_FIELD but is stored). Used to detect a schema-stale resume/progress entry
# from before a weight-table change added new fields, so it never gets silently treated as "done".
ROW_KEYS = (set(DETAIL_FIELDS) - {"ranking", "no_bible_verse", "no_references"}) | {"url"}


def load_main():
    rows = []
    with open(MAIN_CSV, encoding="utf-8") as f:
        f.readline()  # header
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            title, url, rank = line.rsplit(",", 2)
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
    the halved result truncates toward zero (int()), i.e. rounds leniently."""
    if sig.get(prefix + "InData"):
        return 2.0
    if sig.get(prefix + "InInterp") and not sig.get(prefix + "InOther"):
        return 0.5
    return 1.0


def net_score_from_signals(sig):
    s = 0
    s += min(sig["verseCount"], 3) * 3
    s += min(sig["journalCount"], 5) * 1
    s += min(sig["bookCount"], 5) * 1
    # Commentary credit only for parables / idioms / sayings / teachings articles
    if sig.get("isParable") or sig.get("isTeaching"):
        s += min(sig.get("commentaryCount", 0), 3) * 1
    # Parable exemption: arch_site and ancient_historian score as 0
    if not sig.get("isParable"):
        s += 2 if sig["archSiteHit"] else 0
    # Location IAA bonus: +3 extra on top of existing +2
    if sig.get("isLocation") and sig["archSiteHit"]:
        s += 3
    s += 2 if sig["historicalContextHit"] else 0
    # Named-manuscript credit: all articles; DOUBLED for teachings/sayings/idioms and books of
    # the Bible (applied to the capped points)
    s += min(sig.get("manuscriptCount", 0), 3) * 2 * (2 if (sig.get("isTeaching") or sig.get("isBibleBook")) else 1)
    s += min(sig.get("primarySourceQuoteCount", 0), 4) * 1
    s += 3 if (sig["narrativeHeading"] and sig["interpHeading"]) else 0
    s += 1 if sig.get("wikiQualityHit") else 0
    # Parable exemption: ancient_historian scores as 0
    if not sig.get("isParable"):
        s += min(sig.get("ancientHistorianCount", 0), 3) * 1
    s += min(sig.get("anteNiceneCount", 0), 3) * 2
    s += -10 if sig["verseCount"] == 0 else 0
    s += int(min(sig.get("jesusSeminarCount", 0), 3) * -2 * placement_mult(sig, "jesusSeminar"))
    s += -1 if sig.get("gnosticSourceHit") else 0
    s += -1 if sig.get("poorReferencingHit") else 0
    s += int(min(sig.get("mythicistCount", 0), 3) * -3 * placement_mult(sig, "mythicist"))
    s += -8 if sig["refCount"] == 0 else 0
    # Per Reference.md (the source of truth): −2 per instance, capped −6. contOTNT/superCrit are
    # counts from extract.js; int() tolerates a legacy boolean (True==1) from pre-count signals.
    s += min(int(sig["contOTNT"]), 3) * -2
    s += min(int(sig["superCrit"]), 3) * -2
    # New signals
    s += min(sig.get("jewishContextHits", 0), 4) * 1
    # Balanced debate: +1 per pattern capped +3, DOUBLED when >=2 distinct named representatives
    # are cited for the differing views
    s += min(sig.get("balancedDebateHits", 0), 3) * (2 if sig.get("balancedDebateNamedAuthors", 0) >= 2 else 1)
    # Confessional balance: fires only when a critical-scholarship historian is cited.
    # Outside the interpretation sections -> -3; inside interpretation without a contrasting
    # Evangelical author -> -1; inside interpretation WITH one -> 0.
    if sig.get("criticalScholarCount", 0) > 0:
        if sig.get("criticalScholarInData") or sig.get("criticalScholarInOther"):
            s += -3
        elif not sig.get("evangelicalInInterp"):
            s += -1
    s += -3 if sig.get("otherReligionHit", sig.get("islamicMormonHit")) else 0
    s += min(sig.get("passionCriticismHits", 0), 3) * -2
    s += min(sig.get("miracleCriticismHits", 0), 3) * -2
    # Niche exposure bonus (tiered): refCount < 5 → +3; 5–9 → +1
    if sig["refCount"] < 5:
        s += 3
    elif sig["refCount"] < 10:
        s += 1
    return s


def row_from_signals(title, url, sig):
    return {
        "title": title, "url": url, "net_score": net_score_from_signals(sig),
        "verse_count": sig["verseCount"], "ref_count": sig["refCount"],
        "journal_hits": sig["journalCount"], "book_hits": sig["bookCount"],
        "commentary_hits": sig.get("commentaryCount", 0),
        "arch_site": sig["archSiteHit"], "historical_context": sig["historicalContextHit"],
        "manuscript_hits": sig.get("manuscriptCount", 0),
        "primary_source_quotes": sig.get("primarySourceQuoteCount", 0),
        "gnostic_source_quoted": sig.get("gnosticSourceHit", False),
        "poor_referencing": sig.get("poorReferencingHit", False),
        "wiki_quality": sig.get("wikiQualityHit", False),
        "ancient_historian_hits": sig.get("ancientHistorianCount", 0),
        "ante_nicene_hits": sig.get("anteNiceneCount", 0),
        "mythicist_hits": sig.get("mythicistCount", 0),
        "narrative_and_interp_sections": sig["narrativeHeading"] and sig["interpHeading"],
        "jesus_seminar_hits": sig.get("jesusSeminarCount", 0),
        "jesus_seminar_mult": placement_mult(sig, "jesusSeminar"),
        "mythicist_mult": placement_mult(sig, "mythicist"),
        "ot_nt_criticism": int(sig["contOTNT"]), "supernatural_criticism": int(sig["superCrit"]),
        "jewish_context_hits": sig.get("jewishContextHits", 0),
        "balanced_debate_hits": sig.get("balancedDebateHits", 0),
        "balanced_debate_named": sig.get("balancedDebateNamedAuthors", 0),
        "critical_scholar_hits": sig.get("criticalScholarCount", 0),
        "critical_outside_interp": bool(sig.get("criticalScholarInData") or sig.get("criticalScholarInOther")),
        "evangelical_contrast": bool(sig.get("evangelicalInInterp", False)),
        "other_religion_hit": sig.get("otherReligionHit", sig.get("islamicMormonHit", False)),
        "passion_criticism_hits": sig.get("passionCriticismHits", 0),
        "miracle_criticism_hits": sig.get("miracleCriticismHits", 0),
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
    rows.sort(key=lambda r: (-r["net_score"], -r["verse_count"], -r["ref_count"], r["title"].lower()))
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
                "arch_site": r["arch_site"], "historical_context": r["historical_context"],
                "manuscript_hits": r["manuscript_hits"],
                "primary_source_quotes": r["primary_source_quotes"],
                "gnostic_source_quoted": r["gnostic_source_quoted"],
                "poor_referencing": r["poor_referencing"],
                "wiki_quality": r["wiki_quality"],
                "ancient_historian_hits": r["ancient_historian_hits"],
                "ante_nicene_hits": r["ante_nicene_hits"],
                "mythicist_hits": r["mythicist_hits"],
                "narrative_and_interp_sections": r["narrative_and_interp_sections"],
                "jesus_seminar_hits": r["jesus_seminar_hits"],
                "jesus_seminar_mult": r["jesus_seminar_mult"], "mythicist_mult": r["mythicist_mult"],
                "no_bible_verse": r["verse_count"] == 0, "no_references": r["ref_count"] == 0,
                "ot_nt_criticism": r["ot_nt_criticism"], "supernatural_criticism": r["supernatural_criticism"],
                "jewish_context_hits": r["jewish_context_hits"],
                "other_religion_hit": r["other_religion_hit"],
                "passion_criticism_hits": r["passion_criticism_hits"],
                "miracle_criticism_hits": r["miracle_criticism_hits"],
                "balanced_debate_hits": r["balanced_debate_hits"],
                "balanced_debate_named": r["balanced_debate_named"],
                "critical_scholar_hits": r["critical_scholar_hits"],
                "critical_outside_interp": r["critical_outside_interp"],
                "evangelical_contrast": r["evangelical_contrast"],
                "is_passion": r["is_passion"], "is_miracle": r["is_miracle"],
                "is_parable": r["is_parable"], "is_location": r["is_location"],
                "is_teaching": r["is_teaching"], "is_bible_book": r["is_bible_book"],
            })
    write_bulk_paste_file(rows)
    write_export(rows)


def _count_or_bool(v):
    """Parse a detail-CSV cell that is an int count post-2026-07 but was "True"/"False" before."""
    if v == "True":
        return 1
    if v in ("False", "", None):
        return 0
    return int(v)


# --- JSON export (for The Jesus Website visualization widget) ---------------------------------
EXPORT_JSON = os.path.join(PROJECT_DIR, "scoring-export.json")
EXPORT_REPO_JSON = "/Users/lukeishammacbookair/Developer/thejesuswebsite/database/scoring-export.json"

# label, weight description, caveat — the embedded data dictionary for the widget.
SIGNAL_DICTIONARY = {
    "bible_verses":        {"label": "Bible verses cited", "weight": "+3 per, capped +9", "caveat": None},
    "narrative_interp_split": {"label": "Data/interpretation section split", "weight": "+3 flat", "caveat": "raw data/narrative held apart from how it is understood and contextualized"},
    "manuscripts":         {"label": "Named manuscripts", "weight": "+2 per, capped +6; doubled for teachings/books of the Bible", "caveat": "fixed list; generic mention counts as 1"},
    "ante_nicene":         {"label": "Ante-Nicene authors", "weight": "+2 per, capped +6", "caveat": None},
    "arch_site":           {"label": "Archaeological site/artefact", "weight": "+2 flat", "caveat": "scores 0 for parables"},
    "location_bonus":      {"label": "Location + archaeology bonus", "weight": "+3 flat", "caveat": "location articles with an archaeology hit"},
    "historical_context":  {"label": "Historical/contextual comparanda", "weight": "+2 flat", "caveat": None},
    "journals":            {"label": "Journal citations", "weight": "+1 per, capped +5", "caveat": None},
    "books":               {"label": "Book citations", "weight": "+1 per, capped +5", "caveat": None},
    "primary_quotes":      {"label": "Primary-source quotes", "weight": "+1 per, capped +4", "caveat": "blunt proxy: any substantial quote"},
    "jewish_context":      {"label": "Jewish context terms", "weight": "+1 per, capped +4", "caveat": None},
    "balanced_debate":     {"label": "Balanced debate in interpretation sections", "weight": "+1 per, capped +3; doubled when 2+ named representatives cited", "caveat": "interpretation sections only; sentences mentioning other religions excluded"},
    "confessional_balance": {"label": "Confessional balance", "weight": "0 / -1 / -3 conditional", "caveat": "fires when a critical-scholarship historian (Ehrman et al.) is cited anywhere, footnotes included: -3 outside interpretation sections (footnotes count as outside), -1 in interpretation without an Evangelical counterpart, 0 with one"},
    "commentaries":        {"label": "Commentary citations", "weight": "+1 per, capped +3", "caveat": "only for parables/idioms/sayings/teachings"},
    "ancient_historians":  {"label": "Non-Christian ancient historians", "weight": "+1 per, capped +3", "caveat": "scores 0 for parables; 8-name list incl. Mara bar Serapion, Lucian, Celsus, Phlegon"},
    "wiki_quality":        {"label": "Wikipedia Good/Featured Article", "weight": "+1 flat", "caveat": None},
    "niche_bonus":         {"label": "Niche exposure bonus", "weight": "+3 if <5 refs; +1 if 5-9 refs", "caveat": "tiered — protects short, well-researched niche topics"},
    "gnostic_quoted":      {"label": "Gnostic source quoted", "weight": "-1 flat", "caveat": None},
    "poor_referencing":    {"label": "Poor referencing", "weight": "-1 flat", "caveat": None},
    "jesus_seminar":       {"label": "Jesus Seminar citations", "weight": "-2 per, capped -6; x2 in data sections, x0.5 if interpretation-only", "caveat": "stance-blind keyword match; placement multiplier applied to capped penalty"},
    "ot_nt_criticism":     {"label": "OT-NT continuity criticism", "weight": "-2 per distinct pattern, capped -6", "caveat": "stance-blind keyword match"},
    "supernatural_criticism": {"label": "Supernatural-worldview criticism", "weight": "-2 per, capped -6", "caveat": "stance-blind keyword match"},
    "passion_criticism":   {"label": "Passion-specific criticism", "weight": "-2 per, capped -6", "caveat": "Passion articles only"},
    "miracle_criticism":   {"label": "Miracle-specific criticism", "weight": "-2 per, capped -6", "caveat": "Miracle articles only; section-aware"},
    "other_religion":      {"label": "Other-religion sources", "weight": "-3 flat", "caveat": "Islamic, Mormon, Buddhist, Hindu, Sikh, Jain, Rastafari, Baha'i material cited as authoritative"},
    "mythicist":           {"label": "Mythicist citations", "weight": "-3 per, capped -9; x2 in data sections, x0.5 if interpretation-only", "caveat": "stance-blind keyword match; placement multiplier applied to capped penalty"},
    "no_references":       {"label": "No references at all", "weight": "-8 flat", "caveat": None},
    "no_bible_verse":      {"label": "No Bible verse cited", "weight": "-10 flat", "caveat": None},
}


def contributions_from_row(r):
    """Per-signal POINT contributions (caps and category conditionals applied) for one internal
    row. Must mirror net_score_from_signals exactly — cmd/auto export verifies the sum equals the
    stored net_score for every article and refuses to write a mismatched export."""
    return {
        "bible_verses": min(r["verse_count"], 3) * 3,
        "narrative_interp_split": 3 if r["narrative_and_interp_sections"] else 0,
        "manuscripts": min(r["manuscript_hits"], 3) * 2 * (2 if (r["is_teaching"] or r["is_bible_book"]) else 1),
        "ante_nicene": min(r["ante_nicene_hits"], 3) * 2,
        "arch_site": 0 if r["is_parable"] else (2 if r["arch_site"] else 0),
        "location_bonus": 3 if (r["is_location"] and r["arch_site"]) else 0,
        "historical_context": 2 if r["historical_context"] else 0,
        "journals": min(r["journal_hits"], 5),
        "books": min(r["book_hits"], 5),
        "primary_quotes": min(r["primary_source_quotes"], 4),
        "jewish_context": min(r["jewish_context_hits"], 4),
        "balanced_debate": min(r["balanced_debate_hits"], 3) * (2 if r["balanced_debate_named"] >= 2 else 1),
        "confessional_balance": 0 if r["critical_scholar_hits"] == 0 else (
            -3 if r["critical_outside_interp"] else (0 if r["evangelical_contrast"] else -1)),
        "commentaries": min(r["commentary_hits"], 3) if (r["is_parable"] or r["is_teaching"]) else 0,
        "ancient_historians": 0 if r["is_parable"] else min(r["ancient_historian_hits"], 3),
        "wiki_quality": 1 if r["wiki_quality"] else 0,
        "niche_bonus": 3 if r["ref_count"] < 5 else (1 if r["ref_count"] < 10 else 0),
        "gnostic_quoted": -1 if r["gnostic_source_quoted"] else 0,
        "poor_referencing": -1 if r["poor_referencing"] else 0,
        "jesus_seminar": int(min(r["jesus_seminar_hits"], 3) * -2 * r["jesus_seminar_mult"]),
        "ot_nt_criticism": min(r["ot_nt_criticism"], 3) * -2,
        "supernatural_criticism": min(r["supernatural_criticism"], 3) * -2,
        "passion_criticism": min(r["passion_criticism_hits"], 3) * -2,
        "miracle_criticism": min(r["miracle_criticism_hits"], 3) * -2,
        "other_religion": -3 if r["other_religion_hit"] else 0,
        "mythicist": int(min(r["mythicist_hits"], 3) * -3 * r["mythicist_mult"]),
        "no_references": -8 if r["ref_count"] == 0 else 0,
        "no_bible_verse": -10 if r["verse_count"] == 0 else 0,
    }


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
        articles.append({
            "ranking": i, "title": r["title"], "url": r["url"], "net_score": r["net_score"],
            "contributions": contrib,
            "raw_signals": {
                "verse_count": r["verse_count"], "ref_count": r["ref_count"],
                "journal_hits": r["journal_hits"], "book_hits": r["book_hits"],
                "commentary_hits": r["commentary_hits"], "arch_site": r["arch_site"],
                "historical_context": r["historical_context"], "manuscript_hits": r["manuscript_hits"],
                "primary_source_quotes": r["primary_source_quotes"],
                "gnostic_source_quoted": r["gnostic_source_quoted"],
                "poor_referencing": r["poor_referencing"], "wiki_quality": r["wiki_quality"],
                "ancient_historian_hits": r["ancient_historian_hits"],
                "ante_nicene_hits": r["ante_nicene_hits"], "mythicist_hits": r["mythicist_hits"],
                "narrative_and_interp_sections": r["narrative_and_interp_sections"],
                "jesus_seminar_hits": r["jesus_seminar_hits"],
                "jesus_seminar_mult": r["jesus_seminar_mult"], "mythicist_mult": r["mythicist_mult"],
                "ot_nt_criticism": r["ot_nt_criticism"],
                "supernatural_criticism": r["supernatural_criticism"],
                "jewish_context_hits": r["jewish_context_hits"],
                "other_religion_hit": r["other_religion_hit"],
                "passion_criticism_hits": r["passion_criticism_hits"],
                "miracle_criticism_hits": r["miracle_criticism_hits"],
                "balanced_debate_hits": r["balanced_debate_hits"],
                "balanced_debate_named": r["balanced_debate_named"],
                "critical_scholar_hits": r["critical_scholar_hits"],
                "critical_outside_interp": r["critical_outside_interp"],
                "evangelical_contrast": r["evangelical_contrast"],
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
            "ceiling": CEILING,
            "source": "Lukeatron !TheJesusWebsite-Wikipedia rank_engine.py",
            "note": "contributions are capped/conditional POINTS per signal (they sum to net_score); "
                    "raw_signals are the uncapped harvested values.",
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
    internal.sort(key=lambda r: (-r["net_score"], -r["verse_count"], -r["ref_count"], r["title"].lower()))
    if not write_export(internal):
        sys.exit(1)


def detail_row_to_internal(d, url_lookup):
    return {
        "title": d["title"], "url": url_lookup.get(d["title"], ""),
        "net_score": int(d["net_score"]), "verse_count": int(d["verse_count"]), "ref_count": int(d["ref_count"]),
        "journal_hits": int(d["journal_hits"]), "book_hits": int(d["book_hits"]),
        "commentary_hits": int(d.get("commentary_hits", 0)),
        "arch_site": d.get("arch_site", d.get("iaa_or_arch", "False")) == "True",
        "historical_context": d.get("historical_context", "False") == "True",
        # manuscript/jesus_seminar were flat booleans before per-instance counting was added;
        # a pre-upgrade detail row (not yet rescored) has the old column, not the new one —
        # fall back to reading it as a count of 1 rather than silently zeroing it out.
        "manuscript_hits": int(d["manuscript_hits"]) if "manuscript_hits" in d else (1 if d.get("manuscript") == "True" else 0),
        "primary_source_quotes": int(d.get("primary_source_quotes", 0)),
        "gnostic_source_quoted": d.get("gnostic_source_quoted", "False") == "True",
        "poor_referencing": d.get("poor_referencing", "False") == "True",
        "wiki_quality": d.get("wiki_quality", "False") == "True",
        "ancient_historian_hits": int(d.get("ancient_historian_hits", 0)),
        "ante_nicene_hits": int(d.get("ante_nicene_hits", 0)),
        "mythicist_hits": int(d.get("mythicist_hits", 0)),
        "narrative_and_interp_sections": d["narrative_and_interp_sections"] == "True",
        "jesus_seminar_hits": int(d["jesus_seminar_hits"]) if "jesus_seminar_hits" in d else (1 if d.get("jesus_seminar_cited") == "True" else 0),
        # Placement multipliers (2026-07-17): pre-rescore rows lack the columns — default x1.
        "jesus_seminar_mult": float(d.get("jesus_seminar_mult") or 1.0),
        "mythicist_mult": float(d.get("mythicist_mult") or 1.0),
        # Were flat booleans before per-instance counting (2026-07): a pre-rescore detail row
        # holds "True"/"False" — read those as 1/0 rather than crashing on int().
        "ot_nt_criticism": _count_or_bool(d["ot_nt_criticism"]),
        "supernatural_criticism": _count_or_bool(d["supernatural_criticism"]),
        "jewish_context_hits": int(d.get("jewish_context_hits", 0)),
        "balanced_debate_hits": int(d.get("balanced_debate_hits") or 0),
        "balanced_debate_named": int(d.get("balanced_debate_named") or 0),
        "critical_scholar_hits": int(d.get("critical_scholar_hits") or 0),
        "critical_outside_interp": d.get("critical_outside_interp", "False") == "True",
        "evangelical_contrast": d.get("evangelical_contrast", "False") == "True",
        # Renamed from islamic_mormon_hit (2026-07-17, list expanded to other religions) — a
        # pre-rescore detail row still has the old column name; read it as the same signal.
        "other_religion_hit": (d.get("other_religion_hit") or d.get("islamic_mormon_hit", "False")) == "True",
        "passion_criticism_hits": int(d.get("passion_criticism_hits", 0)),
        "miracle_criticism_hits": int(d.get("miracle_criticism_hits", 0)),
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
    internal.sort(key=lambda r: (-r["net_score"], -r["verse_count"], -r["ref_count"], r["title"].lower()))
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
    so an interrupted run can just be re-invoked and will skip whatever's already done."""
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
            row = row_from_signals(r["title"], r["url"], sig)
            done[r["title"]] = row
            prog.write(json.dumps(row) + "\n")
            prog.flush()

    write_files(list(done.values()))
    os.remove(RESCORE_PROGRESS)
    print(f"Rescore complete — {total} article(s) written.")


def cmd_add(input_path):
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


RESCORE_PROGRESS = os.path.join(PROJECT_DIR, ".rescore-progress.jsonl")

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
