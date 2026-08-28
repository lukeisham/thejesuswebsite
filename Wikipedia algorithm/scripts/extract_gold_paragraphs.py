#!/usr/bin/env python3
"""Re-extract every gold-set article's paragraphs from the Wikipedia parse API.

The current gold set was labelled on visually rendered pages while the classifier
reads parse-API HTML, so paragraph indices do not align and the lede mismatches
by construction. This script re-extracts paragraphs from the parse API for every
article in the gold set, producing a clean mapping of paragraph index → text
that the classifier actually sees.

Usage:
    python scripts/extract_gold_paragraphs.py [--limit N] [--cache CACHE_PATH]

Output: gold-set-parse-paragraphs.json — maps article title → list of paragraph
texts extracted from the Wikipedia parse API, in the same order the classifier
will encounter them.
"""

import argparse
import csv
import json
import logging
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
from urllib.request import urlopen, Request
from urllib.parse import quote

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("extract-gold")

ALGORITHM_DIR = Path(__file__).resolve().parent.parent
GOLD_SET_PATH = ALGORITHM_DIR / "gold-set-section-classifier.csv"
OUTPUT_PATH = ALGORITHM_DIR / "gold-set-parse-paragraphs.json"
CACHE_PATH = ALGORITHM_DIR / ".extract-gold-cache.json"

WIKIPEDIA_PARSE_API = (
    "https://en.wikipedia.org/w/api.php"
    "?action=parse&page={title}&prop=text&format=json"
    "&disabletoc=1&formatversion=2"
)

PARAGRAPH_CLEAN_RE = re.compile(r"<[^>]+>")


class ParagraphExtractor(HTMLParser):
    """Extract and clean <p> tag text from Wikipedia parse-API HTML."""

    def __init__(self) -> None:
        super().__init__()
        self.paragraphs: list[str] = []
        self._current: list[str] = []
        self._in_p = False
        self._skip_div = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "p":
            self._in_p = True
            self._current = []
        elif tag in ("sup", "span"):
            pass  # Inline elements — keep.
        elif tag in ("div", "table", "ul", "ol"):
            self._skip_div = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "p":
            self._in_p = False
            text = "".join(self._current).strip()
            if text:
                self.paragraphs.append(self._clean(text))
        elif tag in ("div", "table", "ul", "ol"):
            self._skip_div = False

    def handle_data(self, data: str) -> None:
        if self._in_p and not self._skip_div:
            self._current.append(data)

    @staticmethod
    def _clean(text: str) -> str:
        """Remove residual HTML tags and normalise whitespace."""
        text = PARAGRAPH_CLEAN_RE.sub("", text)
        text = re.sub(r"\[\d+\]", "", text)  # Remove citation brackets [1], [2], etc.
        text = re.sub(r"\s+", " ", text).strip()
        return text


def fetch_article_paragraphs(title: str) -> list[str]:
    """Fetch and extract paragraphs for a single Wikipedia article via the parse API.

    Args:
        title: Wikipedia article title (URL-encoded internally).

    Returns:
        List of cleaned paragraph texts in reading order.
    """
    url = WIKIPEDIA_PARSE_API.format(title=quote(title))
    logger.info("Fetching: %s", title)

    req = Request(url, headers={"User-Agent": "TheJesusWebsite-GoldSetExtract/1.0"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.error("Failed to fetch '%s': %s", title, exc)
        return []

    parse_result = data.get("parse", {})
    text_html = parse_result.get("text", "")

    if not text_html:
        logger.warning("No parse text for '%s'", title)
        return []

    extractor = ParagraphExtractor()
    extractor.feed(text_html)
    return extractor.paragraphs


def load_gold_titles(path: Optional[Path] = None) -> list[str]:
    """Load the list of unique article titles from the gold-set CSV.

    Args:
        path: Path to gold-set CSV. Defaults to GOLD_SET_PATH.

    Returns:
        List of unique article titles.
    """
    if path is None:
        path = GOLD_SET_PATH

    titles: list[str] = []
    seen: set[str] = set()

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("article_title", "").strip()
            if title and title not in seen:
                titles.append(title)
                seen.add(title)

    logger.info("Loaded %d unique titles from gold set.", len(titles))
    return titles


def load_cache(path: Optional[Path] = None) -> dict[str, list[str]]:
    """Load the fetch cache if it exists."""
    if path is None:
        path = CACHE_PATH
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict[str, list[str]], path: Optional[Path] = None) -> None:
    """Save the fetch cache."""
    if path is None:
        path = CACHE_PATH
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Re-extract gold-set paragraphs from the Wikipedia parse API."
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Limit to the first N articles (0 = all).",
    )
    parser.add_argument(
        "--cache", type=str, default=str(CACHE_PATH),
        help="Path to the fetch cache JSON file.",
    )
    args = parser.parse_args()

    cache_path = Path(args.cache)
    titles = load_gold_titles()
    if args.limit > 0:
        titles = titles[: args.limit]
        logger.info("Limited to %d articles.", args.limit)

    cache = load_cache(cache_path)
    output: dict[str, list[str]] = {}
    new_fetches = 0

    for i, title in enumerate(titles, 1):
        if title in cache:
            output[title] = cache[title]
            logger.info("[%d/%d] %s (cached)", i, len(titles), title)
        else:
            paragraphs = fetch_article_paragraphs(title)
            output[title] = paragraphs
            cache[title] = paragraphs
            new_fetches += 1
            logger.info("[%d/%d] %s — %d paragraphs", i, len(titles), title,
                         len(paragraphs))
            # Rate-limit: Wikipedia asks for polite spacing.
            if new_fetches > 1:
                time.sleep(1.0)

    # Write output.
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    logger.info("Wrote %d articles to %s", len(output), OUTPUT_PATH)

    save_cache(cache, cache_path)
    logger.info("Cache saved to %s (%d entries)", cache_path, len(cache))


if __name__ == "__main__":
    main()
