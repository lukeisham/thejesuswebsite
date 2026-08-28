"""Unit tests for both separation ratio computations.

Tests cover the adjacency-based compute_separation_ratio() and the new
block-structure compute_separation_blocks().

Key difference: the adjacency metric counts adjacent transitions between
differing class labels. The block-structure metric counts contiguous runs
(blocks) of the same label. A sequence with 4 blocks and many paragraphs
scores well under block-structure, but may score poorly under adjacency if
the blocks are large and a few scattered paragraphs break them up.

Tests cover:
  1. No transitions (all one class) → ratio = 1.0
  2. Alternating labels (max transitions) → ratio ≈ 0.0
  3. Two contiguous blocks with one transition → ~0.83
  4. Real articles with mixed patterns (including 'other'/'neither')
  5. Block-structure specific: clustered alternation vs true interleaving
"""

import unittest

# Allow running from the tests directory or the project root.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from classifier.scorer import (
    compute_separation_ratio,
    compute_separation_blocks,
)


class TestSeparationRatio(unittest.TestCase):
    """Tests for compute_separation_ratio() (adjacency-based)."""

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

    # --- Three-tier: close (Tier 2) collapsed with data (Tier 1) ---

    def test_close_collapsed_with_data(self) -> None:
        """Close (Tier 2) paragraphs are collapsed with data (Tier 1) as
        'descriptive'. A sequence of data+close is treated as one class."""
        labels = ["data", "close", "data", "close"]
        ratio = compute_separation_ratio(labels)
        # All collapsed as 'desc' → 4 class-bearing, 0 transitions → 1.0
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_desc_vs_interp_two_blocks(self) -> None:
        """Descriptive block (data+close) vs interpretive block →
        same separation as data-only vs interpretation."""
        labels = ["data", "close", "data", "interpretation", "interpretation"]
        ratio = compute_separation_ratio(labels)
        # Class-bearing: desc,desc,desc,interp,interp (5 items, 1 transition)
        # ratio = 1 - 1/4 = 0.75
        expected = 1.0 - (1.0 / 4.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_close_interp_interleaved_low_separation(self) -> None:
        """Close (Tier 2) interleaved with interpretation (Tier 3) →
        low separation. This is the key detection case."""
        labels = ["close", "interpretation", "close", "interpretation",
                   "close", "interpretation"]
        ratio = compute_separation_ratio(labels)
        # 6 class-bearing, 5 transitions → 0.0
        self.assertAlmostEqual(ratio, 0.0, places=4)

    def test_all_three_tiers_cleanly_separated(self) -> None:
        """Data+close block cleanly separated from interpretation block →
        high separation."""
        labels = ["data", "data", "close", "close", "data",
                   "interpretation", "interpretation", "interpretation"]
        ratio = compute_separation_ratio(labels)
        # Class-bearing: desc×5, interp×3 (8 items, 1 transition)
        # ratio = 1 - 1/7 ≈ 0.857
        expected = 1.0 - (1.0 / 7.0)
        self.assertAlmostEqual(ratio, expected, places=4)


class TestSeparationBlocks(unittest.TestCase):
    """Tests for compute_separation_blocks() (block-structure-based)."""

    def test_no_blocks_all_one_class(self) -> None:
        """All labels are the same → 1 block → ratio = 1.0."""
        labels = ["data", "data", "data", "data", "data"]
        ratio = compute_separation_blocks(labels)
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_alternating_max_blocks(self) -> None:
        """Alternating labels → each paragraph is its own block → ratio ≈ 0.0."""
        labels = ["data", "interpretation", "data", "interpretation", "data"]
        ratio = compute_separation_blocks(labels)
        # 5 class-bearing labels, each is its own block → 5 blocks
        # ratio = 1 - (5-1)/(5-1) = 0.0
        self.assertAlmostEqual(ratio, 0.0, places=4)

    def test_two_blocks_equal_to_adjacency(self) -> None:
        """Two contiguous blocks: block-structure == adjacency."""
        labels = ["data", "data", "data", "interpretation", "interpretation",
                   "interpretation", "interpretation"]
        ratio = compute_separation_blocks(labels)
        # n=7, blocks=2, ratio = 1 - 1/6 ≈ 0.8333
        expected = 1.0 - (1.0 / 6.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_three_blocks_with_scattered(self) -> None:
        """Three blocks: D,D,D,I,I,D,D,D. scores differently from 2-block."""
        labels = ["data", "data", "data", "interpretation", "interpretation",
                   "data", "data", "data", "data"]
        ratio = compute_separation_blocks(labels)
        # n=9, blocks=3, ratio = 1 - 2/8 = 0.75
        expected = 1.0 - (2.0 / 8.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_gospel_of_mark_shape(self) -> None:
        """Simulate Gospel of Mark gold-set shape: blocks with scattered alternation.

        The gold set has: D,D,I,D,I,I,I,I,D,I,D,I,I... which under adjacency
        would score low due to many adjacent transitions, but human labellers
        see it as clustered blocks (data block → interpretation block → mixed).
        """
        # Simulate: 4 data, 6 interp, 2 data, 3 interp — 4 blocks in 15 class-bearing.
        labels = (
            ["data"] * 4 +
            ["interpretation"] * 6 +
            ["data"] * 2 +
            ["interpretation"] * 3
        )
        adj_ratio = compute_separation_ratio(labels)
        blk_ratio = compute_separation_blocks(labels)

        # n=15, blocks=4, block ratio = 1 - 3/14 ≈ 0.786
        expected_block = 1.0 - (3.0 / 14.0)
        self.assertAlmostEqual(blk_ratio, expected_block, places=4)

        # Adjacency: 3 transitions (D→I, I→D, D→I), ratio = 1 - 3/14 ≈ 0.786
        # In this case they're the same because all blocks are size > 1.
        self.assertAlmostEqual(adj_ratio, blk_ratio, places=4)

    def test_block_vs_adjacency_difference(self) -> None:
        """Adjacency and block formulas coincide on this fixture.

        For any label sequence, block_count - 1 equals the number of
        adjacent transitions (each block boundary is exactly one
        transition), so compute_separation_blocks() = 1 - (B-1)/(n-1)
        and compute_separation_ratio() = 1 - T/(n-1) are mathematically
        the same functional. This test pins that equivalence on a
        single-paragraph-block fixture (D,D,I,D,D): both formulas return
        0.5 — the two functions differ in how they *describe* the split
        (blocks vs transitions), not in their numeric result on this
        sequence shape.
        """
        labels = ["data", "data", "interpretation", "data", "data"]
        # Class-bearing: D,D,I,D,D (n=5)
        # Adjacency: D→D(no), D→I(yes,1), I→D(yes,2), D→D(no) → 2 transitions
        # adj_ratio = 1 - 2/4 = 0.50
        adj = compute_separation_ratio(labels)
        # Blocks: D(2), I(1), D(2) → 3 blocks
        # blk_ratio = 1 - 2/4 = 0.50
        blk = compute_separation_blocks(labels)

        # Both formulas give the same result (block_count - 1 == transitions).
        self.assertAlmostEqual(adj, blk, places=4)
        self.assertAlmostEqual(adj, 0.5, places=4)

    def test_mixed_with_other_and_neither_blocks(self) -> None:
        """'other' and 'neither' labels are excluded from block counting."""
        labels = [
            "other",
            "data",
            "data",
            "neither",
            "interpretation",
            "interpretation",
            "other",
            "interpretation",
        ]
        ratio = compute_separation_blocks(labels)
        # Class-bearing: data, data, interpretation, interpretation, interpretation
        # n=5, blocks=2 (D-block, I-block)
        # ratio = 1 - 1/4 = 0.75
        expected = 1.0 - (1.0 / 4.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_empty_labels_blocks(self) -> None:
        """Empty list → ratio = 0.0."""
        ratio = compute_separation_blocks([])
        self.assertEqual(ratio, 0.0)

    def test_single_class_bearing_blocks(self) -> None:
        """One class-bearing paragraph → ratio = 0.0."""
        labels = ["other", "data", "other"]
        ratio = compute_separation_blocks(labels)
        self.assertEqual(ratio, 0.0)

    def test_all_other_blocks(self) -> None:
        """No class-bearing labels → ratio = 0.0."""
        labels = ["other", "neither", "other"]
        ratio = compute_separation_blocks(labels)
        self.assertEqual(ratio, 0.0)

    def test_block_separation_bounded(self) -> None:
        """Block ratio must always be in [0, 1]."""
        self.assertGreaterEqual(
            compute_separation_blocks(["data", "data"]), 0.0)
        self.assertLessEqual(
            compute_separation_blocks(["data", "data"]), 1.0)
        self.assertAlmostEqual(
            compute_separation_blocks(["data", "interpretation", "data"]),
            0.0, places=4)

    # --- Three-tier: close (Tier 2) collapsed with data (Tier 1) ---

    def test_close_collapsed_with_data_blocks(self) -> None:
        """Close (Tier 2) is collapsed with data (Tier 1)."""
        labels = ["data", "close", "data", "close"]
        ratio = compute_separation_blocks(labels)
        # All collapsed as 'desc' → 4 items, 1 block → 1.0
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_all_three_tiers_blocks_clean(self) -> None:
        """Data+close block vs interpretation block → high separation."""
        labels = ["data", "data", "close",
                   "interpretation", "interpretation", "interpretation"]
        ratio = compute_separation_blocks(labels)
        # desc×3, interp×3 → 2 blocks, 6 items → 1 - 1/5 = 0.80
        expected = 1.0 - (1.0 / 5.0)
        self.assertAlmostEqual(ratio, expected, places=4)

    def test_close_interp_interleaved_blocks(self) -> None:
        """Close interleaved with interpretation → max blocks → 0.0."""
        labels = ["close", "interpretation", "close", "interpretation"]
        ratio = compute_separation_blocks(labels)
        # desc,interp,desc,interp → 4 blocks, 4 items → 1 - 3/3 = 0.0
        self.assertAlmostEqual(ratio, 0.0, places=4)

    def test_block_vs_adjacency_equivalence_with_close(self) -> None:
        """Block-structure and adjacency are mathematically equivalent
        even with close (Tier 2) paragraphs present."""
        labels = ["data", "close", "interpretation", "interpretation",
                   "close", "data", "interpretation"]
        # Collapsed: desc,desc,interp,interp,desc,desc,interp → 7 items
        # Blocks: desc(2), interp(2), desc(2), interp(1) → 4 blocks
        # Adjacency transitions = 3 (desc→interp, interp→desc, desc→interp)
        # Both = 1 - 3/6 = 0.50
        adj = compute_separation_ratio(labels)
        blk = compute_separation_blocks(labels)
        self.assertAlmostEqual(adj, blk, places=4)
        self.assertAlmostEqual(adj, 0.5, places=4)


if __name__ == "__main__":
    unittest.main()
