"""Unit tests for the separation ratio computation.

Tests cover the four cases specified in the plan:
  1. No transitions (all one class) → ratio = 1.0
  2. Alternating labels (max transitions) → ratio ≈ 0.0
  3. Two contiguous blocks with one transition
  4. Real articles with mixed patterns (including 'other'/'neither')
"""

import unittest

# Allow running from the tests directory or the project root.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from classifier.scorer import compute_separation_ratio


class TestSeparationRatio(unittest.TestCase):
    """Tests for compute_separation_ratio()."""

    def test_no_transitions_all_one_class(self) -> None:
        """All labels are the same → no transitions → ratio = 1.0."""
        labels = ["data", "data", "data", "data", "data"]
        ratio = compute_separation_ratio(labels)
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_no_transitions_all_interpretation(self) -> None:
        """All labels are 'interpretation' → ratio = 1.0."""
        labels = ["interpretation", "interpretation", "interpretation"]
        ratio = compute_separation_ratio(labels)
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_alternating_max_transitions(self) -> None:
        """Alternating labels → every adjacent pair differs → ratio ≈ 0.0."""
        labels = ["data", "interpretation", "data", "interpretation", "data"]
        ratio = compute_separation_ratio(labels)
        # 5 class-bearing labels, 4 adjacent pairs, all 4 are transitions.
        # ratio = 1 - 4/4 = 0.0
        self.assertAlmostEqual(ratio, 0.0, places=4)

    def test_two_contiguous_blocks_one_transition(self) -> None:
        """Two contiguous blocks with one transition."""
        # 7 class-bearing paragraphs: 3 data + 4 interpretation = 1 transition.
        labels = ["data", "data", "data", "interpretation", "interpretation",
                   "interpretation", "interpretation"]
        ratio = compute_separation_ratio(labels)
        # n=7, transitions=1, ratio = 1 - 1/6 = 5/6 ≈ 0.8333
        expected = 1.0 - (1.0 / 6.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_mixed_with_other_and_neither(self) -> None:
        """'other' and 'neither' labels are excluded from the ratio."""
        labels = [
            "other",       # positional — excluded
            "data",
            "data",
            "neither",     # excluded
            "interpretation",
            "interpretation",
            "other",       # positional — excluded
            "interpretation",
        ]
        ratio = compute_separation_ratio(labels)
        # Class-bearing: data, data, interpretation, interpretation, interpretation
        # n=5, transitions=1 (data→interp at index 1→2)
        # ratio = 1 - 1/4 = 0.75
        expected = 1.0 - (1.0 / 4.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_all_other_and_neither(self) -> None:
        """No class-bearing labels → ratio = 0.0."""
        labels = ["other", "neither", "other", "other"]
        ratio = compute_separation_ratio(labels)
        self.assertEqual(ratio, 0.0)

    def test_single_class_bearing_paragraph(self) -> None:
        """One class-bearing paragraph → cannot compute → ratio = 0.0."""
        labels = ["other", "data", "other", "other"]
        ratio = compute_separation_ratio(labels)
        self.assertEqual(ratio, 0.0)

    def test_two_class_bearing_identical(self) -> None:
        """Two class-bearing paragraphs, both same label → ratio = 1.0."""
        labels = ["other", "data", "data", "other"]
        ratio = compute_separation_ratio(labels)
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_two_class_bearing_different(self) -> None:
        """Two class-bearing paragraphs, different labels → ratio = 0.0."""
        labels = ["data", "interpretation"]
        ratio = compute_separation_ratio(labels)
        # n=2, transitions=1, ratio = 1 - 1/1 = 0.0
        self.assertAlmostEqual(ratio, 0.0, places=4)

    def test_empty_labels(self) -> None:
        """Empty list → ratio = 0.0."""
        ratio = compute_separation_ratio([])
        self.assertEqual(ratio, 0.0)

    def test_three_blocks_two_transitions(self) -> None:
        """Three contiguous blocks (data, interp, data) → 2 transitions."""
        labels = ["data", "data", "data", "interpretation", "interpretation",
                   "data", "data", "data", "data"]
        ratio = compute_separation_ratio(labels)
        # n=9, transitions=2, ratio = 1 - 2/8 = 0.75
        expected = 1.0 - (2.0 / 8.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_realistic_mixed_article(self) -> None:
        """Simulate a realistic article with lede, mixed body, and references."""
        labels = [
            "other",          # lede
            "data",
            "data",
            "data",
            "interpretation",
            "interpretation",
            "interpretation",
            "interpretation",
            "data",
            "data",
            "neither",
            "other",          # references
            "other",          # references
            "other",          # references
        ]
        ratio = compute_separation_ratio(labels)
        # Class-bearing: data, data, data, interp, interp, interp, interp, data, data
        # n=9, transitions: data→interp at 2→3, interp→data at 6→7 = 2 transitions
        # ratio = 1 - 2/8 = 0.75
        expected = 1.0 - (2.0 / 8.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_separation_bounded_0_to_1(self) -> None:
        """The ratio must always be in [0, 1]."""
        # Normal case.
        self.assertGreaterEqual(compute_separation_ratio(["data", "data"]), 0.0)
        self.assertLessEqual(compute_separation_ratio(["data", "data"]), 1.0)

        # Alternating case yields exactly 0.0.
        self.assertAlmostEqual(
            compute_separation_ratio(["data", "interpretation", "data"]), 0.0
        )


if __name__ == "__main__":
    unittest.main()
