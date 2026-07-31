#!/usr/bin/env python3
"""Tests for placement-aware scoring functions (Plan 4 — paragraph-label reuse)."""
import sys, os, unittest

# Add rank_engine.py's directory to the import path
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_RANK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(_SCRIPT_DIR)),
    "setup", "SKILLS", "!TheJesusWebsite-Wikipedia", "scripts",
)
sys.path.insert(0, _RANK_DIR)

import rank_engine


class TestComputePlacement(unittest.TestCase):
    """Tests for _compute_placement()."""

    def test_x2_data_hit(self):
        """x2 when any hit is in a data paragraph."""
        labels = ["data", "interpretation", "interpretation"]
        hits = [True, False, False]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 2.0)

    def test_x2_close_hit(self):
        """x2 when any hit is in a close-analysis paragraph."""
        labels = ["interpretation", "close", "interpretation"]
        hits = [False, True, False]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 2.0)

    def test_x2_mixed_data_and_interp(self):
        """x2 when hits span both data and interpretation."""
        labels = ["data", "interpretation", "interpretation"]
        hits = [True, True, False]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 2.0)

    def test_x0_5_all_interpretation(self):
        """x0.5 when ALL hits are in interpretation-only paragraphs."""
        labels = ["interpretation", "interpretation", "interpretation"]
        hits = [False, True, True]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 0.5)

    def test_x1_mixed_other_and_interp(self):
        """x1 when hits fall in both other and interpretation."""
        labels = ["other", "interpretation", "interpretation"]
        hits = [True, True, False]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 1.0)

    def test_x1_no_hits(self):
        """x1 when there are no hits at all."""
        labels = ["data", "interpretation"]
        hits = [False, False]
        self.assertEqual(rank_engine._compute_placement(labels, hits), 1.0)

    def test_x1_none_hits(self):
        """x1 when hits is None."""
        self.assertEqual(rank_engine._compute_placement(["data"], None), 1.0)

    def test_x1_none_labels(self):
        """x1 when labels is None."""
        self.assertEqual(rank_engine._compute_placement(None, [True]), 1.0)

    def test_x1_empty(self):
        """x1 when both lists are empty."""
        self.assertEqual(rank_engine._compute_placement([], []), 1.0)

    def test_length_mismatch_truncates(self):
        """Truncates to the shorter list length."""
        labels = ["data", "interpretation"]
        hits = [True]  # shorter
        # hit is in "data" → x2
        self.assertEqual(rank_engine._compute_placement(labels, hits), 2.0)


class TestIsOutsideInterpretation(unittest.TestCase):
    """Tests for _is_outside_interpretation()."""

    def test_outside_data(self):
        """True when hit is in a data paragraph."""
        labels = ["data", "interpretation"]
        hits = [True, False]
        self.assertTrue(rank_engine._is_outside_interpretation(labels, hits))

    def test_outside_other(self):
        """True when hit is in an other paragraph."""
        labels = ["other", "interpretation"]
        hits = [True, False]
        self.assertTrue(rank_engine._is_outside_interpretation(labels, hits))

    def test_outside_close(self):
        """True when hit is in a close paragraph."""
        labels = ["close", "interpretation"]
        hits = [True, False]
        self.assertTrue(rank_engine._is_outside_interpretation(labels, hits))

    def test_inside_only(self):
        """False when ALL hits are in interpretation paragraphs."""
        labels = ["interpretation", "interpretation"]
        hits = [True, True]
        self.assertFalse(rank_engine._is_outside_interpretation(labels, hits))

    def test_no_hits(self):
        """False when there are no hits at all."""
        labels = ["data", "interpretation"]
        hits = [False, False]
        self.assertFalse(rank_engine._is_outside_interpretation(labels, hits))

    def test_none_inputs(self):
        """False when either input is None."""
        self.assertFalse(rank_engine._is_outside_interpretation(None, [True]))
        self.assertFalse(rank_engine._is_outside_interpretation(["data"], None))


class TestAnyHitInLabels(unittest.TestCase):
    """Tests for _any_hit_in_labels()."""

    def test_hit_in_target(self):
        """True when a hit is in a target label paragraph."""
        labels = ["data", "interpretation", "close"]
        hits = [False, True, False]
        self.assertFalse(rank_engine._any_hit_in_labels(labels, hits, {"data", "close"}))
        hits = [True, False, False]
        self.assertTrue(rank_engine._any_hit_in_labels(labels, hits, {"data", "close"}))

    def test_hit_in_close_target(self):
        """True when hit is in close (one of the target labels)."""
        labels = ["interpretation", "close", "interpretation"]
        hits = [False, True, False]
        self.assertTrue(rank_engine._any_hit_in_labels(labels, hits, {"data", "close"}))

    def test_no_hit_in_target(self):
        """False when hit is NOT in any target label."""
        labels = ["interpretation", "other", "neither"]
        hits = [True, True, True]
        self.assertFalse(rank_engine._any_hit_in_labels(labels, hits, {"data", "close"}))

    def test_no_hits_at_all(self):
        """False when there are no hits."""
        labels = ["data", "close"]
        hits = [False, False]
        self.assertFalse(rank_engine._any_hit_in_labels(labels, hits, {"data", "close"}))

    def test_none_inputs(self):
        """False when either input is None."""
        self.assertFalse(rank_engine._any_hit_in_labels(None, [True], {"data"}))
        self.assertFalse(rank_engine._any_hit_in_labels(["data"], None, {"data"}))

    def test_empty_target(self):
        """False when target_labels is empty."""
        labels = ["data"]
        hits = [True]
        self.assertFalse(rank_engine._any_hit_in_labels(labels, hits, set()))


class TestPlacementMult(unittest.TestCase):
    """Tests for placement_mult()."""

    def test_returns_1_0_without_paragraph_hits(self):
        """Returns 1.0 when sig has no paragraph_hits."""
        sig = {}
        self.assertEqual(rank_engine.placement_mult(sig, "jesusSeminar"), 1.0)

    def test_returns_1_0_without_bucket_labels(self):
        """Returns 1.0 when bucket_labels is not provided."""
        sig = {"paragraph_hits": {"jesus_seminar": [True]}}
        self.assertEqual(rank_engine.placement_mult(sig, "jesusSeminar"), 1.0)

    def test_unknown_prefix_returns_1_0(self):
        """Returns 1.0 for an unrecognized prefix."""
        sig = {"paragraph_hits": {"something": [True]}}
        self.assertEqual(rank_engine.placement_mult(sig, "unknownPrefix"), 1.0)

    def test_x2_with_data_hit(self):
        """Returns 2.0 when hit is in a data paragraph."""
        sig = {"paragraph_hits": {"jesus_seminar": [True, False]}}
        bucket_labels = {"Test": {"paragraphs": ["data", "interpretation"]}}
        self.assertEqual(
            rank_engine.placement_mult(sig, "jesusSeminar", bucket_labels, "Test"),
            2.0,
        )

    def test_x0_5_with_interpretation_only(self):
        """Returns 0.5 when hits are only in interpretation paragraphs."""
        sig = {"paragraph_hits": {"mythicist": [False, True, True]}}
        bucket_labels = {"Test": {"paragraphs": ["interpretation", "interpretation", "interpretation"]}}
        self.assertEqual(
            rank_engine.placement_mult(sig, "mythicist", bucket_labels, "Test"),
            0.5,
        )

    def test_missing_article_returns_1_0(self):
        """Returns 1.0 when article is not in bucket_labels."""
        sig = {"paragraph_hits": {"jesus_seminar": [True]}}
        bucket_labels = {}
        self.assertEqual(
            rank_engine.placement_mult(sig, "jesusSeminar", bucket_labels, "Missing"),
            1.0,
        )

    def test_confessional_balance_prefix(self):
        """Works with confessionalBalance prefix."""
        sig = {"paragraph_hits": {"critical_scholar": [True, False]}}
        bucket_labels = {"Test": {"paragraphs": ["data", "interpretation"]}}
        self.assertEqual(
            rank_engine.placement_mult(sig, "confessionalBalance", bucket_labels, "Test"),
            2.0,
        )


if __name__ == "__main__":
    unittest.main()
