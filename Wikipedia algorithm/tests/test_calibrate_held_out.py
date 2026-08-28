#!/usr/bin/env python3
"""Tests for calibrate_held_out.py's gold-tier derivation and wiring."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

_ALGO_DIR = Path(__file__).resolve().parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

import calibrate_held_out
from classifier.scorer import score_article


class TestBuildHeldOutRecords(unittest.TestCase):
    """Tests for build_held_out_records()."""

    def test_gold_tier_matches_score_article(self):
        """The gold_tier_state a record is tagged with must match a direct
        score_article() call on the same labels — guards the two call sites
        (this script and classifier/llm_labels.py's build_llm_bucket_entry())
        against drifting apart."""
        labels = ["data", "data", "close", "interpretation", "interpretation"]
        llm_labels = {"Article A": labels}
        fetch_cache = {"Article A": ["p1", "p2", "p3", "p4", "p5"]}

        records = calibrate_held_out.build_held_out_records(llm_labels, fetch_cache)

        self.assertEqual(len(records), 1)
        expected = score_article(labels)
        self.assertEqual(records[0]["gold_tier_state"], expected["tier_state"])
        self.assertEqual(
            records[0]["gold_tier_contribution"],
            calibrate_held_out.TIER_CONTRIBUTION[expected["tier_state"]],
        )

    def test_excludes_titles_missing_from_fetch_cache(self):
        """A title present in llm_labels but absent from fetch_cache is
        dropped, not a crash."""
        llm_labels = {
            "In Cache": ["data", "data", "interpretation", "interpretation"],
            "Not In Cache": ["data", "data", "interpretation", "interpretation"],
        }
        fetch_cache = {"In Cache": ["p1", "p2", "p3", "p4"]}

        records = calibrate_held_out.build_held_out_records(llm_labels, fetch_cache)

        titles = {r["title"] for r in records}
        self.assertEqual(titles, {"In Cache"})

    def test_empty_inputs_produce_no_records(self):
        self.assertEqual(calibrate_held_out.build_held_out_records({}, {}), [])


class TestMainExitsOnInsufficientCorpus(unittest.TestCase):
    """Tests for main()'s '< 20 articles' guard (mirrors
    calibrate_with_held_out()'s own skip contract)."""

    def test_exits_nonzero_when_llm_corpus_too_small(self):
        small_corpus = {
            f"Article {i}": ["data", "data", "interpretation", "interpretation"]
            for i in range(5)
        }
        with patch.object(calibrate_held_out, "load_llm_corpus", return_value=small_corpus):
            with self.assertRaises(SystemExit) as ctx:
                calibrate_held_out.main()
        self.assertNotEqual(ctx.exception.code, 0)

    def test_exits_nonzero_when_fetch_cache_intersection_too_small(self):
        """Even with >= 20 LLM-labelled articles, too few surviving the
        fetch-cache intersection must still abort loudly."""
        corpus = {
            f"Article {i}": ["data", "data", "interpretation", "interpretation"]
            for i in range(25)
        }
        # Only 5 of the 25 titles are in the fetch cache.
        sparse_cache = {f"Article {i}": ["p1", "p2", "p3", "p4"] for i in range(5)}
        with patch.object(calibrate_held_out, "load_llm_corpus", return_value=corpus), \
             patch.object(calibrate_held_out, "_load_fetch_cache", return_value=sparse_cache):
            with self.assertRaises(SystemExit) as ctx:
                calibrate_held_out.main()
        self.assertNotEqual(ctx.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
