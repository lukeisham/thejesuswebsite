"""Unit tests for the gnostic-over-emphasis family."""

import unittest

from families.gnostic_over_emphasis import score
from families.tests.fixtures import FakeEmbedder, FakeStore


class TestGnosticOverEmphasis(unittest.TestCase):
    """Tests for gnostic-over-emphasis scoring logic."""

    def test_fallback_when_store_none(self) -> None:
        result = score("text", [], {}, embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))

    def test_contextualised_when_store_fires_without_data_paragraphs(self) -> None:
        """Store fires, no data paragraphs → −2 contextualised tier.

        Exercises the real scoring path: a positive exemplar at 0.8 clears
        t_fire (0.55), and with no 'data' labels the mention is treated as
        contextualised (GNOSTIC_CONTEXTUALISED = −2).
        """
        store = FakeStore([{"type": "positive", "similarity": 0.8}])
        result = score(
            "The Gnostic Gospel of Thomas is mentioned in passing.",
            [], {},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertTrue(result["store_fires"])
        self.assertFalse(result["in_privileged_position"])
        self.assertEqual(result["contribution"], -2)

    def test_privileged_when_store_fires_with_data_paragraphs(self) -> None:
        """Store fires with data paragraphs → −4 privileged tier."""
        store = FakeStore([{"type": "positive", "similarity": 0.8}])
        result = score(
            "The Gnostic Gospel of Thomas is mentioned in passing.",
            ["data"], {},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertTrue(result["store_fires"])
        self.assertTrue(result["in_privileged_position"])
        self.assertEqual(result["contribution"], -4)

    def test_zero_when_store_does_not_fire(self) -> None:
        """Similarity below t_fire → no fire, zero contribution."""
        store = FakeStore([{"type": "positive", "similarity": 0.1}])
        result = score(
            "Ordinary discussion, no Gnostic material.",
            ["data"], {},
            embedder=FakeEmbedder(), store=store,
        )
        self.assertFalse(result["store_fires"])
        self.assertEqual(result["contribution"], 0)


if __name__ == "__main__":
    unittest.main()
