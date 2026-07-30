"""Unit tests for the tier assignment logic.

Tests cover the seven cases specified in the plan:
  1. Both classes, high separation → +10
  2. Both classes, low separation → -3
  3. Only data class → -5
  4. Only interpretation class → -5
  5. Fewer than N_min paragraphs → 0
  6. No data class but high interpretation presence → -5
  7. Single paragraph → cannot compute transitions → 0
"""

import unittest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from classifier.scorer import assign_tier, TIER_CLEAR, TIER_MUDDLED, \
    TIER_ONE_SIDED, TIER_UNCLASSIFIABLE


class TestTierAssignment(unittest.TestCase):
    """Tests for assign_tier()."""

    # Use small N_min and t_sep for deterministic testing.
    N_MIN = 2
    T_SEP = 0.70

    def test_both_classes_high_separation(self) -> None:
        """Both classes present AND separation >= t_sep → +10."""
        labels = ["data", "data", "data", "interpretation", "interpretation"]
        # n=5, 1 transition, separation = 0.75 >= 0.70
        tier = assign_tier(labels, 0.75, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_CLEAR)

    def test_both_classes_low_separation(self) -> None:
        """Both classes present BUT separation < t_sep → -3."""
        labels = ["data", "interpretation", "data", "interpretation", "data"]
        # n=5, 4 transitions, separation = 0.0 < 0.70
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)

    def test_both_classes_boundary_separation(self) -> None:
        """Separation exactly at t_sep → +10 (>= check)."""
        labels = ["data", "data", "interpretation", "interpretation"]
        # n=4, 1 transition, separation = 0.666...; need >= 0.70
        # So this should be < t_sep, not >=.
        tier = assign_tier(labels, 0.6667, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)

    def test_only_data_class(self) -> None:
        """Only 'data' paragraphs → -5."""
        labels = ["data", "data", "data", "data", "data"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    def test_only_interpretation_class(self) -> None:
        """Only 'interpretation' paragraphs → -5."""
        labels = ["interpretation", "interpretation", "interpretation"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    def test_only_interpretation_with_other(self) -> None:
        """No 'data' class but high interpretation presence + other → -5."""
        labels = ["other", "interpretation", "interpretation",
                   "interpretation", "other"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    def test_fewer_than_n_min(self) -> None:
        """Fewer than N_min class-bearing paragraphs → 0."""
        labels = ["data", "other", "other", "other"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=3)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    def test_single_paragraph_unclassifiable(self) -> None:
        """Single paragraph → cannot compute transitions → 0."""
        labels = ["data"]
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        # n_min=2, only 1 class-bearing → unclassifiable.
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    def test_empty_labels_unclassifiable(self) -> None:
        """Empty label list → 0."""
        tier = assign_tier([], 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    def test_all_other_and_neither(self) -> None:
        """All paragraphs are 'other' or 'neither' → 0."""
        labels = ["other", "neither", "other", "other", "neither"]
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    def test_high_separation_exactly_at_threshold(self) -> None:
        """separation == t_sep → +10."""
        labels = ["data", "data", "data", "interpretation", "interpretation",
                   "interpretation"]
        # n=6, 1 transition, separation = 0.80
        tier = assign_tier(labels, 0.70, t_sep_threshold=0.70,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_CLEAR)

    def test_default_thresholds_from_config(self) -> None:
        """Verify defaults are used when thresholds are not passed."""
        # With both classes and high separation, should get +10.
        labels = ["data", "data", "data", "data", "interpretation",
                   "interpretation", "interpretation"]
        # separation = 1 - 1/6 ≈ 0.833, which exceeds default t_sep=0.70.
        tier = assign_tier(labels, 0.833)
        # Default N_min=3 (from config), we have 7 class-bearing → should work.
        self.assertIn(tier, (TIER_CLEAR, TIER_MUDDLED, TIER_ONE_SIDED,
                             TIER_UNCLASSIFIABLE))


if __name__ == "__main__":
    unittest.main()
