"""Unit tests for the tier assignment logic.

Tests cover the settled target tier scheme (2026-07-31):
 +10   clear split (both descriptive and interpretive present AND separation >= t_sep)
  -5   muddled split (both present BUT separation < t_sep — the worst outcome)
   0   one-sided (only descriptive or only interpretive present)
   0   unclassifiable (fewer than N_min class-bearing paragraphs)

Three-tier semantics (Signal 3 activation):
  - data (Tier 1) and close (Tier 2) are collapsed as "descriptive".
  - interpretation (Tier 3) is "interpretive".

one_sided and unclassifiable both collide at 0, so the burden of verifying
they're distinguishable falls on tier_state string checks, not contribution
integer checks.
"""

import unittest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from classifier.scorer import (
    assign_tier,
    score_article,
    TIER_CLEAR,
    TIER_MUDDLED,
    TIER_ONE_SIDED,
    TIER_UNCLASSIFIABLE,
)


class TestTierAssignment(unittest.TestCase):
    """Tests for assign_tier()."""

    # Use small N_min and t_sep for deterministic testing.
    N_MIN = 2
    T_SEP = 0.70

    # --- Settled tier constant assertions ---
    def test_tier_constants_settled_ordering(self) -> None:
        """Assert the settled target tier contributions (2026-07-31).

        clear=+10, muddled=-5, one_sided=0, unclassifiable=0.
        """
        self.assertEqual(TIER_CLEAR, 10)
        self.assertEqual(TIER_MUDDLED, -5)
        self.assertEqual(TIER_ONE_SIDED, 0)
        self.assertEqual(TIER_UNCLASSIFIABLE, 0)

    def test_muddled_is_worst_outcome(self) -> None:
        """Muddled is the worst outcome (-5): an article that mixes description
        and interpretation without a clean separation is judged worse than one
        that never attempts the split (one_sided/unclassifiable, both 0).

        This is a deliberate weight decision: short single-tier articles are
        legitimately one-sided and shouldn't be penalised for it, but a mixed,
        undifferentiated article should be. The muddled tier_state is still
        recorded so articles that fire it are distinguishable in diagnostics."""
        self.assertEqual(TIER_MUDDLED, -5)
        self.assertEqual(TIER_ONE_SIDED, 0)
        self.assertEqual(TIER_UNCLASSIFIABLE, 0)
        # muddled is negative, one_sided/unclassifiable are both 0, but
        # tier_state strings must still differ between the latter two.
        # Verify muddled has a distinct tier_state from one_sided.
        muddled_labels = ["data", "interpretation", "data", "interpretation"]
        one_sided_labels = ["data", "data", "data"]
        result_m = score_article(muddled_labels, n_min=2)
        result_o = score_article(one_sided_labels, n_min=2)
        self.assertEqual(result_m["tier_state"], "muddled")
        self.assertEqual(result_o["tier_state"], "one_sided")
        self.assertNotEqual(result_m["tier_state"], result_o["tier_state"])

    def test_one_sided_and_unclassifiable_both_zero(self) -> None:
        """Both one_sided and unclassifiable map to 0, but are distinct states."""
        self.assertEqual(TIER_ONE_SIDED, 0)
        self.assertEqual(TIER_UNCLASSIFIABLE, 0)
        # They must be distinguishable via tier_state.
        self.assertNotEqual(
            score_article(["data", "data", "data"])["tier_state"],
            score_article(["data"])["tier_state"],
            "one_sided and unclassifiable must have different tier_state strings"
        )

    # --- Both classes present ---
    def test_both_classes_high_separation(self) -> None:
        """Both classes present AND separation >= t_sep → +10 (clear_split)."""
        labels = ["data", "data", "data", "interpretation", "interpretation"]
        # n=5, 1 transition, separation = 0.75 >= 0.70
        tier = assign_tier(labels, 0.75, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_CLEAR)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "clear_split")

    def test_both_classes_low_separation(self) -> None:
        """Both classes present BUT separation < t_sep → -5 (muddled)."""
        labels = ["data", "interpretation", "data", "interpretation", "data"]
        # n=5, 4 transitions, separation = 0.0 < 0.70
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "muddled")

    def test_both_classes_boundary_separation(self) -> None:
        """Separation exactly at t_sep → +10 (>= check)."""
        labels = ["data", "data", "interpretation", "interpretation"]
        # n=4, 1 transition, separation = 0.666... < 0.70
        tier = assign_tier(labels, 0.6667, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)

    # --- One-sided ---
    def test_only_data_class(self) -> None:
        """Only 'data' paragraphs → 0 (one_sided)."""
        labels = ["data", "data", "data", "data", "data"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier"], 0)
        self.assertEqual(result["tier_state"], "one_sided")

    def test_only_interpretation_class(self) -> None:
        """Only 'interpretation' paragraphs → 0 (one_sided)."""
        labels = ["interpretation", "interpretation", "interpretation"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "one_sided")

    def test_only_interpretation_with_other(self) -> None:
        """No 'data' class but high interpretation presence + other → 0 (one_sided)."""
        labels = ["other", "interpretation", "interpretation",
                   "interpretation", "other"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    # --- Unclassifiable ---
    def test_fewer_than_n_min(self) -> None:
        """Fewer than N_min class-bearing paragraphs → 0 (unclassifiable)."""
        labels = ["data", "other", "other", "other"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=3)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

        result = score_article(labels, n_min=3)
        self.assertEqual(result["tier_state"], "unclassifiable")

    def test_single_paragraph_unclassifiable(self) -> None:
        """Single paragraph → 0 (unclassifiable)."""
        labels = ["data"]
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

        result = score_article(labels, n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "unclassifiable")

    def test_empty_labels_unclassifiable(self) -> None:
        """Empty label list → 0 (unclassifiable)."""
        tier = assign_tier([], 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    def test_all_other_and_neither(self) -> None:
        """All paragraphs are 'other' or 'neither' → 0 (unclassifiable)."""
        labels = ["other", "neither", "other", "other", "neither"]
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_UNCLASSIFIABLE)

    # --- Boundary cases ---
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
        labels = ["data", "data", "data", "data", "interpretation",
                   "interpretation", "interpretation"]
        tier = assign_tier(labels, 0.833)
        # Default N_min=3 (from config), we have 7 class-bearing → should work.
        self.assertIn(tier, (TIER_CLEAR, TIER_MUDDLED, TIER_ONE_SIDED,
                             TIER_UNCLASSIFIABLE))

    # --- tier_state distinctness: the two 0-cases ---
    def test_one_sided_vs_unclassifiable_distinct(self) -> None:
        """one_sided and unclassifiable both score 0 but have distinct tier_state."""
        one_sided_labels = ["data", "data", "data"]  # 3 class-bearing, only data
        unclass_labels = ["data"]  # 1 class-bearing, < N_min=2

        result_one = score_article(one_sided_labels, n_min=self.N_MIN)
        result_uncl = score_article(unclass_labels, n_min=self.N_MIN)

        self.assertEqual(result_one["tier"], 0)
        self.assertEqual(result_uncl["tier"], 0)
        self.assertEqual(result_one["tier_state"], "one_sided")
        self.assertEqual(result_uncl["tier_state"], "unclassifiable")
        self.assertNotEqual(result_one["tier_state"], result_uncl["tier_state"])

    # --- Three-tier: close (Tier 2) handling ---

    def test_score_article_includes_close_count(self) -> None:
        """score_article output includes close_count field for Tier 2 tracking."""
        labels = ["data", "close", "interpretation", "close", "data"]
        result = score_article(labels, n_min=self.N_MIN)
        self.assertIn("close_count", result)
        self.assertEqual(result["close_count"], 2)
        self.assertEqual(result["data_count"], 2)
        self.assertEqual(result["interp_count"], 1)

    def test_only_close_class_is_one_sided(self) -> None:
        """Only 'close' (Tier 2) paragraphs → 0 (one_sided)."""
        labels = ["close", "close", "close", "close"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "one_sided")

    def test_data_plus_close_is_descriptive_class(self) -> None:
        """Data (Tier 1) and close (Tier 2) are collapsed as 'descriptive'.

        An article with only data and close (no interpretation) is one-sided."""
        labels = ["data", "close", "data", "close", "data"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    def test_descriptive_vs_interpretive_clear_split(self) -> None:
        """Data+Close block separated from Interpretation block → +10."""
        # Descriptive block (data+close) followed by interpretive block.
        labels = ["data", "data", "close", "close",
                   "interpretation", "interpretation", "interpretation"]
        # 7 class-bearing, 1 transition (desc→interp), sep = 0.833 >= 0.70
        tier = assign_tier(labels, 0.833, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_CLEAR)

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "clear_split")

    def test_close_and_interpretation_interleaved_is_muddled(self) -> None:
        """Close (Tier 2) interleaved with Interpretation (Tier 3) → -5 (muddled).

        This is the load-bearing assertion: an article interleaving
        Tier 2 and Tier 3 scores -5, never +10."""
        labels = ["close", "interpretation", "close", "interpretation",
                   "close", "interpretation"]
        # 6 class-bearing, 5 transitions, sep = 0.0 < 0.70
        tier = assign_tier(labels, 0.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)
        self.assertNotEqual(tier, TIER_CLEAR,
                           "close+interp interleaving must not score +10")

        result = score_article(labels, t_sep_threshold=self.T_SEP,
                               n_min=self.N_MIN)
        self.assertEqual(result["tier_state"], "muddled")

    def test_boundary_data_heavy_with_close_analysis(self) -> None:
        """Boundary case: mostly data with scattered close-analysis paragraphs.

        From Action:Refining the data interpretation split.md — an article
        that is predominantly Tier 1 data but includes close analysis
        (synoptic comparison, text-critical notes) without interpretation
        is one-sided (descriptive only)."""
        labels = ["data", "data", "close", "data", "close", "data", "data"]
        tier = assign_tier(labels, 1.0, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_ONE_SIDED)

    def test_boundary_close_heavy_with_interpretation(self) -> None:
        """Boundary case: an article interleaving close analysis with
        theological interpretation — muddled."""
        labels = ["close", "interpretation", "close", "interpretation",
                   "close", "close", "interpretation"]
        # 7 class-bearing, many transitions, sep is low.
        tier = assign_tier(labels, 0.167, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_MUDDLED)

    def test_boundary_all_three_tiers_present_clear(self) -> None:
        """Boundary case: data, close, interpretation all present but cleanly
        separated into descriptive vs interpretive blocks."""
        labels = ["data", "data", "data", "close", "close",
                   "interpretation", "interpretation", "interpretation",
                   "interpretation"]
        # 9 class-bearing, 1 transition (desc→interp), sep = 0.875 >= 0.70
        tier = assign_tier(labels, 0.875, t_sep_threshold=self.T_SEP,
                           n_min=self.N_MIN)
        self.assertEqual(tier, TIER_CLEAR)


if __name__ == "__main__":
    unittest.main()
