"""Unit tests for the LLM-to-bucket-labels conversion module.

Covers:
  1. build_llm_bucket_entry() produces a dict that passes
     validate_bucket_labels().
  2. A known LLM label sequence produces the expected +10 clear_split tier
     via the shared score_article() path.
  3. A paragraph-count mismatch between labels-corpus.json and the fetch
     cache returns None (fallback).
  4. load_llm_corpus() excludes articles whose content_hash doesn't match
     the current fetch cache.
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

_ALGO_DIR = Path(__file__).resolve().parent.parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from classifier.export import validate_bucket_labels
from classifier.llm_labels import build_llm_bucket_entry, load_llm_corpus
from scripts.llm_label_corpus import content_hash


class TestBuildLlmBucketEntry(unittest.TestCase):
    """Tests for build_llm_bucket_entry()."""

    def test_produces_valid_bucket_entry(self) -> None:
        """build_llm_bucket_entry() result passes validate_bucket_labels()."""
        labels = ["data", "data", "close", "interpretation", "interpretation"]
        paragraphs = ["P1", "P2", "P3", "P4", "P5"]
        fetch_cache = {"Test Article": paragraphs}

        entry = build_llm_bucket_entry("Test Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None  # narrow for type checker

        # Wrap in the same top-level shape validate_bucket_labels expects.
        errors = validate_bucket_labels({"Test Article": entry})
        self.assertEqual(
            errors,
            [],
            f"Validation errors for LLM bucket entry: {errors}",
        )

    def test_clear_split_tier_from_known_sequence(self) -> None:
        """All-data then all-interpretation produces +10 clear_split."""
        labels = (["data"] * 5) + (["interpretation"] * 5)
        paragraphs = [f"P{i}" for i in range(10)]
        fetch_cache = {"Split Article": paragraphs}

        entry = build_llm_bucket_entry("Split Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None

        self.assertEqual(entry["tier"], 10)
        self.assertEqual(entry["tier_state"], "clear_split")
        # Separation is 1 - (1/9) = 0.8889 — a single transition
        # between the last data paragraph and the first interpretation
        # paragraph in the adjacency metric.
        self.assertAlmostEqual(entry["separation"], 0.8889, places=3)

    def test_all_interpretation_is_one_sided(self) -> None:
        """All-interpretation (no data/close) is one_sided, tier 0."""
        labels = ["interpretation"] * 8
        paragraphs = [f"P{i}" for i in range(8)]
        fetch_cache = {"OneSided Article": paragraphs}

        entry = build_llm_bucket_entry("OneSided Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None

        self.assertEqual(entry["tier"], 0)
        self.assertEqual(entry["tier_state"], "one_sided")

    def test_paragraph_count_mismatch_returns_none(self) -> None:
        """Paragraph-count mismatch between LLM labels and fetch cache → None."""
        labels = ["data"] * 5
        paragraphs = ["P1", "P2", "P3"]  # 3, not 5
        fetch_cache = {"Mismatch Article": paragraphs}

        entry = build_llm_bucket_entry("Mismatch Article", labels, fetch_cache)
        self.assertIsNone(entry)

    def test_title_not_in_fetch_cache_returns_none(self) -> None:
        """Article title absent from fetch cache → None."""
        labels = ["data"] * 3
        fetch_cache = {"Other Article": ["x", "y", "z"]}  # different title

        entry = build_llm_bucket_entry("Missing Article", labels, fetch_cache)
        self.assertIsNone(entry)

    def test_empty_labels_returns_unclassifiable(self) -> None:
        """Empty label list: assign_tier returns unclassifiable (fewer than N_min)."""
        labels: list[str] = []
        paragraphs: list[str] = []
        fetch_cache = {"Empty Article": paragraphs}

        entry = build_llm_bucket_entry("Empty Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None

        self.assertEqual(entry["tier"], 0)
        self.assertEqual(entry["tier_state"], "unclassifiable")

    def test_muddled_tier_from_interleaved_sequence(self) -> None:
        """Interleaved data/interpretation produces a muddled tier."""
        labels = ["data", "interpretation", "data", "interpretation",
                  "data", "interpretation", "data", "interpretation"]
        paragraphs = [f"P{i}" for i in range(8)]
        fetch_cache = {"Muddled Article": paragraphs}

        entry = build_llm_bucket_entry("Muddled Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None

        self.assertEqual(entry["tier"], -5)
        self.assertEqual(entry["tier_state"], "muddled")
        # Highly interleaved → separation near 0.
        self.assertLess(entry["separation"], 0.3)

    def test_paragraph_texts_match_fetch_cache_order(self) -> None:
        """paragraph_texts preserves exact fetch-cache paragraph order."""
        labels = ["data", "close", "interpretation"]
        paragraphs = ["First paragraph text.", "Second paragraph.", "Third."]
        fetch_cache = {"Ordered Article": paragraphs}

        entry = build_llm_bucket_entry("Ordered Article", labels, fetch_cache)
        self.assertIsNotNone(entry)
        assert entry is not None

        self.assertEqual(entry["paragraph_texts"], paragraphs)
        self.assertEqual(len(entry["paragraph_texts"]), len(entry["paragraphs"]))


class TestLoadLlmCorpus(unittest.TestCase):
    """Tests for load_llm_corpus()."""

    def setUp(self) -> None:
        """Create a temporary fetch-cache and corpus file for each test."""
        # We need to patch ALGO_DIR to point at a temp directory so
        # load_fetch_cache() and DEFAULT_CORPUS_PATH resolve there.
        import classifier.llm_labels as llm_mod
        import scripts.llm_label_corpus as lc_mod

        self._tempdir = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tempdir.name)

        # Override paths in both modules.
        self._orig_algo_dir = llm_mod._ALGO_DIR
        self._orig_fetch_cache = lc_mod.FETCH_CACHE_PATH
        self._orig_corpus_path = llm_mod.DEFAULT_CORPUS_PATH

        llm_mod._ALGO_DIR = self.tmp
        lc_mod.FETCH_CACHE_PATH = self.tmp / ".calibrate-fetch-cache.json"
        llm_mod.DEFAULT_CORPUS_PATH = self.tmp / "labels-corpus.json"

        # Populate a fetch cache.
        self.fetch_cache = {
            "Fresh Article": ["P1", "P2", "P3"],
            "Drifted Article": ["Old P1", "Old P2"],
            "Present Article": ["A", "B", "C", "D"],
        }
        with open(lc_mod.FETCH_CACHE_PATH, "w", encoding="utf-8") as fh:
            json.dump(self.fetch_cache, fh)

        # Compute hashes.
        self.fresh_hash = content_hash("\n\n".join(self.fetch_cache["Fresh Article"]))
        self.drifted_hash = "0000000000000000"  # deliberately wrong

    def tearDown(self) -> None:
        """Restore original paths."""
        import classifier.llm_labels as llm_mod
        import scripts.llm_label_corpus as lc_mod

        llm_mod._ALGO_DIR = self._orig_algo_dir
        lc_mod.FETCH_CACHE_PATH = self._orig_fetch_cache  # type: ignore[assignment]
        llm_mod.DEFAULT_CORPUS_PATH = self._orig_corpus_path  # type: ignore[assignment]
        self._tempdir.cleanup()

    def _write_corpus(self, articles: dict) -> Path:
        """Write a minimal labels-corpus.json to the temp dir."""
        data = {
            "model_id": "test-model",
            "prompt_version": "test",
            "stats": {},
            "articles": articles,
        }
        path = self.tmp / "labels-corpus.json"
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh)
        return path

    def test_load_llm_corpus_includes_fresh_article(self) -> None:
        """Fresh article (matching hash) is included."""
        articles = {
            "Fresh Article": {
                "labels": ["data", "close", "interpretation"],
                "content_hash": self.fresh_hash,
            },
        }
        self._write_corpus(articles)

        result = load_llm_corpus()
        self.assertIn("Fresh Article", result)
        self.assertEqual(
            result["Fresh Article"],
            ["data", "close", "interpretation"],
        )

    def test_load_llm_corpus_excludes_drifted_article(self) -> None:
        """Article whose content_hash doesn't match is excluded."""
        articles = {
            "Drifted Article": {
                "labels": ["data", "data"],
                "content_hash": self.drifted_hash,
            },
        }
        self._write_corpus(articles)

        result = load_llm_corpus()
        self.assertNotIn("Drifted Article", result)

    def test_load_llm_corpus_excludes_title_not_in_cache(self) -> None:
        """Article title not present in fetch cache at all is excluded."""
        articles = {
            "Ghost Article": {
                "labels": ["interpretation"],
                "content_hash": "abcdef1234567890",
            },
        }
        self._write_corpus(articles)

        result = load_llm_corpus()
        self.assertNotIn("Ghost Article", result)

    def test_load_llm_corpus_missing_file_returns_empty(self) -> None:
        """Missing labels-corpus.json returns empty dict."""
        # Don't write the corpus file at all.
        result = load_llm_corpus()
        self.assertEqual(result, {})

    def test_load_llm_corpus_mixed_fresh_and_drifted(self) -> None:
        """Only fresh articles are included; drifted ones excluded."""
        articles = {
            "Fresh Article": {
                "labels": ["data", "close", "interpretation"],
                "content_hash": self.fresh_hash,
            },
            "Drifted Article": {
                "labels": ["data", "data"],
                "content_hash": self.drifted_hash,
            },
            "Present Article": {
                "labels": ["close", "close", "close", "interpretation"],
                "content_hash": content_hash(
                    "\n\n".join(self.fetch_cache["Present Article"])
                ),
            },
        }
        self._write_corpus(articles)

        result = load_llm_corpus()
        self.assertIn("Fresh Article", result)
        self.assertNotIn("Drifted Article", result)
        self.assertIn("Present Article", result)
        self.assertEqual(len(result), 2)
