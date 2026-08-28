"""Unit tests for the literary-analysis family."""

import unittest

from families.literary_analysis import score
from families.tests.fixtures import FakeEmbedder, FakeStore


class TestLiteraryAnalysis(unittest.TestCase):
    """Tests for literary-analysis scoring logic."""

    def test_fallback_when_store_none(self) -> None:
        result = score("text", {}, embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))

    def test_parable_tier_when_store_fires(self) -> None:
        """Store fires on a parable-category article → +6 'parable' tier.

        Exercises the real scoring path: a positive exemplar at 0.8 clears
        t_fire (0.55), and the is_parable flag selects the LITERARY_TIER_PARABLE
        weight (+6) via shape_d_tiered.
        """
        store = FakeStore([{"type": "positive", "similarity": 0.8}])
        result = score(
            "The parable opens with an inclusio and closes with a chiasm.",
            {"is_parable": True},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertTrue(result["store_fires"])
        self.assertEqual(result["tier"], "parable")
        self.assertEqual(result["contribution"], 6)

    def test_other_tier_when_store_fires_without_parable_category(self) -> None:
        """Store fires without parable flags → +4 'other' tier."""
        store = FakeStore([{"type": "positive", "similarity": 0.8}])
        result = score(
            "The narrative criticism here notes the rhetorical structure.",
            {},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertTrue(result["store_fires"])
        self.assertEqual(result["tier"], "other")
        self.assertEqual(result["contribution"], 4)

    def test_zero_when_store_does_not_fire(self) -> None:
        """Similarity below t_fire → no fire, zero contribution, no tier."""
        store = FakeStore([{"type": "positive", "similarity": 0.1}])
        result = score(
            "An ordinary paragraph.",
            {"is_parable": True},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertFalse(result["store_fires"])
        self.assertEqual(result["contribution"], 0)
        self.assertIsNone(result["tier"])


if __name__ == "__main__":
    unittest.main()
